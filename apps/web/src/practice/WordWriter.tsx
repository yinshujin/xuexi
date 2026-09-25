import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { loadHanzi, WRITE_SLIPS } from '../lib/hanzi';
import { sfx } from '../lib/sfx';

/** How one character was written. */
export interface CharResult {
  ch: string;
  /** Wrong strokes (hanzi-writer quiz: wrong shape, place or order). */
  mistakes: number;
  /** 「不会写」 was tapped. */
  gaveUp: boolean;
  ok: boolean;
}

/** 「广 写对了」, 「边 写错 4 笔」, 「边 不会写」. */
export const charResultText = (r: CharResult) => `${r.ch} ${r.gaveUp ? '不会写' : r.ok ? '写对了' : `写错 ${r.mistakes} 笔`}`;

/** Hint the next stroke after this many wrong tries at it. */
const HINT_AFTER = 3;

/**
 * Write characters of a word in a 田字格, stroke by stroke: the pinyin, the
 * word with the characters to write as boxes, and a large writing square
 * (touch, pen or mouse). A character is right with at most WRITE_SLIPS wrong
 * strokes; a wrong one is then shown in its stroke order. `onDone` gets every
 * character's result once the last one is written.
 */
export function WordWriter({
  word,
  pinyin,
  blanks,
  onDone,
  disabled = false,
}: {
  word: string;
  pinyin: string;
  /** Indices of the characters to write. */
  blanks: number[];
  onDone: (results: CharResult[]) => void;
  disabled?: boolean;
}) {
  const chars = [...word];
  const [k, setK] = useState(0);
  const [results, setResults] = useState<CharResult[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [failed, setFailed] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriter | null>(null);
  const [size, setSize] = useState(0);
  const at = blanks[k];
  const ch = chars[at];
  const current = results[k];
  const syllables = pinyin.split(' ');

  useLayoutEffect(() => {
    const w = wrap.current?.clientWidth ?? 300;
    setSize(Math.max(200, Math.min(380, w)));
  }, []);

  const finish = (r: CharResult) => {
    const all = [...results, r];
    setResults(all);
    if (!r.ok) void writer.current?.animateCharacter();
    if (k + 1 >= blanks.length) onDone(all);
    else if (r.ok) {
      sfx.right();
      window.setTimeout(() => setK((x) => x + 1), 700);
    } else sfx.wrong();
  };

  // A new writer (and quiz) for each character.
  useEffect(() => {
    const el = box.current;
    if (!el || !size || !ch) return;
    let live = true;
    setMistakes(0);
    setFailed(false);
    const w = HanziWriter.create(el, ch, {
      width: size,
      height: size,
      padding: Math.round(size / 18),
      showOutline: false,
      showCharacter: false,
      strokeColor: '#1e293b',
      outlineColor: '#e2e8f0',
      highlightColor: '#f59e0b',
      drawingColor: '#0f172a',
      drawingWidth: Math.max(6, Math.round(size / 28)),
      strokeAnimationSpeed: 1.2,
      delayBetweenStrokes: 250,
      charDataLoader: (c, onLoad, onError) => {
        loadHanzi(c).then(onLoad, (e: unknown) => {
          if (live) setFailed(true);
          onError(e);
        });
      },
    });
    writer.current = w;
    if (!disabled) {
      void w.quiz({
        showHintAfterMisses: HINT_AFTER,
        leniency: 1.2,
        onMistake: (s) => live && setMistakes(s.totalMistakes),
        onComplete: ({ totalMistakes }) => {
          if (!live) return;
          setMistakes(totalMistakes);
          finish({ ch, mistakes: totalMistakes, gaveUp: false, ok: totalMistakes <= WRITE_SLIPS });
        },
      });
    }
    return () => {
      live = false;
      w.cancelQuiz();
      writer.current = null;
      el.innerHTML = '';
    };
    // `finish` reads this render's results when the quiz ends; the writer is only remade for a new character.
  }, [ch, k, size]);

  useEffect(() => {
    if (disabled) writer.current?.cancelQuiz();
  }, [disabled]);

  const giveUp = () => {
    writer.current?.cancelQuiz();
    finish({ ch, mistakes, gaveUp: true, ok: false });
  };

  const line = 'stroke-rose-300';
  return (
    <div ref={wrap} className="flex w-full flex-col items-center gap-3">
      <div className="text-center text-3xl font-medium tracking-wide text-slate-700">
        {syllables.length === chars.length
          ? syllables.map((s, i) => (
              <span key={i} className={i === at && !current ? 'rounded-md bg-amber-100 px-1 text-amber-800' : ''}>
                {i > 0 ? ' ' : ''}
                {s}
              </span>
            ))
          : pinyin}
      </div>
      <div className="flex gap-1">
        {chars.map((c, i) => {
          const b = blanks.indexOf(i);
          const r = b >= 0 ? results[b] : undefined;
          const tone =
            b < 0
              ? 'border-transparent text-slate-800'
              : r
                ? r.ok
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : 'border-rose-400 bg-rose-50 text-rose-700'
                : b === k
                  ? 'border-amber-400 bg-amber-50 text-amber-500'
                  : 'border-slate-300 bg-white text-slate-300';
          return (
            <span key={i} className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 text-4xl font-bold ${tone}`}>
              {b < 0 || r ? c : b === k ? '✎' : ''}
            </span>
          );
        })}
      </div>
      {failed ? (
        <div className="rounded-2xl bg-rose-50 p-4 text-rose-700">没有找到「{ch}」的笔顺数据。</div>
      ) : (
        <div
          className="relative rounded-lg border-4 border-rose-400 bg-white"
          style={{
            width: size + 8,
            height: size + 8,
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          {/* 田字格 */}
          <svg className="pointer-events-none absolute inset-0" width={size} height={size} viewBox="0 0 100 100" aria-hidden>
            <line x1="50" y1="0" x2="50" y2="100" className={line} strokeWidth="0.6" strokeDasharray="3 2" />
            <line x1="0" y1="50" x2="100" y2="50" className={line} strokeWidth="0.6" strokeDasharray="3 2" />
            <line x1="0" y1="0" x2="100" y2="100" className="stroke-rose-200" strokeWidth="0.4" strokeDasharray="2 2" />
            <line x1="100" y1="0" x2="0" y2="100" className="stroke-rose-200" strokeWidth="0.4" strokeDasharray="2 2" />
          </svg>
          <div ref={box} className="absolute inset-0" aria-label={`在这里写「${pinyin}」里空着的字`} />
        </div>
      )}
      <div className="flex min-h-12 flex-wrap items-center justify-center gap-3 text-lg">
        {current ? (
          <span className={`xx-pop font-bold ${current.ok ? 'text-emerald-600' : 'text-rose-600'}`}>
            {current.ok
              ? current.mistakes
                ? `写对了（错了 ${current.mistakes} 笔）`
                : '写对了，笔顺也对！'
              : current.gaveUp
                ? '看看笔顺，记住它'
                : `写错了 ${current.mistakes} 笔，看看笔顺`}
          </span>
        ) : (
          <>
            <span className="text-slate-500">{mistakes ? `写错 ${mistakes} 笔` : '按笔顺一笔一笔写'}</span>
            {!disabled && (
              <button
                type="button"
                onClick={giveUp}
                className="rounded-xl border-2 border-b-4 border-slate-200 bg-white px-4 py-1 font-bold text-slate-500"
              >
                {failed ? '跳过' : '不会写'}
              </button>
            )}
          </>
        )}
        {current && !current.ok && (
          <button
            type="button"
            onClick={() => void writer.current?.animateCharacter()}
            className="rounded-xl border-2 border-b-4 border-slate-200 bg-white px-4 py-1 font-bold text-slate-600"
          >
            再看一遍
          </button>
        )}
        {current && !current.ok && k + 1 < blanks.length && (
          <button
            type="button"
            onClick={() => setK((x) => x + 1)}
            className="rounded-xl border-b-4 border-sky-700 bg-sky-500 px-5 py-1 font-bold text-white"
          >
            下一个字 →
          </button>
        )}
      </div>
    </div>
  );
}
