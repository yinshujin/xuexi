import { useEffect, useMemo, useState } from 'react';
import type { ChildProfile } from '@xuexi/shared';
import { useApp } from '../lib/store';
import { href } from '../lib/router';
import { attemptsOf, childKps, openMistakes, progressMap } from '../lib/learning';
import { dayKey } from '../lib/format';
import { listBooks } from '../lib/books';
import { kvGet } from '../lib/db';
import { dailyDoneKey } from './PracticePage';
import { Card, Page } from '../components/ui';

function streakDays(days: Set<string>, now: number): number {
  let n = 0;
  for (let t = now; days.has(dayKey(t)); t -= 86_400_000) n++;
  return n;
}

export function ChildHome({ child }: { child: ChildProfile }) {
  const { eventsOf, family } = useApp();
  const events = eventsOf(child.id);
  const [bookCount, setBookCount] = useState<number | null>(null);
  const [dailyDone, setDailyDone] = useState(false);
  useEffect(() => {
    listBooks().then((b) => setBookCount(b.length), () => setBookCount(0));
    kvGet<boolean>(dailyDoneKey(child.id)).then((d) => setDailyDone(!!d));
  }, [child.id]);
  const now = Date.now();
  const stats = useMemo(() => {
    const attempts = attemptsOf(events);
    const today = dayKey(now);
    const todays = attempts.filter((a) => dayKey(a.at) === today);
    const days = new Set(events.map((e) => dayKey(e.at)));
    const progress = progressMap(events, family.settings, now);
    const kps = childKps(child);
    const mastered = kps.filter((k) => progress.get(k.kp.id)?.status === 'mastered').length;
    const reviewDue = kps.filter((k) => progress.get(k.kp.id)?.reviewDue).length;
    const lastKp = [...events].reverse().find((e) => e.type === 'attempt')?.kpId;
    return {
      todayCount: todays.length,
      todayCorrect: todays.filter((a) => a.correct).length,
      streak: streakDays(days, now),
      mastered,
      total: kps.filter((k) => k.kp.practice.length > 0).length,
      reviewDue,
      mistakes: openMistakes(events).length,
      lastKp: kps.find((k) => k.kp.id === lastKp),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, family.settings, child]);

  const tile = 'flex flex-col items-center justify-center gap-1 rounded-3xl p-5 text-center shadow-sm transition active:scale-95';
  return (
    <Page
      title={
        <span>
          {child.avatar} {child.name}，你好！
        </span>
      }
      back="/"
      right={stats.streak > 0 ? <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">🔥 连续 {stats.streak} 天</span> : undefined}
    >
      {dailyDone ? (
        <Card className="mb-4 flex flex-wrap items-center gap-4 bg-gradient-to-r from-emerald-500 to-teal-400 text-white ring-0">
          <span className="text-6xl">✅</span>
          <div className="flex-1">
            <div className="text-2xl font-bold">今日任务完成！</div>
            <div className="text-lg opacity-90">
              今天做了 {stats.todayCount} 题，对了 {stats.todayCorrect} 题。还想多练，就来加练一组吧。
            </div>
          </div>
          <a href={href(`/c/${child.id}/practice/extra`)} className="rounded-full bg-white/25 px-5 py-3 text-xl font-bold">
            💪 加练 →
          </a>
          <a href={href(`/c/${child.id}/practice/daily`)} className="text-sm underline opacity-80">
            再做一遍今日任务
          </a>
        </Card>
      ) : (
        <a href={href(`/c/${child.id}/practice/daily`)}>
          <Card className="mb-4 flex items-center gap-4 bg-gradient-to-r from-sky-500 to-emerald-400 text-white ring-0">
            <span className="text-6xl">📅</span>
            <div className="flex-1">
              <div className="text-2xl font-bold">今日任务</div>
              <div className="text-lg opacity-90">
                {stats.todayCount > 0 ? `今天已做 ${stats.todayCount} 题，对了 ${stats.todayCorrect} 题` : '口算热身 → 复习 → 错题 → 新练习 → 拔高'}
              </div>
            </div>
            <span className="rounded-full bg-white/25 px-5 py-3 text-xl font-bold">开始 →</span>
          </Card>
        </a>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <a href={href(`/c/${child.id}/map`)} className={`${tile} bg-white`}>
          <span className="text-5xl">🗺️</span>
          <span className="text-xl font-bold">知识地图</span>
          <span className="text-slate-500">已掌握 {stats.mastered}/{stats.total}</span>
        </a>
        <a href={href(`/c/${child.id}/mistakes`)} className={`${tile} bg-white`}>
          <span className="text-5xl">📕</span>
          <span className="text-xl font-bold">错题本</span>
          <span className="text-slate-500">{stats.mistakes} 道待消灭</span>
        </a>
        <a href={href(`/c/${child.id}/practice/review`)} className={`${tile} bg-white ${stats.reviewDue ? '' : 'opacity-60'}`}>
          <span className="text-5xl">🔁</span>
          <span className="text-xl font-bold">复习</span>
          <span className="text-slate-500">{stats.reviewDue ? `${stats.reviewDue} 个知识点到期` : '暂时没有'}</span>
        </a>
        {stats.lastKp ? (
          <a href={href(`/c/${child.id}/kp/${stats.lastKp.kp.id}`)} className={`${tile} bg-white`}>
            <span className="text-5xl">▶️</span>
            <span className="text-xl font-bold">继续学习</span>
            <span className="line-clamp-1 text-slate-500">{stats.lastKp.kp.title}</span>
          </a>
        ) : (
          <a href={href(`/c/${child.id}/map`)} className={`${tile} bg-white`}>
            <span className="text-5xl">🚀</span>
            <span className="text-xl font-bold">开始学习</span>
            <span className="text-slate-500">从第一单元开始</span>
          </a>
        )}
      </div>
      <a href={href(`/c/${child.id}/books`)}>
        <Card className="mt-4 flex items-center gap-4 bg-gradient-to-r from-violet-500 to-fuchsia-400 text-white ring-0">
          <span className="text-5xl">📚</span>
          <div className="flex-1">
            <div className="text-2xl font-bold">绘本跟读</div>
            <div className="text-lg opacity-90">
              {bookCount === null
                ? '听读 / 跟读 / 自己读'
                : bookCount > 0
                  ? `${bookCount} 本英文绘本 · 听读 / 跟读 / 自己读`
                  : '请爸爸妈妈先在家长模式里导入绘本'}
            </div>
          </div>
          <span className="rounded-full bg-white/25 px-5 py-3 text-xl font-bold">去读 →</span>
        </Card>
      </a>
    </Page>
  );
}
