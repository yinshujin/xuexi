import type { ErrorTag } from '@xuexi/shared';
import { koujue } from '../chinese';
import {
  BLANK,
  buildChoice,
  choiceDiagnosis,
  defineGenerator,
  numOf,
  sampleUntil,
  step,
  type Diagnosis,
} from './base';

/**
 * g2.mul.meaning — 乘法的意义（几个几相加）。
 *
 * Forms:
 *  C1 choice  「n个m相加，用乘法算式表示是」
 *  C2 choice  情境「每盘 m 个，n 盘」选列式
 *  N1 numeric 「m+m+…+m = ( ) × m」
 *  N2 numeric 「n个m相加，和是多少」
 *  N3 numeric 「n × m 比 (n−k) × m 多 ( )」
 *
 * Difficulty raises the factor range and moves from recognising the meaning
 * to using it (N3).
 */

type Form = 'C1' | 'C2' | 'N1' | 'N2' | 'N3';

export interface MulMeaningParams {
  form: Form;
  n: number;
  m: number;
  /** N3: how many fewer groups on the right side. */
  k: number;
  context: number;
  optionTags: Array<ErrorTag | null>;
}

const RANGES: Array<[number, number, number, number]> = [
  // nMin, nMax, mMin, mMax
  [2, 4, 2, 5],
  [2, 5, 2, 6],
  [3, 6, 2, 9],
  [3, 8, 3, 9],
  [4, 9, 3, 9],
];

const CONTEXTS = [
  { each: '盘', item: '苹果', unit: '个' },
  { each: '袋', item: '荔枝', unit: '颗' },
  { each: '排', item: '同学', unit: '名' },
  { each: '盒', item: '彩笔', unit: '支' },
  { each: '束', item: '花', unit: '朵' },
];

function formsFor(variant: string, d: number, target?: ErrorTag): Form[] {
  if (target === 'table-add-confused') return variant === 'choice' ? ['C1', 'C2'] : ['N2'];
  if (target === 'mul-meaning')
    return variant === 'choice'
      ? ['C1']
      : variant === 'numeric'
        ? ['N1', 'N3']
        : ['C1', 'N1', 'N3'];
  if (variant === 'choice') return d <= 2 ? ['C1'] : ['C1', 'C2'];
  if (variant === 'numeric')
    return d <= 2 ? ['N1'] : d === 3 ? ['N1', 'N2'] : d === 4 ? ['N2', 'N3'] : ['N3', 'N2'];
  return [
    ['C1', 'N1'],
    ['C1', 'N1', 'C2'],
    ['C2', 'N2', 'N1'],
    ['C2', 'N2', 'N3'],
    ['N3', 'N2', 'C2'],
  ][d - 1] as Form[];
}

export const g2MulMeaning = defineGenerator<MulMeaningParams>({
  id: 'g2.mul.meaning',
  variants: ['mixed', 'choice', 'numeric'],
  targets: ['mul-meaning', 'table-add-confused'],
  build({ difficulty: d, variant, target, rng }) {
    const form = rng.pick(formsFor(variant, d, target));
    const [nMin, nMax, mMin, mMax] = RANGES[d - 1];
    const { n, m } = sampleUntil(
      () => ({ n: rng.int(nMin, nMax), m: rng.int(mMin, mMax) }),
      (x) => x.n !== x.m && (form !== 'N1' || x.n <= 6),
      'mul meaning factors',
    );
    const k = form === 'N3' && d >= 5 && n >= 4 ? rng.int(1, 2) : 1;
    const context = rng.int(0, CONTEXTS.length - 1);
    const base = { form, n, m, k, context, optionTags: [] as Array<ErrorTag | null> };
    const table = `口诀：${koujue(n, m)}。`;

    if (form === 'C1' || form === 'C2') {
      // Only ONE of n×m / m×n appears among the options, so the answer is unique.
      const [x, y] = form === 'C1' ? [n, m] : [m, n];
      const meaning = rng
        .shuffle([
          { text: `${m} × ${m}`, tag: 'mul-meaning' as ErrorTag },
          { text: `${x + 1} × ${y}`, tag: 'mul-meaning' as ErrorTag },
          { text: `${x} × ${y + 1}`, tag: 'mul-meaning' as ErrorTag },
          { text: `${n} × ${n}`, tag: 'mul-meaning' as ErrorTag },
        ])
        .filter(
          (o, i, all) =>
            o.text !== `${x} × ${y}` &&
            o.text !== `${y} × ${x}` &&
            all.findIndex((z) => z.text === o.text) === i,
        );
      const choice = buildChoice(rng, `${x} × ${y}`, [
        { text: `${x} + ${y}`, tag: 'table-add-confused' },
        ...meaning.slice(0, 2),
      ]);
      const ctx = CONTEXTS[context];
      const prompt =
        form === 'C1'
          ? `${n}个${m}相加，用乘法算式表示是${BLANK}。`
          : `每${ctx.each}有 ${m} ${ctx.unit}${ctx.item}，${n} ${ctx.each}一共有多少${ctx.unit}？下面列式正确的是${BLANK}。`;
      return {
        widget: 'choice',
        prompt,
        options: choice.options,
        answer: { type: 'choice', index: choice.index },
        hint:
          form === 'C1'
            ? '想一想：几个几相加，可以写成几乘几。'
            : `想一想：求 ${n} 个 ${m} 是多少。`,
        steps: [
          step(
            form === 'C1'
              ? `${n} 个 ${m} 相加：${Array(n).fill(m).join(' + ')}。`
              : `每${ctx.each} ${m} ${ctx.unit}，${n} ${ctx.each}就是 ${n} 个 ${m}。`,
          ),
          step(`求 ${n} 个 ${m} 相加，可以用乘法：${n} × ${m} 或 ${m} × ${n}。`),
          step(`所以选「${x} × ${y}」。`),
        ],
        targetSeconds: form === 'C1' ? 10 : 15,
        params: { ...base, optionTags: choice.optionTags },
      };
    }
    if (form === 'N1') {
      return {
        widget: 'numeric',
        prompt: `${Array(n).fill(m).join(' + ')} = ${BLANK} × ${m}`,
        answer: { type: 'number', value: n },
        hint: `数一数，一共有几个 ${m} 相加？`,
        steps: [
          step(`一共有 ${n} 个 ${m} 相加。`),
          step(`${n} 个 ${m} 相加写成乘法：`, `${n} × ${m}`),
          step(`所以括号里填 ${n}。`),
        ],
        targetSeconds: 10,
        params: base,
      };
    }
    if (form === 'N2') {
      return {
        widget: 'numeric',
        prompt: `${n}个${m}相加，和是多少？`,
        answer: { type: 'number', value: n * m },
        hint: `${n} 个 ${m} 相加，可以用乘法算。`,
        steps: [
          step(`${n} 个 ${m} 相加，就是 ${n} × ${m}。`),
          step(table, `${n} × ${m} = ${n * m}`),
        ],
        targetSeconds: 10,
        params: base,
      };
    }
    // N3
    return {
      widget: 'numeric',
      prompt: `${n} × ${m} 比 ${n - k} × ${m} 多${BLANK}。`,
      answer: { type: 'number', value: k * m },
      hint: `${n} × ${m} 表示 ${n} 个 ${m}，想一想多了几个 ${m}。`,
      steps: [
        step(`${n} × ${m} 表示 ${n} 个 ${m}，${n - k} × ${m} 表示 ${n - k} 个 ${m}。`),
        step(`多了 ${k} 个 ${m}，就是多 ${k * m}。`, `${n} × ${m} − ${n - k} × ${m} = ${k * m}`),
      ],
      targetSeconds: 15,
      params: base,
    };
  },
  diagnose(p, r) {
    if (p.form === 'C1' || p.form === 'C2') return choiceDiagnosis(p.optionTags, r);
    const x = numOf(r);
    if (x === null) return { tags: [] };
    const { n, m, k } = p;
    const tags: Diagnosis['tags'] = [];
    if (p.form === 'N1') {
      if (x === m || x === n * m || x === n + 1 || x === n - 1) tags.push('mul-meaning');
    } else if (p.form === 'N2') {
      if (x === n + m) tags.push('table-add-confused');
      if (x === (n + 1) * m || x === (n - 1) * m || x === n * (m + 1) || x === n * (m - 1))
        tags.push('mul-meaning');
    } else {
      if (x === k || x === n - k || x === n * m || x === (n - k) * m) tags.push('mul-meaning');
    }
    return { tags };
  },
});
