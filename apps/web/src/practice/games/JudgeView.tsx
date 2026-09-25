import { useEffect, useRef, useState } from 'react';
import { JUDGE_SLIPS, type JudgeGame, type JudgeStatement } from '../../lib/games';
import { sfx } from '../../lib/sfx';
import type { GameViewProps } from './types';

/** The two big 对 / 错 buttons (also used by 限时挑战). */
export function TrueFalseButtons({ onAnswer, disabled }: { onAnswer: (said: boolean) => void; disabled?: boolean }) {
  const btn = 'min-h-20 rounded-2xl border-b-4 text-3xl font-black text-white transition active:translate-y-0.5 disabled:opacity-60';
  return (
    <div className="grid grid-cols-2 gap-4">
      <button type="button" disabled={disabled} onClick={() => onAnswer(true)} className={`${btn} border-emerald-700 bg-emerald-500`}>
        ✔ 对
      </button>
      <button type="button" disabled={disabled} onClick={() => onAnswer(false)} className={`${btn} border-rose-700 bg-rose-500`}>
        ✘ 错
      </button>
    </div>
  );
}

/** A statement on a big card, green / red for a moment after answering. */
export function StatementCard({ s, flash }: { s: JudgeStatement; flash: 'right' | 'wrong' | null }) {
  return (
    <div
      className={`flex min-h-32 items-center justify-center rounded-2xl border-2 p-4 text-center text-3xl font-bold transition-colors ${
        flash === 'right' ? 'border-emerald-400 bg-emerald-50' : flash === 'wrong' ? 'xx-shake border-rose-400 bg-rose-50' : 'border-slate-200 bg-white'
      }`}
    >
      {s.text}
    </div>
  );
}

/** 判断: one statement after another, 对 or 错; right with at most JUDGE_SLIPS slips. */
export function JudgeView({ game, onDone, done }: GameViewProps<JudgeGame>) {
  const [idx, setIdx] = useState(0);
  const [said, setSaid] = useState<boolean[]>([]);
  const [flash, setFlash] = useState<'right' | 'wrong' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    setIdx(0);
    setSaid([]);
    setFlash(null);
    return () => clearTimeout(timer.current);
  }, [game]);

  const s = game.statements[Math.min(idx, game.statements.length - 1)];
  const answer = (v: boolean) => {
    if (flash || done || idx >= game.statements.length) return;
    const ok = v === s.truth;
    if (ok) sfx.right();
    else sfx.wrong();
    const next = [...said, v];
    setSaid(next);
    setFlash(ok ? 'right' : 'wrong');
    timer.current = setTimeout(
      () => {
        setFlash(null);
        setIdx((i) => i + 1);
        if (next.length === game.statements.length) {
          const wrong = game.statements.filter((x, i) => next[i] !== x.truth);
          onDone({
            correct: wrong.length <= JUDGE_SLIPS,
            missedWords: [...new Set(wrong.flatMap((x) => (x.word ? [x.word] : [])))],
            given: wrong.length ? `判断错 ${wrong.length} 题` : '全部判断对',
          });
        }
      },
      ok ? 700 : 1600,
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center text-2xl font-bold">{game.title}</div>
      <div className="flex justify-center gap-2">
        {game.statements.map((x, i) => (
          <span
            key={i}
            className={`h-4 w-10 rounded-full ${
              i >= said.length ? (i === idx ? 'bg-sky-400' : 'bg-slate-200') : said[i] === x.truth ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
        ))}
      </div>
      <StatementCard s={s} flash={flash} />
      <div className="min-h-8 text-center text-lg font-bold">
        {flash === 'right' && <span className="text-emerald-600">判断对了！</span>}
        {flash === 'wrong' && <span className="text-rose-600">{s.truth ? '这句是对的哦' : `应该是：${s.fix}`}</span>}
      </div>
      {!done && idx < game.statements.length && <TrueFalseButtons onAnswer={answer} disabled={!!flash} />}
      {said.length > 0 && <div className="text-center text-slate-500">错 {JUDGE_SLIPS} 题以内都算对</div>}
    </div>
  );
}
