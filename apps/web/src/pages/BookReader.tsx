import { useCallback, useEffect, useRef, useState } from 'react';
import { wordKey, type BookWord } from '@xuexi/course-pack';
import { BOOK_EVENT_PREFIX, type BookReadMode } from '@xuexi/shared';
import { openBook, recordingId, recordingsOf, saveRecording, type OpenedBook } from '../lib/books';
import { bookReading, pageLimitMs, splitBySentence, wordAt, wordTimings, type PageScore } from '../lib/reading';
import { bareWord, saveReading, type ReadWord } from '../lib/pron';
import {
  alignWords,
  bookStars,
  CHEER,
  cheerBand,
  loadScoringConfig,
  PASS_SCORE_DEFAULT,
  passed,
  sayCheer,
  scoreRecording,
  type ReadingScore,
  type ScoringConfig,
  type WordState,
} from '../lib/scoring';
import { hush } from '../lib/scoring/grade';
import { useApp } from '../lib/store';
import { navigate } from '../lib/router';
import { uuid } from '../lib/format';
import { Btn, Stars } from '../components/ui';

type Screen = 'start' | 'read' | 'quiz' | 'done';
/**
 * What the reader is doing right now. 跟读 goes page by page: the page is read
 * to the child ('model'), then it waits ('idle') until the child taps 🎤 and
 * reads the whole page ('record'), which is scored ('scoring').
 */
type Phase = 'idle' | 'model' | 'record' | 'scoring' | 'playback';

/** 跟读评分 result of one sentence, for colouring its words. */
interface Graded {
  score: ReadingScore;
  states: Array<WordState | undefined>;
}

/** 跟读评分 of one page: the best try, and its words for the 错题本. */
interface PageResult extends PageScore {
  words: ReadWord[];
}

const MODES: Array<{ id: BookReadMode; icon: string; label: string; hint: string }> = [
  { id: 'listen', icon: '🎧', label: '听读', hint: '听着读，一页一页自动翻' },
  { id: 'repeat', icon: '🎤', label: '跟读', hint: '先听一页，再点 🎤 自己读，读完打分' },
  { id: 'self', icon: '📖', label: '自己读', hint: '自己读，不会的词点一下' },
];

/** Printed words of a sentence, as the reader shows them. */
const tokens = (text: string) => text.split(/\s+/).filter(Boolean);

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported?.(t));
}

export function BookReader({ childId, bookId, back }: { childId: string; bookId: string; back: string }) {
  const { addEvent, deviceId, family } = useApp();
  const passScore = family.settings.readPassScore ?? PASS_SCORE_DEFAULT;
  const [opened, setOpened] = useState<OpenedBook | null>(null);
  const [error, setError] = useState('');
  const [screen, setScreen] = useState<Screen>('start');
  const [mode, setMode] = useState<BookReadMode>('listen');
  const [page, setPage] = useState(0);
  const [sentence, setSentence] = useState(-1);
  const [word, setWord] = useState(-1);
  const [phase, setPhase] = useState<Phase>('idle');
  const [playing, setPlaying] = useState(false);
  const [recUntil, setRecUntil] = useState<{ start: number; end: number } | null>(null);
  const [micError, setMicError] = useState('');
  const [quizAt, setQuizAt] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [layout, setLayout] = useState<'stack' | 'side'>('stack');
  /** Quiz narration: -1 = the question is being read, i = option i, null = quiet. */
  const [readingOpt, setReadingOpt] = useState<number | null>(null);
  /** 跟读评分: set when the parent entered 讯飞 credentials on this device. */
  const [scoring, setScoring] = useState<ScoringConfig | null>(null);
  const [graded, setGraded] = useState<Record<string, Graded>>({});
  const [feedback, setFeedback] = useState<{ text: string; tone: 'good' | 'try' | 'info'; score?: ReadingScore } | null>(null);
  /** 跟读评分 per page (best try); a ref too, for the async steps. */
  const [pageScores, setPageScores] = useState<Record<number, PageResult>>({});
  const results = useRef(new Map<number, PageResult>());
  /** The child's latest reading of each page (跟读), to listen back. */
  const blobs = useRef(new Map<number, Blob>());
  const [tries, setTries] = useState<Record<number, number>>({});

  const audio = useRef<HTMLAudioElement | null>(null);
  const run = useRef(0);
  const cancels = useRef(new Set<() => void>());
  const finishRec = useRef<(() => void) | null>(null);
  const mic = useRef<MediaStream | null>(null);
  const micAsk = useRef<Promise<MediaStream | null> | null>(null);
  const durations = useRef(new Map<string, number>());
  const maxPage = useRef(0);
  const pageRef = useRef(0);
  const started = useRef(Date.now());
  const recorded = useRef(false);
  const stage = useRef<HTMLDivElement | null>(null);
  const imgAspect = useRef(1.4);
  // Read by the async reading loop, which outlives the render that started it.
  const modeRef = useRef(mode);

  useEffect(() => {
    let cancelled = false;
    let release = () => {};
    openBook(bookId).then(
      (o) => {
        if (cancelled) return o.release();
        release = o.release;
        setOpened(o);
      },
      (e: Error) => !cancelled && setError(e.message),
    );
    audio.current = new Audio();
    void loadScoringConfig().then(setScoring);
    return () => {
      cancelled = true;
      stopAll();
      audio.current?.pause();
      mic.current?.getTracks().forEach((t) => t.stop());
      release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  const book = opened?.book;
  const pages = book?.pages ?? [];

  // ---- layout: picture beside the text when the page is tall and the screen wide ----
  const measure = useCallback(() => {
    const el = stage.current;
    if (!el) return;
    const screenAspect = el.clientWidth / Math.max(1, el.clientHeight);
    setLayout(screenAspect > 1.15 && imgAspect.current < screenAspect * 0.85 ? 'side' : 'stack');
  }, []);
  const stageRef = useCallback(
    (el: HTMLDivElement | null) => {
      stage.current = el;
      if (!el) return;
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    },
    [measure],
  );

  // ---- cancellable steps ----
  function stopAll() {
    run.current++;
    for (const c of [...cancels.current]) c();
    cancels.current.clear();
    finishRec.current = null;
    setPlaying(false);
    setPhase('idle');
    setRecUntil(null);
  }

  const sleep = (r: number, ms: number) =>
    new Promise<boolean>((resolve) => {
      const cancel = () => {
        clearTimeout(t);
        cancels.current.delete(cancel);
        resolve(false);
      };
      const t = setTimeout(() => {
        cancels.current.delete(cancel);
        resolve(r === run.current);
      }, ms);
      cancels.current.add(cancel);
    });

  /**
   * Play `src` (optionally only [from, to] ms). `words` lights up the word being
   * spoken; `fixedWord` keeps one word lit (tap-a-word).
   */
  const play = (
    r: number,
    src: string,
    o: { from?: number; to?: number; words?: (durationMs: number) => BookWord[]; key?: string } = {},
  ) =>
    new Promise<boolean>((resolve) => {
      const a = audio.current;
      if (!a || r !== run.current) return resolve(false);
      let raf = 0;
      let words: BookWord[] = [];
      const done = (ok: boolean) => {
        cancelAnimationFrame(raf);
        a.onended = a.onerror = a.onloadedmetadata = null;
        cancels.current.delete(cancel);
        resolve(ok && r === run.current);
      };
      const cancel = () => {
        a.pause();
        done(false);
      };
      const tick = () => {
        const ms = a.currentTime * 1000;
        if (o.to !== undefined && ms >= o.to) {
          a.pause();
          return done(true);
        }
        if (o.words) setWord(wordAt(words, ms));
        raf = requestAnimationFrame(tick);
      };
      cancels.current.add(cancel);
      a.onloadedmetadata = () => {
        const dur = Number.isFinite(a.duration) ? a.duration * 1000 : 0;
        if (o.key && dur) durations.current.set(o.key, dur);
        if (o.words) words = o.words(dur);
        if (o.from) a.currentTime = o.from / 1000;
        a.play().then(tick, () => done(false));
      };
      a.onended = () => done(true);
      a.onerror = () => done(false);
      a.src = src;
      a.load();
    });

  const playSentence = (r: number, pi: number, si: number) => {
    const s = pages[pi].sentences[si];
    const src = opened?.url(s.audio);
    if (!src) return sleep(r, 600 + s.text.length * 60); // no narration: give time to read it
    return play(r, src, { words: (d) => wordTimings(s, d), key: `${pi}:${si}` });
  };

  /** Ask for the microphone once per book (the answer is reused, also a refusal). */
  const ensureMic = (): Promise<MediaStream | null> => {
    micAsk.current ??= (async () => {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setMicError('这台设备不能录音，跟着读出来就好');
        return null;
      }
      try {
        mic.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        setMicError('');
        return mic.current;
      } catch {
        setMicError('没有麦克风权限，跟着读出来就好（可以在系统设置里给 App 打开麦克风）');
        return null;
      }
    })();
    return micAsk.current;
  };

  const recordFor = (r: number, stream: MediaStream, limit: number) =>
    new Promise<Blob | null>((resolve) => {
      const mime = pickMime();
      let rec: MediaRecorder;
      try {
        rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      } catch {
        return resolve(null);
      }
      const chunks: Blob[] = [];
      let keep = true;
      const finish = () => rec.state !== 'inactive' && rec.stop();
      const cancel = () => {
        keep = false;
        finish();
      };
      const t = setTimeout(finish, limit);
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      rec.onstop = () => {
        clearTimeout(t);
        cancels.current.delete(cancel);
        finishRec.current = null;
        setRecUntil(null);
        resolve(keep && r === run.current && chunks.length ? new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' }) : null);
      };
      cancels.current.add(cancel);
      finishRec.current = finish;
      const now = Date.now();
      setRecUntil({ start: now, end: now + limit });
      rec.start();
    });

  /** The page's own text (not the 看图说一说 captions): what 跟读 asks the child to read. */
  const readable = (pi: number) => (pages[pi]?.sentences ?? []).map((x, si) => ({ ...x, si })).filter((x) => x.kind !== 'caption');

  /**
   * 跟读: the child reads the whole page (recorded) after tapping 🎤. With
   * 跟读评分 on, the reading is scored and its words coloured; the child may
   * read again, and the page keeps its best try.
   */
  const recordPage = async () => {
    const pi = pageRef.current;
    const list = readable(pi);
    if (list.length === 0) return;
    stopAll();
    const r = run.current;
    const stream = await ensureMic();
    if (r !== run.current || !stream) return;
    hush(); // the cheer voice must not end up in the recording
    setFeedback(null);
    setWord(-1);
    setSentence(-1);
    setPhase('record');
    const clips = list.map((x) => durations.current.get(`${pi}:${x.si}`) ?? 1200 + x.text.length * 70);
    const blob = await recordFor(r, stream, pageLimitMs(clips));
    if (r !== run.current) return;
    if (!blob) return setPhase('idle');
    blobs.current.set(pi, blob);
    setTries((t) => ({ ...t, [pi]: (t[pi] ?? 0) + 1 }));
    const text = list.map((x) => x.text).join(' ');
    let best = true;
    let scored: { overall: number; passed: boolean } | undefined;
    if (scoring) {
      setPhase('scoring');
      const out = await scoreRecording(blob, text, scoring);
      if (r !== run.current) return;
      if (out.kind === 'error') {
        // Not the child's fault: no score for this try.
        setFeedback({ text: `${out.message}，可以再读一次或者翻页`, tone: 'info' });
        best = !results.current.has(pi);
      } else if (out.kind === 'quiet' || out.score.unclear) {
        const say = out.kind === 'quiet' ? '几乎没录到声音，大声一点再读一遍。' : CHEER.unclear;
        setFeedback({ text: say, tone: 'try' });
        sayCheer(say);
        best = !results.current.has(pi);
      } else {
        const heard = out.score;
        const ok = passed(heard, passScore);
        const printed = list.map((x) => tokens(x.text));
        const states = alignWords(printed.flat(), heard.words);
        const bySentence = splitBySentence(
          printed.map((t) => t.length),
          states,
        );
        const prev = results.current.get(pi);
        best = !prev || heard.overall >= prev.best;
        // Colour the words of this try (the page score keeps the best one).
        setGraded((g) => {
          const next = { ...g };
          list.forEach((x, k) => (next[`${pi}:${x.si}`] = { score: heard, states: bySentence[k] }));
          return next;
        });
        if (best) {
          const res: PageResult = {
            best: heard.overall,
            passed: ok,
            words: list.flatMap((x, k) => printed[k].map((token, wi) => ({ token, state: bySentence[k][wi], sentence: x.text }))),
          };
          results.current.set(pi, res);
          setPageScores((m) => ({ ...m, [pi]: res }));
        }
        const say = CHEER[cheerBand(heard, passScore)];
        setFeedback({ text: say, tone: ok ? 'good' : 'try', score: heard });
        sayCheer(say);
        scored = { overall: heard.overall, passed: ok };
      }
    }
    if (best) {
      await saveRecording({
        id: recordingId(childId, bookId, pi, 0),
        childId,
        bookId,
        page: pi,
        sentence: 0,
        text,
        at: Date.now(),
        blob,
        ...(scored ? { score: scored.overall, passed: scored.passed } : {}),
      });
    }
    if (r === run.current) setPhase('idle');
  };

  /** 跟读: hear the child's latest reading of this page. */
  const playMine = async () => {
    const blob = blobs.current.get(pageRef.current);
    if (!blob) return;
    stopAll();
    const r = run.current;
    hush();
    setPhase('playback');
    const url = URL.createObjectURL(blob);
    await play(r, url);
    URL.revokeObjectURL(url);
    if (r === run.current) setPhase('idle');
  };

  const goPage = (pi: number) => {
    setPage(pi);
    pageRef.current = pi;
    setSentence(-1);
    setWord(-1);
    setFeedback(null);
    maxPage.current = Math.max(maxPage.current, pi);
  };

  /**
   * 听读: read on from (page, sentence), turning the pages. 跟读: read this
   * page to the child, then wait for them to tap 🎤 (no page turning).
   */
  const runFrom = async (p: number, s: number) => {
    stopAll();
    const r = run.current;
    setPlaying(true);
    const repeat = modeRef.current === 'repeat';
    for (let pi = p; pi < pages.length; pi++) {
      if (pi !== pageRef.current) goPage(pi);
      const list = pages[pi].sentences;
      if (list.length === 0 && !repeat && !(await sleep(r, 2500))) return; // a picture-only page
      for (let si = pi === p ? s : 0; si < list.length; si++) {
        setSentence(si);
        setPhase('model');
        if (!(await playSentence(r, pi, si))) return;
        if (!(await sleep(r, 350))) return;
      }
      setSentence(-1);
      setWord(-1);
      setPhase('idle');
      if (repeat) return setPlaying(false);
      if (!(await sleep(r, pi + 1 < pages.length ? 900 : 400))) return;
    }
    setPlaying(false);
    finishReading();
  };

  /** Tap a word: hear just that word. */
  const tapWord = async (pi: number, si: number, wi: number) => {
    stopAll();
    const r = run.current;
    const s = pages[pi].sentences[si];
    const src = opened?.url(s.audio);
    setSentence(si);
    setWord(wi);
    const own = opened?.url(book?.wordAudio?.[wordKey(s.text.split(/\s+/).filter(Boolean)[wi] ?? '')]);
    if (own) {
      await play(r, own);
      if (r === run.current) setWord(wi);
      return;
    }
    if (!src) return;
    const known = durations.current.get(`${pi}:${si}`);
    const w = s.words?.[wi] ?? (known ? wordTimings(s, known)[wi] : undefined);
    if (w) {
      await play(r, src, { from: Math.max(0, w.start - 40), to: w.end + 80 });
    } else {
      // Duration unknown yet: play the sentence, lighting the words as it goes.
      await play(r, src, { words: (d) => wordTimings(s, d), key: `${pi}:${si}` });
    }
    if (r === run.current) setWord(wi);
  };

  /** Hear one word from the book's word audio (the 读不准的单词 on the last screen). */
  const sayWord = async (w: string) => {
    const src = opened?.url(book?.wordAudio?.[wordKey(w)]);
    if (!src) return;
    stopAll();
    await play(run.current, src);
  };

  const tapSentence = async (pi: number, si: number) => {
    stopAll();
    const r = run.current;
    setSentence(si);
    await playSentence(r, pi, si);
    if (r === run.current) setWord(-1);
  };

  // ---- finishing ----
  const record = async (completed: boolean, quiz?: { correct: number; total: number }) => {
    if (recorded.current || !book) return;
    recorded.current = true;
    await addEvent({
      type: 'lesson',
      id: uuid(),
      childId,
      at: Date.now(),
      deviceId,
      lessonId: BOOK_EVENT_PREFIX + book.id,
      packVersion: 1,
      progress: completed ? 1 : Math.min(1, (maxPage.current + 1) / pages.length),
      completed,
      durationMs: Date.now() - started.current,
      readMode: modeRef.current,
      ...(quiz ? { quizCorrect: quiz.correct, quizTotal: quiz.total } : {}),
      ...readingSummary(),
    });
    // 读不准的单词 go into the 错题本; words read well count towards clearing old ones.
    const words = [...results.current.values()].flatMap((x) => x.words);
    if (words.length) await saveReading(childId, { id: book.id, title: book.title }, words);
  };

  /** 跟读评分 over the book: pages passed, pages with text, total score (average of the pages read). */
  function readingSummary(): { readPassed?: number; readTotal?: number; readScore?: number } {
    const textPages = pages.filter((_, pi) => readable(pi).length > 0).length;
    return bookReading(pages.map((_, pi) => results.current.get(pi)), textPages) ?? {};
  }

  /** Words read wrong or missed in the pages' best tries (for the 错题本). */
  function missedWords(): string[] {
    const seen = new Map<string, string>();
    for (const res of results.current.values()) {
      for (const w of res.words) {
        const bare = bareWord(w.token);
        if (w.state && w.state !== 'ok' && bare.length >= 2) seen.set(wordKey(bare), bare);
      }
    }
    return [...seen.values()];
  }

  // Leaving by the system back button still records how far the child read.
  const recordRef = useRef(record);
  recordRef.current = record;
  const reading = useRef(false);
  reading.current = screen === 'read' || screen === 'quiz';
  useEffect(() => () => void (reading.current && recordRef.current(false)), []);

  const finishReading = () => {
    stopAll();
    if (book?.quiz?.length) {
      setQuizAt(0);
      setPicked(null);
      setCorrect(0);
      setScreen('quiz');
    } else {
      setScreen('done');
      void record(true);
    }
  };

  /** 听题：read the question, then each option, lighting up what is being read. */
  const listenQuiz = async (qi: number, only?: number) => {
    const q = book?.quiz?.[qi];
    if (!q) return;
    stopAll();
    const r = run.current;
    const say = async (idx: number, rel: string | undefined) => {
      const src = opened?.url(rel);
      if (!src) return true;
      setReadingOpt(idx);
      return play(r, src);
    };
    if (only !== undefined) {
      await say(only, only < 0 ? q.audio : q.optionAudio?.[only]);
    } else if (await say(-1, q.audio)) {
      for (let i = 0; i < q.options.length; i++) {
        if (!(await sleep(r, 350)) || !(await say(i, q.optionAudio?.[i]))) break;
      }
    }
    if (r === run.current) setReadingOpt(null);
  };
  useEffect(() => {
    if (screen === 'quiz') void listenQuiz(quizAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, quizAt]);

  const exit = async () => {
    stopAll();
    if (screen === 'read' || screen === 'quiz') await record(false);
    navigate(back);
  };

  if (error) {
    return (
      <div className="p-8 text-lg">
        {error} <Btn tone="plain" onClick={() => navigate(back)}>返回</Btn>
      </div>
    );
  }
  if (!opened || !book) return <div className="flex h-full items-center justify-center text-slate-400">正在打开绘本…</div>;

  const header = (
    <header className="flex items-center gap-3 px-3 pb-2 pt-[max(env(safe-area-inset-top),10px)]">
      <button type="button" onClick={exit} className="rounded-full bg-white px-4 py-2 text-lg shadow-sm ring-1 ring-slate-200">
        ←
      </button>
      <h1 className="min-w-0 flex-1 truncate text-xl font-bold">{book.title}</h1>
      {screen === 'read' && (
        <span className="rounded-full bg-white px-3 py-1 text-slate-600 ring-1 ring-slate-200">
          {MODES.find((m) => m.id === mode)?.icon} {page + 1}/{pages.length}
          {mode === 'repeat' && pageScores[page] && <b className="ml-2 text-violet-700">{pageScores[page].best}分</b>}
        </span>
      )}
    </header>
  );

  // ---- start: cover, credits, pick a mode ----
  if (screen === 'start') {
    const cover = opened.url(book.cover ?? pages[0].image);
    return (
      <div className="flex h-full flex-col bg-amber-50">
        {header}
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-4 overflow-auto px-4 pb-6 sm:flex-row sm:items-start">
          <div className="flex w-full flex-col items-center gap-2 sm:w-1/2">
            {cover && <img src={cover} alt="" className="max-h-[45vh] w-full rounded-2xl object-contain shadow" />}
            <p className="text-center text-sm text-slate-500">
              {book.source.attribution ?? book.source.name} · {book.source.license}
              {book.private && <span className="ml-1 text-rose-500">· 仅限家庭自用</span>}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-1/2">
            <div className="text-lg text-slate-600">
              <span className="mr-2 rounded-lg bg-violet-500 px-2 py-0.5 text-white">{book.level}</span>
              {pages.length} 页{book.quiz?.length ? ` · 读完有 ${book.quiz.length} 道小题` : ''}
            </div>
            <div className="text-slate-500">💡 读的时候，点任何一个单词都能听它的发音。</div>
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMode(m.id);
                  modeRef.current = m.id;
                  recorded.current = false;
                  results.current.clear();
                  blobs.current.clear();
                  setPageScores({});
                  setTries({});
                  setGraded({});
                  setFeedback(null);
                  started.current = Date.now();
                  setScreen('read');
                  goPage(0);
                  if (m.id !== 'self') void runFrom(0, 0);
                  if (m.id === 'repeat') void ensureMic();
                }}
                className="flex items-center gap-4 rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 transition active:scale-95"
              >
                <span className="text-4xl">{m.icon}</span>
                <span className="flex-1">
                  <span className="block text-xl font-bold">{m.label}</span>
                  <span className="text-slate-500">{m.hint}</span>
                </span>
                <span className="text-2xl text-sky-500">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- quiz ----
  if (screen === 'quiz' && book.quiz) {
    const q = book.quiz[quizAt];
    const answered = picked !== null;
    return (
      <div className="flex h-full flex-col bg-amber-50">
        {header}
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 overflow-auto px-4 pb-6">
          <div className="text-slate-500">
            小测 {quizAt + 1}/{book.quiz.length}
          </div>
          <div className={`flex items-start gap-3 rounded-2xl p-2 ${readingOpt === -1 ? 'bg-sky-100' : ''}`}>
            <h2 className="flex-1 text-2xl font-bold leading-snug">{q.question}</h2>
            {q.audio && (
              <button type="button" aria-label="听题" className="shrink-0 rounded-full bg-white px-3 py-2 text-xl shadow-sm ring-1 ring-slate-200" onClick={() => void listenQuiz(quizAt)}>
                🔊 听题
              </button>
            )}
          </div>
          {q.options.map((opt, i) => {
            const tone = !answered
              ? readingOpt === i
                ? 'bg-sky-50 ring-sky-400'
                : 'bg-white ring-slate-200'
              : i === q.answer
                ? 'bg-emerald-100 ring-emerald-400'
                : i === picked
                  ? 'bg-rose-100 ring-rose-400'
                  : 'bg-white ring-slate-200 opacity-60';
            return (
              <div key={opt} className="flex items-stretch gap-2">
                <button
                  type="button"
                  disabled={answered}
                  onClick={() => {
                    stopAll();
                    setReadingOpt(null);
                    setPicked(i);
                    if (i === q.answer) setCorrect((n) => n + 1);
                  }}
                  className={`flex-1 rounded-2xl p-4 text-left text-xl ring-2 transition ${tone}`}
                >
                  <span className="mr-2 font-bold text-slate-400">{'ABCD'[i]}</span>
                  {opt}
                </button>
                {q.optionAudio?.[i] && (
                  <button
                    type="button"
                    aria-label={`听选项 ${'ABCD'[i]}`}
                    className="shrink-0 rounded-2xl bg-white px-3 text-xl ring-1 ring-slate-200"
                    onClick={() => void listenQuiz(quizAt, i)}
                  >
                    🔊
                  </button>
                )}
              </div>
            );
          })}
          {answered && (
            <div className={`rounded-2xl p-4 text-lg ${picked === q.answer ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
              {picked === q.answer ? '答对了！' : `正确答案是 ${'ABCD'[q.answer]}。`}
              {q.analysis && <div className="mt-1 text-slate-700">{q.analysis}</div>}
            </div>
          )}
          {answered && (
            <Btn
              onClick={() => {
                if (quizAt + 1 < book.quiz!.length) {
                  setQuizAt(quizAt + 1);
                  setPicked(null);
                } else {
                  setScreen('done');
                  void record(true, { correct, total: book.quiz!.length });
                }
              }}
            >
              {quizAt + 1 < book.quiz.length ? '下一题 →' : '完成'}
            </Btn>
          )}
        </div>
      </div>
    );
  }

  // ---- done ----
  if (screen === 'done') {
    const total = book.quiz?.length ?? 0;
    const read = readingSummary();
    const missed = read.readTotal !== undefined ? missedWords() : [];
    // With 跟读评分 the stars come from the sentences really passed; otherwise from the quiz.
    const stars =
      read.readTotal !== undefined
        ? bookStars(read.readPassed ?? 0, read.readTotal)
        : total === 0
          ? 3
          : correct === total
            ? 3
            : correct >= total / 2
              ? 2
              : 1;
    return (
      <div className="flex h-full flex-col bg-amber-50">
        {header}
        <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="text-6xl">🎉</div>
          <div className="text-3xl font-bold">读完了《{book.title}》！</div>
          <div className="text-5xl">
            <Stars n={stars} />
          </div>
          {read.readScore !== undefined && (
            <>
              <div className="text-2xl font-bold text-violet-700">跟读总分 {read.readScore} 分</div>
              <div className="text-lg text-slate-600">
                过关 {read.readPassed}/{read.readTotal} 页（及格线 {passScore} 分）
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {pages.map((_, pi) =>
                  readable(pi).length === 0 ? null : (
                    <span
                      key={pi}
                      className={`rounded-lg px-2 py-0.5 text-sm ${
                        pageScores[pi] === undefined
                          ? 'bg-slate-100 text-slate-400'
                          : pageScores[pi].passed
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      第{pi + 1}页 {pageScores[pi] === undefined ? '没读' : `${pageScores[pi].best}分`}
                    </span>
                  ),
                )}
              </div>
            </>
          )}
          {missed.length > 0 && (
            <div className="rounded-2xl bg-rose-50 p-3 text-rose-900">
              <div className="mb-2">这些词还没读准，已经放进错题本，点一下听听：</div>
              <div className="flex flex-wrap justify-center gap-2">
                {missed.map((w) => (
                  <button key={w} type="button" className="rounded-xl bg-white px-3 py-1 text-xl ring-1 ring-rose-200" onClick={() => void sayWord(w)}>
                    {w} 🔊
                  </button>
                ))}
              </div>
            </div>
          )}
          {total > 0 && (
            <div className="text-xl text-slate-600">
              小测答对 {correct}/{total} 题
            </div>
          )}
          {mode === 'repeat' && <MyReading childId={childId} bookId={bookId} />}
          <div className="flex flex-wrap justify-center gap-3">
            <Btn
              tone="plain"
              onClick={() => {
                recorded.current = false;
                maxPage.current = 0;
                pageRef.current = -1;
                goPage(0);
                setScreen('start');
              }}
            >
              再读一遍
            </Btn>
            <Btn onClick={() => navigate(back)}>回书架</Btn>
          </div>
        </div>
      </div>
    );
  }

  // ---- reading ----
  const p = pages[page];
  const img = opened.url(p.image);
  const last = page + 1 >= pages.length;
  const auto = mode !== 'self';
  return (
    <div className="flex h-full flex-col bg-amber-50">
      {header}
      <div ref={stageRef} className={`flex min-h-0 flex-1 gap-3 px-3 ${layout === 'side' ? 'flex-row' : 'flex-col'}`}>
        <div className={`flex min-h-0 items-center justify-center ${layout === 'side' ? 'flex-[3]' : 'flex-1'}`}>
          {img && (
            <img
              src={img}
              alt=""
              className="max-h-full max-w-full rounded-xl object-contain shadow"
              onLoad={(e) => {
                const el = e.currentTarget;
                imgAspect.current = el.naturalWidth / Math.max(1, el.naturalHeight);
                measure();
              }}
            />
          )}
        </div>
        <div
          className={`overflow-auto rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${
            layout === 'side' ? 'flex-[2] self-center' : 'max-h-[38%] shrink-0'
          }`}
        >
          {p.sentences.length === 0 ? (
            <p className="text-center text-lg text-slate-400">这一页只有图，看看图上发生了什么？</p>
          ) : (
            <p className="text-2xl leading-relaxed sm:text-3xl sm:leading-relaxed">
              {p.sentences.map((s, si) => {
                const active = si === sentence;
                const words = s.text.split(/\s+/).filter(Boolean);
                const caption = s.kind === 'caption';
                return (
                  <span
                    key={si}
                    className={`mr-2 rounded-lg ${active ? 'bg-sky-100' : ''} ${caption ? 'text-slate-600 italic' : ''}`}
                  >
                    {caption && si === 0 && (
                      <span className="mr-2 rounded-md bg-amber-100 px-1.5 align-middle text-base not-italic text-amber-800">🖼 看图说一说</span>
                    )}
                    {words.map((w, wi) => {
                      // 跟读评分: green = read well, red = missed or misread (tap it to hear it).
                      const verdict = graded[`${page}:${si}`]?.states[wi];
                      const tone =
                        active && wi === word
                          ? 'bg-amber-300'
                          : verdict === 'ok'
                            ? 'text-emerald-700'
                            : verdict
                              ? 'text-rose-600 underline decoration-2 underline-offset-4'
                              : active && phase === 'record'
                                ? 'text-rose-700'
                                : '';
                      return (
                        <button
                          key={wi}
                          type="button"
                          onClick={() => void tapWord(page, si, wi)}
                          className={`mr-[0.3em] inline rounded-md px-0.5 transition-colors ${tone}`}
                        >
                          {w}
                        </button>
                      );
                    })}
                    {!auto && (
                      <button type="button" aria-label="听这一句" className="mr-2 align-middle text-xl" onClick={() => void tapSentence(page, si)}>
                        🔊
                      </button>
                    )}
                  </span>
                );
              })}
            </p>
          )}
        </div>
      </div>

      {mode === 'repeat' && (
        <div className="mx-3 mt-2 flex min-h-14 flex-wrap items-center justify-center gap-3 text-lg">
          {phase === 'model' && <span className="text-sky-700">🎧 先听这一页……</span>}
          {phase === 'record' && (
            <>
              <span className="animate-pulse text-rose-600">🎤 读这一页吧！</span>
              {recUntil && <RecordBar start={recUntil.start} end={recUntil.end} />}
              <Btn tone="danger" className="py-2" onClick={() => finishRec.current?.()}>
                读完了
              </Btn>
            </>
          )}
          {phase === 'scoring' && <span className="animate-pulse text-sky-700">⏳ 评分中…</span>}
          {phase === 'playback' && <span className="text-emerald-700">👂 听听你读的</span>}
          {phase === 'idle' &&
            (readable(page).length === 0 ? (
              <span className="text-slate-500">🖼 这一页看图听一听，然后点 下一页</span>
            ) : micError ? (
              <span className="text-slate-500">🗣️ 跟着读一遍，读完点 下一页（{micError}）</span>
            ) : (
              <>
                {feedback && <ScoreCard feedback={feedback} />}
                <Btn tone="danger" onClick={() => void recordPage()}>
                  🎤 {tries[page] ? '再读一次' : '我来读这一页'}
                </Btn>
                {blobs.current.has(page) && (
                  <Btn tone="plain" onClick={() => void playMine()}>
                    👂 听我读的
                  </Btn>
                )}
                {pageScores[page] && tries[page] > 1 && (
                  <span className="text-sm text-slate-500">这一页最好 {pageScores[page].best} 分</span>
                )}
                {!scoring && !feedback && <span className="text-sm text-slate-400">（家长在设置里开启跟读评分后会打分）</span>}
              </>
            ))}
        </div>
      )}

      <footer className="flex items-center justify-center gap-4 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
        <Btn
          tone="plain"
          disabled={page === 0}
          onClick={() => {
            if ((auto && playing) || mode === 'repeat') void runFrom(page - 1, 0);
            else {
              stopAll();
              goPage(page - 1);
            }
          }}
        >
          ◀ 上一页
        </Btn>
        {auto && (
          <Btn
            className="min-w-28"
            tone={playing ? 'plain' : 'green'}
            disabled={phase === 'record' || phase === 'scoring'}
            onClick={() => (playing ? stopAll() : void runFrom(page, mode === 'repeat' ? 0 : Math.max(0, sentence)))}
          >
            {playing ? '⏸ 暂停' : mode === 'repeat' ? '🔊 再听一遍' : '▶ 继续'}
          </Btn>
        )}
        {last ? (
          <Btn tone="green" onClick={finishReading}>
            读完了 ✓
          </Btn>
        ) : (
          <Btn
            tone="plain"
            onClick={() => {
              if ((auto && playing) || mode === 'repeat') void runFrom(page + 1, 0);
              else {
                stopAll();
                goPage(page + 1);
              }
            }}
          >
            下一页 ▶
          </Btn>
        )}
      </footer>
    </div>
  );
}

function ScoreCard({ feedback }: { feedback: { text: string; tone: 'good' | 'try' | 'info'; score?: ReadingScore; tries?: number } }) {
  const color = feedback.tone === 'good' ? 'bg-emerald-50 text-emerald-800' : feedback.tone === 'try' ? 'bg-amber-50 text-amber-900' : 'bg-slate-100 text-slate-700';
  const s = feedback.score;
  return (
    <span className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl px-4 py-2 ${color}`}>
      {s && <b className="text-2xl">{s.overall} 分</b>}
      <span>{feedback.text}</span>
      {s && (
        <span className="text-sm opacity-80">
          准确 {s.accuracy} · 流利 {s.fluency} · 完整 {s.completeness}
        </span>
      )}
    </span>
  );
}

function RecordBar({ start, end }: { start: number; end: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.min(1, (end - now) / (end - start)));
  return (
    <span className="h-3 w-32 overflow-hidden rounded-full bg-rose-100">
      <span className="block h-full bg-rose-500 transition-[width]" style={{ width: `${left * 100}%` }} />
    </span>
  );
}

/** Play back everything the child recorded for this book, sentence by sentence. */
export function MyReading({ childId, bookId }: { childId: string; bookId: string }) {
  const [count, setCount] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const stop = useRef<() => void>(() => {});
  useEffect(() => {
    recordingsOf(childId, bookId).then((r) => setCount(r.length));
    return () => stop.current();
  }, [childId, bookId]);
  if (count === 0) return null;
  const playAll = async () => {
    let cancelled = false;
    const a = new Audio();
    stop.current = () => {
      cancelled = true;
      a.pause();
      setPlaying(null);
    };
    for (const r of await recordingsOf(childId, bookId)) {
      if (cancelled) return;
      setPlaying(r.text);
      const url = URL.createObjectURL(r.blob);
      await new Promise<void>((res) => {
        a.onended = a.onerror = () => res();
        a.src = url;
        a.play().catch(() => res());
      });
      URL.revokeObjectURL(url);
    }
    setPlaying(null);
  };
  return (
    <div className="flex flex-col items-center gap-2">
      <Btn tone="green" onClick={() => (playing ? stop.current() : void playAll())}>
        {playing ? '⏹ 停' : `▶ 听我读的（${count} 段）`}
      </Btn>
      {playing && <div className="text-lg text-slate-600">{playing}</div>}
    </div>
  );
}
