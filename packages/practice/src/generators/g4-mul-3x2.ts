import type { ErrorTag } from '@xuexi/shared';
import {
  addCarryBugs,
  countCarries,
  countMulCarries,
  mulDigitCarryBugs,
  mulDigitFactBugs,
  numLen,
  pow10,
  trailingZeros,
} from '../arith';
import type { Rng } from '../rng';
import type { Response, SolutionStep } from '../types';
import { BLANK, defineGenerator, numOf, sampleUntil, step, type Diagnosis } from './base';

/**
 * g4.mul.3x2 — 三位数乘两位数（竖式）。
 *
 * Variant 'standard': multiplier has no trailing 0 → two partial-product rows.
 * Variant 'trailing-zero': multiplier is 整十数 (e.g. 240 × 30) → partialRows = 0:
 *   compute the non-zero parts, then append the zeros (北师大 “末尾有 0 的乘法”).
 *
 * Difficulty (standard):
 *  1 部分积不进位
 *  2 部分积共 1~2 次进位
 *  3 部分积 ≥ 3 次进位，相加也有进位
 *  4 被乘数中间有 0 或末尾有 0，有进位
 *  5 中间 / 末尾有 0，两行部分积都进位，乘数个位 ≥ 6，相加 ≥ 2 次进位
 * Difficulty (trailing-zero):
 *  1 三位数 × 整十数，不进位      2 有进位
 *  3 被乘数末尾也有 0（240 × 30）  4 同上且进位多、乘数大
 *  5 口诀积本身末尾有 0 或被乘数末尾两个 0（250 × 40, 300 × 50）
 *
 * Grid response (see types.ts): partials[i] is row i read from its leftmost
 * filled cell to the rightmost grid column, empty cells as ' '. Trailing
 * spaces therefore mark the shift; a trailing '0' is accepted as well.
 */

export interface Mul3x2Params {
  a: number;
  b: number;
  trailing: boolean;
}

/** Parse a partial-product row: spaces are empty cells worth 0. null for an empty row. */
export function parsePartialRow(row: string | undefined): number | null {
  if (row === undefined) return null;
  const t = row.replace(/^\s+/, '');
  if (t === '' || !/^[0-9 ]+$/.test(t)) return null;
  return Number(t.replace(/ /g, '0'));
}

function totalPartialCarries(a: number, b: number): number {
  return countMulCarries(a, b % 10) + countMulCarries(a, Math.floor(b / 10));
}

function hasMiddleZero(a: number): boolean {
  return String(a)[1] === '0';
}

function pickStandard(rng: Rng, d: number, target?: ErrorTag): Mul3x2Params {
  const level = target === 'carry-missed' ? Math.max(d, 3) : d;
  const sample = (): Mul3x2Params => {
    let a: number;
    if (level >= 4 || target === 'trailing-zero') {
      const shape = target === 'trailing-zero' ? 1 : rng.int(0, 1);
      a = shape === 0 ? rng.int(1, 9) * 100 + rng.int(1, 9) : rng.int(10, 99) * 10; // 305 or 240
    } else a = rng.int(101, 999);
    const lo = level >= 5 || target === 'mul-fact' ? 6 : 1;
    const b = rng.int(1, 9) * 10 + rng.int(lo, 9);
    return { a, b, trailing: false };
  };
  const accept = ({ a, b }: Mul3x2Params): boolean => {
    if (b % 10 === 0 || b < 11) return false;
    const c = totalPartialCarries(a, b);
    const sumCarries = countCarries(a * (b % 10), a * Math.floor(b / 10) * 10);
    if (target === 'trailing-zero') return a % 10 === 0 && c >= 1;
    switch (level) {
      case 1:
        return c === 0 && sumCarries <= 1 && !String(a).includes('0');
      case 2:
        return c >= 1 && c <= 2 && !String(a).includes('0');
      case 3:
        return c >= 3 && sumCarries >= 1 && !String(a).includes('0');
      case 4:
        return (hasMiddleZero(a) || a % 10 === 0) && c >= 1;
      default:
        // A 0 inside the multiplicand limits carries to one per partial row.
        return (hasMiddleZero(a) || a % 10 === 0) && c >= 2 && sumCarries >= 2;
    }
  };
  return sampleUntil(sample, accept, `3x2 standard d${level}`);
}

function pickTrailing(rng: Rng, d: number, target?: ErrorTag): Mul3x2Params {
  const level =
    target === 'trailing-zero' ? Math.max(d, 3) : target === 'carry-missed' ? Math.max(d, 2) : d;
  const sample = (): Mul3x2Params => {
    const t = rng.int(level >= 4 ? 5 : 2, 9);
    let a: number;
    if (level <= 2) a = rng.int(111, 999);
    else if (level <= 4) a = rng.int(11, 99) * 10;
    else a = rng.chance(0.5) ? rng.int(1, 9) * 100 : rng.int(11, 99) * 10;
    return { a, b: t * 10, trailing: true };
  };
  const accept = ({ a, b }: Mul3x2Params): boolean => {
    const t = b / 10;
    const coreA = a / pow10(trailingZeros(a));
    const c = countMulCarries(coreA, t);
    switch (level) {
      case 1:
        return a % 10 !== 0 && c === 0;
      case 2:
        return a % 10 !== 0 && c >= 1;
      case 3:
        return a % 10 === 0;
      case 4:
        return a % 10 === 0 && c >= 1;
      default:
        return (a % 100 === 0 || (coreA * t) % 10 === 0) && a % 10 === 0;
    }
  };
  return sampleUntil(sample, accept, `3x2 trailing d${level}`);
}

function standardSteps(a: number, b: number): SolutionStep[] {
  const o = b % 10;
  const t = Math.floor(b / 10);
  return [
    step(`先用 ${b} 个位上的 ${o} 去乘 ${a}，积的末位和个位对齐：`, `${a} × ${o} = ${a * o}`),
    step(
      `再用 ${b} 十位上的 ${t} 去乘 ${a}，得 ${a * t} 个十，积的末位和十位对齐：`,
      `${a} × ${t * 10} = ${a * t * 10}`,
    ),
    step('最后把两次乘得的积加起来：', `${a * o} + ${a * t * 10} = ${a * b}`),
    step('所以', `${a} × ${b} = ${a * b}`),
  ];
}

function trailingSteps(a: number, b: number): SolutionStep[] {
  const za = trailingZeros(a);
  const ca = a / pow10(za);
  const t = b / 10;
  const z = za + 1;
  return [
    step(`先不看因数末尾的 0，把 ${ca} 和 ${t} 的末尾对齐，算：`, `${ca} × ${t} = ${ca * t}`),
    step(`两个因数末尾一共有 ${z} 个 0，在 ${ca * t} 的末尾添上 ${z} 个 0。`),
    step('所以', `${a} × ${b} = ${a * b}`),
  ];
}

/** Diagnose one partial product p against the correct a × digit. */
function partialTags(a: number, digit: number, p: number): ErrorTag[] {
  const tags: ErrorTag[] = [];
  if (mulDigitCarryBugs(a, digit).includes(p)) tags.push('carry-missed');
  if (mulDigitFactBugs(a, digit).includes(p)) tags.push('mul-fact');
  return tags;
}

function diagnoseStandard(a: number, b: number, r: Response): Diagnosis {
  const o = b % 10;
  const t = Math.floor(b / 10);
  const P1 = a * o;
  const P2 = a * t; // before shifting
  const ans = a * b;
  const tags: ErrorTag[] = [];
  const x = numOf(r);

  // 1) Look at the partial rows when the grid reported them.
  const partials = r.type === 'vertical' ? (r.partials ?? []) : [];
  const p1 = parsePartialRow(partials[0]);
  const p2 = parsePartialRow(partials[1]);
  let rowsOk = p1 !== null && p2 !== null;
  if (p1 !== null && p1 !== P1) {
    rowsOk = false;
    tags.push(...partialTags(a, o, p1));
  }
  if (p2 !== null && p2 !== P2 * 10) {
    rowsOk = false;
    if (p2 === P2 || p2 === P2 * 100) tags.push('partial-shift');
    else if (p2 % 10 === 0 && partialTags(a, t, p2 / 10).length > 0)
      tags.push(...partialTags(a, t, p2 / 10));
    else if (partialTags(a, t, p2).length > 0) tags.push('partial-shift', ...partialTags(a, t, p2));
  }
  if (
    rowsOk &&
    p1 === P1 &&
    p2 === P2 * 10 &&
    x !== null &&
    addCarryBugs(P1, P2 * 10).includes(x)
  ) {
    tags.push('carry-missed');
  }
  if (tags.length > 0 || x === null) return { tags };

  // 2) Only the final value: compare with the results of typical wrong procedures.
  if (x === P1 + P2 || x === P1 + P2 * 100) tags.push('partial-shift');
  const p1s = [P1, ...mulDigitCarryBugs(a, o)];
  const p2s = [P2, ...mulDigitCarryBugs(a, t)];
  if (
    p1s.some((u) => p2s.some((v) => (u !== P1 || v !== P2) && u + v * 10 === x)) ||
    addCarryBugs(P1, P2 * 10).includes(x)
  ) {
    tags.push('carry-missed');
  }
  const f1 = mulDigitFactBugs(a, o);
  const f2 = mulDigitFactBugs(a, t);
  if (f1.some((u) => u + P2 * 10 === x) || f2.some((v) => P1 + v * 10 === x)) tags.push('mul-fact');
  if (a % 10 === 0 && [1, 2].some((k) => x * pow10(k) === ans || x === ans * pow10(k)))
    tags.push('trailing-zero');
  return { tags };
}

function diagnoseTrailing(a: number, b: number, x: number | null): Diagnosis {
  if (x === null) return { tags: [] };
  const za = trailingZeros(a);
  const ca = a / pow10(za);
  const t = b / 10;
  const scale = pow10(za + 1);
  const ans = a * b;
  const tags: ErrorTag[] = [];
  for (const k of [1, 2, 3])
    if (x * pow10(k) === ans || x === ans * pow10(k)) tags.push('trailing-zero');
  if (mulDigitCarryBugs(ca, t).some((v) => v * scale === x)) tags.push('carry-missed');
  if (mulDigitFactBugs(ca, t).some((v) => v * scale === x)) tags.push('mul-fact');
  return { tags: [...new Set(tags)] };
}

export const g4Mul3x2 = defineGenerator<Mul3x2Params>({
  id: 'g4.mul.3x2',
  variants: ['standard', 'trailing-zero'],
  targets: ['partial-shift', 'carry-missed', 'trailing-zero', 'mul-fact'],
  build({ difficulty: d, variant, target, rng }) {
    const trailing = variant === 'trailing-zero' && target !== 'partial-shift';
    const p = trailing ? pickTrailing(rng, d, target) : pickStandard(rng, d, target);
    const { a, b } = p;
    const ans = a * b;
    const o = b % 10;
    const t = Math.floor(b / 10);
    const columns = trailing
      ? Math.max(numLen(a), numLen(b), numLen(ans))
      : Math.max(numLen(a), numLen(b), numLen(a * o), numLen(a * t) + 1, numLen(ans));
    return {
      widget: 'vertical',
      prompt: `用竖式计算：${a} × ${b} = ${BLANK}`,
      vertical: { op: '×', operands: [a, b], partialRows: trailing ? 0 : 2, columns },
      answer: { type: 'number', value: ans },
      hint: trailing
        ? '先把 0 前面的数相乘，再数一数两个因数末尾一共有几个 0。'
        : `先用个位上的 ${o} 去乘，再用十位上的 ${t} 去乘，注意第二次的积要和十位对齐。`,
      steps: trailing ? trailingSteps(a, b) : standardSteps(a, b),
      targetSeconds: trailing ? 25 + 5 * d : 50 + 10 * d,
      params: { a, b, trailing },
    };
  },
  diagnose({ a, b, trailing }, r) {
    return trailing ? diagnoseTrailing(a, b, numOf(r)) : diagnoseStandard(a, b, r);
  },
  feedback: {
    'carry-missed': '乘的时候满几十就要向前一位进几，加的时候也别忘了进位哦！',
  },
});
