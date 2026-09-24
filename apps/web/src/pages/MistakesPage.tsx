import { useMemo } from 'react';
import { findKnowledgePoint } from '@xuexi/curriculum';
import type { ChildProfile } from '@xuexi/shared';
import { describeQuestionForParent } from '@xuexi/practice';
import { useApp } from '../lib/store';
import { href } from '../lib/router';
import { makeQuestion, openMistakes, tagLabel } from '../lib/learning';
import { Btn, Card, Empty, Page } from '../components/ui';

export function MistakesPage({ child }: { child: ChildProfile }) {
  const { eventsOf } = useApp();
  const events = eventsOf(child.id);
  const mistakes = useMemo(() => openMistakes(events), [events]);
  const byKp = new Map<string, typeof mistakes>();
  for (const m of mistakes) byKp.set(m.kpId, [...(byKp.get(m.kpId) ?? []), m]);

  return (
    <Page title="错题本" back={`/c/${child.id}`}>
      {mistakes.length === 0 ? (
        <Empty>没有错题，太棒了！🎉</Empty>
      ) : (
        <>
          <Card className="mb-4 flex items-center gap-4">
            <span className="flex-1 text-lg">
              还有 <b>{mistakes.length}</b> 道错题。原题做对，再在不同的两天各做对一道同类题，就能消灭它。
            </span>
            <a href={href(`/c/${child.id}/practice/mistakes?back=${encodeURIComponent(`/c/${child.id}/mistakes`)}`)}>
              <Btn>开始重练</Btn>
            </a>
          </Card>
          {[...byKp].map(([kpId, list]) => (
            <Card key={kpId} className="mb-3">
              <h2 className="mb-2 text-lg font-bold">{findKnowledgePoint(kpId)?.kp.title ?? kpId}</h2>
              <ul className="divide-y divide-slate-100">
                {list.map((m) => (
                  <li key={m.key} className="flex flex-wrap items-center gap-2 py-2">
                    <span className="flex-1 font-mono text-lg">{describeQuestionForParent(makeQuestion(m.ref))}</span>
                    {m.errorTags.map((t) => (
                      <span key={t} className="rounded-full bg-rose-50 px-2 py-0.5 text-sm text-rose-700">
                        {tagLabel(t)}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </>
      )}
    </Page>
  );
}
