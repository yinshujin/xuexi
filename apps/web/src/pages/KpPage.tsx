import { useMemo } from 'react';
import { findKnowledgePoint } from '@xuexi/curriculum';
import { GENERATORS, practiceSizeOf, type ChildProfile } from '@xuexi/shared';
import { useApp } from '../lib/store';
import { href } from '../lib/router';
import { coreSpecs, progressMap, setShape } from '../lib/learning';
import { wordsOf } from '../lib/dictation';
import { minutes } from '../lib/format';
import { Card, Empty, Page } from '../components/ui';

const SPEED_GENERATORS = new Set(['g2.mul.table', 'g2.div.table', 'g2.addsub.2d', 'g4.oral.muldiv']);

export function KpPage({ child, kpId }: { child: ChildProfile; kpId: string }) {
  const { catalog, eventsOf, family } = useApp();
  const ref = findKnowledgePoint(kpId);
  const events = eventsOf(child.id);
  const progress = useMemo(() => progressMap(events, family.settings).get(kpId), [events, family.settings, kpId]);
  if (!ref) return <Page title="找不到这个知识点" back={`/c/${child.id}/map`}><Empty>知识点不存在</Empty></Page>;
  const { kp, unit } = ref;
  const watched = new Set(events.filter((e) => e.type === 'lesson' && e.completed).map((e) => (e.type === 'lesson' ? e.lessonId : '')));
  const back = encodeURIComponent(`/c/${child.id}/kp/${kpId}`);
  const hasSpeed = coreSpecs(kp).some((p) => SPEED_GENERATORS.has(p.generatorId));
  const shape = setShape(kp, practiceSizeOf(family.settings));
  const dictation = wordsOf(kpId);
  const challenges = shape.filter((x) => x !== 'core').length;

  return (
    <Page title={kp.title} back={`/c/${child.id}/map`}>
      <p className="mb-4 text-slate-500">
        第 {unit.index} 单元 · {unit.title}
      </p>
      <Card className="mb-4">
        <h2 className="mb-2 text-lg font-bold">这节要学会</h2>
        <ul className="list-disc space-y-1 pl-6 text-lg">
          {kp.objectives.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
        {progress && kp.practice.length > 0 && (
          <div className="mt-4">
            <div className="mb-1 text-sm text-slate-500">
              {progress.status === 'mastered' ? '已掌握 ⭐' : progress.status === 'learning' ? '练习中' : '还没开始'} · 练了 {progress.attempts} 题
              {Number.isFinite(progress.accuracy) ? ` · 最近正确率 ${Math.round(progress.accuracy * 100)}%` : ''}
            </div>
            <div className="h-3 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${Math.min(100, Math.round((Number.isFinite(progress.accuracy) ? progress.accuracy : 0) * 100))}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      <h2 className="mb-2 text-xl font-bold">📺 看课</h2>
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {kp.lessons.map((l) => {
          const entry = catalog?.lessons[l.id];
          const inner = (
            <Card className={`flex h-full items-center gap-3 ${entry ? 'transition active:scale-95' : 'opacity-50'}`}>
              <span className="text-4xl">{l.kind === 'lecture' ? '🎓' : '💡'}</span>
              <span className="flex-1">
                <span className="block text-sm text-slate-500">{l.kind === 'lecture' ? '讲解课' : '技巧课'}</span>
                <span className="block text-lg font-medium leading-snug">{l.title}</span>
                <span className="text-sm text-slate-500">
                  {entry ? `约 ${minutes(entry.durationSec)}` : '还没有发布'}
                  {watched.has(l.id) ? ' · ✓ 看过了' : ''}
                </span>
              </span>
            </Card>
          );
          return entry ? (
            <a key={l.id} href={href(`/c/${child.id}/lesson/${l.id}?back=${back}`)}>
              {inner}
            </a>
          ) : (
            <div key={l.id}>{inner}</div>
          );
        })}
      </div>

      {dictation.length > 0 && (
        <a href={href(`/c/${child.id}/dictation?kp=${kpId}&back=${back}`)} className="mb-4 block">
          <Card className="flex items-center gap-3 bg-violet-500 text-white ring-0 transition active:scale-95">
            <span className="text-4xl">✍️</span>
            <span className="flex-1">
              <span className="block text-xl font-bold">看拼音写词语（{dictation.length} 个）</span>
              <span className="opacity-90">课本听写词语：看拼音在本子上写，写完对答案</span>
            </span>
          </Card>
        </a>
      )}
      <h2 className="mb-2 text-xl font-bold">✏️ 专项练习</h2>
      {kp.practice.length === 0 ? (
        <Empty>这个知识点以看课和课本练习为主，暂时没有电子练习题。</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <a href={href(`/c/${child.id}/practice/kp?kp=${kpId}&back=${back}`)}>
            <Card className="flex items-center gap-3 bg-sky-500 text-white ring-0 transition active:scale-95">
              <span className="text-4xl">🎯</span>
              <span className="flex-1">
                <span className="block text-xl font-bold">专项练习 {shape.length} 题</span>
                <span className="opacity-90">
                  {[...new Set(coreSpecs(kp).map((p) => GENERATORS.find((g) => g.id === p.generatorId)?.title))].join('、')}
                  {challenges > 0 && `，最后 ${challenges} 道拔高题、创新题`}
                </span>
              </span>
            </Card>
          </a>
          {hasSpeed && (
            <a href={href(`/c/${child.id}/practice/speed?kp=${kpId}&back=${back}`)}>
              <Card className="flex items-center gap-3 transition active:scale-95">
                <span className="text-4xl">⚡</span>
                <span className="flex-1">
                  <span className="block text-xl font-bold">口算速练</span>
                  <span className="text-slate-500">1 分钟能做对几题？</span>
                </span>
              </Card>
            </a>
          )}
        </div>
      )}
    </Page>
  );
}
