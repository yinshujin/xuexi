import { useEffect, useState } from 'react';
import { MATCH_SLIPS, type MatchGame } from '../../lib/games';
import { sfx } from '../../lib/sfx';
import type { GameViewProps } from './types';

/** 连连看: tap one on each side; a wrong pair shakes. Right when at most MATCH_SLIPS slips. */
export function MatchView({ game, onDone }: GameViewProps<MatchGame>) {
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
