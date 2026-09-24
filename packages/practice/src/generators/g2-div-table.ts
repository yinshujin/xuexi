import { koujue } from '../chinese';
import { BLANK, defineGenerator, numOf, step, type Diagnosis } from './base';

/**
 * g2.div.table — 表内除法（用口诀求商），包括平均分 / 包含除情境。
 *
 * Difficulty:
 *  1 除数 2~5，商 1~5，算式
 *  2 除数 2~5，商 1~9，算式 / 平均分
 *  3 除数 2~9，商 2~9，算式 / 平均分
 *  4 除数 6~9，算式 / 平均分 / 包含除（装袋）
 *  5 除数 6~9，求除数「42 ÷ ( ) = 6」/ 包含除 / 算式
 */

type Form = 'div' | 'share' | 'group' | 'missingDivisor';

export interface DivTableParams {
  form: Form;
  divisor: number;
  quotient: number;
  context: number;
}

const SHARE = [
  { item: '桃子', unit: '个', who: '小猴', whoUnit: '只' },
  { item: '铅笔', unit: '支', who: '同学', whoUnit: '名' },
  { item: '荔枝', unit: '颗', who: '小朋友', whoUnit: '个' },
  { item: '气球', unit: '个', who: '小组', whoUnit: '个' },
];
const GROUP = [
  { item: '苹果', unit: '个', bag: '袋' },
  { item: '鸡蛋', unit: '个', bag: '盒' },
  { item: '花', unit: '朵', bag: '束' },
  { item: '本子', unit: '本', bag: '摞' },
];

export const g2DivTable = defineGenerator<DivTableParams>({
  id: 'g2.div.table',
  variants: ['default'],
  targets: ['div-wrong-table'],
  build({ difficulty: d, target, rng }) {
    const forms: Form[] = target
      ? ['div']
      : ([
          ['div'],
          ['div', 'share'],
          ['div', 'share'],
          ['div', 'share', 'group'],
          ['missingDivisor', 'group', 'div'],
        ][d - 1] as Form[]);
    const form = rng.pick(forms);
    const [dMin, dMax, qMin, qMax] = target
      ? [6, 9, 6, 9]
      : [
          [2, 5, 1, 5],
          [2, 5, 1, 9],
          [2, 9, 2, 9],
          [6, 9, 2, 9],
          [6, 9, 3, 9],
        ][d - 1];
    const divisor = rng.int(dMin, dMax);
    const quotient = rng.int(qMin, qMax);
    const N = divisor * quotient;
    const context = rng.int(0, 3);
    const params: DivTableParams = { form, divisor, quotient, context };
    const kj = `口诀：${koujue(divisor, quotient)}。`;

    if (form === 'missingDivisor') {
      return {
        widget: 'numeric',
        prompt: `${N} ÷ ${BLANK} = ${quotient}`,
        answer: { type: 'number', value: divisor },
        hint: `想：${quotient} 乘几等于 ${N}？`,
        steps: [
          step(`想：${quotient} × ( ) = ${N}。`),
          step(kj),
          step(`所以 ${N} ÷ ${divisor} = ${quotient}，括号里填 ${divisor}。`),
        ],
        targetSeconds: 8,
        params,
      };
    }
    let prompt: string;
    let lead: string;
    if (form === 'share') {
      const c = SHARE[context];
      prompt = `把 ${N} ${c.unit}${c.item}平均分给 ${divisor} ${c.whoUnit}${c.who}，每${c.whoUnit}${c.who}分到几${c.unit}？`;
      lead = `平均分成 ${divisor} 份，求每份是多少，用除法：${N} ÷ ${divisor}。`;
    } else if (form === 'group') {
      const c = GROUP[context];
      prompt = `有 ${N} ${c.unit}${c.item}，每 ${divisor} ${c.unit}装一${c.bag}，可以装几${c.bag}？`;
      lead = `求 ${N} 里面有几个 ${divisor}，用除法：${N} ÷ ${divisor}。`;
    } else {
      prompt = `${N} ÷ ${divisor} = ${BLANK}`;
      lead = `想：几乘 ${divisor} 等于 ${N}？`;
    }
    return {
      widget: 'numeric',
      prompt,
      answer: { type: 'number', value: quotient },
      hint: `想：${divisor} 乘几等于 ${N}？`,
      steps: [step(lead), step(kj), step('所以', `${N} ÷ ${divisor} = ${quotient}`)],
      targetSeconds: form === 'div' ? (d <= 2 ? 5 : 4) : 15,
      params,
    };
  },
  diagnose(p, r) {
    const x = numOf(r);
    if (x === null) return { tags: [] };
    const N = p.divisor * p.quotient;
    const ans = p.form === 'missingDivisor' ? p.divisor : p.quotient;
    const tags: Diagnosis['tags'] = [];
    // A neighbouring 口诀, or a 口诀 that contains the dividend but with the wrong factor.
    if (x === ans - 1 || x === ans + 1 || (x >= 1 && x <= 9 && N % x === 0 && N / x <= 9))
      tags.push('div-wrong-table');
    return { tags };
  },
});
