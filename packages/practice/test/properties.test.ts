import { describe, expect, it } from 'vitest';
import { GENERATORS, type ErrorTag } from '@xuexi/shared';
import { ALL_GENERATORS, generateQuestion, getGenerator, gradeQuestion } from '../src/registry';
import type { Answer, Question, Response } from '../src/types';
import { expectedAnswer } from './verify';

const SEEDS = 300;
const allowed = (id: string) =>
  new Set<ErrorTag>(GENERATORS.find((g) => g.id === id)!.errorTags as readonly ErrorTag[]);

function exactResponse(q: Question): Response {
  const a = q.answer;
  switch (a.type) {
    case 'number':
      return q.widget === 'vertical'
        ? { type: 'vertical', value: a.value }
        : { type: 'number', value: a.value };
    case 'choice':
      return { type: 'choice', index: a.index };
    case 'compare':
      return { type: 'compare', value: a.value };
    case 'division':
      return { type: 'division', quotient: a.quotient, remainder: a.remainder };
  }
}

/** A few wrong responses for each answer type. */
function perturbed(q: Question): Response[] {
  const a = q.answer;
  switch (a.type) {
    case 'number': {
      const vals = [
        a.value + 1,
        a.value - 1,
        a.value * 10,
        a.value + 10,
        180 - a.value,
        a.value === 0 ? 5 : -a.value,
      ];
      return vals
        .filter((v) => v !== a.value)
        .map((v) =>
          q.widget === 'vertical' ? { type: 'vertical', value: v } : { type: 'number', value: v },
        );
    }
    case 'choice':
      return q
        .options!.map((_, i) => i)
        .filter((i) => i !== a.index)
        .map((i) => ({ type: 'choice', index: i }));
    case 'compare':
      return (['<', '>', '='] as const)
        .filter((v) => v !== a.value)
        .map((v) => ({ type: 'compare', value: v }));
    case 'division':
      return [
        { type: 'division', quotient: a.quotient + 1, remainder: a.remainder },
        { type: 'division', quotient: a.quotient - 1, remainder: a.remainder },
        { type: 'division', quotient: a.quotient, remainder: a.remainder + 1 },
        { type: 'division', quotient: a.quotient * 10, remainder: a.remainder },
      ];
  }
}

function answerMatchesWidget(q: Question, a: Answer): boolean {
  switch (q.widget) {
    case 'numeric':
    case 'vertical':
    case 'angle':
      return a.type === 'number';
    case 'choice':
      return a.type === 'choice';
    case 'compare':
      return a.type === 'compare';
    case 'division':
      return a.type === 'division';
  }
}

describe.each(ALL_GENERATORS.map((g) => [g.id, g] as const))('%s', (id, gen) => {
  const tags = allowed(id);
  it.each(gen.variants)(
    'variant %s: deterministic, verified, graded, diagnosed within catalog tags',
    (variant) => {
      for (let difficulty = 1; difficulty <= 5; difficulty++) {
        for (let seed = 0; seed < SEEDS; seed++) {
          const q = generateQuestion(id, { difficulty, seed, variant });
          // Deterministic.
          expect(generateQuestion(id, { difficulty, seed, variant })).toEqual(q);
          expect(q.key).toBe(`${id}:${difficulty}:${seed}:${variant}`);
          // Well-formed.
          expect(answerMatchesWidget(q, q.answer), q.key).toBe(true);
          expect(q.steps.length, q.key).toBeGreaterThan(0);
          expect(q.hint.length, q.key).toBeGreaterThan(0);
          expect(q.targetSeconds, q.key).toBeGreaterThan(0);
          if (q.answer.type === 'number') {
            expect(Number.isInteger(q.answer.value), q.key).toBe(true);
            if (id !== 'g4.negative') expect(q.answer.value, q.key).toBeGreaterThanOrEqual(0);
            // Hints must not reveal the worked result.
            const last = [...q.steps].reverse().find((st) => st.formula)?.formula;
            if (last) expect(q.hint.includes(last), q.key).toBe(false);
          }
          if (q.widget === 'choice') {
            expect(q.options!.length, q.key).toBeGreaterThanOrEqual(2);
            expect(new Set(q.options).size, q.key).toBe(q.options!.length);
          }
          if (q.widget === 'vertical') expect(q.vertical, q.key).toBeDefined();
          if (q.widget === 'angle') expect(q.angle, q.key).toBeDefined();
          // Independently verified answer.
          expect(q.answer, `${q.key} ${q.prompt}`).toEqual(expectedAnswer(q));
          // Grading.
          expect(gradeQuestion(q, exactResponse(q))).toMatchObject({
            correct: true,
            errorTags: [],
          });
          for (const r of perturbed(q)) {
            const g = gradeQuestion(q, r);
            expect(g.correct, `${q.key} ${JSON.stringify(r)}`).toBe(false);
            expect(g.errorTags.length).toBeGreaterThan(0);
            expect(g.feedback.length).toBeGreaterThan(0);
            for (const t of g.errorTags) {
              if (t !== 'careless') expect(tags.has(t), `${q.key}: ${t} not allowed`).toBe(true);
            }
          }
        }
      }
    },
  );

  it('targetFor builds valid questions for every supported tag and null otherwise', () => {
    for (const tag of gen.targets) {
      expect(tags.has(tag), `${id} targets ${tag}`).toBe(true);
      for (const variant of gen.variants) {
        for (let difficulty = 1; difficulty <= 5; difficulty++) {
          for (let seed = 0; seed < 40; seed++) {
            const q = gen.targetFor!(tag, { difficulty, seed, variant })!;
            expect(q.variant).toBe(`${variant}@${tag}`);
            expect(q.answer).toEqual(expectedAnswer(q));
            expect(gradeQuestion(q, exactResponse(q)).correct).toBe(true);
            // Reproducible from its own key parts.
            expect(generateQuestion(id, { difficulty, seed, variant: q.variant })).toEqual(q);
          }
        }
      }
    }
    expect(gen.targetFor!('careless', { difficulty: 1, seed: 1 })).toBeNull();
  });

  it('empty responses are not diagnosed', () => {
    const q = gen.generate({ difficulty: 3, seed: 1 });
    const empty: Response =
      q.answer.type === 'number'
        ? { type: 'number', value: null }
        : q.answer.type === 'choice'
          ? { type: 'choice', index: null }
          : q.answer.type === 'compare'
            ? { type: 'compare', value: null }
            : { type: 'division', quotient: null, remainder: null };
    expect(getGenerator(id).grade(q, empty)).toMatchObject({ correct: false, errorTags: [] });
  });
});

describe('generator options', () => {
  it('rejects unknown variants and clamps difficulty', () => {
    expect(() =>
      generateQuestion('g2.addsub.2d', { difficulty: 1, seed: 1, variant: 'nope' }),
    ).toThrow();
    const q = generateQuestion('g2.addsub.2d', { difficulty: 9, seed: 1 });
    expect(q.difficulty).toBe(5);
    expect(q.key).toBe('g2.addsub.2d:5:1');
    expect(q.variant).toBeUndefined();
    // Omitted variant == the default variant (same question body).
    const v = generateQuestion('g2.addsub.2d', { difficulty: 5, seed: 1, variant: 'oral' });
    expect({ ...v, key: '', variant: undefined }).toEqual({ ...q, key: '', variant: undefined });
  });
});
