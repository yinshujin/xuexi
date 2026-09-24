import type { ErrorTag } from '@xuexi/shared';
import { MINUS } from '../arith';
import type { Rng } from '../rng';
import type { SolutionStep } from '../types';
import { BLANK, defineGenerator, numOf, step, type Diagnosis } from './base';

/**
 * g4.law.simplify — 运算律与简便计算。
 *
 * Forms:
 *  add-pair    38 + 45 + 62            加法交换律、结合律（凑整百）
 *  add-pair4   64 + 28 + 36 + 72
 *  mul-pair    25 × 17 × 4             乘法交换律、结合律（25×4、125×8）
 *  dist-fwd    25 × (40 + 4), (100 + 2) × 45     乘法分配律
 *  dist-rev    36 × 58 + 36 × 42, 38 × 126 − 38 × 26   分配律逆用
 *  mul-split   25 × 44 = 25 × 4 × 11
 *  dist-split  102 × 45, 45 × 99
 *  dist-rev1   37 × 99 + 37
 *
 * Difficulty: 1 add-pair · 2 mul-pair / add-pair4 · 3 dist-fwd · 4 dist-rev · 5 mul-split / dist-split / dist-rev1
 */

type Form =
  | 'add-pair'
  | 'add-pair4'
  | 'mul-pair'
  | 'dist-fwd'
  | 'dist-rev'
  | 'mul-split'
  | 'dist-split'
  | 'dist-rev1';

export interface LawParams {
  form: Form;
  /** Meaning depends on the form, see `describe`. */
  n: number[];
  /** dist-rev / dist-split / dist-rev1: '+' or '-'; dist-fwd: 0 = c×(h+s), 1 = (h+s)×c */
  sign: '+' | '-';
  layout: number;
}

const FORMS_BY_LEVEL: Form[][] = [
  ['add-pair'],
  ['mul-pair', 'add-pair4'],
  ['dist-fwd'],
  ['dist-rev'],
  ['mul-split', 'dist-split', 'dist-rev1'],
];

function pickParams(rng: Rng, form: Form): LawParams {
  const base = { form, sign: '+' as '+' | '-', layout: rng.int(0, 1) };
  switch (form) {
    case 'add-pair': {
      const hund = rng.chance(0.3) ? 200 : 100;
      let a = rng.int(11, hund - 11);
      if (a % 10 === 0) a++;
      return { ...base, n: [a, rng.int(12, 99), hund - a] };
    }
    case 'add-pair4': {
      let a = rng.int(11, 89);
      let b = rng.int(11, 89);
      if (a % 10 === 0) a++;
      if (b % 10 === 0 || b === a || b === 100 - a) b = b === 88 ? 17 : b + 1;
      return { ...base, n: [a, b, 100 - a, 100 - b] };
    }
    case 'mul-pair': {
      const [p, q] = rng.pick<[number, number]>([
        [25, 4],
        [125, 8],
        [50, 2],
        [20, 5],
        [4, 25],
      ]);
      return { ...base, n: [p, rng.int(3, 49), q] };
    }
    case 'dist-fwd': {
      if (base.layout === 0) {
        const [c, h] = rng.pick<[number, number]>([
          [25, 40],
          [25, 80],
          [125, 80],
          [15, 10],
          [12, 10],
        ]);
        return { ...base, n: [c, h, rng.int(1, 9)] };
      }
      return { ...base, n: [rng.int(12, 99), 100, rng.int(1, 9)] };
    }
    case 'dist-rev': {
      const a = rng.int(12, 99);
      if (rng.chance(0.6)) {
        const b = rng.int(11, 89);
        return { ...base, n: [a, b, 100 - b], sign: '+' };
      }
      const c = rng.int(11, 89);
      return { ...base, n: [a, 100 + c, c], sign: '-' };
    }
    case 'mul-split': {
      const [p, pair] = rng.pick<[number, number]>([
        [25, 4],
        [125, 8],
      ]);
      const k = pair === 4 ? rng.int(3, 24) : rng.int(2, 12);
      return { ...base, n: [p, pair, k === pair ? k + 1 : k] };
    }
    case 'dist-split': {
      const c = rng.int(12, 99);
      return rng.chance(0.5)
        ? { ...base, n: [c, 100, rng.int(1, 9)], sign: '+' }
        : { ...base, n: [c, 100, rng.int(1, 2)], sign: '-' };
    }
    case 'dist-rev1': {
      const a = rng.int(12, 99);
      return { ...base, n: [a], sign: rng.chance(0.6) ? '+' : '-' };
    }
  }
}

/** Expression shown to the child and the answer. */
export function describeLaw(p: LawParams): { expr: string; value: number } {
  const [a, b, c, d] = p.n;
  const s = p.sign === '+' ? '+' : MINUS;
  switch (p.form) {
    case 'add-pair':
      return { expr: `${a} + ${b} + ${c}`, value: a + b + c };
    case 'add-pair4':
      return { expr: `${a} + ${b} + ${c} + ${d}`, value: a + b + c + d };
    case 'mul-pair':
      return { expr: `${a} × ${b} × ${c}`, value: a * b * c };
    case 'dist-fwd':
      return p.layout === 0
        ? { expr: `${a} × (${b} + ${c})`, value: a * (b + c) }
        : { expr: `(${b} + ${c}) × ${a}`, value: a * (b + c) };
    case 'dist-rev':
      return {
        expr: `${a} × ${b} ${s} ${a} × ${c}`,
        value: p.sign === '+' ? a * b + a * c : a * b - a * c,
      };
    case 'mul-split':
      return { expr: `${a} × ${b * c}`, value: a * b * c };
    case 'dist-split':
      return p.sign === '+'
        ? { expr: `${b + c} × ${a}`, value: (b + c) * a }
        : { expr: `${a} × ${b - c}`, value: a * (b - c) };
    case 'dist-rev1':
      return p.sign === '+'
        ? { expr: `${a} × 99 + ${a}`, value: a * 100 }
        : { expr: `${a} × 101 ${MINUS} ${a}`, value: a * 100 };
  }
}

function lawSteps(p: LawParams): SolutionStep[] {
  const [a, b, c, d] = p.n;
  const { expr, value } = describeLaw(p);
  const s = p.sign === '+' ? '+' : MINUS;
  switch (p.form) {
    case 'add-pair':
      return [
        step(
          `${a} 和 ${c} 能凑成整百，用加法交换律、结合律先把它们加起来：`,
          `${expr} = (${a} + ${c}) + ${b}`,
        ),
        step('先算：', `= ${a + c} + ${b}`),
        step('得：', `= ${value}`),
      ];
    case 'add-pair4':
      return [
        step(
          '用加法交换律、结合律，把能凑成整百的数放在一起：',
          `${expr} = (${a} + ${c}) + (${b} + ${d})`,
        ),
        step('先算：', `= ${a + c} + ${b + d}`),
        step('得：', `= ${value}`),
      ];
    case 'mul-pair':
      return [
        step(
          `${a} × ${c} = ${a * c}，用乘法交换律、结合律先算它们：`,
          `${expr} = (${a} × ${c}) × ${b}`,
        ),
        step('先算：', `= ${a * c} × ${b}`),
        step('得：', `= ${value}`),
      ];
    case 'dist-fwd':
      return [
        step(
          '用乘法分配律：括号里的两个数都要和括号外的数相乘，再把积相加。',
          `${expr} = ${a} × ${b} + ${a} × ${c}`,
        ),
        step('先算：', `= ${a * b} + ${a * c}`),
        step('得：', `= ${value}`),
      ];
    case 'dist-rev':
      return [
        step(
          `两个积都有相同的因数 ${a}，用乘法分配律（逆用）：`,
          `${expr} = ${a} × (${b} ${s} ${c})`,
        ),
        step('先算：', `= ${a} × ${p.sign === '+' ? b + c : b - c}`),
        step('得：', `= ${value}`),
      ];
    case 'mul-split':
      return [
        step(
          `把 ${b * c} 拆成 ${b} × ${c}，再用乘法结合律让 ${a} 和 ${b} 先乘：`,
          `${expr} = ${a} × ${b} × ${c}`,
        ),
        step('先算：', `= ${a * b} × ${c}`),
        step('得：', `= ${value}`),
      ];
    case 'dist-split':
      return p.sign === '+'
        ? [
            step(
              `把 ${b + c} 看作 ${b} + ${c}，用乘法分配律：`,
              `${expr} = (${b} + ${c}) × ${a} = ${b} × ${a} + ${c} × ${a}`,
            ),
            step('先算：', `= ${b * a} + ${c * a}`),
            step('得：', `= ${value}`),
          ]
        : [
            step(
              `把 ${b - c} 看作 ${b} ${MINUS} ${c}，用乘法分配律：`,
              `${expr} = ${a} × (${b} ${MINUS} ${c}) = ${a} × ${b} ${MINUS} ${a} × ${c}`,
            ),
            step('先算：', `= ${a * b} ${MINUS} ${a * c}`),
            step('得：', `= ${value}`),
          ];
    case 'dist-rev1':
      return [
        step(
          `${a} 可以看作 ${a} × 1，用乘法分配律（逆用）：`,
          `${expr} = ${a} × (${p.sign === '+' ? '99 + 1' : `101 ${MINUS} 1`})`,
        ),
        step('先算：', `= ${a} × 100`),
        step('得：', `= ${value}`),
      ];
  }
}

export const g4LawSimplify = defineGenerator<LawParams>({
  id: 'g4.law.simplify',
  variants: ['default'],
  targets: ['distributive-miss', 'pairing', 'order-of-ops'],
  build({ difficulty: d, target, rng }) {
    const forms: Form[] =
      target === 'distributive-miss'
        ? ['dist-fwd', 'dist-split']
        : target === 'pairing'
          ? ['mul-pair', 'mul-split']
          : target === 'order-of-ops'
            ? ['dist-rev']
            : FORMS_BY_LEVEL[d - 1];
    const p = pickParams(rng, rng.pick(forms));
    const { expr, value } = describeLaw(p);
    return {
      widget: 'numeric',
      prompt: `用简便方法计算：${expr} = ${BLANK}`,
      answer: { type: 'number', value },
      hint: p.form.startsWith('dist')
        ? '想一想乘法分配律：(a + b) × c = a × c + b × c。'
        : p.form.startsWith('add')
          ? '找一找哪两个数能凑成整百。'
          : '找一找哪两个数相乘能得到整十、整百或整千。',
      steps: lawSteps(p),
      targetSeconds: [15, 20, 25, 25, 30][d - 1],
      params: p,
    };
  },
  diagnose(p, r) {
    const x = numOf(r);
    if (x === null) return { tags: [] };
    const [a, b, c] = p.n;
    const { value } = describeLaw(p);
    const tags: Diagnosis['tags'] = [];
    const add = (tag: ErrorTag, cond: boolean) => cond && tags.push(tag);
    switch (p.form) {
      case 'add-pair':
      case 'add-pair4':
        add(
          'pairing',
          [10, 100].some((k) => x === value + k || x === value - k),
        );
        break;
      case 'mul-pair':
        add('pairing', x * 10 === value || x === value * 10 || x === (a + c) * b);
        break;
      case 'mul-split':
        // 25 × 44 → 25 × 4 + 11, or a wrong 凑整 value (25 × 4 = 1000).
        add('pairing', x === a * b + c || x * 10 === value || x === value * 10);
        // 25 × 44 → 25 × 40 + 4
        add(
          'distributive-miss',
          (b * c) % 10 !== 0 && x === a * (b * c - ((b * c) % 10)) + ((b * c) % 10),
        );
        break;
      case 'dist-fwd':
        add('distributive-miss', x === a * b + c || x === b + a * c);
        break;
      case 'dist-split':
        if (p.sign === '+') add('distributive-miss', x === b * a + c || x === b + c * a);
        else add('distributive-miss', x === a * b - c || x === a * b - a * c - c);
        break;
      case 'dist-rev':
        add('order-of-ops', p.sign === '+' ? x === (a * b + a) * c : x === (a * b - a) * c);
        add(
          'distributive-miss',
          x === a * b + c || x === a * b - c || x === a * (p.sign === '+' ? b + c : b - c) + a,
        );
        break;
      case 'dist-rev1':
        add(
          'distributive-miss',
          x === a * 99 || x === a * 101 || x === a * 99 + 1 || x === a * 101 - 1,
        );
        add('order-of-ops', p.sign === '+' ? x === a * (99 + a) : x === a * (101 - a));
        break;
    }
    return { tags: [...new Set(tags)] };
  },
});
