import type { ErrorTag } from '@xuexi/shared';
import { neighborProducts } from '../arith';
import { CN_DIGITS, koujue } from '../chinese';
import {
  BLANK,
  buildChoice,
  choiceDiagnosis,
  defineGenerator,
  numOf,
  step,
  type Diagnosis,
} from './base';

/**
 * g2.mul.table — 乘法口诀（2~9）。
 *
 * Variants choose the 口诀 rows: 'tables-2-5' | 'tables-6-9' | 'all'.
 * Difficulty:
 *  1 看算式写积，另一个因数 1~5
 *  2 看算式写积 / 口诀填空，另一个因数 1~9
 *  3 再加上求未知因数「( ) × 7 = 42」
 *  4 未知因数 / 看积找算式（选择）/ 写积，另一个因数 3~9
 *  5 未知因数 / 看积找算式，偏大的口诀（易混）
 */

type Form = 'product' | 'koujue' | 'missing' | 'find';

export interface MulTableParams {
  form: Form;
  /** Row of the table (from the variant range). */
  a: number;
  /** Other factor. */
  b: number;
  /** Display order: true → "b × a". */
  swapped: boolean;
  /** missing: which factor is blank (0 = first). */
  blank: 0 | 1;
  optionTags: Array<ErrorTag | null>;
}

const ROWS: Record<string, [number, number]> = {
  'tables-2-5': [2, 5],
  'tables-6-9': [6, 9],
  all: [2, 9],
};

export const g2MulTable = defineGenerator<MulTableParams>({
  id: 'g2.mul.table',
  variants: ['all', 'tables-2-5', 'tables-6-9'],
  targets: ['table-neighbor', 'table-add-confused'],
  build({ difficulty: d, variant, target, rng }) {
    const [rMin, rMax] = ROWS[variant];
    const forms: Form[] = target
      ? ['product']
      : ([
          ['product'],
          ['product', 'koujue'],
          ['product', 'koujue', 'missing'],
          ['missing', 'find', 'product'],
          ['missing', 'find'],
        ][d - 1] as Form[]);
    const form = rng.pick(forms);
    const aLo = d === 5 ? Math.ceil((rMin + rMax) / 2) : rMin;
    const a = rng.int(aLo, rMax);
    const [bMin, bMax] =
      target === 'table-neighbor'
        ? [6, 9]
        : d === 1
          ? [1, 5]
          : d === 2
            ? [1, 9]
            : d === 3
              ? [2, 9]
              : d === 4
                ? [3, 9]
                : [5, 9];
    const b = rng.int(bMin, bMax);
    const swapped = rng.chance(0.5);
    const blank: 0 | 1 = rng.chance(0.5) ? 0 : 1;
    const p = a * b;
    const [x, y] = swapped ? [b, a] : [a, b];
    const kj = `口诀：${koujue(a, b)}。`;
    const base: MulTableParams = { form, a, b, swapped, blank, optionTags: [] };

    switch (form) {
      case 'product':
        return {
          widget: 'numeric',
          prompt: `${x} × ${y} = ${BLANK}`,
          answer: { type: 'number', value: p },
          hint: `想一想「${CN_DIGITS[Math.min(a, b)]}${CN_DIGITS[Math.max(a, b)]}」这句口诀。`,
          steps: [step(kj), step('所以', `${x} × ${y} = ${p}`)],
          targetSeconds: d === 1 ? 5 : 3,
          params: base,
        };
      case 'koujue':
        return {
          widget: 'numeric',
          prompt: `填口诀：${CN_DIGITS[Math.min(a, b)]}${CN_DIGITS[Math.max(a, b)]}${BLANK}`,
          answer: { type: 'number', value: p },
          hint: '从这一句的前一句口诀往下想一想。',
          steps: [step(kj), step('所以', `${Math.min(a, b)} × ${Math.max(a, b)} = ${p}`)],
          targetSeconds: 3,
          params: base,
        };
      case 'missing': {
        const known = blank === 0 ? y : x;
        const ans = blank === 0 ? x : y;
        return {
          widget: 'numeric',
          prompt: blank === 0 ? `${BLANK} × ${y} = ${p}` : `${x} × ${BLANK} = ${p}`,
          answer: { type: 'number', value: ans },
          hint: `想：几乘 ${known} 等于 ${p}？`,
          steps: [step(`想：几乘 ${known} 等于 ${p}？`), step(kj), step(`所以括号里填 ${ans}。`)],
          targetSeconds: 6,
          params: base,
        };
      }
      case 'find': {
        const distractors: Array<{ text: string; tag: ErrorTag | null }> = [];
        for (const [u, v] of rng.shuffle([
          [a - 1, b],
          [a + 1, b],
          [a, b - 1],
          [a, b + 1],
        ])) {
          if (u >= 1 && u <= 9 && v >= 1 && v <= 9 && u * v !== p)
            distractors.push({ text: `${u} × ${v}`, tag: 'table-neighbor' });
        }
        const choice = buildChoice(
          rng,
          `${a} × ${b}`,
          [
            ...distractors.slice(0, 2),
            { text: `${a} + ${b}`, tag: 'table-add-confused' as ErrorTag },
            ...distractors.slice(2),
          ].slice(0, 3),
        );
        return {
          widget: 'choice',
          prompt: `积是 ${p} 的算式是${BLANK}。`,
          options: choice.options,
          answer: { type: 'choice', index: choice.index },
          hint: `哪句口诀的得数是 ${p}？`,
          steps: [step(kj), step(`所以积是 ${p} 的算式是 ${a} × ${b}。`)],
          targetSeconds: 8,
          params: { ...base, optionTags: choice.optionTags },
        };
      }
    }
  },
  diagnose(p, r) {
    if (p.form === 'find') return choiceDiagnosis(p.optionTags, r);
    const x = numOf(r);
    if (x === null) return { tags: [] };
    const { a, b } = p;
    const tags: Diagnosis['tags'] = [];
    if (p.form === 'missing') {
      const [fx, fy] = p.swapped ? [b, a] : [a, b];
      const ans = p.blank === 0 ? fx : fy;
      const known = p.blank === 0 ? fy : fx;
      if (x === ans - 1 || x === ans + 1) tags.push('table-neighbor');
      if (x === a * b - known) tags.push('table-add-confused');
      return { tags };
    }
    if (neighborProducts(a, b).includes(x)) tags.push('table-neighbor');
    if (x === a + b) tags.push('table-add-confused');
    return { tags };
  },
});
