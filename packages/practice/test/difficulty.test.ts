import { describe, expect, it } from 'vitest';
import { countBorrows, countCarries, countMulCarries } from '../src/arith';
import { readChineseNumber } from '../src/chinese';
import { generateQuestion } from '../src/registry';
import type { Question } from '../src/types';

/** Average of a metric over many seeds at one difficulty. */
function mean(
  id: string,
  difficulty: number,
  metric: (q: Question) => number,
  variant?: string,
  n = 200,
): number {
  let s = 0;
  for (let seed = 0; seed < n; seed++)
    s += metric(generateQuestion(id, { difficulty, seed, variant }));
  return s / n;
}

function nonDecreasing(values: number[]) {
  for (let i = 1; i < values.length; i++)
    expect(values[i], values.join(', ')).toBeGreaterThanOrEqual(values[i - 1] - 1e-9);
}

describe('difficulty controls real difficulty', () => {
  it('g2.addsub.2d: no regrouping at 1–2, always from 3', () => {
    for (let seed = 0; seed < 200; seed++) {
      for (let d = 1; d <= 5; d++) {
        const q = generateQuestion('g2.addsub.2d', { difficulty: d, seed, variant: 'vertical' });
        const [a, b] = q.vertical!.operands;
        const regroup = q.vertical!.op === '+' ? countCarries(a, b) : countBorrows(a, b);
        expect(regroup > 0, q.key).toBe(d >= 3);
      }
    }
  });

  it('g4.mul.3x2: carries in partial products grow', () => {
    const carries = (q: Question) => {
      const [a, b] = q.vertical!.operands;
      return countMulCarries(a, b % 10) + countMulCarries(a, Math.floor(b / 10));
    };
    expect(mean('g4.mul.3x2', 1, carries)).toBe(0);
    expect(mean('g4.mul.3x2', 3, carries)).toBeGreaterThan(mean('g4.mul.3x2', 2, carries));
    // 4–5 introduce zeros in the multiplicand.
    for (const d of [4, 5]) {
      for (let seed = 0; seed < 100; seed++) {
        const a = generateQuestion('g4.mul.3x2', { difficulty: d, seed }).vertical!.operands[0];
        expect(String(a).slice(1)).toContain('0');
      }
    }
  });

  it('g4.bignum.read: more digits and more zeros', () => {
    const digits = [1, 2, 3, 4, 5].map((d) =>
      mean(
        'g4.bignum.read',
        d,
        (q) => {
          const n = q.prompt.match(/\d+/)?.[0] ?? '';
          return n.length;
        },
        'read',
      ),
    );
    nonDecreasing(digits);
    const zeros = [1, 2, 3, 4, 5].map((d) =>
      mean(
        'g4.bignum.read',
        d,
        (q) =>
          [...readChineseNumber(Number(q.prompt.match(/\d+/)![0]))].filter((c) => c === '零')
            .length,
        'read',
      ),
    );
    expect(zeros[4]).toBeGreaterThan(zeros[0]);
  });

  it('g4.angle.measure: multiples of 10 → 5 → any', () => {
    for (let seed = 0; seed < 200; seed++) {
      expect(
        generateQuestion('g4.angle.measure', { difficulty: 1, seed }).angle!.degrees % 10,
      ).toBe(0);
      expect(generateQuestion('g4.angle.measure', { difficulty: 1, seed }).angle!.opensLeft).toBe(
        false,
      );
      expect(
        generateQuestion('g4.angle.measure', { difficulty: 2, seed }).angle!.degrees % 10,
      ).toBe(0);
      expect(generateQuestion('g4.angle.measure', { difficulty: 3, seed }).angle!.degrees % 5).toBe(
        0,
      );
    }
    expect(
      mean('g4.angle.measure', 4, (q) => (q.angle!.degrees % 5 !== 0 ? 1 : 0)),
    ).toBeGreaterThan(0.5);
  });

  it('g2.mul.table variants respect the 口诀 rows', () => {
    for (let seed = 0; seed < 200; seed++) {
      const q = generateQuestion('g2.mul.table', { difficulty: 2, seed, variant: 'tables-6-9' });
      const nums = q.prompt.match(/\d+/g)?.map(Number) ?? [];
      if (q.prompt.includes('×') && !q.prompt.includes('（'))
        expect(
          nums.some((n) => n >= 6 && n <= 9),
          q.prompt,
        ).toBe(true);
    }
  });

  it('targetSeconds grows with difficulty for computation drills', () => {
    for (const id of ['g2.addsub.chain', 'g4.div.2d', 'g4.mul.3x2']) {
      nonDecreasing([1, 2, 3, 4, 5].map((d) => mean(id, d, (q) => q.targetSeconds, undefined, 50)));
    }
  });
});
