import { useEffect, useState } from 'react';
import { orderCorrect, type OrderGame } from '../../lib/games';
import { sfx } from '../../lib/sfx';
import type { GameViewProps } from './types';

/** 拼一拼: tap tiles into the answer line (tap a placed tile to take it back), then 检查. */
export function OrderView({ game, onDone, done }: GameViewProps<OrderGame>) {
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
        {picked.length === 0 && (
          <span className="text-lg text-slate-400">
            点下面的{game.joiner !== '' ? '单词' : game.tiles.some((t) => [...t].length > 1) ? '字块' : '字'}，按顺序排好
          </span>
        )}
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
