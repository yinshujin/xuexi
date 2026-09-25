import { useEffect, useState } from 'react';
import { CLASSIFY_SLIPS, classifySlips, type ClassifyGame } from '../../lib/games';
import { sfx } from '../../lib/sfx';
import type { GameViewProps } from './types';

const BUCKET_TONES = ['border-sky-300 bg-sky-50', 'border-amber-300 bg-amber-50', 'border-violet-300 bg-violet-50'];

/** 分类: tap a card, then the bucket it belongs in (tap a placed card to take it back); 检查 once all are placed. */
export function ClassifyView({ game, onDone, done }: GameViewProps<ClassifyGame>) {
  const [placed, setPlaced] = useState<Array<number | null>>(() => game.cards.map(() => null));
  const [sel, setSel] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    setPlaced(game.cards.map(() => null));
    setSel(null);
    setChecked(false);
  }, [game]);

  const locked = done || checked;
  const all = placed.every((p) => p !== null);
  const put = (bucket: number) => {
    if (sel === null || locked) return;
    sfx.tap();
    setPlaced((p) => p.map((x, i) => (i === sel ? bucket : x)));
    setSel(null);
  };
  const check = () => {
    const slips = classifySlips(game, placed);
    setChecked(true);
    const missed = game.words ? game.cards.flatMap((c, i) => (placed[i] !== c.bucket ? [c.text] : [])) : [];
    onDone({ correct: slips <= CLASSIFY_SLIPS, missedWords: missed, given: slips ? `放错 ${slips} 张` : '全部放对' });
  };
  const card = (i: number) => {
    const wrong = checked && placed[i] !== game.cards[i].bucket;
    const right = checked && !wrong;
    return (
      <button
        key={i}
        type="button"
        disabled={locked}
        onClick={(e) => {
          e.stopPropagation();
          // A card is picked and this one is in a bucket: the tap means that bucket.
          if (sel !== null && sel !== i && placed[i] !== null) return put(placed[i]!);
          sfx.tap();
          if (placed[i] !== null) {
            setPlaced((p) => p.map((x, k) => (k === i ? null : x)));
            setSel(i);
          } else setSel(sel === i ? null : i);
        }}
        className={`min-h-12 rounded-xl border-2 border-b-4 px-3 py-1 text-xl font-bold transition active:translate-y-0.5 ${
          wrong
            ? 'xx-shake border-rose-400 bg-rose-50 text-rose-800'
            : right
              ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
              : sel === i
                ? 'xx-pop -translate-y-1 border-sky-500 bg-sky-100 text-sky-900 shadow'
                : 'border-slate-200 bg-white text-slate-700'
        }`}
      >
        {game.cards[i].text}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center text-2xl font-bold">{game.title}</div>
      <div className="text-center text-lg text-slate-500">{sel === null ? '先点一张卡片，再点它该去的篮子' : '现在点一个篮子 👇'}</div>
      <div className="flex min-h-16 flex-wrap items-center justify-center gap-2 rounded-2xl bg-slate-50 p-3">
        {placed.every((p) => p !== null) ? (
          <span className="text-lg text-slate-400">{checked ? '' : '都放好了，检查一下吧！'}</span>
        ) : (
          game.cards.map((_, i) => (placed[i] === null ? card(i) : null))
        )}
      </div>
      <div className={`grid gap-3 ${game.buckets.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {game.buckets.map((b, k) => (
          <div
            key={k}
            role="button"
            tabIndex={0}
            onClick={() => put(k)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && put(k)}
            className={`flex min-h-44 flex-col items-center gap-2 rounded-2xl border-2 border-b-4 p-2 transition ${BUCKET_TONES[k]} ${
              sel !== null && !locked ? 'cursor-pointer ring-4 ring-sky-200' : ''
            }`}
          >
            <div className="text-center text-lg font-black text-slate-700">{b}</div>
            <div className="flex flex-wrap justify-center gap-2">{game.cards.map((_, i) => (placed[i] === k ? card(i) : null))}</div>
          </div>
        ))}
      </div>
      {checked && (
        <div className="text-center text-slate-500">
          {classifySlips(game, placed) ? `放错 ${classifySlips(game, placed)} 张（错 ${CLASSIFY_SLIPS} 张以内都算对）` : '全部放对！'}
        </div>
      )}
      {!locked && (
        <button
          type="button"
          disabled={!all}
          onClick={check}
          className="mx-auto rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-12 py-3 text-xl font-bold text-white disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
        >
          检查
        </button>
      )}
    </div>
  );
}
