import { useCallback, useEffect, useRef, useState } from 'react';
import type { BookWord } from '@xuexi/course-pack';
import { BOOK_EVENT_PREFIX, type BookReadMode } from '@xuexi/shared';
import { openBook, recordingId, recordingsOf, saveRecording, type OpenedBook } from '../lib/books';
import { recordLimitMs, wordAt, wordTimings } from '../lib/reading';
import { useApp } from '../lib/store';
import { navigate } from '../lib/router';
import { uuid } from '../lib/format';
import { Btn, Stars } from '../components/ui';

type Screen = 'start' | 'read' | 'quiz' | 'done';
/** What the reader is doing right now (跟读 shows the child whose turn it is). */
type Phase = 'idle' | 'model' | 'record' | 'shadow' | 'playback';

const MODES: Array<{ id: BookReadMode; icon: string; label: string; hint: string }> = [
  { id: 'listen', icon: '🎧', label: '听读', hint: '听着读，一页一页自动翻' },
  { id: 'repeat', icon: '🎤', label: '跟读', hint: '听一句，读一句，录下来听听' },
  { id: 'self', icon: '📖', label: '自己读', hint: '自己读，不会的词点一下' },
];

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported?.(t));
}

export function BookReader({ childId, bookId, back }: { childId: string; bookId: string; back: string }) {
  const { addEvent, deviceId } = useApp();
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

  const audio = useRef<HTMLAudioElement | null>(null);
  const run = useRef(0);
  const cancels = useRef(new Set<() => void>());
  const finishRec = useRef<(() => void) | null>(null);
  const mic = useRef<MediaStream | null>(null);
  const micAsk = useRef<Promise<MediaStream | null> | null>(null);
  const durations = useRef(new Map<string, number>());
  const maxPage = useRef(0);
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

  const repeatTurn = async (r: number, pi: number, si: number): Promise<boolean> => {
    const clip = durations.current.get(`${pi}:${si}`) ?? 2000;
    const stream = await ensureMic();
    if (r !== run.current) return false;
    setWord(-1);
    if (!stream) {
      setPhase('shadow');
      return sleep(r, clip * 1.5 + 800);
    }
    setPhase('record');
    const blob = await recordFor(r, stream, recordLimitMs(clip));
    if (r !== run.current) return false;
    if (blob) {
      await saveRecording({
        id: recordingId(childId, bookId, pi, si),
        childId,
        bookId,
        page: pi,
        sentence: si,
        text: pages[pi].sentences[si].text,
        at: Date.now(),
        blob,
      });
      setPhase('playback');
      const url = URL.createObjectURL(blob);
      const ok = await play(r, url);
      URL.revokeObjectURL(url);
      if (!ok) return false;
    }
    setPhase('idle');
    return sleep(r, 400);
  };

  const goPage = (pi: number) => {
    setPage(pi);
    setSentence(-1);
    setWord(-1);
    maxPage.current = Math.max(maxPage.current, pi);
  };

  /** 听读 / 跟读: read on from (page, sentence), turning the pages. */
  const runFrom = async (p: number, s: number) => {
    stopAll();
    const r = run.current;
    setPlaying(true);
    for (let pi = p; pi < pages.length; pi++) {
      goPage(pi);
      const list = pages[pi].sentences;
      if (list.length === 0 && !(await sleep(r, 2500))) return; // a picture-only page
      for (let si = pi === p ? s : 0; si < list.length; si++) {
        setSentence(si);
        setPhase('model');
        if (!(await playSentence(r, pi, si))) return;
        if (modeRef.current === 'repeat') {
          if (!(await repeatTurn(r, pi, si))) return;
        } else if (!(await sleep(r, 350))) return;
      }
      setSentence(-1);
      setWord(-1);
      setPhase('idle');
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
    });
  };

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
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMode(m.id);
                  modeRef.current = m.id;
                  recorded.current = false;
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
          <h2 className="text-2xl font-bold leading-snug">{q.question}</h2>
          {q.options.map((opt, i) => {
            const tone = !answered
              ? 'bg-white ring-slate-200'
              : i === q.answer
                ? 'bg-emerald-100 ring-emerald-400'
                : i === picked
                  ? 'bg-rose-100 ring-rose-400'
                  : 'bg-white ring-slate-200 opacity-60';
            return (
              <button
                key={opt}
                type="button"
                disabled={answered}
                onClick={() => {
                  setPicked(i);
                  if (i === q.answer) setCorrect((n) => n + 1);
                }}
                className={`rounded-2xl p-4 text-left text-xl ring-2 transition ${tone}`}
              >
                <span className="mr-2 font-bold text-slate-400">{'ABCD'[i]}</span>
                {opt}
              </button>
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
    const stars = total === 0 ? 3 : correct === total ? 3 : correct >= total / 2 ? 2 : 1;
    return (
      <div className="flex h-full flex-col bg-amber-50">
        {header}
        <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="text-6xl">🎉</div>
          <div className="text-3xl font-bold">读完了《{book.title}》！</div>
          <div className="text-5xl">
            <Stars n={stars} />
          </div>
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
            <p className="text-center text-lg text-slate-400">这一页没有字，看看图上发生了什么？</p>
          ) : (
            <p className="text-2xl leading-relaxed sm:text-3xl sm:leading-relaxed">
              {p.sentences.map((s, si) => {
                const active = si === sentence;
                const words = s.text.split(/\s+/).filter(Boolean);
                return (
                  <span key={si} className={`mr-2 rounded-lg ${active ? 'bg-sky-100' : ''}`}>
                    {words.map((w, wi) => (
                      <button
                        key={wi}
                        type="button"
                        onClick={() => void tapWord(page, si, wi)}
                        className={`mr-[0.3em] inline rounded-md px-0.5 transition-colors ${
                          active && wi === word ? 'bg-amber-300' : active && phase === 'record' ? 'text-rose-700' : ''
                        }`}
                      >
                        {w}
                      </button>
                    ))}
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
        <div className="mx-3 mt-2 flex min-h-12 items-center justify-center gap-3 text-lg">
          {phase === 'model' && <span className="text-sky-700">🎧 先听……</span>}
          {phase === 'record' && (
            <>
              <span className="animate-pulse text-rose-600">🎤 该你读了！</span>
              {recUntil && <RecordBar start={recUntil.start} end={recUntil.end} />}
              <Btn tone="danger" className="py-2" onClick={() => finishRec.current?.()}>
                读完了
              </Btn>
            </>
          )}
          {phase === 'shadow' && <span className="text-rose-600">🗣️ 跟着读一遍</span>}
          {phase === 'playback' && <span className="text-emerald-700">👂 听听你读的</span>}
          {micError && phase !== 'record' && <span className="text-sm text-slate-500">{micError}</span>}
        </div>
      )}

      <footer className="flex items-center justify-center gap-4 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
        <Btn
          tone="plain"
          disabled={page === 0}
          onClick={() => {
            if (auto && playing) void runFrom(page - 1, 0);
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
            onClick={() => (playing ? stopAll() : void runFrom(page, Math.max(0, sentence)))}
          >
            {playing ? '⏸ 暂停' : '▶ 继续'}
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
              if (auto && playing) void runFrom(page + 1, 0);
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
        {playing ? '⏹ 停' : `▶ 听我读的（${count} 句）`}
      </Btn>
      {playing && <div className="text-lg text-slate-600">{playing}</div>}
    </div>
  );
}
