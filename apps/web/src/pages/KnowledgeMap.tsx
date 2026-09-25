import { useMemo, useState } from 'react';
import { SUBJECT_LABEL, type Subject } from '@xuexi/curriculum';
import type { ChildProfile } from '@xuexi/shared';
import { useApp } from '../lib/store';
import { href } from '../lib/router';
import { childKps, progressMap, type KpRef } from '../lib/learning';
import { Btn, Card, Page } from '../components/ui';

const STATUS_STYLE = {
  new: 'bg-white ring-slate-200',
  learning: 'bg-amber-50 ring-amber-300',
  mastered: 'bg-emerald-50 ring-emerald-400',
} as const;

export function KnowledgeMap({ child }: { child: ChildProfile }) {
  const { eventsOf, family, catalog } = useApp();
  const events = eventsOf(child.id);
  const progress = useMemo(() => progressMap(events, family.settings), [events, family.settings]);
  const allKps = childKps(child);
  const subjects = [...new Set(allKps.map((k) => k.subject))];
  const [picked, setPicked] = useState<Subject | null>(() => {
    try {
      return (localStorage.getItem('xuexi.mapSubject') as Subject | null) ?? null;
    } catch {
      return null;
    }
  });
  const subject = picked && subjects.includes(picked) ? picked : subjects[0];
  const pick = (s: Subject) => {
    setPicked(s);
    try {
      localStorage.setItem('xuexi.mapSubject', s);
    } catch {
      /* private mode */
    }
  };
  const kps = allKps.filter((k) => k.subject === subject);
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
      {subjects.length > 1 && (
        <div className="mb-4 flex gap-2">
          {subjects.map((s) => (
            <Btn key={s} tone={s === subject ? 'primary' : 'plain'} onClick={() => pick(s)}>
              {SUBJECT_LABEL[s]}
            </Btn>
          ))}
        </div>
      )}
      {[...byUnit.values()].map((list) => (
        <Card key={`${list[0].bookId}${list[0].unitIndex}`} className="mb-4">
          <h2 className="mb-3 flex flex-wrap items-center gap-3 text-xl font-bold">
            <span className="flex-1">
              第 {list[0].unitIndex} 单元 · {list[0].unitTitle}
            </span>
            {list.some(({ kp }) => kp.practice.some((p) => !p.tier)) && (
              <a
                href={href(`/c/${child.id}/exams?book=${list[0].bookId}`)}
                className="rounded-full bg-amber-100 px-3 py-1 text-base font-bold text-amber-800"
              >
                🏆 单元闯关
              </a>
            )}
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
                      {kp.writing ? ' · ✏️ 写作任务' : ''}
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
