import { useMemo } from 'react';
import type { ChildProfile } from '@xuexi/shared';
import { useApp } from '../lib/store';
import { href } from '../lib/router';
import { childKps, progressMap, type KpRef } from '../lib/learning';
import { Card, Page } from '../components/ui';

const STATUS_STYLE = {
  new: 'bg-white ring-slate-200',
  learning: 'bg-amber-50 ring-amber-300',
  mastered: 'bg-emerald-50 ring-emerald-400',
} as const;

export function KnowledgeMap({ child }: { child: ChildProfile }) {
  const { eventsOf, family, catalog } = useApp();
  const events = eventsOf(child.id);
  const progress = useMemo(() => progressMap(events, family.settings), [events, family.settings]);
  const kps = childKps(child);
  const byUnit = new Map<string, KpRef[]>();
  for (const k of kps) {
    const key = `${k.bookId}|${k.unitIndex}`;
    byUnit.set(key, [...(byUnit.get(key) ?? []), k]);
  }
  const watched = new Set(events.filter((e) => e.type === 'lesson' && e.completed).map((e) => (e.type === 'lesson' ? e.lessonId : '')));

  return (
    <Page title="知识地图" back={`/c/${child.id}`}>
      <div className="mb-4 flex flex-wrap gap-3 text-sm text-slate-600">
        <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">未开始</span>
        <span className="rounded-full bg-amber-50 px-3 py-1 ring-1 ring-amber-300">练习中</span>
        <span className="rounded-full bg-emerald-50 px-3 py-1 ring-1 ring-emerald-400">已掌握 ⭐</span>
        <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">🔁 需要复习</span>
      </div>
      {[...byUnit.values()].map((list) => (
        <Card key={`${list[0].bookId}${list[0].unitIndex}`} className="mb-4">
          <h2 className="mb-3 text-xl font-bold">
            第 {list[0].unitIndex} 单元 · {list[0].unitTitle}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map(({ kp }) => {
              const p = progress.get(kp.id);
              const status = p?.status ?? 'new';
              const lecture = kp.lessons.find((l) => l.kind === 'lecture');
              const hasLesson = lecture && catalog?.lessons[lecture.id];
              return (
                <a
                  key={kp.id}
                  href={href(`/c/${child.id}/kp/${kp.id}`)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 ring-2 transition active:scale-95 ${STATUS_STYLE[status]}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-medium leading-snug">{kp.title}</span>
                    <span className="text-sm text-slate-500">
                      {hasLesson ? (lecture && watched.has(lecture.id) ? '✓ 已看讲解' : '📺 有讲解课') : ''}
                      {kp.practice.length > 0 && p ? ` · 练了 ${p.attempts} 题` : ''}
                    </span>
                  </span>
                  {p?.reviewDue && <span title="需要复习">🔁</span>}
                  {status === 'mastered' && <span className="text-2xl">⭐</span>}
                </a>
              );
            })}
          </div>
        </Card>
      ))}
    </Page>
  );
}
