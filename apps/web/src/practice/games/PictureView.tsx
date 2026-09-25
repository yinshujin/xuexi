import { useEffect, useState } from 'react';
import type { PictureGame } from '../../lib/games';
import { sfx } from '../../lib/sfx';
import type { GameViewProps } from './types';

/** Columns for a box of n emoji: small groups in neat rows, big piles in rows of 5 or 8 (easy to count). */
function columns(n: number): number {
  if (n <= 3) return n;
  if (n === 4) return 2;
  if (n <= 9) return 3;
  if (n <= 20) return 5;
  return 8;
}

/** The picture: one big emoji, or groups of emoji each in a rounded box. */
function Picture({ game }: { game: PictureGame }) {
  const single = game.groups.length === 1 && game.groups[0].length === 1;
  if (single) {
    return (
      <div className="flex justify-center">
        <div role="img" aria-label="图" className="xx-pop flex h-40 w-40 items-center justify-center rounded-full bg-sky-50 text-8xl leading-none">
          {game.groups[0][0]}
        </div>
      </div>
    );
  }
  return (
    <div role="img" aria-label={game.alt} className="flex flex-wrap items-center justify-center gap-3">
      {game.groups.map((g, i) => (
        <div key={i} className="flex items-center gap-3">
          {i > 0 && game.between && <span className="text-3xl">{game.between}</span>}
          <div
            className="grid gap-1 rounded-2xl border-2 border-amber-200 bg-amber-50 p-2 text-3xl leading-none"
            style={{ gridTemplateColumns: `repeat(${columns(g.length)}, minmax(0, 1fr))` }}
          >
            {g.map((e, k) => (
              <span key={k} className="flex h-9 w-9 items-center justify-center">
                {e}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** 看图题: look at the picture, tap one of four options (graded at once). */
export function PictureView({ game, onDone, done }: GameViewProps<PictureGame>) {
  const [chosen, setChosen] = useState<number | null>(null);
  useEffect(() => setChosen(null), [game]);

  const pick = (i: number) => {
    if (chosen !== null || done) return;
    sfx.tap();
    setChosen(i);
    const ok = i === game.answer;
    onDone({ correct: ok, missedWords: ok ? [] : (game.words ?? []), given: game.options[i] });
  };
  const emoji = game.optionStyle === 'emoji';

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center text-2xl font-bold">{game.title}</div>
      {emoji ? (
        <div className="flex flex-col items-center gap-1">
          <div className="rounded-2xl bg-violet-50 px-8 py-4 text-4xl font-black text-violet-800">{game.prompt}</div>
          <div className="text-lg text-slate-500">选出对的图</div>
        </div>
      ) : (
        <>
          <Picture game={game} />
          <div className="text-center text-xl font-bold text-slate-700">{game.prompt}</div>
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        {game.options.map((o, i) => {
          const state = chosen === null ? '' : i === game.answer ? 'right' : i === chosen ? 'wrong' : 'off';
          return (
            <button
              key={i}
              type="button"
              disabled={chosen !== null || done}
              onClick={() => pick(i)}
              className={`min-h-16 rounded-2xl border-2 border-b-4 px-3 py-2 font-bold transition active:translate-y-0.5 ${
                emoji ? 'text-5xl leading-none' : 'text-2xl'
              } ${
                state === 'right'
                  ? 'xx-pop border-emerald-400 bg-emerald-50 text-emerald-800'
                  : state === 'wrong'
                    ? 'xx-shake border-rose-400 bg-rose-50 text-rose-800'
                    : state === 'off'
                      ? 'border-slate-100 bg-slate-50 text-slate-400'
                      : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
