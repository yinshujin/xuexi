import { useEffect, useRef, useState } from 'react';
import type { SpeakGame } from '../../lib/games';
import {
  alignWords,
  CHEER,
  cheerBand,
  loadScoringConfig,
  PASS_SCORE_DEFAULT,
  passed,
  scoreRecording,
  type ScoringConfig,
  type WordState,
} from '../../lib/scoring';
import { hush } from '../../lib/scoring/grade';
import { sfx } from '../../lib/sfx';
import { useApp } from '../../lib/store';
import { stopWord, wordAudioUrl } from '../../lib/wordAudio';
import { Speaker } from './Speaker';
import type { GameViewProps } from './types';

/** Tries at a reading before it counts as wrong (unclear recordings don't count). */
export const SPEAK_TRIES = 2;

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported?.(t));
}

/** Recording limit: a word 4 s, a sentence a little more per word. */
const limitMs = (text: string) => Math.min(10_000, 3000 + 700 * text.split(' ').length);

type Verdict = { tone: 'good' | 'retry' | 'info'; text: string; score?: number };

/**
 * 开口读 (the record → score → feedback flow of PronPage): 🎤 read the word or
 * sentence, 讯飞 scores it against the family's 跟读 pass line. A quiet or
 * unclear recording is asked again; SPEAK_TRIES real tries; when 讯飞 cannot
 * be reached (or there is no microphone) the child skips without losing points.
 */
export function SpeakView({ game, onDone, done, env }: GameViewProps<SpeakGame>) {
  const { family } = useApp();
  const passScore = family.settings.readPassScore ?? PASS_SCORE_DEFAULT;
  const [cfg, setCfg] = useState<ScoringConfig | null | undefined>(undefined);
  const [phase, setPhase] = useState<'idle' | 'record' | 'scoring'>('idle');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [marks, setMarks] = useState<Array<WordState | undefined>>([]);
  const [tries, setTries] = useState(0);
  const [best, setBest] = useState(0);
  /** Why this reading cannot be scored (not the child's fault): offer a skip. */
  const [trouble, setTrouble] = useState('');
  const mic = useRef<MediaStream | null>(null);
  const stopRec = useRef<(() => void) | null>(null);
  const mine = useRef<Blob | null>(null);
  const [hasMine, setHasMine] = useState(false);
  const player = useRef<HTMLAudioElement | null>(null);
  const alive = useRef(true);

  const printed = game.text.split(' ');
  const clip = env.audio && !!wordAudioUrl('en', game.text);

  useEffect(() => {
    alive.current = true;
    void loadScoringConfig().then((c) => alive.current && setCfg(c));
    return () => {
      alive.current = false;
      stopRec.current?.();
      mic.current?.getTracks().forEach((t) => t.stop());
      mic.current = null;
      player.current?.pause();
    };
  }, []);

  useEffect(() => {
    setVerdict(null);
    setMarks([]);
    setTries(0);
    setBest(0);
    setTrouble('');
    mine.current = null;
    setHasMine(false);
  }, [game]);

  const read = async () => {
    if (done || phase !== 'idle') return;
    stopWord();
    hush();
    setVerdict(null);
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setTrouble('这台设备不能录音');
      return;
    }
    if (!mic.current) {
      try {
        mic.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      } catch {
        setTrouble('没有麦克风权限（可以在系统设置里给 App 打开麦克风）');
        return;
      }
    }
    const mime = pickMime();
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(mic.current, mime ? { mimeType: mime } : undefined);
    } catch {
      setTrouble('这台设备不能录音');
      return;
    }
    const chunks: Blob[] = [];
    const blob = await new Promise<Blob>((resolve) => {
      const stop = () => rec.state !== 'inactive' && rec.stop();
      const t = setTimeout(stop, limitMs(game.text));
      stopRec.current = stop;
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      rec.onstop = () => {
        clearTimeout(t);
        stopRec.current = null;
        resolve(new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' }));
      };
      setPhase('record');
      rec.start();
    });
    if (!alive.current) return;
    mine.current = blob;
    setHasMine(true);
    if (!cfg) {
      setPhase('idle');
      setTrouble('还没有设置讯飞评分');
      return;
    }
    setPhase('scoring');
    const out = await scoreRecording(blob, game.text, cfg);
    if (!alive.current) return;
    setPhase('idle');
    if (out.kind === 'error') {
      setTrouble(out.message);
      return;
    }
    if (out.kind === 'quiet' || out.score.unclear) {
      // Not a try: only the recording was the problem.
      setVerdict({ tone: 'info', text: out.kind === 'quiet' ? '几乎没录到声音，靠近一点、大声一点再读一遍。' : CHEER.unclear });
      return;
    }
    const states = alignWords(printed, out.score.words);
    const ok = passed(out.score, passScore) && (printed.length > 1 || (states[0] !== 'wrong' && states[0] !== 'miss'));
    const top = Math.max(best, out.score.overall);
    setBest(top);
    setMarks(states);
    if (ok) {
      onDone({ correct: true, missedWords: [], given: `读得好，${out.score.overall} 分` });
      return;
    }
    const n = tries + 1;
    setTries(n);
    if (n >= SPEAK_TRIES) {
      onDone({ correct: false, missedWords: [], given: `读了 ${n} 次，最高 ${top} 分（${passScore} 分过关）` });
      return;
    }
    sfx.wrong();
    setVerdict({ tone: 'retry', text: CHEER[cheerBand(out.score, passScore)], score: out.score.overall });
  };

  const playMine = () => {
    if (!mine.current) return;
    const url = URL.createObjectURL(mine.current);
    player.current ??= new Audio();
    player.current.onended = () => URL.revokeObjectURL(url);
    player.current.src = url;
    void player.current.play().catch(() => URL.revokeObjectURL(url));
  };

  const skip = () =>
    onDone({ correct: true, skipped: true, missedWords: [], given: `${trouble}，这题不扣分` });

  const big = printed.length === 1 ? 'text-5xl' : printed.length <= 4 ? 'text-4xl' : 'text-3xl';
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="text-center text-2xl font-bold">{game.title}</div>
      <div className="flex w-full flex-col items-center gap-2 rounded-2xl bg-violet-50 p-5 text-center">
        <div className={`${big} font-bold leading-snug tracking-wide text-violet-800`}>
          {printed.map((w, i) => (
            <span
              key={i}
              className={marks[i] === 'wrong' || marks[i] === 'miss' ? 'text-rose-600 underline decoration-4' : marks[i] === 'ok' ? 'text-emerald-700' : ''}
            >
              {w}
              {i < printed.length - 1 ? ' ' : ''}
            </span>
          ))}
        </div>
        {game.zh && <div className="text-xl text-slate-600">{game.zh}</div>}
      </div>
      {clip && <Speaker lang="en" text={game.text} autoPlay={false} slow={false} />}

      {!done && !trouble && (
        <div className="flex flex-col items-center gap-2">
          {phase === 'record' ? (
            <button
              type="button"
              onClick={() => stopRec.current?.()}
              className="flex h-28 w-28 animate-pulse items-center justify-center rounded-full border-b-8 border-rose-800 bg-rose-500 text-xl font-bold text-white"
            >
              读完了
            </button>
          ) : (
            <button
              type="button"
              disabled={phase !== 'idle' || cfg === undefined}
              onClick={() => void read()}
              className="flex h-28 w-28 items-center justify-center rounded-full border-b-8 border-rose-700 bg-rose-500 text-5xl text-white shadow transition active:translate-y-1 active:border-b-4 disabled:opacity-50"
              aria-label="开始读"
            >
              🎤
            </button>
          )}
          <div className="text-lg text-slate-600">
            {phase === 'record' ? '🎤 大声读出来……读完点一下' : phase === 'scoring' ? '⏳ 评分中…' : verdict ? '点 🎤 再读一次' : '点 🎤 开始读'}
          </div>
          {tries > 0 && phase === 'idle' && <div className="text-sm text-slate-400">还可以读 {SPEAK_TRIES - tries} 次</div>}
        </div>
      )}

      {verdict && !done && (
        <div className={`rounded-2xl px-5 py-3 text-center text-lg ${verdict.tone === 'retry' ? 'bg-amber-50 text-amber-900' : 'bg-slate-100 text-slate-700'}`}>
          {verdict.score !== undefined && <b className="mr-2 text-2xl">{verdict.score} 分</b>}
          {verdict.text}
        </div>
      )}
      {hasMine && phase === 'idle' && (
        <button type="button" onClick={playMine} className="rounded-2xl border-2 border-b-4 border-slate-200 bg-white px-5 py-2 text-lg font-bold text-slate-600">
          👂 听我读的
        </button>
      )}

      {trouble && !done && (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-amber-50 p-4 text-center text-lg text-amber-900">
          <div>{trouble}，这题先不评分，不扣分。</div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setTrouble('');
                setVerdict(null);
              }}
              className="rounded-2xl border-2 border-b-4 border-amber-300 bg-white px-6 py-3 text-lg font-bold text-amber-800"
            >
              再试一次
            </button>
            <button
              type="button"
              onClick={skip}
              className="rounded-2xl border-b-4 border-amber-600 bg-amber-400 px-8 py-3 text-xl font-bold text-white active:translate-y-0.5"
            >
              跳过（不扣分）
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
