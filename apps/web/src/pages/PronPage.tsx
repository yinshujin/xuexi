import { useEffect, useRef, useState } from 'react';
import { wordKey } from '@xuexi/course-pack';
import type { ChildProfile } from '@xuexi/shared';
import { openBook, type OpenedBook } from '../lib/books';
import { CLEAR_AFTER_DAYS, loadPron, practiceOrder, savePractice, type PronMiss } from '../lib/pron';
import {
  alignWords,
  CHEER,
  cheerBand,
  loadScoringConfig,
  PASS_SCORE_DEFAULT,
  passed,
  sayCheer,
  scoreRecording,
  type ScoringConfig,
} from '../lib/scoring';
import { hush } from '../lib/scoring/grade';
import { useApp } from '../lib/store';
import { navigate } from '../lib/router';
import { Btn, Card, Empty, Page } from '../components/ui';

const ROUND = 10;
const WORD_LIMIT_MS = 4000;

type Verdict = { good: boolean; text: string; score?: number } | { good: null; text: string };

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported?.(t));
}

/**
 * 🎤 读不准的单词: the words 跟读评分 marked in the picture books, one at a
 * time: hear it, read it, get it scored. Reading a word well on two different
 * days clears it from the 错题本.
 */
export function PronPage({ child, back }: { child: ChildProfile; back: string }) {
  const { family } = useApp();
  const passScore = family.settings.readPassScore ?? PASS_SCORE_DEFAULT;
  const [words, setWords] = useState<PronMiss[] | null>(null);
  const [at, setAt] = useState(0);
  const [scoring, setScoring] = useState<ScoringConfig | null | undefined>(undefined);
  const [phase, setPhase] = useState<'idle' | 'record' | 'scoring'>('idle');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [good, setGood] = useState(0);
  const [micError, setMicError] = useState('');
  const books = useRef(new Map<string, Promise<OpenedBook | null>>());
  const audio = useRef<HTMLAudioElement | null>(null);
  const mic = useRef<MediaStream | null>(null);
  const stopRec = useRef<(() => void) | null>(null);
  const mine = useRef<Blob | null>(null);

  useEffect(() => {
    loadPron(child.id).then((l) => setWords(practiceOrder(l).slice(0, ROUND)));
    void loadScoringConfig().then(setScoring);
    audio.current = new Audio();
    const opened = books.current;
    return () => {
      audio.current?.pause();
      stopRec.current?.();
      mic.current?.getTracks().forEach((t) => t.stop());
      for (const b of opened.values()) void b.then((o) => o?.release());
    };
  }, [child.id]);

  const w = words?.[at];

  const bookOf = (id: string) => {
    let b = books.current.get(id);
    if (!b) {
      b = openBook(id).catch(() => null);
      books.current.set(id, b);
    }
    return b;
  };

  const playSrc = (src: string) =>
    new Promise<void>((resolve) => {
      const a = audio.current;
      if (!a) return resolve();
      a.onended = a.onerror = () => resolve();
      a.src = src;
      a.play().catch(() => resolve());
    });

  const listen = async () => {
    if (!w) return;
    hush();
    const b = await bookOf(w.bookId);
    const src = b?.url(b.book.wordAudio?.[w.key]);
    if (src) await playSrc(src);
  };

  // Hear the word as soon as it comes up.
  useEffect(() => {
    if (w && phase === 'idle' && !verdict) void listen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w?.key]);

  const read = async () => {
    if (!w) return;
    audio.current?.pause();
    hush();
    setVerdict(null);
    if (!mic.current) {
      try {
        mic.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      } catch {
        setMicError('没有麦克风权限（可以在系统设置里给 App 打开麦克风）');
        return;
      }
    }
    const mime = pickMime();
    const rec = new MediaRecorder(mic.current, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    const blob = await new Promise<Blob>((resolve) => {
      const stop = () => rec.state !== 'inactive' && rec.stop();
      const t = setTimeout(stop, WORD_LIMIT_MS);
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
    mine.current = blob;
    if (!scoring) {
      setPhase('idle');
      setVerdict({ good: null, text: '录好了，听听自己读的。（家长在设置里开启跟读评分后会打分）' });
      return;
    }
    setPhase('scoring');
    const out = await scoreRecording(blob, w.word, scoring);
    setPhase('idle');
    if (out.kind === 'error') return setVerdict({ good: null, text: `${out.message}，这次不算` });
    if (out.kind === 'quiet' || out.score.unclear) {
      const text = out.kind === 'quiet' ? '几乎没录到声音，大声一点再读一遍。' : CHEER.unclear;
      sayCheer(text);
      return setVerdict({ good: null, text });
    }
    const state = alignWords([w.word], out.score.words)[0];
    const ok = passed(out.score, passScore) && state !== 'wrong' && state !== 'miss';
    const text = CHEER[cheerBand(out.score, passScore)];
    sayCheer(text);
    setVerdict({ good: ok, text, score: out.score.overall });
    if (ok) setGood((n) => n + 1);
    await savePractice(child.id, wordKey(w.word), ok);
  };

  const playMine = async () => {
    if (!mine.current) return;
    const url = URL.createObjectURL(mine.current);
    await playSrc(url);
    URL.revokeObjectURL(url);
  };

  const next = () => {
    mine.current = null;
    setVerdict(null);
    setAt((i) => i + 1);
  };

  if (!words) return <Page title="🎤 读不准的单词" back={back}>{null}</Page>;
  if (words.length === 0) {
    return (
      <Page title="🎤 读不准的单词" back={back}>
        <Empty>没有读不准的单词，太棒了！🎉</Empty>
      </Page>
    );
  }
  if (!w) {
    return (
      <Page title="🎤 读不准的单词" back={back}>
        <Card className="mx-auto flex max-w-md flex-col items-center gap-4 py-10 text-center">
          <div className="text-6xl">🎉</div>
          <div className="text-2xl font-bold">
            练完了 {words.length} 个词{scoring ? `，读准了 ${good} 个` : ''}！
          </div>
          <div className="text-lg text-slate-600">一个词在 {CLEAR_AFTER_DAYS} 天里都读准，就从错题本里消失。</div>
          <Btn onClick={() => navigate(back)}>返回</Btn>
        </Card>
      </Page>
    );
  }

  const parts = w.sentence.split(new RegExp(`(\\b${w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b)`, 'i'));
  return (
    <Page
      title="🎤 读不准的单词"
      back={back}
      right={<span className="rounded-full bg-white px-4 py-2 text-lg shadow-sm ring-1 ring-slate-200">{at + 1} / {words.length}</span>}
    >
      <Card className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 py-8 text-center">
        <div className="text-6xl font-bold tracking-wide text-violet-700">{w.word}</div>
        <div className="text-xl text-slate-600">
          {parts.map((p, i) => (i % 2 === 1 ? <b key={i} className="text-violet-700 underline">{p}</b> : <span key={i}>{p}</span>))}
        </div>
        <div className="text-sm text-slate-400">
          《{w.bookTitle}》{w.misses > 1 ? ` · 读错过 ${w.misses} 次` : ''}
          {w.passDays.length > 0 ? ` · 已经读准 ${w.passDays.length} 天` : ''}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Btn tone="plain" disabled={phase !== 'idle'} onClick={() => void listen()}>
            🔊 听一听
          </Btn>
          {phase === 'record' ? (
            <Btn tone="danger" onClick={() => stopRec.current?.()}>
              读完了
            </Btn>
          ) : (
            <Btn tone="danger" disabled={phase !== 'idle'} onClick={() => void read()}>
              🎤 {verdict ? '再读一次' : '我来读'}
            </Btn>
          )}
          {mine.current && phase === 'idle' && (
            <Btn tone="plain" onClick={() => void playMine()}>
              👂 听我读的
            </Btn>
          )}
        </div>
        {phase === 'record' && <div className="animate-pulse text-lg text-rose-600">🎤 大声读出来……</div>}
        {phase === 'scoring' && <div className="animate-pulse text-lg text-sky-700">⏳ 评分中…</div>}
        {micError && <div className="text-slate-500">{micError}</div>}
        {verdict && (
          <div
            className={`rounded-2xl px-5 py-3 text-lg ${
              verdict.good === true ? 'bg-emerald-50 text-emerald-800' : verdict.good === false ? 'bg-amber-50 text-amber-900' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {'score' in verdict && verdict.score !== undefined && <b className="mr-2 text-2xl">{verdict.score} 分</b>}
            {verdict.text}
          </div>
        )}
        {(verdict || !scoring) && (
          <Btn tone="green" disabled={phase !== 'idle'} onClick={next}>
            {at + 1 < words.length ? '下一个 →' : '完成'}
          </Btn>
        )}
      </Card>
    </Page>
  );
}
