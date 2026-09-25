import { useEffect, useState } from 'react';
import { MATCH_SLIPS, orderCorrect, type MatchGame, type OrderGame } from '../lib/games';
import { sfx } from '../lib/sfx';

export interface GameOutcome {
  correct: boolean;
  /** 语文: the words that were matched / built wrong. */
  missedWords: string[];
  /** What the child did, for going over the paper. */
  given: string;
}

/** 连连看: tap one on each side; a wrong pair shakes. Right when at most MATCH_SLIPS slips. */
export function MatchGameView({ game, onDone }: { game: MatchGame; onDone: (o: GameOutcome) => void }) {
  const [left, setLeft] = useState<number | null>(null);
  const [right, setRight] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [slips, setSlips] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [shake, setShake] = useState<[number, number] | null>(null);

  useEffect(() => {
    setLeft(null);
    setRight(null);
    setMatched(new Set());
    setSlips(0);
    setMissed([]);
  }, [game]);

  useEffect(() => {
    if (left === null || right === null) return;
    if (left === right) {
      sfx.tap();
      const next = new Set(matched).add(left);
      setMatched(next);
      if (next.size === game.pairs.length) {
        onDone({ correct: slips <= MATCH_SLIPS, missedWords: missed, given: slips ? `配错 ${slips} 次` : '全部配对' });
      }
    } else {
      sfx.wrong();
      setSlips((n) => n + 1);
      const w = game.words?.[left];
      if (w && !missed.includes(w)) setMissed((m) => [...m, w]);
      setShake([left, right]);
      setTimeout(() => setShake(null), 400);
    }
    setLeft(null);
    setRight(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, right]);

  const cell = (text: string, on: boolean, done: boolean, shaking: boolean, onClick: () => void) => (
    <button
      type="button"
      disabled={done}
      onClick={onClick}
      className={`min-h-16 rounded-2xl border-2 border-b-4 px-3 py-2 text-xl font-bold transition active:translate-y-0.5 ${
        done
          ? 'border-slate-100 bg-slate-50 text-slate-300'
          : on
            ? 'border-sky-400 bg-sky-50 text-sky-800'
            : 'border-slate-200 bg-white text-slate-700'
      } ${shaking ? 'xx-shake border-rose-400 bg-rose-50' : ''}`}
    >
      {text}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center text-2xl font-bold">{game.title}</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3">
          {game.pairs.map(([a], i) => cell(a, left === i, matched.has(i), shake?.[0] === i, () => setLeft(i)))}
        </div>
        <div className="flex flex-col gap-3">
          {game.order.map((i) => cell(game.pairs[i][1], right === i, matched.has(i), shake?.[1] === i, () => setRight(i)))}
        </div>
      </div>
      {slips > 0 && <div className="text-center text-slate-500">配错 {slips} 次{slips > MATCH_SLIPS ? '' : '（错 1 次以内都算对）'}</div>}
    </div>
  );
}

/** 拼一拼: tap tiles into the answer line (tap a placed tile to take it back), then 检查. */
export function OrderGameView({ game, onDone, done }: { game: OrderGame; onDone: (o: GameOutcome) => void; done: boolean }) {
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  useEffect(() => {
    setPicked([]);
    setResult(null);
  }, [game]);

  const text = picked.map((i) => game.tiles[i]);
  const check = () => {
    const ok = orderCorrect(game, text);
    setResult(ok);
    onDone({ correct: ok, missedWords: ok ? [] : (game.words ?? []), given: text.join(game.joiner) || '没有作答' });
  };
  const tile = (t: string, extra: string) =>
    `rounded-xl border-2 border-b-4 px-3 py-2 text-2xl font-bold transition active:translate-y-0.5 ${extra} ${
      game.joiner === '' ? 'min-w-14' : ''
    }`;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center text-2xl font-bold">{game.title}</div>
      <div className="whitespace-pre-line rounded-2xl bg-violet-50 p-4 text-center text-2xl text-violet-900">{game.prompt}</div>
      <div
        className={`flex min-h-20 flex-wrap items-center justify-center gap-2 rounded-2xl border-b-2 p-3 ${
          result === null ? 'border-slate-300' : result ? 'border-emerald-400 bg-emerald-50' : 'border-rose-400 bg-rose-50'
        }`}
      >
        {picked.length === 0 && <span className="text-lg text-slate-400">点下面的{game.joiner === '' ? '字' : '单词'}，按顺序排好</span>}
        {picked.map((i, k) => (
          <button
            key={`${i}-${k}`}
            type="button"
            disabled={done}
            className={tile(game.tiles[i], 'xx-pop border-sky-300 bg-white')}
            onClick={() => {
              sfx.tap();
              setPicked((p) => p.filter((x) => x !== i));
            }}
          >
            {game.tiles[i]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {game.tiles.map((t, i) => {
          const used = picked.includes(i);
          return (
            <button
              key={i}
              type="button"
              disabled={used || done}
              className={tile(t, used ? 'border-slate-100 bg-slate-100 text-transparent' : 'border-slate-200 bg-white')}
              onClick={() => {
                sfx.tap();
                setPicked((p) => [...p, i]);
              }}
            >
              {t}
            </button>
          );
        })}
      </div>
      {!done && (
        <button
          type="button"
          disabled={picked.length === 0}
          onClick={check}
          className="mx-auto rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-12 py-3 text-xl font-bold text-white disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
        >
          检查
        </button>
      )}
    </div>
  );
}
