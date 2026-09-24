import type { ErrorTag } from '@xuexi/shared';
import type { KnowledgePoint, LessonSpec, PracticeSpec, Unit } from '../types';

/** Authoring shape for a knowledge point; ids of the KP and its lessons are derived. */
export interface KpInput {
  /** Short kebab-case English slug, unique within the unit. */
  slug: string;
  title: string;
  objectives: string[];
  keyPoints: string[];
  /** Full knowledge point ids. */
  prerequisites?: string[];
  localContexts?: string[];
  lecture: { title: string; minutes: number; focus: string };
  techniques?: Array<{
    slug: string;
    title: string;
    minutes: number;
    focus: string;
    /** Math only: the error tags the technique fixes. */
    remedies?: ErrorTag[];
  }>;
  practice: PracticeSpec[];
}

export function kp(unitId: string, input: KpInput): KnowledgePoint {
  const id = `${unitId}.${input.slug}`;
  const lessons: LessonSpec[] = [
    {
      id: `${id}.lecture`,
      kind: 'lecture',
      title: input.lecture.title,
      minutes: input.lecture.minutes,
      focus: input.lecture.focus,
    },
    ...(input.techniques ?? []).map((t): LessonSpec => ({
      id: `${id}.tech-${t.slug}`,
      kind: 'technique',
      title: t.title,
      minutes: t.minutes,
      focus: t.focus,
      ...(t.remedies && t.remedies.length > 0 ? { remedies: t.remedies } : {}),
    })),
  ];
  const out: KnowledgePoint = {
    id,
    title: input.title,
    objectives: input.objectives,
    keyPoints: input.keyPoints,
    prerequisites: input.prerequisites ?? [],
    lessons,
    practice: input.practice,
  };
  if (input.localContexts && input.localContexts.length > 0)
    out.localContexts = input.localContexts;
  return out;
}

export function unit(bookId: string, index: number, title: string, kps: KpInput[]): Unit {
  const id = `${bookId}.u${index}`;
  return { id, index, title, knowledgePoints: kps.map((k) => kp(id, k)) };
}
