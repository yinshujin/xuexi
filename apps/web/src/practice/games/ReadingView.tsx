import { Fragment, useEffect, useRef, useState } from 'react';
import {
  circled,
  isNumberQuestion,
  readingAnswerText,
  readingGivenText,
  readingLabel,
  readingRight,
  readingScore,
  type ReadingAnswer,
  type ReadingGame,
} from '../../lib/games';
import { sfx } from '../../lib/sfx';
import type { GameViewProps } from './types';

/**
 * 阅读题组: the passage in a card that stays in view (it scrolls on its own
 * when long), all questions below; 提交 marks each one with its explanation,
 * then hands the points over (one per right answer).
 */
export function ReadingView({ game, onDone, done }: GameViewProps<ReadingGame>) {
  const n = game.questions.length;
  const [answers, setAnswers] = useState<ReadingAnswer[]>(() => game.questions.map(() => null));
  const [typed, setTyped] = useState<string[]>(() => game.questions.map(() => ''));
  const [checked, setChecked] = useState(false);
  const refs = useRef<Array<HTMLElement | null>>([]);
  const card = useRef<HTMLElement | null>(null);
  /** The passage card scrolls and the end is not in view yet. */
  const [more, setMore] = useState(false);

  useEffect(() => {
    setAnswers(game.questions.map(() => null));
    setTyped(game.questions.map(() => ''));
    setChecked(false);
  }, [game]);

  const measure = () => {
    const el = card.current;
    setMore(!!el && el.scrollHeight - el.scrollTop - el.clientHeight > 8);
  };
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [game, checked]);

  const locked = checked || done;
  const left = answers.filter((a) => a === null).length;
  const zh = /\p{Script=Han}/u.test(game.text);
  const big = game.large;

  const pick = (i: number, a: ReadingAnswer) => {
    if (locked) return;
    sfx.tap();
    setAnswers((xs) => xs.map((x, k) => (k === i ? a : x)));
  };

  const type = (i: number, s: string) => {
    if (locked) return;
    const clean = s.replace(/[^\d]/g, '').slice(0, 7);
    setTyped((xs) => xs.map((x, k) => (k === i ? clean : x)));
    setAnswers((xs) => xs.map((x, k) => (k === i ? (clean === '' ? null : Number(clean)) : x)));
  };

  const submit = () => {
    if (locked || left > 0) return;
    setChecked(true);
    const score = readingScore(game, answers);
    const given = `对 ${score}/${n} 题：${game.questions
      .map((q, i) => `${readingLabel(game, i)} ${readingGivenText(q, answers[i])}${readingRight(q, answers[i]) ? ' ✓' : ' ✗'}`)
      .join('；')}`;
    onDone({ correct: score === n, earned: score, missedWords: [], given });
  };

  /** A 完形填空 blank in the passage: ① and what the child chose. */
  const blankChip = (num: number) => {
    const i = num - 1;
    const q = game.questions[i];
    const a = answers[i];
    const tone = !checked
      ? a === null
        ? 'border-amber-400 bg-white text-amber-700'
        : 'border-sky-400 bg-sky-50 text-sky-800'
      : q && readingRight(q, a)
        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
        : 'border-rose-400 bg-rose-50 text-rose-700';
    return (
      <button
        type="button"
        onClick={() => refs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        className={`mx-1 inline-flex min-w-16 items-baseline justify-center gap-1 rounded-lg border-b-4 border-2 px-2 align-baseline font-bold ${tone}`}
      >
        <span>{circled(num)}</span>
        <span className={a === null || !q || isNumberQuestion(q) ? 'text-slate-300' : ''}>
          {a === null || !q || isNumberQuestion(q) ? '＿＿' : q.options[a]}
        </span>
      </button>
    );
  };

  const paragraph = (line: string, k: number) => {
    const parts = line.split(/\{(\d+)\}/);
    // Chinese paragraphs start two characters in, short lines (dates, greetings) do not.
    const indent = zh && line.length > 16 ? 'indent-[2em]' : '';
    return (
      <p key={k} className={indent}>
        {parts.map((p, j) => (j % 2 === 1 ? <Fragment key={j}>{blankChip(Number(p))}</Fragment> : <Fragment key={j}>{p}</Fragment>))}
      </p>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center text-2xl font-bold">{game.title}</div>

      {/* While answering, the passage stays in view (scrolling on its own when long); afterwards it is part of the page. */}
      <article
        ref={card}
        onScroll={measure}
        className={`relative rounded-2xl border-2 border-b-4 border-amber-200 bg-amber-50 px-4 pt-3 text-slate-800 shadow-sm ${
          'pb-3' + (checked ? '' : ' sticky top-2 z-10 max-h-[42vh] overflow-y-auto')
        } ${big ? 'text-2xl leading-[1.9]' : 'text-xl leading-loose'}`}
      >
        <h3 className="mb-1 text-center font-black text-amber-900">{game.passageTitle}</h3>
        <div className={zh ? 'tracking-wide' : ''}>{game.text.split('\n').map(paragraph)}</div>
        {!checked && more && (
          <div className="sticky bottom-0 -mx-4 -mb-3 bg-gradient-to-t from-amber-50 via-amber-50/90 to-transparent pb-2 pt-5 text-center text-sm font-bold text-amber-700">
            ⬇ 往下滑，读完全文
          </div>
        )}
      </article>

      <ol className="flex flex-col gap-5">
        {game.questions.map((q, i) => {
          const a = answers[i];
          const right = checked && readingRight(q, a);
          const short = !isNumberQuestion(q) && q.options.every((o) => o.length <= 8);
          return (
            <li
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className={`rounded-2xl border-2 p-3 ${
                !checked ? 'border-slate-100' : right ? 'border-emerald-300 bg-emerald-50/40' : 'border-rose-300 bg-rose-50/40'
              }`}
            >
              <div className={`mb-3 flex gap-2 font-bold ${big ? 'text-2xl' : 'text-xl'}`}>
                <span
                  className={`flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-1 text-lg text-white ${
                    !checked ? 'bg-sky-500' : right ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                >
                  {checked ? (right ? '✓' : '✗') : game.mode === 'cloze' ? circled(i + 1) : i + 1}
                </span>
                <span className="min-w-0 flex-1 self-center">{q.q || `选出第 ${circled(i + 1)} 空的答案`}</span>
              </div>

              {isNumberQuestion(q) ? (
                <label className="flex items-center gap-3 pl-11">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    aria-label={`第 ${i + 1} 题的答案`}
                    disabled={locked}
                    value={typed[i]}
                    onChange={(e) => type(i, e.target.value)}
                    className={`h-14 w-40 rounded-2xl border-2 border-b-4 px-3 text-center text-2xl font-bold tabular-nums outline-none focus:border-sky-400 ${
                      !checked ? 'border-slate-200 bg-white' : right ? 'border-emerald-400 bg-emerald-50' : 'border-rose-400 bg-rose-50 text-rose-700'
                    }`}
                  />
                  {q.unit && <span className="text-xl text-slate-600">{q.unit}</span>}
                </label>
              ) : (
                <div className={`grid gap-2 ${short ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1'}`}>
                  {q.options.map((o, k) => {
                    const on = a === k;
                    const tone = !checked
                      ? on
                        ? 'border-sky-400 bg-sky-50 text-sky-800'
                        : 'border-slate-200 bg-white text-slate-700'
                      : k === q.answer
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : on
                          ? 'border-rose-400 bg-rose-50 text-rose-700 line-through'
                          : 'border-slate-100 bg-white text-slate-400';
                    return (
                      <button
                        key={k}
                        type="button"
                        disabled={locked}
                        onClick={() => pick(i, k)}
                        className={`min-h-14 rounded-2xl border-2 border-b-4 px-4 py-2 text-left font-bold transition active:translate-y-0.5 ${
                          big ? 'text-xl' : 'text-lg'
                        } ${tone}`}
                      >
                        {o}
                      </button>
                    );
                  })}
                </div>
              )}

              {checked && (
                <div className={`mt-3 rounded-xl px-3 py-2 text-lg ${right ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'}`}>
                  {!right && <div className="font-bold">正确答案：{readingAnswerText(q)}</div>}
                  <div>{q.explain}</div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {!locked && (
        <div className="flex flex-col items-center gap-2">
          {left > 0 && <div className="text-slate-500">还有 {left} 题没做</div>}
          <button
            type="button"
            disabled={left > 0}
            onClick={submit}
            className="rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-14 py-3 text-xl font-bold text-white active:translate-y-0.5 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
          >
            提交
          </button>
        </div>
      )}
    </div>
  );
}
