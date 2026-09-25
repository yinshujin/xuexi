import { useEffect, useState } from 'react';
import { sortCorrect, type SortGame } from '../../lib/games';
import { sfx } from '../../lib/sfx';
import type { GameViewProps } from './types';

/** 排序: tap every tile in order (tap a placed tile to take it back), then 检查. */
export function SortView({ game, onDone, done }: GameViewProps<SortGame>) {
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  useEffect(() => {
    setPicked([]);
    setResult(null);
  }, [game]);

  const text = picked.map((i) => game.tiles[i]);
  const check = () => {
    const ok = sortCorrect(game, text);
    setResult(ok);
    onDone({ correct: ok, missedWords: [], given: text.join(game.sep) });
  };
  const tile = (extra: string) => `min-h-14 rounded-xl border-2 border-b-4 px-4 py-2 text-2xl font-bold transition active:translate-y-0.5 ${extra}`;
  const sign = game.sep.trim();

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center text-2xl font-bold">{game.title}</div>
      <div className="rounded-2xl bg-violet-50 p-4 text-center text-xl text-violet-900">{game.prompt}</div>
      <div
        className={`flex min-h-24 flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-3 ${
          result === null ? 'border-slate-300' : result ? 'border-emerald-400 bg-emerald-50' : 'border-rose-400 bg-rose-50'
        }`}
      >
        {picked.length === 0 && <span className="text-lg text-slate-400">按顺序点下面的卡片</span>}
        {picked.map((i, k) => (
          <span key={i} className="flex items-center gap-2">
            {k > 0 && <span className="text-2xl font-black text-slate-400">{sign}</span>}
            <button
              type="button"
              disabled={done}
              className={tile('xx-pop border-sky-300 bg-white')}
              onClick={() => {
                sfx.tap();
                setPicked((p) => p.filter((x) => x !== i));
              }}
            >
              {game.tiles[i]}
            </button>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {game.tiles.map((t, i) => {
          const used = picked.includes(i);
          return (
            <button
              key={i}
              type="button"
              disabled={used || done}
              className={tile(used ? 'border-slate-100 bg-slate-100 text-transparent' : 'border-slate-200 bg-white')}
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
          disabled={picked.length < game.tiles.length}
          onClick={check}
          className="mx-auto rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-12 py-3 text-xl font-bold text-white disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
        >
          检查
        </button>
      )}
    </div>
  );
}
