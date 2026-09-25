import { useEffect, useRef, useState } from 'react';
import { timedEarned, type TimedGame } from '../../lib/games';
import { sfx } from '../../lib/sfx';
import { StatementCard, TrueFalseButtons } from './JudgeView';
import type { GameViewProps } from './types';

type Stage = 'ready' | 'run' | 'over';

/**
 * ⚡限时挑战: the rule and a 开始 button first (the clock starts only then);
 * then 对 / 错 as fast as possible until the time is up or the statements run out.
 */
export function TimedView({ game, onDone, done }: GameViewProps<TimedGame>) {
  const [stage, setStage] = useState<Stage>('ready');
  const [idx, setIdx] = useState(0);
  const [right, setRight] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [combo, setCombo] = useState(0);
  const [left, setLeft] = useState(game.seconds);
  const [flash, setFlash] = useState<'right' | 'wrong' | null>(null);
  const startAt = useRef(0);
  const finished = useRef(false);
  const tally = useRef({ right: 0, wrong: 0 });

  useEffect(() => {
    setStage('ready');
    setIdx(0);
    setRight(0);
    setWrong(0);
    setCombo(0);
    setLeft(game.seconds);
    finished.current = false;
    tally.current = { right: 0, wrong: 0 };
  }, [game]);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    setStage('over');
    const { right: r, wrong: w } = tally.current;
    const earned = timedEarned(game, r, w);
    onDone({ correct: earned > 0, earned, missedWords: [], given: `${game.seconds} 秒答对 ${r} 题，答错 ${w} 题` });
  };

  // The clock: from the tap on 开始.
  useEffect(() => {
    if (stage !== 'run') return;
    const t = setInterval(() => {
      const rest = Math.max(0, game.seconds - (Date.now() - startAt.current) / 1000);
      setLeft(rest);
      if (rest <= 0) finish();
    }, 100);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, game]);

  const start = () => {
    sfx.tap();
    startAt.current = Date.now();
    setStage('run');
  };

  const answer = (v: boolean) => {
    if (stage !== 'run' || finished.current) return;
    const s = game.statements[idx];
    const ok = v === s.truth;
    if (ok) {
      tally.current.right++;
      setRight((n) => n + 1);
      const c = combo + 1;
      setCombo(c);
      if (c % 5 === 0) sfx.combo();
      else sfx.tap();
    } else {
      tally.current.wrong++;
      setWrong((n) => n + 1);
      setCombo(0);
      sfx.wrong();
    }
    setFlash(ok ? 'right' : 'wrong');
    setTimeout(() => setFlash(null), 250);
    if (idx + 1 >= game.statements.length) finish();
    else setIdx(idx + 1);
  };

  const stars = timedEarned(game, right, wrong);

  if (stage === 'ready') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="text-6xl">⚡</div>
        <div className="text-2xl font-bold">{game.title}</div>
        <div className="text-lg text-slate-600">看到一句话，马上判断 ✔ 对 还是 ✘ 错，{game.seconds} 秒内做得越多越好！</div>
        <div className="w-full max-w-md rounded-2xl bg-amber-50 p-4 text-left text-lg text-amber-900">
          <div>
            ⭐⭐ 满分：答对 <b>{game.full.right}</b> 题以上，答错不超过 <b>{game.full.wrong}</b> 题
          </div>
          <div>
            ⭐ 一半分：答对 <b>{game.pass.right}</b> 题以上，答错不超过 <b>{game.pass.wrong}</b> 题
          </div>
        </div>
        <div className="text-xl font-bold">准备好了吗？</div>
        <button
          type="button"
          disabled={done}
          onClick={start}
          className="rounded-2xl border-b-4 border-amber-600 bg-amber-400 px-14 py-4 text-2xl font-black text-white active:translate-y-0.5"
        >
          开始！
        </button>
      </div>
    );
  }

  const share = left / game.seconds;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className={`w-16 text-3xl font-black tabular-nums ${left <= 10 ? 'text-rose-600' : 'text-slate-700'}`}>{Math.ceil(left)}″</span>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-[width] duration-100 ${left <= 10 ? 'bg-rose-500' : 'bg-amber-400'}`}
            style={{ width: `${share * 100}%` }}
          />
        </div>
        <span className={`min-w-14 text-right text-xl font-bold ${combo >= 3 ? 'text-orange-500' : 'text-slate-400'}`}>🔥{combo}</span>
      </div>
      <div className="flex justify-center gap-6 text-xl font-bold">
        <span className="text-emerald-600">✔ {right}</span>
        <span className="text-rose-600">✘ {wrong}</span>
      </div>
      {stage === 'run' ? (
        <>
          <StatementCard s={game.statements[idx]} flash={flash} />
          <TrueFalseButtons onAnswer={answer} disabled={done} />
        </>
      ) : (
        <div className="xx-pop flex flex-col items-center gap-2 rounded-2xl bg-amber-50 p-6 text-center">
          <div className="text-5xl">{stars === 2 ? '⭐⭐' : stars === 1 ? '⭐' : '⏰'}</div>
          <div className="text-2xl font-black text-amber-800">
            {left <= 0 ? '时间到！' : '全部答完了！'}答对 {right} 题，答错 {wrong} 题
          </div>
        </div>
      )}
    </div>
  );
}
