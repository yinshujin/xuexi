import { roundTo } from '../arith';
import type { Rng } from '../rng';
import type { SolutionStep } from '../types';
import { BLANK, defineGenerator, numOf, sampleUntil, step } from './base';

/**
 * g4.mul.estimate — 乘法估算。
 *
 * 北师大版做法：把因数看作接近的整十、整百数（四舍五入到最高位）再口算。
 * 规则写在题目里，保证答案唯一：三位数看作整百数，两位数看作整十数，一位数不变。
 *
 * Difficulty:
 *  1 三位数 × 一位数，三位数接近整百（198 × 4）
 *  2 两位数 × 两位数，都接近整十（29 × 41）
 *  3 三位数 × 两位数，接近整百 / 整十
 *  4 有「临界」的数（349、351、45、64）或进位后变成 100
 *  5 生活情境（深圳）+ 临界数
 */

export interface EstimateParams {
  a: number;
  b: number;
  context: number;
}

/** The rounding rule the prompt states. */
export function estimateOf(n: number): number {
  if (n >= 100) return roundTo(n, 100);
  if (n >= 10) return roundTo(n, 10);
  return n;
}

const CONTEXTS = [
  (a: number, b: number) =>
    `学校组织 ${a} 名同学去深圳湾公园，每人车费 ${b} 元，大约一共需要多少元？`,
  (a: number, b: number) => `深圳地铁一列车大约能坐 ${a} 人，${b} 列这样的车大约能坐多少人？`,
  (a: number, b: number) => `一箱荔枝重 ${b} 千克，${a} 箱大约重多少千克？`,
  (a: number, b: number) => `每本故事书 ${b} 元，图书室买了 ${a} 本，大约花了多少元？`,
];

function nearHundred(rng: Rng): number {
  // tens digit 0/1 (just above) or 8/9 (just below a hundred)
  const h = rng.int(1, 9);
  return rng.chance(0.5) ? h * 100 + rng.int(1, 19) : h * 100 - rng.int(1, 19);
}

function nearTen(rng: Rng): number {
  const t = rng.int(2, 9);
  return t * 10 + rng.pick([1, 2, -1, -2]);
}

function boundary(rng: Rng, digits: 2 | 3): number {
  if (digits === 3) {
    const h = rng.int(1, 8);
    return h * 100 + rng.pick([45, 46, 48, 49, 51, 52, 54, 55, 95, 96, 98]);
  }
  return rng.int(1, 9) * 10 + rng.pick([4, 5, 6]);
}

function whyText(n: number, r: number): string {
  if (n === r) return `${n} 不用变`;
  const unit = n >= 100 ? 100 : 10;
  const unitName = unit === 100 ? '十位' : '个位';
  const dig = Math.floor(n / (unit / 10)) % 10;
  return `${n} 的${unitName}是 ${dig}，${dig >= 5 ? `${dig} ≥ 5，要进 1` : `${dig} < 5，舍去`}，看作 ${r}`;
}

export const g4MulEstimate = defineGenerator<EstimateParams>({
  id: 'g4.mul.estimate',
  variants: ['default'],
  targets: ['rounding'],
  build({ difficulty: d, target, rng }) {
    const level = target === 'rounding' ? Math.max(d, 4) : d;
    const p = sampleUntil(
      (): EstimateParams => {
        const context = rng.int(0, CONTEXTS.length - 1);
        switch (level) {
          case 1:
            return { a: nearHundred(rng), b: rng.int(2, 9), context };
          case 2:
            return { a: nearTen(rng), b: nearTen(rng), context };
          case 3:
            return { a: nearHundred(rng), b: nearTen(rng), context };
          default:
            return rng.chance(0.5)
              ? { a: boundary(rng, 3), b: nearTen(rng), context }
              : { a: nearHundred(rng), b: boundary(rng, 2), context };
        }
      },
      (x) =>
        x.a >= 100 === (level !== 2) &&
        x.a * x.b !== estimateOf(x.a) * estimateOf(x.b) &&
        estimateOf(x.a) < 1000,
      'estimate',
    );
    const { a, b } = p;
    const ra = estimateOf(a);
    const rb = estimateOf(b);
    const ans = ra * rb;
    const rule = level === 2 ? '（两位数看作整十数）' : '（三位数看作整百数，两位数看作整十数）';
    const prompt =
      level >= 5 ? `${CONTEXTS[p.context](a, b)}${rule}` : `估算：${a} × ${b} ≈ ${BLANK}${rule}`;
    const steps: SolutionStep[] = [
      step(`${whyText(a, ra)}。`),
      step(`${whyText(b, rb)}。`),
      step('再口算：', `${ra} × ${rb} = ${ans}`),
      step('所以', `${a} × ${b} ≈ ${ans}`),
    ];
    return {
      widget: 'numeric',
      prompt,
      answer: { type: 'number', value: ans },
      hint: '先把因数看作接近的整十、整百数，再口算。',
      steps,
      targetSeconds: level >= 5 ? 30 : 15 + 2 * d,
      params: p,
    };
  },
  diagnose({ a, b }, r) {
    const x = numOf(r);
    if (x === null) return { tags: [] };
    const cands = (n: number): number[] => {
      const out = [n];
      for (const u of [10, 100]) {
        if (n >= u) out.push(Math.floor(n / u) * u, Math.ceil(n / u) * u, roundTo(n, u));
      }
      return [...new Set(out)];
    };
    const ans = estimateOf(a) * estimateOf(b);
    const wrong = cands(a)
      .flatMap((u) => cands(b).map((v) => u * v))
      .filter((v) => v !== ans);
    return { tags: wrong.includes(x) ? ['rounding'] : [] };
  },
});
