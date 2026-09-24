import type { Rng } from '../rng';
import type { SolutionStep } from '../types';
import { defineGenerator, sampleUntil, step } from './base';

/**
 * g4.bignum.compare — 大数比较大小（compare widget）。
 *
 * Difficulty:
 *  1 位数不同
 *  2 位数相同，最高位不同
 *  3 位数相同，前几位相同，中间某一位不同
 *  4 「350万 ○ 3490000」一边带单位，或 8~10 位中间有 0 的数
 *  5 「2亿 ○ 19999万」单位不同 / 相等的情况「35万 ○ 350000」
 */

export interface Side {
  /** Numeric part as displayed. */
  k: number;
  unit: '' | '万' | '亿';
}

export interface CompareParams {
  left: Side;
  right: Side;
}

type Cmp = '<' | '>' | '=';

const UNIT: Record<Side['unit'], number> = { '': 1, 万: 10_000, 亿: 100_000_000 };

export const sideValue = (s: Side) => s.k * UNIT[s.unit];
export const sideText = (s: Side) => `${s.k}${s.unit}`;

function cmp(a: number, b: number): Cmp {
  return a < b ? '<' : a > b ? '>' : '=';
}

function randomDigits(rng: Rng, len: number, pz = 0.25): string {
  let s = String(rng.int(1, 9));
  for (let i = 1; i < len; i++) s += rng.chance(pz) ? '0' : String(rng.int(0, 9));
  return s;
}

function build(rng: Rng, d: number): CompareParams {
  const plain = (k: number): Side => ({ k, unit: '' });
  switch (d) {
    case 1: {
      const l1 = rng.int(5, 8);
      let l2 = rng.int(5, 8);
      if (l2 === l1) l2 = l1 === 8 ? 7 : l1 + 1;
      return {
        left: plain(Number(randomDigits(rng, l1))),
        right: plain(Number(randomDigits(rng, l2))),
      };
    }
    case 2: {
      const len = rng.int(6, 8);
      const a = randomDigits(rng, len);
      let b = randomDigits(rng, len);
      if (b[0] === a[0]) b = String(((Number(a[0]) + rng.int(1, 8) - 1) % 9) + 1) + b.slice(1);
      return { left: plain(Number(a)), right: plain(Number(b)) };
    }
    case 3: {
      const len = rng.int(7, 8);
      const a = randomDigits(rng, len);
      const i = rng.int(2, len - 2);
      const b =
        a.slice(0, i) +
        String((Number(a[i]) + rng.int(1, 9)) % 10) +
        randomDigits(rng, len - i - 1 + 1).slice(1);
      return { left: plain(Number(a)), right: plain(Number(b)) };
    }
    case 4: {
      if (rng.chance(0.5)) {
        const k = rng.int(12, 999);
        const near = k * 10_000 + rng.int(-9_999, 9_999);
        const [l, r] = rng.chance(0.5)
          ? [{ k, unit: '万' as const }, plain(near)]
          : [plain(near), { k, unit: '万' as const }];
        return { left: l, right: r };
      }
      const len = rng.int(8, 10);
      const a = randomDigits(rng, len, 0.4);
      const i = rng.int(3, len - 2);
      const b =
        a.slice(0, i) +
        String((Number(a[i]) + rng.int(1, 9)) % 10) +
        randomDigits(rng, len - i, 0.4).slice(1);
      return { left: plain(Number(a)), right: plain(Number(b)) };
    }
    default: {
      const kind = rng.int(0, 2);
      if (kind === 0) {
        const y = rng.int(1, 9);
        const w = y * 10_000 + rng.int(-99, 99) * (rng.chance(0.5) ? 1 : 10);
        return rng.chance(0.5)
          ? { left: { k: y, unit: '亿' }, right: { k: w, unit: '万' } }
          : { left: { k: w, unit: '万' }, right: { k: y, unit: '亿' } };
      }
      if (kind === 1) {
        const k = rng.int(12, 9999);
        return rng.chance(0.5)
          ? { left: { k, unit: '万' }, right: plain(k * 10_000) }
          : { left: plain(k * 10_000), right: { k, unit: '万' } };
      }
      const k = rng.int(12, 999);
      const near =
        k * 10_000 + rng.int(1, 9) * (rng.chance(0.5) ? 1 : -1) * rng.pick([1, 10, 100, 1000]);
      return { left: { k, unit: '万' }, right: plain(near) };
    }
  }
}

function explain(p: CompareParams): SolutionStep[] {
  const L = sideValue(p.left);
  const R = sideValue(p.right);
  const out: SolutionStep[] = [];
  const withUnit = [p.left, p.right].filter((s) => s.unit);
  if (withUnit.length > 0) {
    out.push(
      step(
        '单位不同，先化成没有单位的数：',
        withUnit.map((s) => `${sideText(s)} = ${sideValue(s)}`).join('，'),
      ),
    );
  }
  const a = String(L);
  const b = String(R);
  if (a.length !== b.length) {
    out.push(step(`${L} 是 ${a.length} 位数，${R} 是 ${b.length} 位数，位数多的数大。`));
  } else if (a === b) {
    out.push(step('两个数完全一样，所以相等。'));
  } else {
    const i = [...a].findIndex((c, j) => c !== b[j]);
    const names = [
      '个',
      '十',
      '百',
      '千',
      '万',
      '十万',
      '百万',
      '千万',
      '亿',
      '十亿',
      '百亿',
      '千亿',
    ];
    out.push(
      step(
        `位数相同，从最高位比起${i > 0 ? `，前 ${i} 位都相同` : ''}，${names[a.length - 1 - i]}位上 ${a[i]} ${a[i] > b[i] ? '>' : '<'} ${b[i]}。`,
      ),
    );
  }
  out.push(step('所以', `${sideText(p.left)} ${cmp(L, R)} ${sideText(p.right)}`));
  return out;
}

export const g4BignumCompare = defineGenerator<CompareParams>({
  id: 'g4.bignum.compare',
  variants: ['default'],
  targets: ['place-value'],
  build({ difficulty: d, target, rng }) {
    const level = target === 'place-value' ? Math.max(d, 4) : d;
    const p = sampleUntil(
      () => build(rng, level),
      (x) => {
        const L = sideValue(x.left);
        const R = sideValue(x.right);
        if (L <= 0 || R <= 0) return false;
        if (level <= 4 && L === R) return false;
        if (level === 3 || level === 2) return String(L).length === String(R).length;
        return true;
      },
      'compare pair',
    );
    const ans = cmp(sideValue(p.left), sideValue(p.right));
    return {
      widget: 'compare',
      prompt: `比较大小：${sideText(p.left)} ○ ${sideText(p.right)}`,
      answer: { type: 'compare', value: ans },
      hint:
        p.left.unit || p.right.unit
          ? '单位不同时，先化成相同的单位再比。'
          : '先比位数，位数相同再从最高位比起。',
      steps: explain(p),
      targetSeconds: 8 + 2 * d,
      params: p,
    };
  },
  diagnose(p, r) {
    if (r.type !== 'compare' || r.value === null) return { tags: [] };
    const x = r.value;
    const a = String(p.left.k);
    const b = String(p.right.k);
    const buggy: Cmp[] = [
      // Comparing digit strings from the left without looking at the number of digits.
      a < b ? '<' : a > b ? '>' : '=',
      // Ignoring the units 万 / 亿.
      cmp(p.left.k, p.right.k),
      // Comparing only the first digit.
      cmp(Number(a[0]), Number(b[0])),
    ];
    return { tags: buggy.includes(x) ? ['place-value'] : [] };
  },
});
