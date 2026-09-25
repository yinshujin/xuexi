import { useEffect, useRef, useState } from 'react';
import { spellCorrect, type SpellGame } from '../../lib/games';
import { sfx } from '../../lib/sfx';
import { wordAudioUrl } from '../../lib/wordAudio';
import { Speaker } from './Speaker';
import type { GameViewProps } from './types';

/**
 * 拼写: the meaning (and 🔊 when the word audio pack is there), a box per
 * letter, and big letter tiles; tap a placed letter or ⌫ to take it back.
 * A hardware keyboard works too (letters, Backspace, Enter).
 */
export function SpellView({ game, onDone, done, env }: GameViewProps<SpellGame>) {
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const sent = useRef(false);
  useEffect(() => {
    setPicked([]);
    setResult(null);
    sent.current = false;
  }, [game]);

  const n = game.answer.length;
  const typed = picked.map((i) => game.tiles[i]).join('');
  const full = picked.length === n;
  const audio = env.audio && !!wordAudioUrl('en', game.answer);

  const add = (i: number) => {
    if (done || picked.includes(i) || picked.length >= n) return;
    sfx.tap();
    setPicked((p) => [...p, i]);
  };
  const back = () => {
    if (done) return;
    sfx.tap();
    setPicked((p) => p.slice(0, -1));
  };
  const check = () => {
    if (done || !full || sent.current) return;
    sent.current = true;
    const ok = spellCorrect(game, typed);
    setResult(ok);
    onDone({ correct: ok, missedWords: [], given: typed || '没有作答' });
  };

  // A keyboard (desktop / tablet keyboard): letters take the first free tile.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Backspace') {
        e.preventDefault();
        back();
      } else if (e.key === 'Enter' && full && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        check();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        const i = game.tiles.findIndex((t, k) => t === e.key.toLowerCase() && !picked.includes(k));
        if (i >= 0) add(i);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center text-2xl font-bold">{game.title}</div>
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-violet-50 p-4 text-center">
        <div className="text-3xl font-bold text-violet-900">{game.zh}</div>
        {audio && <Speaker lang="en" text={game.answer} />}
      </div>
      <div className="flex w-full justify-center gap-1 sm:gap-1.5">
        {Array.from({ length: n }, (_, k) => {
          const i = picked[k];
          const filled = i !== undefined;
          return (
            <button
              key={k}
              type="button"
              disabled={done || !filled}
              aria-label={filled ? `去掉 ${game.tiles[i]}` : `第 ${k + 1} 个字母`}
              onClick={() => {
                sfx.tap();
                setPicked((p) => p.filter((_, j) => j !== k));
              }}
              className={`flex h-14 min-w-0 max-w-12 flex-1 items-center justify-center rounded-xl border-b-4 ${n > 7 ? 'text-2xl' : 'text-3xl'} font-bold sm:h-16 sm:text-3xl ${
                result === true
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                  : result === false
                    ? 'border-rose-400 bg-rose-50 text-rose-800'
                    : filled
                      ? 'xx-pop border-sky-300 bg-white text-slate-800'
                      : 'border-slate-300 bg-slate-100'
              }`}
            >
              {filled ? game.tiles[i] : ''}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {game.tiles.map((t, i) => {
          const used = picked.includes(i);
          return (
            <button
              key={i}
              type="button"
              disabled={used || done || full}
              onClick={() => add(i)}
              className={`h-16 min-w-16 rounded-2xl border-2 border-b-4 text-3xl font-bold transition active:translate-y-0.5 ${
                used ? 'border-slate-100 bg-slate-100 text-transparent' : 'border-slate-200 bg-white text-slate-800 disabled:text-slate-300'
              }`}
            >
              {t}
            </button>
          );
        })}
        <button
          type="button"
          aria-label="退格"
          disabled={done || picked.length === 0}
          onClick={back}
          className="h-16 min-w-20 rounded-2xl border-2 border-b-4 border-slate-200 bg-slate-50 text-3xl text-slate-600 transition active:translate-y-0.5 disabled:opacity-40"
        >
          ⌫
        </button>
      </div>
      {!done && (
        <button
          type="button"
          disabled={!full}
          onClick={check}
          className="mx-auto rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-12 py-3 text-xl font-bold text-white disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
        >
          检查
        </button>
      )}
    </div>
  );
}
