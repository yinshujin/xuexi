import { describe, expect, it } from 'vitest';
import { buildDailyPlan, chooseCurrentKp, type DailyKp, type DailyPlanInput } from '../src/daily';
import type { MasteryState } from '../src/mastery';
import { computeMistakeBook } from '../src/mistakes';
import { questionFromRef } from '../src/refs';
import type { ReviewItem } from '../src/review';
import { attempt, sh } from './helpers';

const KPS: DailyKp[] = [
  {
    id: 'g2.table-2-5',
    prerequisites: [],
    practice: [
      { generatorId: 'g2.mul.table', minDifficulty: 1, maxDifficulty: 5, variant: 'tables-2-5' },
    ],
  },
  {
    id: 'g2.addsub',
    prerequisites: [],
    practice: [
      { generatorId: 'g2.addsub.2d', minDifficulty: 1, maxDifficulty: 5, variant: 'vertical' },
    ],
  },
  { id: 'g2.observe', prerequisites: [], practice: [] },
  {
    id: 'g2.table-6-9',
    prerequisites: ['g2.table-2-5'],
    practice: [
      { generatorId: 'g2.mul.table', minDifficulty: 1, maxDifficulty: 5, variant: 'tables-6-9' },
      { generatorId: 'g2.mul.meaning', minDifficulty: 2, maxDifficulty: 4 },
    ],
  },
  {
    id: 'g2.div',
    prerequisites: ['g2.table-6-9'],
    practice: [{ generatorId: 'g2.div.table', minDifficulty: 1, maxDifficulty: 5 }],
  },
];

function state(
  kpId: string,
  status: MasteryState['status'],
  theta = 3,
  extra: Partial<MasteryState> = {},
): MasteryState {
  return {
    childId: 'kid',
    kpId,
    theta,
    attempts: 20,
    correct: 18,
    recentAccuracy: 0.9,
    recentCount: 10,
    status,
    targetDifficulty: 3,
    ...extra,
  };
}

const now = sh('2026-09-10', '18:00');
const mastery = new Map<string, MasteryState>([
  ['g2.table-2-5', state('g2.table-2-5', 'mastered', 4.5, { masteredAt: sh('2026-09-01') })],
  ['g2.addsub', state('g2.addsub', 'mastered', 4, { masteredAt: sh('2026-09-02') })],
  ['g2.table-6-9', state('g2.table-6-9', 'learning', 2)],
]);
const reviewDue: ReviewItem[] = [
  {
    childId: 'kid',
    kpId: 'g2.addsub',
    stage: 1,
    intervalDays: 3,
    dueAt: sh('2026-09-08', '00:00'),
    isDue: true,
    status: 'mastered',
    reviewsPassed: 1,
  },
  {
    childId: 'kid',
    kpId: 'g2.table-2-5',
    stage: 2,
    intervalDays: 7,
    dueAt: sh('2026-09-15', '00:00'),
    isDue: false,
    status: 'mastered',
    reviewsPassed: 2,
  },
];
const mistakes = computeMistakeBook([
  attempt({
    at: sh('2026-09-09'),
    kpId: 'g2.addsub',
    correct: false,
    errorTags: ['carry-missed'],
    question: {
      source: 'generator',
      generatorId: 'g2.addsub.2d',
      difficulty: 4,
      seed: 11,
      variant: 'vertical',
    },
  }),
  attempt({
    at: sh('2026-09-09', '10:01'),
    kpId: 'g2.word',
    correct: false,
    question: { source: 'bank', bankId: 'wp', questionId: 'q9' },
  }),
]);

const input: DailyPlanInput = {
  kps: KPS,
  masteryMap: mastery,
  reviewDue,
  mistakes,
  minutes: 20,
  now,
  seedBase: 'kid:2026-09-10',
};

describe('buildDailyPlan', () => {
  it('is deterministic', () => {
    expect(buildDailyPlan(input)).toEqual(buildDailyPlan({ ...input }));
    expect(buildDailyPlan({ ...input, seedBase: 'other' })).not.toEqual(buildDailyPlan(input));
  });

  it('orders blocks warm-up → review → mistakes → practice and stays within budget', () => {
    const plan = buildDailyPlan(input);
    expect(plan.blocks.map((b) => b.kind)).toEqual(['warmup', 'review', 'mistakes', 'practice']);
    expect(plan.budgetSeconds).toBe(1200);
    expect(plan.estSeconds).toBeLessThanOrEqual(plan.budgetSeconds);
    expect(plan.estSeconds).toBe(plan.blocks.reduce((s, b) => s + b.estSeconds, 0));
    expect(plan.estSeconds).toBeGreaterThan(plan.budgetSeconds * 0.8);
  });

  it('warm-up is a ~2 minute speed drill from a mastered computation KP, never vertical', () => {
    const w = buildDailyPlan(input).blocks[0];
    expect(w.mode).toBe('speed');
    expect(['g2.table-2-5', 'g2.addsub']).toContain(w.kpId);
    expect(w.estSeconds).toBeGreaterThanOrEqual(120);
    expect(w.estSeconds).toBeLessThan(150);
    for (const q of w.questions) {
      expect(q.ref.source === 'generator' && q.ref.variant).not.toBe('vertical');
      expect(questionFromRef(q.ref)).not.toBeNull();
    }
  });

  it('reviews only due KPs, 3–5 questions each', () => {
    const reviews = buildDailyPlan(input).blocks.filter((b) => b.kind === 'review');
    expect(reviews.map((b) => b.kpId)).toEqual(['g2.addsub']);
    expect(reviews[0].questions.length).toBeGreaterThanOrEqual(3);
    expect(reviews[0].questions.length).toBeLessThanOrEqual(5);
    expect(reviews[0].questions.every((q) => q.mode === 'review')).toBe(true);
  });

  it('mistake redo has the original plus a targeted variant', () => {
    const m = buildDailyPlan(input).blocks.find((b) => b.kind === 'mistakes')!;
    const gen = m.questions.filter((q) => q.kpId === 'g2.addsub');
    expect(gen.map((q) => q.role)).toEqual(['original', 'variant']);
    expect(gen[0].ref).toEqual(mistakes[0].question);
    expect(gen[1].ref).toMatchObject({
      generatorId: 'g2.addsub.2d',
      difficulty: 4,
      variant: 'vertical@carry-missed',
    });
    expect(questionFromRef(gen[1].ref)!.vertical!.op).toBe('+');
    const bank = m.questions.filter((q) => q.kpId === 'g2.word');
    expect(bank.map((q) => q.role)).toEqual(['original']);
    expect(m.questions.every((q) => q.mode === 'mistakes' && q.mistakeKey)).toBe(true);
  });

  it('practises the first unmastered KP with practice, adaptively, from its difficulty range', () => {
    const plan = buildDailyPlan(input);
    expect(plan.currentKpId).toBe('g2.table-6-9');
    const p = plan.blocks.at(-1)!;
    expect(p).toMatchObject({
      kind: 'practice',
      kpId: 'g2.table-6-9',
      adaptive: true,
      mode: 'daily',
    });
    expect(p.questions.length).toBeGreaterThan(5);
    const gens = new Set(
      p.questions.map((q) => (q.ref.source === 'generator' ? q.ref.generatorId : '')),
    );
    expect(gens).toEqual(new Set(['g2.mul.table', 'g2.mul.meaning']));
    for (const q of p.questions) {
      if (q.ref.source === 'generator' && q.ref.generatorId === 'g2.mul.meaning')
        expect(q.ref.difficulty).toBeGreaterThanOrEqual(2);
    }
  });

  it('short budgets skip the warm-up and still respect the budget', () => {
    const plan = buildDailyPlan({ ...input, minutes: 3 });
    expect(plan.blocks.some((b) => b.kind === 'warmup')).toBe(false);
    expect(plan.estSeconds).toBeLessThanOrEqual(180);
    expect(buildDailyPlan({ ...input, minutes: 0 }).blocks).toEqual([]);
  });

  it('without mastered computation KPs the warm-up uses the current KP', () => {
    const plan = buildDailyPlan({ ...input, masteryMap: new Map(), reviewDue: [], mistakes: [] });
    expect(plan.blocks.map((b) => b.kind)).toEqual(['warmup', 'practice']);
    expect(plan.blocks[0].kpId).toBe('g2.table-2-5');
    expect(plan.currentKpId).toBe('g2.table-2-5');
  });
});

describe('chooseCurrentKp', () => {
  it('honours the parent choice, skips KPs without practice', () => {
    expect(chooseCurrentKp(KPS, mastery, 'g2.div')!.id).toBe('g2.div');
    expect(chooseCurrentKp(KPS, mastery, 'g2.observe')!.id).toBe('g2.table-6-9');
  });
  it('falls back to an unmastered prerequisite when stuck', () => {
    const m = new Map(mastery);
    m.set('g2.table-2-5', state('g2.table-2-5', 'learning', 2));
    m.set('g2.div', state('g2.div', 'learning', 1, { attempts: 15, recentAccuracy: 0.4 }));
    expect(chooseCurrentKp(KPS, m, 'g2.div')!.id).toBe('g2.table-6-9');
    m.set(
      'g2.table-6-9',
      state('g2.table-6-9', 'learning', 1, { attempts: 12, recentAccuracy: 0.5 }),
    );
    expect(chooseCurrentKp(KPS, m, 'g2.div')!.id).toBe('g2.table-2-5');
  });
  it('returns undefined when everything is mastered', () => {
    const all = new Map(KPS.map((k) => [k.id, state(k.id, 'mastered')]));
    expect(chooseCurrentKp(KPS, all)).toBeUndefined();
  });
});
