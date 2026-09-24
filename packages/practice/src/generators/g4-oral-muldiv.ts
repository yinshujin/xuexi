import { pow10, trailingZeros } from '../arith';
import type { SolutionStep } from '../types';
import { BLANK, defineGenerator, numOf, step, type Diagnosis } from './base';

/**
 * g4.oral.muldiv — 整十、整百数乘除口算（以及 25×4、125×8 这类凑整口算）。
 *
 * Difficulty:
 *  1 整十 / 整百数 × 一位数，整十 / 整百数 ÷ 一位数（30×4, 200×3, 80÷4, 4500÷5）
 *  2 整十 × 整十，整十 / 整百数 ÷ 整十数（30×40, 80÷20, 600÷20）
 *  3 口诀的积本身末尾有 0（50×40=2000, 2000÷40=50）
 *  4 凑整口算 25×4, 15×6, 25×40；商是整十、整百数的除法 1800÷60, 42000÷70
 *  5 250×40, 125×80；2000÷25, 10000÷125
 */

export interface OralParams {
  op: '×' | '÷';
  /** × : factors; ÷ : dividend, divisor */
  a: number;
  b: number;
}

/** Strip trailing zeros: 3000 → [3, 3]. */
function core(n: number): [number, number] {
  const z = trailingZeros(n);
  return [n / pow10(z), z];
}

const PAIRS: Array<[number, number]> = [
  [25, 4],
  [25, 8],
  [125, 8],
  [15, 6],
  [12, 5],
  [35, 2],
  [45, 2],
  [16, 5],
  [24, 5],
  [75, 4],
  [14, 5],
  [18, 5],
];

export const g4OralMulDiv = defineGenerator<OralParams>({
  id: 'g4.oral.muldiv',
  variants: ['mixed', 'mul', 'div'],
  targets: ['trailing-zero', 'mul-fact'],
  build({ difficulty: d, variant, target, rng }) {
    const op: '×' | '÷' =
      variant === 'mul' ? '×' : variant === 'div' ? '÷' : rng.chance(0.55) ? '×' : '÷';
    const level =
      target === 'trailing-zero' ? Math.max(d, 3) : target === 'mul-fact' ? Math.max(d, 2) : d;
    const bigFact = () => rng.int(target === 'mul-fact' ? 6 : 2, 9);
    // Choose the core facts x × y (both 1..9 or a 凑整 pair) and zero counts.
    let x: number, y: number, zx: number, zy: number;
    switch (level) {
      case 1:
        [x, y, zx, zy] = [bigFact(), bigFact(), rng.int(1, 2), 0];
        break;
      case 2:
        [x, y, zx, zy] = [bigFact(), bigFact(), rng.int(1, 2), 1];
        break;
      case 3: {
        const [p, q] = rng.pick<[number, number]>([
          [5, 2],
          [5, 4],
          [5, 6],
          [5, 8],
          [4, 5],
          [6, 5],
          [8, 5],
          [2, 5],
        ]);
        [x, y, zx, zy] = [p, q, 1, rng.int(0, 1)];
        break;
      }
      case 4: {
        const [p, q] = rng.pick(PAIRS);
        [x, y, zx, zy] = [p, q, 0, rng.int(0, 1)];
        break;
      }
      default: {
        // 250 × 40, 125 × 80, 250 × 80
        const [p, q] = rng.pick(PAIRS.slice(0, 3));
        [x, y, zx, zy] = [p, q, p === 125 ? 0 : 1, 1];
      }
    }
    if (rng.chance(0.5) && op === '×') [x, y, zx, zy] = [y, x, zy, zx];
    if (op === '÷') {
      // Division: quotient A = x·10^zx, divisor B = y·10^zy, dividend A·B.
      switch (level) {
        case 1: // 80 ÷ 4, 4500 ÷ 5
          [x, y, zx, zy] = [bigFact(), bigFact(), rng.int(1, 2), 0];
          break;
        case 2: // 80 ÷ 20, 600 ÷ 20
          [x, y, zx, zy] = [bigFact(), bigFact(), rng.int(0, 1), 1];
          break;
        case 3: // 200 ÷ 40, 2000 ÷ 40 (口诀积末尾有 0)
          zx = rng.int(0, 1);
          zy = 1;
          break;
        case 4: // 1800 ÷ 60, 42000 ÷ 70
          [x, y, zx, zy] = [bigFact(), bigFact(), rng.int(1, 2), 1];
          break;
        default: {
          // 2000 ÷ 25, 10000 ÷ 125, 20000 ÷ 250
          const [p, q] = rng.pick(PAIRS.slice(0, 3));
          [x, y, zx, zy] = p === 125 ? [q, p, 1, 0] : [q, p, rng.int(1, 2), rng.int(0, 1)];
        }
      }
    }
    const A = x * pow10(zx);
    const B = y * pow10(zy);
    const params: OralParams = op === '×' ? { op, a: A, b: B } : { op, a: A * B, b: B };
    const ans = op === '×' ? A * B : A;
    const steps: SolutionStep[] =
      op === '×' ? mulSteps(params.a, params.b) : divSteps(params.a, params.b);
    return {
      widget: 'numeric',
      prompt: `${params.a} ${op} ${params.b} = ${BLANK}`,
      answer: { type: 'number', value: ans },
      hint:
        op === '×'
          ? '先算 0 前面的数相乘，再数一数末尾一共有几个 0。'
          : '想一想：除数乘几等于被除数？',
      steps,
      targetSeconds: [6, 8, 10, 10, 12][d - 1],
      params,
    };
  },
  diagnose(p, r) {
    const x = numOf(r);
    if (x === null) return { tags: [] };
    const ans = p.op === '×' ? p.a * p.b : p.a / p.b;
    const tags: Diagnosis['tags'] = [];
    for (const k of [1, 2, 3]) {
      if (x === ans * pow10(k) || x * pow10(k) === ans) tags.push('trailing-zero');
    }
    if (p.op === '×') {
      const [ca, za] = core(p.a);
      const [cb, zb] = core(p.b);
      const scale = pow10(za + zb);
      const wrong = [(ca + 1) * cb, (ca - 1) * cb, ca * (cb + 1), ca * (cb - 1)].map(
        (v) => v * scale,
      );
      if (wrong.includes(x)) tags.push('mul-fact');
    } else {
      const [cq, zq] = core(ans);
      if ([(cq + 1) * pow10(zq), (cq - 1) * pow10(zq)].includes(x)) tags.push('mul-fact');
    }
    return { tags: [...new Set(tags)] };
  },
});

function mulSteps(a: number, b: number): SolutionStep[] {
  const [ca, za] = core(a);
  const [cb, zb] = core(b);
  const z = za + zb;
  const out: SolutionStep[] = [step(`先不看末尾的 0，算：`, `${ca} × ${cb} = ${ca * cb}`)];
  if (z > 0) out.push(step(`两个因数末尾一共有 ${z} 个 0，在 ${ca * cb} 的末尾添上 ${z} 个 0。`));
  out.push(step('所以', `${a} × ${b} = ${a * b}`));
  return out;
}

function divSteps(n: number, dv: number): SolutionStep[] {
  const q = n / dv;
  return [
    step(`想：${dv} × ( ) = ${n}？`),
    step('因为', `${dv} × ${q} = ${n}`),
    step('所以', `${n} ÷ ${dv} = ${q}`),
  ];
}
