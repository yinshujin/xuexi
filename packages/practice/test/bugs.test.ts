import { describe, expect, it } from 'vitest';
import { countCarries, countMulCarries } from '../src/arith';
import { g2AddSub2d } from '../src/generators/g2-addsub-2d';
import { g2AddSubChain } from '../src/generators/g2-addsub-chain';
import { g2DivTable } from '../src/generators/g2-div-table';
import { g2MulMeaning } from '../src/generators/g2-mul-meaning';
import { g2MulTable } from '../src/generators/g2-mul-table';
import { g2UnitLength, g2UnitMoney } from '../src/generators/g2-units';
import { g4AngleClassify, g4AngleMeasure } from '../src/generators/g4-angle';
import { g4BignumCompare } from '../src/generators/g4-bignum-compare';
import { g4BignumPlace } from '../src/generators/g4-bignum-place';
import { g4BignumRewrite } from '../src/generators/g4-bignum-rewrite';
import { g4Div2d, longDivide } from '../src/generators/g4-div-2d';
import { g4LawSimplify } from '../src/generators/g4-law-simplify';
import { g4Mul3x2 } from '../src/generators/g4-mul-3x2';
import { g4MulEstimate } from '../src/generators/g4-mul-estimate';
import { g4Negative } from '../src/generators/g4-negative';
import { g4OralMulDiv } from '../src/generators/g4-oral-muldiv';
import { gradeQuestion } from '../src/registry';
import type { Response } from '../src/types';

const num = (value: number): Response => ({ type: 'number', value });
const vert = (value: number, partials?: string[]): Response => ({
  type: 'vertical',
  value,
  ...(partials ? { partials } : {}),
});
const div = (quotient: number, remainder: number): Response => ({
  type: 'division',
  quotient,
  remainder,
});

describe('addition / subtraction bug library', () => {
  it('detects a dropped carry: 38 + 25 → 53', () => {
    expect(g2AddSub2d.diagnoseWith({ a: 38, b: 25, op: '+' }, num(53)).tags).toEqual([
      'carry-missed',
    ]);
  });
  it('detects a borrow that was not paid back / smaller-from-larger: 52 − 17 → 45', () => {
    expect(g2AddSub2d.diagnoseWith({ a: 52, b: 17, op: '-' }, num(45)).tags).toEqual([
      'borrow-missed',
    ]);
    // |a_i − b_i| per column: 43 − 18 → |3−8|=5, |4−1|=3 → 35 (correct: 25)
    expect(g2AddSub2d.diagnoseWith({ a: 43, b: 18, op: '-' }, num(35)).tags).toEqual([
      'borrow-missed',
    ]);
  });
  it('detects op confusion', () => {
    expect(g2AddSub2d.diagnoseWith({ a: 52, b: 17, op: '-' }, num(69)).tags).toEqual([
      'op-confused',
    ]);
    expect(g2AddSub2d.diagnoseWith({ a: 38, b: 25, op: '+' }, num(13)).tags).toEqual([
      'op-confused',
    ]);
  });
  it('falls back to careless through grade()', () => {
    const q = g2AddSub2d.generate({ difficulty: 4, seed: 3 });
    const wrong = (q.answer as { value: number }).value + 7;
    const g = gradeQuestion(q, { type: 'number', value: wrong });
    expect(g.correct).toBe(false);
    expect(g.errorTags.length).toBeGreaterThan(0);
  });
  it('finds dropped carries in every generated carry question (vertical widget)', () => {
    for (let seed = 0; seed < 200; seed++) {
      const q = g2AddSub2d.targetFor!('carry-missed', {
        difficulty: 4,
        seed,
        variant: 'vertical',
      })!;
      const [a, b] = q.vertical!.operands;
      expect(q.vertical!.op).toBe('+');
      // Independent "forgot the carry": add each column mod 10.
      const noCarry =
        (((a % 10) + (b % 10)) % 10) + ((Math.floor(a / 10) + Math.floor(b / 10)) % 10) * 10;
      expect(gradeQuestion(q, vert(noCarry)).errorTags).toContain('carry-missed');
    }
  });
  it('chain: order of operations and a dropped carry inside one step', () => {
    // 81 − (32 − 15): ignoring the parentheses gives 81 − 32 − 15 = 34
    const p = { a: 81, b: 32, c: 15, op1: '-' as const, op2: '-' as const, paren: true };
    expect(g2AddSubChain.diagnoseWith(p, num(34)).tags).toContain('order-of-ops');
    // 27 + 35 − 20: first step without carry 27 + 35 → 52, then 52 − 20 = 32
    const q = { a: 27, b: 35, c: 20, op1: '+' as const, op2: '-' as const, paren: false };
    expect(g2AddSubChain.diagnoseWith(q, num(32)).tags).toContain('carry-missed');
  });
});

describe('multiplication table', () => {
  const p = {
    form: 'product' as const,
    a: 7,
    b: 8,
    swapped: false,
    blank: 0 as const,
    optionTags: [],
  };
  it('neighbouring products → table-neighbor (7 × 8 → 48 or 63)', () => {
    expect(g2MulTable.diagnoseWith(p, num(48)).tags).toEqual(['table-neighbor']);
    expect(g2MulTable.diagnoseWith(p, num(63)).tags).toEqual(['table-neighbor']);
  });
  it('sum instead of product → table-add-confused', () => {
    expect(g2MulTable.diagnoseWith(p, num(15)).tags).toEqual(['table-add-confused']);
  });
  it('mul meaning: n + m for n × m', () => {
    const mp = { form: 'N2' as const, n: 3, m: 5, k: 1, context: 0, optionTags: [] };
    expect(g2MulMeaning.diagnoseWith(mp, num(8)).tags).toEqual(['table-add-confused']);
    expect(g2MulMeaning.diagnoseWith(mp, num(20)).tags).toEqual(['mul-meaning']);
  });
  it('division table: a neighbouring 口诀', () => {
    const dp = { form: 'div' as const, divisor: 7, quotient: 8, context: 0 };
    expect(g2DivTable.diagnoseWith(dp, num(9)).tags).toEqual(['div-wrong-table']);
    expect(g2DivTable.diagnoseWith(dp, num(20)).tags).toEqual([]);
  });
});

describe('units', () => {
  it('money: wrong rate', () => {
    const q = {
      left: [
        { value: 3, unit: '元' },
        { value: 5, unit: '角' },
      ],
      target: '角',
    };
    expect(g2UnitMoney.diagnoseWith({ q }, num(8)).tags).toEqual(['unit-rate']); // added 3 + 5
    expect(g2UnitMoney.diagnoseWith({ q }, num(305)).tags).toEqual(['unit-rate']); // 1元 = 100角
    expect(g2UnitMoney.diagnoseWith({ q }, num(36)).tags).toEqual([]);
  });
  it('length: wrong rate and wrong unit choice', () => {
    const q = { left: [{ value: 3, unit: '米' }], target: '厘米' };
    expect(g2UnitLength.diagnoseWith({ kind: 'convert', q, optionTags: [] }, num(30)).tags).toEqual(
      ['unit-rate'],
    );
    expect(
      g2UnitLength.diagnoseWith(
        { kind: 'choose', item: 0, optionTags: [null, 'unit-choice'] },
        { type: 'choice', index: 1 },
      ).tags,
    ).toEqual(['unit-choice']);
  });
});

describe('three-digit × two-digit', () => {
  const p = { a: 326, b: 48, trailing: false };
  it('second partial product not shifted: 326 × 48 → 2608 + 1304 = 3912', () => {
    expect(g4Mul3x2.diagnoseWith(p, vert(3912)).tags).toEqual(['partial-shift']);
  });
  it('detects the missing shift from the grid rows', () => {
    // "1304" without the trailing empty cell = not shifted.
    expect(g4Mul3x2.diagnoseWith(p, vert(3912, ['2608', '1304'])).tags).toEqual(['partial-shift']);
    // Correctly shifted rows ("1304 " or "13040") are fine; the sum then forgot a carry.
    const noCarrySum = 2608 + 13040 - 1000; // thousands carry dropped: 15648 → 14648
    expect(g4Mul3x2.diagnoseWith(p, vert(noCarrySum, ['2608', '1304 '])).tags).toEqual([
      'carry-missed',
    ]);
    expect(g4Mul3x2.diagnoseWith(p, vert(noCarrySum, ['2608', '13040'])).tags).toEqual([
      'carry-missed',
    ]);
  });
  it('carry dropped inside a partial product', () => {
    // 326 × 8 without adding carries: 6×8=48 → 8, 2×8=16 → 6, 3×8=24 → 24 : "2468"
    expect(g4Mul3x2.diagnoseWith(p, vert(2468 + 13040, ['2468', '1304 '])).tags).toEqual([
      'carry-missed',
    ]);
    expect(g4Mul3x2.diagnoseWith(p, vert(2468 + 13040)).tags).toContain('carry-missed');
    // Only the carry into the tens forgotten: 2568
    expect(g4Mul3x2.diagnoseWith(p, vert(2568 + 13040)).tags).toContain('carry-missed');
  });
  it('wrong multiplication fact in a partial product', () => {
    // 326 × 8 with 6 × 8 = 42: 2602
    expect(g4Mul3x2.diagnoseWith(p, vert(2602 + 13040)).tags).toContain('mul-fact');
  });
  it('trailing zeros mishandled: 240 × 30 → 720', () => {
    expect(g4Mul3x2.diagnoseWith({ a: 240, b: 30, trailing: true }, vert(720)).tags).toEqual([
      'trailing-zero',
    ]);
    expect(g4Mul3x2.diagnoseWith({ a: 240, b: 36, trailing: false }, vert(864)).tags).toContain(
      'trailing-zero',
    );
  });
  it('every generated standard question diagnoses the unshifted sum', () => {
    for (let seed = 0; seed < 200; seed++) {
      for (let d = 1; d <= 5; d++) {
        const q = g4Mul3x2.generate({ difficulty: d, seed });
        const [a, b] = q.vertical!.operands;
        expect(q.vertical!.partialRows).toBe(2);
        const unshifted = a * (b % 10) + a * Math.floor(b / 10);
        expect(gradeQuestion(q, vert(unshifted)).errorTags, q.key).toContain('partial-shift');
      }
    }
  });
  it('trailing-zero variant has no partial rows', () => {
    const q = g4Mul3x2.generate({ difficulty: 3, seed: 9, variant: 'trailing-zero' });
    expect(q.vertical!.partialRows).toBe(0);
    expect(q.vertical!.operands[1] % 10).toBe(0);
  });
  it('carry-missed remediation has many carries', () => {
    for (let seed = 0; seed < 50; seed++) {
      const q = g4Mul3x2.targetFor!('carry-missed', { difficulty: 1, seed })!;
      const [a, b] = q.vertical!.operands;
      expect(
        countMulCarries(a, b % 10) + countMulCarries(a, Math.floor(b / 10)),
      ).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('two-digit division', () => {
  it('missing 0 in the quotient', () => {
    // 4215 ÷ 21 = 200 … 15
    expect(g4Div2d.diagnoseWith({ dividend: 4215, divisor: 21 }, div(20, 15)).tags).toEqual([
      'quotient-place',
    ]);
    expect(g4Div2d.diagnoseWith({ dividend: 4215, divisor: 21 }, div(2, 15)).tags).toEqual([
      'quotient-place',
    ]);
    // 4221 ÷ 21 = 201 → 21
    expect(g4Div2d.diagnoseWith({ dividend: 4221, divisor: 21 }, div(21, 0)).tags).toEqual([
      'quotient-place',
    ]);
  });
  it('quotient too big (product exceeds the dividend)', () => {
    // 196 ÷ 32 = 6 … 4; trial with 30 gives 6 — answering 7 is too big
    expect(g4Div2d.diagnoseWith({ dividend: 196, divisor: 32 }, div(7, 0)).tags).toEqual([
      'quotient-too-big',
    ]);
  });
  it('remainder ≥ divisor → quotient too small', () => {
    // 175 ÷ 25 = 7; trial with 30 gives 5 → 5 … 50
    expect(g4Div2d.diagnoseWith({ dividend: 175, divisor: 25 }, div(5, 50)).tags).toEqual([
      'quotient-too-small',
    ]);
    expect(g4Div2d.diagnoseWith({ dividend: 196, divisor: 32 }, div(6, 36)).tags).toEqual([
      'remainder-error',
    ]);
  });
  it('remainder arithmetic wrong', () => {
    expect(g4Div2d.diagnoseWith({ dividend: 196, divisor: 32 }, div(6, 5)).tags).toEqual([
      'remainder-error',
    ]);
  });
  it('an empty remainder counts as 0', () => {
    const q = g4Div2d.targetFor!('quotient-place', { difficulty: 4, seed: 1 })!;
    const a = q.answer as { quotient: number; remainder: number };
    expect(
      gradeQuestion(q, {
        type: 'division',
        quotient: a.quotient,
        remainder: a.remainder === 0 ? null : a.remainder,
      }).correct,
    ).toBe(true);
  });
  it('difficulty 3 needs adjusting, difficulty 4+ has zeros in the quotient', () => {
    for (let seed = 0; seed < 100; seed++) {
      const d3 = g4Div2d.derive({ difficulty: 3, seed });
      expect(longDivide(d3.dividend, d3.divisor).steps.some((s) => s.adjust)).toBe(true);
      const d1 = g4Div2d.derive({ difficulty: 1, seed });
      expect(longDivide(d1.dividend, d1.divisor).steps.some((s) => s.adjust)).toBe(false);
      expect(d1.divisor % 10).toBeLessThan(5);
      const d2 = g4Div2d.derive({ difficulty: 2, seed });
      expect(d2.divisor % 10).toBeGreaterThanOrEqual(5);
      const d4 = g4Div2d.derive({ difficulty: 4, seed });
      expect(String(Math.floor(d4.dividend / d4.divisor))).toContain('0');
    }
  });
  it('trial-quotient trace records the adjustment', () => {
    const tr = longDivide(196, 32);
    expect(tr).toMatchObject({ quotient: 6, remainder: 4, rounded: 30 });
    const up = longDivide(175, 25); // 25 → 30: 17 ÷ 3 ≈ 5, too small, adjust to 7
    expect(up.steps[0]).toMatchObject({ trial: 5, digit: 7, adjust: 'up' });
    const down = longDivide(252, 42); // 42 → 40: 25 ÷ 4 ≈ 6, 42 × 6 = 252 exactly
    expect(down.steps[0]).toMatchObject({ trial: 6, digit: 6, adjust: null });
    const down2 = longDivide(248, 42); // 6 × 42 = 252 > 248 → 5
    expect(down2.steps[0]).toMatchObject({ trial: 6, digit: 5, adjust: 'down' });
  });
});

describe('laws, estimation, oral', () => {
  it('distributive law missing a term: 25 × (40 + 4) → 25 × 40 + 4', () => {
    const p = { form: 'dist-fwd' as const, n: [25, 40, 4], sign: '+' as const, layout: 0 };
    expect(g4LawSimplify.diagnoseWith(p, num(1004)).tags).toEqual(['distributive-miss']);
    const split = { form: 'dist-split' as const, n: [45, 100, 2], sign: '+' as const, layout: 0 };
    expect(g4LawSimplify.diagnoseWith(split, num(4502)).tags).toEqual(['distributive-miss']);
  });
  it('wrong pairing value and order of operations', () => {
    const p = { form: 'mul-pair' as const, n: [125, 7, 8], sign: '+' as const, layout: 0 };
    expect(g4LawSimplify.diagnoseWith(p, num(700)).tags).toEqual(['pairing']);
    const r = { form: 'dist-rev' as const, n: [36, 58, 42], sign: '+' as const, layout: 0 };
    expect(g4LawSimplify.diagnoseWith(r, num((36 * 58 + 36) * 42)).tags).toEqual(['order-of-ops']);
  });
  it('estimation: wrong rounding', () => {
    const p = { a: 198, b: 32, context: 0 }; // 200 × 30 = 6000
    expect(g4MulEstimate.diagnoseWith(p, num(100 * 30)).tags).toEqual(['rounding']);
    expect(g4MulEstimate.diagnoseWith(p, num(200 * 40)).tags).toEqual(['rounding']);
    expect(g4MulEstimate.diagnoseWith(p, num(1234)).tags).toEqual([]);
  });
  it('oral: trailing zeros and facts', () => {
    const p = { op: '×' as const, a: 50, b: 40 };
    expect(g4OralMulDiv.diagnoseWith(p, num(200)).tags).toEqual(['trailing-zero']);
    const q = { op: '×' as const, a: 70, b: 80 };
    expect(g4OralMulDiv.diagnoseWith(q, num(4800)).tags).toEqual(['mul-fact']);
    const r = { op: '÷' as const, a: 600, b: 20 };
    expect(g4OralMulDiv.diagnoseWith(r, num(3)).tags).toEqual(['trailing-zero']);
  });
});

describe('big numbers, angles, negative numbers', () => {
  it('place value: composing, digit values and unit rates', () => {
    // 3 个亿、5 个百万和 2 个千 = 305002000
    const parts = [
      { count: 3, place: 8 },
      { count: 5, place: 6 },
      { count: 2, place: 3 },
    ];
    const p = { form: 'compose' as const, parts };
    expect(g4BignumPlace.diagnoseWith(p, num(352)).tags).toEqual(['zero-reading']);
    expect(g4BignumPlace.diagnoseWith(p, num(30_502_000)).tags).toEqual(['zero-reading']);
    expect(g4BignumPlace.diagnoseWith(p, num(350_002_000)).tags).toEqual(['place-value']);
    expect(g4BignumPlace.diagnoseWith(p, num(305_002_001)).tags).toEqual([]);
    // 38472000 中的「4」表示 400000
    const v = { form: 'value' as const, n: 38_472_000, place: 5 };
    expect(g4BignumPlace.diagnoseWith(v, num(40_000)).tags).toEqual(['place-value']);
    expect(g4BignumPlace.diagnoseWith(v, num(4)).tags).toEqual(['place-value']);
    // 一亿里面有 10000 个一万
    const r = { form: 'rate' as const, big: 8, place: 4, count: 10_000 };
    expect(g4BignumPlace.diagnoseWith(r, num(1000)).tags).toEqual(['place-value']);
    expect(g4BignumPlace.diagnoseWith(r, num(9999)).tags).toEqual([]);
  });
  it('rewrite vs approximation, rounding', () => {
    expect(g4BignumRewrite.diagnoseWith({ form: 'rw-wan', n: 3_460_000 }, num(350)).tags).toEqual([
      'rewrite-vs-approx',
    ]);
    expect(
      g4BignumRewrite.diagnoseWith({ form: 'ap-shiwan', n: 3_460_000 }, num(346)).tags,
    ).toEqual(['rewrite-vs-approx']);
    expect(
      g4BignumRewrite.diagnoseWith({ form: 'ap-shiwan', n: 3_460_000 }, num(340)).tags,
    ).toEqual(['rounding']);
    expect(g4BignumRewrite.diagnoseWith({ form: 'ap-wan', n: 345_800 }, num(34)).tags).toEqual([
      'rounding',
    ]);
    expect(g4BignumRewrite.diagnoseWith({ form: 'ap-yi', n: 1_490_000_000 }, num(14)).tags).toEqual(
      ['rounding'],
    );
  });
  it('compare: digit strings compared from the left', () => {
    const p = { left: { k: 98_000, unit: '' as const }, right: { k: 123_456, unit: '' as const } };
    expect(g4BignumCompare.diagnoseWith(p, { type: 'compare', value: '>' }).tags).toEqual([
      'place-value',
    ]);
    const u = { left: { k: 35, unit: '万' as const }, right: { k: 349_000, unit: '' as const } };
    expect(g4BignumCompare.diagnoseWith(u, { type: 'compare', value: '<' }).tags).toEqual([
      'place-value',
    ]);
  });
  it('protractor read on the wrong scale: 180 − degrees', () => {
    expect(
      g4AngleMeasure.diagnoseWith({ degrees: 50, opensLeft: true, baseRotation: 0 }, num(130)).tags,
    ).toEqual(['protractor-scale']);
    expect(
      g4AngleMeasure.diagnoseWith({ degrees: 50, opensLeft: true, baseRotation: 0 }, num(55)).tags,
    ).toEqual([]);
  });
  it('angle classification and unknown angles', () => {
    const c = g4AngleClassify.generate({ difficulty: 1, seed: 2, variant: 'classify' });
    const wrong = (c.answer as { index: number }).index === 0 ? 1 : 0;
    expect(gradeQuestion(c, { type: 'choice', index: wrong }).errorTags).toEqual(['angle-type']);
    expect(
      g4AngleClassify.diagnoseWith({ form: 'straight', n: [35], optionTags: [] }, num(55)).tags,
    ).toEqual(['angle-sum']);
    expect(
      g4AngleClassify.diagnoseWith({ form: 'three', n: [40, 60], optionTags: [] }, num(140)).tags,
    ).toEqual(['angle-sum']);
  });
  it('negative compare direction flipped', () => {
    const p = { form: 'cmp' as const, n: [-3, -5, -1, -1] };
    expect(g4Negative.diagnoseWith(p, { type: 'compare', value: '<' }).tags).toEqual([
      'negative-compare',
    ]);
    const lower = { form: 'lower' as const, n: [3, 5] }; // 3℃ − 5℃ = −2℃
    expect(g4Negative.diagnoseWith(lower, num(2)).tags).toEqual(['negative-compare']);
    expect(
      g4Negative.diagnoseWith({ form: 'diff' as const, n: [8, -18, 0, 3] }, num(-10)).tags,
    ).toEqual(['negative-compare']);
  });
  it('feedback is a specific Chinese sentence', () => {
    const q = g2AddSub2d.targetFor!('carry-missed', { difficulty: 4, seed: 1 })!;
    const [a, b] = q.prompt.split(' = ')[0].split(' + ').map(Number);
    const noCarry =
      (((a % 10) + (b % 10)) % 10) + ((Math.floor(a / 10) + Math.floor(b / 10)) % 10) * 10;
    const g = gradeQuestion(q, num(noCarry));
    expect(countCarries(a, b)).toBeGreaterThan(0);
    expect(g.feedback).toMatch(/进 1/);
  });
});
