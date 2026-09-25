import { useEffect, useMemo, useState } from 'react';
import { BOOK_EVENT_PREFIX, EXAM_EVENT_PREFIX } from '@xuexi/shared';
import { SUBJECT_LABEL } from '@xuexi/curriculum';
import { examHistory, findPaper, medalOf, MEDAL_ICON } from '../lib/exams';
import { useApp } from '../lib/store';
import { attemptsOf, childKps, openMistakes, progressMap, tagLabel } from '../lib/learning';
import { dayKey } from '../lib/format';
import { Btn, Card, Empty } from '../components/ui';

const DAY = 86_400_000;

export function ReportView() {
  const { family, eventsOf, loadChild } = useApp();
  const [childId, setChildId] = useState(family.children[0]?.id ?? '');
  useEffect(() => {
    if (childId) loadChild(childId);
  }, [childId, loadChild]);
  const child = family.children.find((c) => c.id === childId);
  const events = eventsOf(childId);

  const report = useMemo(() => {
    if (!child) return null;
    const now = Date.now();
    const attempts = attemptsOf(events);
    const days = Array.from({ length: 7 }, (_, i) => dayKey(now - (6 - i) * DAY));
    const perDay = days.map((d) => {
      const dayEvents = events.filter((e) => dayKey(e.at) === d);
      const a = dayEvents.filter((e) => e.type === 'attempt');
      const ms = dayEvents.reduce((n, e) => n + Math.min(e.durationMs, e.type === 'attempt' ? 5 * 60_000 : 60 * 60_000), 0);
      return { day: d.slice(5), minutes: Math.round(ms / 60_000), attempts: a.length, correct: a.filter((x) => x.type === 'attempt' && x.correct).length };
    });
    const recent = attempts.filter((a) => a.at > now - 30 * DAY);
    const tagCounts = new Map<string, number>();
    for (const a of recent) for (const t of a.errorTags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    const tags = [...tagCounts].sort((a, b) => b[1] - a[1]).slice(0, 8);
    const progress = progressMap(events, family.settings, now);
    const kps = childKps(child).filter((k) => k.kp.practice.length > 0);
    const done = events.filter((e) => e.type === 'lesson' && e.completed);
    const ids = done.map((e) => (e.type === 'lesson' ? e.lessonId : ''));
    const lessonIds = new Set(ids.filter((id) => !id.startsWith(BOOK_EVENT_PREFIX) && !id.startsWith(EXAM_EVENT_PREFIX)));
    const booksRead = new Set(ids.filter((id) => id.startsWith(BOOK_EVENT_PREFIX))).size;
    return {
      perDay,
      tags,
      progress,
      kps,
      lessonsWatched: lessonIds.size,
      booksRead,
      exams: [...examHistory(events)].sort((a, b) => b[1].lastAt - a[1].lastAt).slice(0, 12),
      mistakes: openMistakes(events).length,
      total: attempts.length,
    };
  }, [child, events, family.settings]);

  if (family.children.length === 0) return <Empty>先在"孩子"里添加孩子档案。</Empty>;
  if (!child || !report) return null;
  const maxMin = Math.max(10, ...report.perDay.map((d) => d.minutes));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {family.children.map((c) => (
          <Btn key={c.id} tone={c.id === childId ? 'primary' : 'plain'} onClick={() => setChildId(c.id)}>
            {c.avatar} {c.name}
          </Btn>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <div className="text-3xl font-bold">{report.total}</div>
          <div className="text-slate-500">累计做题</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold">{report.lessonsWatched}</div>
          <div className="text-slate-500">看完的课{report.booksRead > 0 ? ` · 绘本 ${report.booksRead} 本` : ''}</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold">{report.mistakes}</div>
          <div className="text-slate-500">待消灭错题</div>
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 text-lg font-bold">最近 7 天</h3>
        <div className="flex h-40 items-end gap-2">
          {report.perDay.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs text-slate-500">{d.minutes}分</span>
              <div className="w-full rounded-t-lg bg-sky-400" style={{ height: `${(d.minutes / maxMin) * 100}%`, minHeight: 2 }} />
              <span className="text-xs text-slate-500">{d.day}</span>
              <span className="text-xs text-slate-400">{d.attempts ? `${d.correct}/${d.attempts}` : '-'}</span>
            </div>
          ))}
        </div>
      </Card>

      {report.exams.length > 0 && (
        <Card>
          <h2 className="mb-2 text-lg font-bold">🏆 单元闯关成绩</h2>
          <ul className="divide-y divide-slate-100">
            {report.exams.map(([id, h]) => {
              const p = findPaper(id);
              const m = medalOf(h.best);
              return (
                <li key={id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="flex-1">
                    {p ? `${SUBJECT_LABEL[p.subject]} 第 ${p.unitIndex} 单元 ${p.unitTitle} · ${p.name}` : id}
                  </span>
                  <span>
                    最好 {m ? MEDAL_ICON[m] : ''}
                    <b>{h.best}</b> 分 · 最近 {h.last} 分 · 考了 {h.times} 次
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      <Card>
        <h3 className="mb-3 text-lg font-bold">最近 30 天常见错因</h3>
        {report.tags.length === 0 ? (
          <p className="text-slate-500">暂无错题</p>
        ) : (
          <ul className="space-y-2">
            {report.tags.map(([tag, n]) => (
              <li key={tag} className="flex items-center gap-3">
                <span className="w-48 shrink-0">{tagLabel(tag)}</span>
                <div className="h-3 flex-1 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-rose-400" style={{ width: `${(n / report.tags[0][1]) * 100}%` }} />
                </div>
                <span className="w-10 text-right tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 text-lg font-bold">知识点掌握情况</h3>
        <table className="w-full text-left">
          <thead className="text-sm text-slate-500">
            <tr>
              <th className="py-1">知识点</th>
              <th>状态</th>
              <th className="text-right">题数</th>
              <th className="text-right">近期正确率</th>
            </tr>
          </thead>
          <tbody>
            {report.kps.map(({ kp, unitIndex }) => {
              const p = report.progress.get(kp.id);
              return (
                <tr key={kp.id} className="border-t border-slate-100">
                  <td className="py-2 pr-2">
                    <span className="text-sm text-slate-400">{unitIndex}.</span> {kp.title}
                  </td>
                  <td>
                    {p?.status === 'mastered' ? '⭐ 掌握' : p?.status === 'learning' ? '练习中' : '未开始'}
                    {p?.reviewDue ? ' 🔁' : ''}
                  </td>
                  <td className="text-right tabular-nums">{p?.attempts ?? 0}</td>
                  <td className="text-right tabular-nums">
                    {p && Number.isFinite(p.accuracy) ? `${Math.round(p.accuracy * 100)}%` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
