import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { dayKey } from '../lib/format';
import { navigate } from '../lib/router';

const BREAK_SECONDS = 20;

/**
 * Eye-care reminder every `eyeBreakMinutes` of continuous use, and a stop screen
 * once today's recorded learning time exceeds `dailyMinutes`.
 */
export function EyeBreak({ childId }: { childId: string }) {
  const { family, eventsOf } = useApp();
  const { eyeBreakMinutes, dailyMinutes } = family.settings;
  const [since, setSince] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [breakLeft, setBreakLeft] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (breakLeft === 0 && now - since >= eyeBreakMinutes * 60_000) setBreakLeft(BREAK_SECONDS);
  }, [now, since, eyeBreakMinutes, breakLeft]);

  useEffect(() => {
    if (breakLeft <= 0) return;
    const t = setTimeout(() => {
      if (breakLeft === 1) setSince(Date.now());
      setBreakLeft(breakLeft - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [breakLeft]);

  const todayMinutes = useMemo(() => {
    const today = dayKey(now);
    const ms = eventsOf(childId)
      .filter((e) => dayKey(e.at) === today)
      .reduce((n, e) => n + Math.min(e.durationMs, e.type === 'attempt' ? 5 * 60_000 : 60 * 60_000), 0);
    return Math.round(ms / 60_000);
  }, [eventsOf, childId, now]);

  if (todayMinutes >= dailyMinutes) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-sky-500 p-6 text-center text-white">
        <div className="text-7xl">🌙</div>
        <div className="text-3xl font-bold">今天已经学了 {todayMinutes} 分钟，真棒！</div>
        <div className="text-xl">休息一下，明天再来吧。（家长可以在家长模式调整每日时长）</div>
        <button type="button" onClick={() => navigate('/')} className="rounded-full bg-white px-8 py-4 text-xl font-bold text-sky-600">
          好的
        </button>
      </div>
    );
  }
  if (breakLeft > 0) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-emerald-500 p-6 text-center text-white">
        <div className="text-7xl">👀</div>
        <div className="text-3xl font-bold">休息一下眼睛</div>
        <div className="text-xl">看看窗外远处的绿色，眨眨眼睛</div>
        <div className="text-6xl font-bold tabular-nums">{breakLeft}</div>
      </div>
    );
  }
  return null;
}
