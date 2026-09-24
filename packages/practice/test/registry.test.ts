import { describe, expect, it } from 'vitest';
import { GENERATOR_IDS, GENERATORS, isErrorTag } from '@xuexi/shared';
import {
  ALL_GENERATORS,
  describeQuestionForParent,
  generateQuestion,
  getGenerator,
  questionFromRef,
  refOfQuestion,
} from '../src/index';

describe('registry', () => {
  it('has a generator for every catalog id and nothing else', () => {
    const registered = ALL_GENERATORS.map((g) => g.id).sort();
    expect(registered).toEqual([...GENERATOR_IDS].sort());
    expect(new Set(registered).size).toBe(registered.length);
    for (const id of GENERATOR_IDS) expect(getGenerator(id).id).toBe(id);
    expect(() => getGenerator('g9.nope')).toThrow();
  });

  it('every generator has variants and only targets catalog tags', () => {
    for (const g of ALL_GENERATORS) {
      expect(g.variants.length).toBeGreaterThan(0);
      const info = GENERATORS.find((x) => x.id === g.id)!;
      for (const t of g.targets) {
        expect(isErrorTag(t)).toBe(true);
        expect((info.errorTags as readonly string[]).includes(t)).toBe(true);
      }
    }
  });

  it('round-trips questions through QuestionRef (including the variant)', () => {
    const q = generateQuestion('g4.mul.3x2', { difficulty: 3, seed: 42, variant: 'trailing-zero' });
    const ref = refOfQuestion(q);
    expect(ref).toEqual({
      source: 'generator',
      generatorId: 'g4.mul.3x2',
      difficulty: 3,
      seed: 42,
      variant: 'trailing-zero',
    });
    expect(questionFromRef(ref)).toEqual(q);
    expect(questionFromRef({ source: 'bank', bankId: 'b', questionId: 'q' })).toBeNull();
    expect(
      questionFromRef({
        source: 'generator',
        generatorId: 'g4.mul.3x2',
        difficulty: 3,
        seed: 42,
        variant: 'nope',
      }),
    ).toBeNull();
  });

  it('describes questions for parents in one line', () => {
    const v = generateQuestion('g4.mul.3x2', { difficulty: 3, seed: 1 });
    expect(describeQuestionForParent(v)).toBe(
      `${v.vertical!.operands[0]} × ${v.vertical!.operands[1]} = ?（竖式）`,
    );
    const n = generateQuestion('g2.mul.table', { difficulty: 1, seed: 1 });
    expect(describeQuestionForParent(n)).toMatch(/^\d × \d = \?$/);
    const c = generateQuestion('g4.bignum.read', { difficulty: 2, seed: 3, variant: 'read' });
    expect(describeQuestionForParent(c)).toContain('A. ');
    for (const g of ALL_GENERATORS) {
      const q = g.generate({ difficulty: 3, seed: 5 });
      expect(describeQuestionForParent(q)).not.toContain('\n');
    }
  });
});
