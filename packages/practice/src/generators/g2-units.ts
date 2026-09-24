import type { Rng } from '../rng';
import {
  BLANK,
  buildChoice,
  choiceDiagnosis,
  defineGenerator,
  numOf,
  sampleUntil,
  step,
} from './base';
import type { ErrorTag } from '@xuexi/shared';
import {
  LENGTH,
  MONEY,
  solveUnits,
  unitPrompt,
  unitSteps,
  wrongRateAnswers,
  type UnitQuestion,
} from './units';

// ---------------------------------------------------------------- money

/**
 * g2.unit.money — 元角分换算。
 *
 * Difficulty:
 *  1 单一单位互化：3元 = ( )角，40角 = ( )元，5角 = ( )分
 *  2 复名数：3元5角 = ( )角，35角 = 3元( )角，4角6分 = ( )分
 *  3 元和分：2元 = ( )分，300分 = ( )元，108分 = 1元( )分
 *  4 简单加减：2元5角 + 8角 = ( )角，1元 − 4角 = ( )角
 *  5 复名数加减：5元 − 2元6角 = ( )角，1元 − 35分 = ( )分
 */

export interface MoneyParams {
  q: UnitQuestion;
}

function moneyQuestion(rng: Rng, d: number): UnitQuestion {
  const y = () => rng.int(1, 9);
  const j = () => rng.int(1, 9);
  switch (d) {
    case 1: {
      // Never 1 of a unit: 「1角 = ( )分」 would be answered by the hint itself.
      const k = () => rng.int(2, 9);
      return rng.pick<() => UnitQuestion>([
        () => ({ left: [{ value: k(), unit: '元' }], target: '角' }),
        () => ({ left: [{ value: 10 * k(), unit: '角' }], target: '元' }),
        () => ({ left: [{ value: k(), unit: '角' }], target: '分' }),
        () => ({ left: [{ value: 10 * k(), unit: '分' }], target: '角' }),
      ])();
    }
    case 2:
      return rng.pick<() => UnitQuestion>([
        () => ({
          left: [
            { value: y(), unit: '元' },
            { value: j(), unit: '角' },
          ],
          target: '角',
        }),
        () => ({
          left: [
            { value: j(), unit: '角' },
            { value: rng.int(1, 9), unit: '分' },
          ],
          target: '分',
        }),
        () => {
          const a = y();
          return {
            left: [{ value: 10 * a + j(), unit: '角' }],
            prefix: [{ value: a, unit: '元' }],
            target: '角',
          };
        },
      ])();
    case 3:
      return rng.pick<() => UnitQuestion>([
        () => ({ left: [{ value: rng.int(2, 5), unit: '元' }], target: '分' }),
        () => ({ left: [{ value: 100 * rng.int(2, 5), unit: '分' }], target: '元' }),
        () => ({
          left: [
            { value: 1, unit: '元' },
            { value: j(), unit: '角' },
          ],
          target: '分',
        }),
        () => ({
          left: [{ value: 100 + rng.int(1, 9), unit: '分' }],
          prefix: [{ value: 1, unit: '元' }],
          target: '分',
        }),
      ])();
    case 4:
      return rng.pick<() => UnitQuestion>([
        () => ({
          left: [
            { value: rng.int(1, 5), unit: '元' },
            { value: j(), unit: '角' },
          ],
          op: '+',
          right: [{ value: j(), unit: '角' }],
          target: '角',
        }),
        () => ({
          left: [{ value: 1, unit: '元' }],
          op: '-',
          right: [{ value: j(), unit: '角' }],
          target: '角',
        }),
        () => ({
          left: [{ value: rng.int(2, 9), unit: '元' }],
          op: '-',
          right: [{ value: j(), unit: '角' }],
          target: '角',
        }),
      ])();
    default:
      return rng.pick<() => UnitQuestion>([
        () => {
          const a = rng.int(3, 9);
          return {
            left: [{ value: a, unit: '元' }],
            op: '-',
            right: [
              { value: rng.int(1, a - 1), unit: '元' },
              { value: j(), unit: '角' },
            ],
            target: '角',
          };
        },
        () => ({
          left: [
            { value: rng.int(1, 5), unit: '元' },
            { value: j(), unit: '角' },
          ],
          op: '+',
          right: [
            { value: rng.int(1, 4), unit: '元' },
            { value: j(), unit: '角' },
          ],
          target: '角',
        }),
        () => ({
          left: [{ value: 1, unit: '元' }],
          op: '-',
          right: [{ value: rng.int(11, 99), unit: '分' }],
          target: '分',
        }),
      ])();
  }
}

export const g2UnitMoney = defineGenerator<MoneyParams>({
  id: 'g2.unit.money',
  variants: ['default'],
  targets: ['unit-rate'],
  build({ difficulty: d, rng }) {
    const q = sampleUntil(
      () => moneyQuestion(rng, d),
      (x) => (solveUnits(MONEY, x) ?? -1) > 0,
      'money',
    );
    return {
      widget: 'numeric',
      prompt: unitPrompt(q),
      answer: { type: 'number', value: solveUnits(MONEY, q) as number },
      hint: '先想清楚进率：1元 = 10角，1角 = 10分。',
      steps: unitSteps(MONEY, q),
      targetSeconds: [8, 10, 12, 15, 20][d - 1],
      params: { q },
    };
  },
  diagnose({ q }, r) {
    const x = numOf(r);
    if (x === null) return { tags: [] };
    return wrongRateAnswers(MONEY, q).includes(x)
      ? { tags: ['unit-rate'], feedback: '进率记错了哦：1元 = 10角，1角 = 10分，1元 = 100分。' }
      : { tags: [] };
  },
});

// ---------------------------------------------------------------- length

/**
 * g2.unit.length — 厘米和米（二上只学这两个单位，1米 = 100厘米）。
 *
 * Variants: 'mixed' | 'convert' | 'choose-unit'.
 * Difficulty (convert):
 *  1 3米 = ( )厘米，200厘米 = ( )米
 *  2 1米20厘米 = ( )厘米，1米5厘米 = ( )厘米
 *  3 150厘米 = 1米( )厘米，1米 − 40厘米 = ( )厘米
 *  4 2米 − 35厘米 = ( )厘米，1米20厘米 + 50厘米 = ( )厘米
 *  5 3米 − 1米45厘米 = ( )厘米，80厘米 + 70厘米 = 1米( )厘米
 * choose-unit: easy objects at low difficulty, easily confused ones later.
 */

export interface LengthParams {
  kind: 'convert' | 'choose';
  q?: UnitQuestion;
  item?: number;
  optionTags: Array<ErrorTag | null>;
}

/** [description, number, correct unit, tricky?] */
const OBJECTS: Array<[string, number, '厘米' | '米', boolean]> = [
  ['一支铅笔长约', 18, '厘米', false],
  ['教室长约', 9, '米', false],
  ['一块橡皮长约', 4, '厘米', false],
  ['旗杆高约', 12, '米', false],
  ['数学书长约', 26, '厘米', false],
  ['一辆公共汽车长约', 10, '米', false],
  ['一枚回形针长约', 3, '厘米', false],
  ['一棵大树高约', 8, '米', false],
  ['小明身高约', 130, '厘米', true],
  ['课桌高约', 70, '厘米', true],
  ['一张床长约', 2, '米', true],
  ['一根跳绳长约', 2, '米', true],
  ['一拃长约', 12, '厘米', true],
  ['教室的门高约', 2, '米', true],
  ['一把直尺长约', 20, '厘米', true],
  ['黑板长约', 4, '米', true],
];

function lengthQuestion(rng: Rng, d: number): UnitQuestion {
  const m = () => rng.int(2, 9);
  switch (d) {
    case 1:
      return rng.chance(0.5)
        ? { left: [{ value: m(), unit: '米' }], target: '厘米' }
        : { left: [{ value: 100 * m(), unit: '厘米' }], target: '米' };
    case 2:
      return {
        left: [
          { value: rng.int(1, 3), unit: '米' },
          { value: rng.chance(0.3) ? rng.int(1, 9) : rng.int(1, 9) * 10, unit: '厘米' },
        ],
        target: '厘米',
      };
    case 3:
      if (rng.chance(0.5)) {
        const a = rng.int(1, 3);
        return {
          left: [{ value: 100 * a + rng.int(1, 99), unit: '厘米' }],
          prefix: [{ value: a, unit: '米' }],
          target: '厘米',
        };
      }
      return {
        left: [{ value: 1, unit: '米' }],
        op: '-',
        right: [{ value: rng.int(1, 9) * 10, unit: '厘米' }],
        target: '厘米',
      };
    case 4:
      if (rng.chance(0.5)) {
        return {
          left: [{ value: rng.int(1, 5), unit: '米' }],
          op: '-',
          right: [{ value: rng.int(11, 99), unit: '厘米' }],
          target: '厘米',
        };
      }
      return {
        left: [
          { value: 1, unit: '米' },
          { value: rng.int(1, 9) * 10, unit: '厘米' },
        ],
        op: '+',
        right: [{ value: rng.int(1, 9) * 10, unit: '厘米' }],
        target: '厘米',
      };
    default:
      if (rng.chance(0.5)) {
        const a = rng.int(2, 5);
        return {
          left: [{ value: a, unit: '米' }],
          op: '-',
          right: [
            { value: rng.int(1, a - 1), unit: '米' },
            { value: rng.int(11, 99), unit: '厘米' },
          ],
          target: '厘米',
        };
      }
      return {
        left: [{ value: rng.int(51, 95), unit: '厘米' }],
        op: '+',
        right: [{ value: rng.int(51, 95), unit: '厘米' }],
        prefix: [{ value: 1, unit: '米' }],
        target: '厘米',
      };
  }
}

export const g2UnitLength = defineGenerator<LengthParams>({
  id: 'g2.unit.length',
  variants: ['mixed', 'convert', 'choose-unit'],
  targets: ['unit-rate', 'unit-choice'],
  build({ difficulty: d, variant, target, rng }) {
    const choose =
      target === 'unit-choice' ||
      (target !== 'unit-rate' &&
        (variant === 'choose-unit' || (variant === 'mixed' && rng.chance(d <= 3 ? 0.35 : 0.2))));
    if (choose) {
      const pool = OBJECTS.map((o, i) => i).filter((i) =>
        d <= 2 ? !OBJECTS[i][3] : d >= 4 ? OBJECTS[i][3] : true,
      );
      const item = rng.pick(pool);
      const [desc, n, unit] = OBJECTS[item];
      const options = ['厘米', '米'];
      const index = options.indexOf(unit);
      return {
        widget: 'choice',
        prompt: `选择合适的单位：${desc} ${n}${BLANK}。`,
        options,
        answer: { type: 'choice', index },
        hint: '用手比一比：1厘米大约是指甲盖那么宽，1米大约是张开双臂那么长。',
        steps: [
          step('1厘米大约有指甲盖那么宽；1米大约是张开双臂那么长。'),
          step(`${desc} ${n}${unit}，${unit === '米' ? `${n}厘米太短了` : `${n}米太长了`}。`),
          step(`所以选「${unit}」。`),
        ],
        targetSeconds: 8,
        params: {
          kind: 'choose',
          item,
          optionTags: options.map((o) => (o === unit ? null : 'unit-choice')),
        },
      };
    }
    const q = sampleUntil(
      () => lengthQuestion(rng, d),
      (x) => (solveUnits(LENGTH, x) ?? -1) > 0,
      'length',
    );
    return {
      widget: 'numeric',
      prompt: unitPrompt(q),
      answer: { type: 'number', value: solveUnits(LENGTH, q) as number },
      hint: '先想清楚：1米 = 100厘米。',
      steps: unitSteps(LENGTH, q),
      targetSeconds: [8, 10, 12, 15, 20][d - 1],
      params: { kind: 'convert', q, optionTags: [] },
    };
  },
  diagnose(p, r) {
    if (p.kind === 'choose') {
      const d = choiceDiagnosis(p.optionTags, r);
      return {
        ...d,
        feedback: d.tags.length ? '想一想这个东西实际有多长，用手比一比再选单位。' : undefined,
      };
    }
    const x = numOf(r);
    if (x === null || !p.q) return { tags: [] };
    return wrongRateAnswers(LENGTH, p.q).includes(x)
      ? { tags: ['unit-rate'], feedback: '进率记错了哦：1米 = 100厘米。' }
      : { tags: [] };
  },
});
