/**
 * Adapter between the app and @xuexi/practice / @xuexi/curriculum.
 * Pages only use the functions here, so engine API changes stay local.
 */
import { BOOKS, type KnowledgePoint, type PracticeSpec } from '@xuexi/curriculum';
import { ERROR_TAGS } from '@xuexi/shared';
import type { AttemptEvent, ChildProfile, FamilySettings, LearningEvent, PracticeMode, QuestionRef } from '@xuexi/shared';
import * as practice from '@xuexi/practice';
import type { Question } from '@xuexi/practice';
import { dayKey } from './format';

export interface KpRef {
  bookId: string;
  bookTitle: string;
  unitIndex: number;
  unitTitle: string;
  kp: KnowledgePoint;
}

export function childKps(child: ChildProfile): KpRef[] {
  return BOOKS.filter((b) => child.bookIds.includes(b.id)).flatMap((b) =>
    b.units.flatMap((u) =>
      u.knowledgePoints.map((kp) => ({ bookId: b.id, bookTitle: b.title, unitIndex: u.index, unitTitle: u.title, kp })),
    ),
  );
}

export function attemptsOf(events: LearningEvent[]): AttemptEvent[] {
  return events.filter((e): e is AttemptEvent => e.type === 'attempt');
}

export type KpStatus = 'new' | 'learning' | 'mastered';

export interface KpProgress {
  status: KpStatus;
  attempts: number;
  /** Accuracy over the recent window, 0..1 (NaN when no attempts). */
  accuracy: number;
  theta: number;
  reviewDue: boolean;
}

/** One question to ask in a session. */
export interface SessionItem {
  kpId: string;
  ref: Extract<QuestionRef, { source: 'generator' }>;
  mode: PracticeMode;
  /** Short label shown above the question, e.g. "错题重练". */
  label?: string;
}

function targetDifficulty(kp: KnowledgePoint): number {
  return Math.max(...kp.practice.map((p) => p.maxDifficulty), 1);
}

const kpIndex = () => new Map(BOOKS.flatMap((b) => b.units.flatMap((u) => u.knowledgePoints.map((kp) => [kp.id, kp] as const))));

export function progressMap(events: LearningEvent[], settings: FamilySettings, now = Date.now()): Map<string, KpProgress> {
  const attempts = attemptsOf(events);
  const kps = kpIndex();
  const mastery = practice.computeMastery(attempts, {
    masteryAccuracy: settings.masteryAccuracy,
    targetDifficulty: (kpId: string) => {
      const kp = kps.get(kpId);
      return kp ? targetDifficulty(kp) : 3;
    },
  });
  const due = new Set(practice.computeReviewSchedule(attempts, mastery, now).filter((r) => r.dueAt <= now).map((r) => r.kpId));
  const out = new Map<string, KpProgress>();
  for (const [kpId, m] of mastery) {
    out.set(kpId, {
      status: m.status,
      attempts: m.attempts,
      accuracy: m.recentAccuracy,
      theta: m.theta,
      reviewDue: due.has(kpId),
    });
  }
  return out;
}

export function difficultyFor(events: LearningEvent[], settings: FamilySettings, kpId: string, spec: PracticeSpec): number {
  const attempts = attemptsOf(events);
  const mastery = practice.computeMastery(attempts, { masteryAccuracy: settings.masteryAccuracy });
  return practice.recommendDifficulty(mastery.get(kpId), { min: spec.minDifficulty, max: spec.maxDifficulty });
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

export function makeQuestion(ref: SessionItem['ref']): Question {
  return practice.generateQuestion(ref.generatorId, { difficulty: ref.difficulty, seed: ref.seed, variant: ref.variant });
}

export const gradeQuestion = practice.gradeQuestion;

/** Adaptive next item for a knowledge point (rotates through its practice specs). */
export function nextKpItem(
  events: LearningEvent[],
  settings: FamilySettings,
  kp: KnowledgePoint,
  index: number,
  mode: PracticeMode,
  specFilter?: (s: PracticeSpec) => boolean,
): SessionItem | null {
  const specs = kp.practice.filter(specFilter ?? (() => true));
  if (specs.length === 0) return null;
  const spec = specs[index % specs.length];
  return {
    kpId: kp.id,
    mode,
    ref: {
      source: 'generator',
      generatorId: spec.generatorId,
      variant: spec.variant,
      difficulty: difficultyFor(events, settings, kp.id, spec),
      seed: randomSeed(),
    },
  };
}

export interface MistakeView {
  key: string;
  kpId: string;
  ref: SessionItem['ref'];
  errorTags: string[];
  at: number;
}

export function openMistakes(events: LearningEvent[]): MistakeView[] {
  return practice
    .computeMistakeBook(attemptsOf(events))
    .filter((m) => !m.cleared && m.question.source === 'generator')
    .map((m) => ({
      key: m.key,
      kpId: m.kpId,
      ref: m.question as SessionItem['ref'],
      errorTags: m.errorTags,
      at: m.firstWrongAt,
    }));
}

/** Mistake redo: original question, then a variant targeting the diagnosed error. */
export function mistakeItems(events: LearningEvent[], limit = 6): SessionItem[] {
  const items: SessionItem[] = [];
  for (const m of openMistakes(events).slice(0, limit)) {
    items.push({ kpId: m.kpId, ref: m.ref, mode: 'mistakes', label: '错题重做' });
    items.push({ kpId: m.kpId, ref: { ...m.ref, seed: randomSeed() }, mode: 'mistakes', label: '同类题' });
  }
  return items;
}

/** Today's plan, flattened into session items. */
export function dailyItems(child: ChildProfile, events: LearningEvent[], settings: FamilySettings, now = Date.now()): SessionItem[] {
  const kps = childKps(child);
  const attempts = attemptsOf(events);
  const mastery = practice.computeMastery(attempts, { masteryAccuracy: settings.masteryAccuracy });
  const reviewDue = practice.computeReviewSchedule(attempts, mastery, now);
  const mistakes = practice.computeMistakeBook(attempts);
  const plan = practice.buildDailyPlan({
    kps: kps.map((r) => ({ id: r.kp.id, practice: r.kp.practice, prerequisites: r.kp.prerequisites })),
    masteryMap: mastery,
    reviewDue,
    mistakes,
    minutes: Math.min(20, settings.dailyMinutes),
    now,
    seedBase: Number(dayKey(now).replace(/-/g, '')) + child.id.length,
  });
  return plan.blocks.flatMap((b) =>
    b.questions.map((q) => ({
      kpId: b.kpId,
      ref: { source: 'generator' as const, ...q },
      mode: 'daily' as const,
      label: b.title,
    })),
  );
}

export function tagLabel(tag: string): string {
  return (ERROR_TAGS as Record<string, string>)[tag] ?? tag;
}
