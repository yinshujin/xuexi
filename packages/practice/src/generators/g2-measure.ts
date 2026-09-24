import type { ErrorTag } from '@xuexi/shared';
import { MINUS } from '../arith';
import type { Rng } from '../rng';
import type { RulerSpec, SolutionStep } from '../types';
import { BLANK, buildChoice, choiceDiagnosis, defineGenerator, numOf, step } from './base';

/**
 * g2.measure — 测量（二上第二单元）：用刻度尺量长度、比较测量结果。
 *
 * 题型（form）：
 *  ruler      看图读长度（刻度尺图，numeric）：从 0 量 / 不从 0 量 / 断尺
 *  text       文字题：一端对着 a 厘米，另一端对着 b 厘米，长几厘米
 *  draw       画线段：起点对准刻度 s，画 n 厘米，终点对准几
 *  compare    两根彩带的起点、终点刻度不同，比较哪根长（choice）
 *  same-unit  用同样的“尺子”量两样东西，次数多的长（choice）
 *  hand       同一张课桌两人用拃量，次数少的人一拃长（choice）
 *  stick      用两种小棒量同一样东西，次数少的小棒长（choice）
 *  why        两人步数不同的原因（choice）
 *  method     首尾相接的正确量法（choice）
 *
 * Variants: 'mixed' | 'ruler'（刻度尺，厘米）| 'informal'（非标准测量，不出现厘米）.
 * Difficulty (ruler): 1 从 0 量，≤ 10 厘米；2 从 0 量，≤ 15 厘米；3 不从 0 量 / 画线段；
 *   4 断尺 / 文字题；5 文字题、画线段、比较、断尺。
 * Difficulty (informal): 1 同一把尺子比长短、量法；2 加上拃和小棒；3 加上原因；4–5 次数只差 1。
 */

type RulerForm = 'ruler' | 'text' | 'draw' | 'compare';
type InformalForm = 'same-unit' | 'hand' | 'stick' | 'why' | 'method';
export type MeasureForm = RulerForm | InformalForm;

export interface MeasureParams {
  form: MeasureForm;
  /** ruler: [rulerFrom, rulerTo, from, to]; text: [from, to]; draw: [start, length];
   *  compare: [redFrom, redTo, blueFrom, blueTo]; informal: [m, n] counts. */
  n: number[];
  item: number;
  names: [number, number];
  optionTags: Array<ErrorTag | null>;
}

const ITEMS: Array<[string, string]> = [
  ['铅笔', '支'],
  ['蜡笔', '支'],
  ['彩带', '根'],
  ['小棒', '根'],
  ['线段', '条'],
];

const NAMES = ['淘气', '笑笑', '奇思', '妙想'];

function rulerForms(d: number): RulerForm[] {
  return [
    ['ruler'],
    ['ruler'],
    ['ruler', 'ruler', 'draw'],
    ['ruler', 'text', 'draw'],
    ['text', 'draw', 'compare', 'ruler'],
  ][d - 1] as RulerForm[];
}

function informalForms(d: number): InformalForm[] {
  return [
    ['same-unit', 'method'],
    ['same-unit', 'hand', 'stick'],
    ['hand', 'stick', 'why'],
    ['same-unit', 'hand', 'stick', 'why', 'method'],
    ['hand', 'stick', 'why', 'same-unit'],
  ][d - 1] as InformalForm[];
}

function formsFor(variant: string, d: number, rng: Rng, target?: ErrorTag): MeasureForm[] {
  if (target === 'ruler-read') return d <= 2 ? ['ruler'] : ['ruler', 'draw', 'compare'];
  if (target === 'measure-count') return ['same-unit', 'hand', 'stick'];
  if (variant === 'ruler') return rulerForms(d);
  if (variant === 'informal') return informalForms(d);
  return rng.chance(0.3) ? informalForms(d) : rulerForms(d);
}

/** The length the child should read / the number to fill in (numeric forms). */
export function solveMeasure(form: MeasureForm, n: number[]): number {
  switch (form) {
    case 'ruler':
      return n[3] - n[2];
    case 'text':
      return n[1] - n[0];
    case 'draw':
      return n[0] + n[1];
    default:
      return -1;
  }
}

function pickRuler(rng: Rng, d: number, offset: boolean): number[] {
  if (d <= 2 && !offset) {
    const top = d === 1 ? 10 : 15;
    return [0, top, 0, rng.int(d === 1 ? 2 : 5, top - 1)];
  }
  if (d === 3 || (offset && d < 4)) {
    const from = rng.int(1, 6);
    return [0, 15, from, rng.int(from + 2, Math.min(15, from + 9))];
  }
  // 断尺：刻度从 rulerFrom 开始。
  const rulerFrom = rng.int(2, 6);
  const rulerTo = rulerFrom + 10;
  const from = rng.int(rulerFrom, rulerFrom + 3);
  return [rulerFrom, rulerTo, from, rng.int(from + 3, rulerTo)];
}

function rulerSteps(from: number, to: number): SolutionStep[] {
  if (from === 0)
    return [
      step('左端对准刻度 0，右端对着几，就是几厘米。'),
      step(`右端对着刻度 ${to}，所以长 ${to} 厘米。`),
    ];
  return [
    step(`左端对着刻度 ${from}，不是 0，不能直接读右端的数。`),
    step(
      `右端对着刻度 ${to}。长度 = 右端刻度 − 左端刻度：`,
      `${to} ${MINUS} ${from} = ${to - from}`,
    ),
    step(
      `也可以数一数：从 ${from} 到 ${to} 一共有 ${to - from} 个 1 厘米，所以长 ${to - from} 厘米。`,
    ),
  ];
}

function fixedOrder(
  correct: string,
  wrong: Array<{ text: string; tag: ErrorTag | null }>,
  order: string[],
): { options: string[]; index: number; optionTags: Array<ErrorTag | null> } {
  const tagOf = new Map(wrong.map((w) => [w.text, w.tag]));
  return {
    options: order,
    index: order.indexOf(correct),
    optionTags: order.map((o) => (o === correct ? null : (tagOf.get(o) ?? null))),
  };
}

export const g2Measure = defineGenerator<MeasureParams>({
  id: 'g2.measure',
  variants: ['mixed', 'ruler', 'informal'],
  targets: ['ruler-read', 'measure-count'],
  build({ difficulty: d, variant, target, rng }) {
    const form = rng.pick(formsFor(variant, d, rng, target));
    const item = rng.int(0, ITEMS.length - 1);
    const p1 = rng.int(0, NAMES.length - 1);
    const p2 = (p1 + rng.int(1, NAMES.length - 1)) % NAMES.length;
    const names: [number, number] = [p1, p2];
    const [thing, measureWord] = ITEMS[item];

    // ---------------------------------------------------- numeric ruler forms
    if (form === 'ruler') {
      const n = pickRuler(rng, d, target === 'ruler-read');
      const [rulerFrom, rulerTo, from, to] = n;
      const ruler: RulerSpec = { rulerFrom, rulerTo, from, to, item: thing };
      return {
        widget: 'numeric',
        prompt: `${rulerFrom > 0 ? '这是一把断了的尺子。' : ''}这${measureWord}${thing}长${BLANK}厘米。`,
        ruler,
        answer: { type: 'number', value: to - from },
        hint:
          from === 0
            ? '左端对准了 0，看右端对着几。'
            : '左端对着几？右端对着几？用右端的刻度减去左端的刻度。',
        steps: rulerSteps(from, to),
        targetSeconds: 15 + 5 * d,
        params: { form, n, item, names, optionTags: [] },
      };
    }
    if (form === 'text') {
      const from = rng.int(1, 9);
      const to = rng.int(from + 3, Math.min(20, from + 12));
      return {
        widget: 'numeric',
        prompt: `用刻度尺量一${measureWord}${thing}，它的一端对着刻度 ${from}，另一端对着刻度 ${to}。这${measureWord}${thing}长${BLANK}厘米。`,
        answer: { type: 'number', value: to - from },
        hint: '长度不是另一端对着的数，要用两端的刻度相减。',
        steps: rulerSteps(from, to),
        targetSeconds: 25,
        params: { form, n: [from, to], item, names, optionTags: [] },
      };
    }
    if (form === 'draw') {
      const start = rng.int(1, 6);
      const len = rng.int(3, 9);
      return {
        widget: 'numeric',
        prompt: `用刻度尺画一条 ${len} 厘米长的线段，起点对准刻度 ${start}，终点应该对准刻度${BLANK}。`,
        answer: { type: 'number', value: start + len },
        hint: `从刻度 ${start} 开始，往右数 ${len} 个 1 厘米（数格子，不是数刻度线）。`,
        steps: [
          step(`从刻度 ${start} 往右数 ${len} 个 1 厘米。`),
          step('终点的刻度 = 起点刻度 + 长度：', `${start} + ${len} = ${start + len}`),
        ],
        targetSeconds: 25,
        params: { form, n: [start, len], item, names, optionTags: [] },
      };
    }
    if (form === 'compare') {
      // 红彩带从 0 量起；蓝彩带起点不是 0，终点刻度更大，但不一定更长。
      const redTo = rng.int(6, 12);
      const blueFrom = rng.int(2, 6);
      const blueLen = redTo + rng.pick([-2, -1, 0, 0, 1]);
      const blueTo = blueFrom + blueLen;
      const n = [0, redTo, blueFrom, blueTo];
      const correct = blueLen < redTo ? '红彩带长' : blueLen > redTo ? '蓝彩带长' : '一样长';
      const options = ['红彩带长', '蓝彩带长', '一样长'];
      const optionTags = options.map((o): ErrorTag | null => (o === correct ? null : 'ruler-read'));
      return {
        widget: 'choice',
        prompt: `红彩带从刻度 0 量到刻度 ${redTo}，蓝彩带从刻度 ${blueFrom} 量到刻度 ${blueTo}。哪根彩带长？`,
        options,
        answer: { type: 'choice', index: options.indexOf(correct) },
        hint: '不能只看终点的刻度，先分别算出两根彩带的长度。',
        steps: [
          step(`红彩带从 0 量起，长 ${redTo} 厘米。`),
          step('蓝彩带长：', `${blueTo} ${MINUS} ${blueFrom} = ${blueLen}`),
          step(`${redTo} 厘米和 ${blueLen} 厘米比，${correct === '一样长' ? '一样长' : correct}。`),
        ],
        targetSeconds: 30,
        params: { form, n, item, names, optionTags },
      };
    }

    // ---------------------------------------------------- informal (choice)
    const gap = d >= 4 ? 1 : rng.int(2, 4);
    const small = rng.int(3, 9);
    const big = small + gap;
    const firstBig = rng.chance(0.5);
    const [m, n] = firstBig ? [big, small] : [small, big];
    const P = NAMES[p1];
    const Q = NAMES[p2];
    let prompt: string;
    let correct: string;
    let wrong: Array<{ text: string; tag: ErrorTag | null }>;
    let steps: SolutionStep[];
    let hint: string;
    let shuffle = false;
    let order: string[] = [];
    switch (form as InformalForm) {
      case 'same-unit': {
        prompt = `用同样的回形针去量，红丝带长 ${m} 个回形针，蓝丝带长 ${n} 个回形针。哪根丝带长？`;
        correct = m > n ? '红丝带长' : '蓝丝带长';
        wrong = [
          { text: m > n ? '蓝丝带长' : '红丝带长', tag: 'measure-count' },
          { text: '一样长', tag: 'measure-count' },
        ];
        order = ['红丝带长', '蓝丝带长', '一样长'];
        hint = '用的“尺子”一样长，量的次数越多，东西就越长。';
        steps = [
          step('两根丝带都用同样的回形针量，“尺子”一样长。'),
          step(
            `${Math.max(m, n)} 个回形针比 ${Math.min(m, n)} 个回形针长，所以${correct.slice(0, 3)}长。`,
          ),
        ];
        break;
      }
      case 'hand': {
        prompt = `量同一张课桌的长，${P}量了 ${m} 拃，${Q}量了 ${n} 拃。谁的一拃长一些？`;
        const longer = m < n ? P : Q;
        const shorter = m < n ? Q : P;
        correct = `${longer}的一拃长`;
        wrong = [
          { text: `${shorter}的一拃长`, tag: 'measure-count' },
          { text: '一样长', tag: 'measure-count' },
        ];
        order = [`${P}的一拃长`, `${Q}的一拃长`, '一样长'];
        hint = '量的是同一张课桌，一拃越长，量的次数就越少。';
        steps = [
          step('课桌的长是一样的。'),
          step(`${longer}只量了 ${Math.min(m, n)} 拃，次数少，说明${longer}的一拃长。`),
        ];
        break;
      }
      case 'stick': {
        prompt = `用红色小棒量黑板，量了 ${m} 次；用蓝色小棒量同一块黑板，量了 ${n} 次。哪种小棒长？`;
        correct = m < n ? '红色小棒长' : '蓝色小棒长';
        wrong = [
          { text: m < n ? '蓝色小棒长' : '红色小棒长', tag: 'measure-count' },
          { text: '一样长', tag: 'measure-count' },
        ];
        order = ['红色小棒长', '蓝色小棒长', '一样长'];
        hint = '量的是同一块黑板，小棒越长，量的次数越少。';
        steps = [
          step('黑板的长是一样的。'),
          step(`${correct.slice(0, 4)}只量了 ${Math.min(m, n)} 次，次数少，说明它长。`),
        ];
        break;
      }
      case 'why': {
        prompt = `${P}和${Q}都用步长量同一条走廊，${P}量了 ${m} 步，${Q}量了 ${n} 步。为什么结果不一样？`;
        correct = '两人每一步的长短不一样';
        wrong = [
          { text: '走廊的长度变了', tag: 'measure-count' },
          { text: '一定有人数错了', tag: 'measure-count' },
        ];
        hint = '走廊没有变，用来量的“尺子”——每个人的一步——一样长吗？';
        steps = [
          step('走廊的长度没有变。'),
          step('每个人的一步长短不同，量的步数就不同。'),
          step('所以要用统一的长度单位来量。'),
        ];
        shuffle = true;
        break;
      }
      default: {
        prompt = '用脚长量教室的长，下面哪种做法是对的？';
        correct = '脚跟接着脚尖，一步接一步';
        wrong = [
          { text: '两步之间留一点空', tag: null },
          { text: '两步之间重叠一点', tag: null },
        ];
        hint = '量的时候要首尾相接：不重叠，也不留空。';
        steps = [
          step('测量时要首尾相接，不重叠、不留空。'),
          step('所以要脚跟接着脚尖，一步接一步地量。'),
        ];
        shuffle = true;
      }
    }
    // 比较题按固定顺序排（红 / 蓝，先说的人 / 后说的人，一样长），其余打乱。
    const { options, index, optionTags } = shuffle
      ? buildChoice(rng, correct, wrong)
      : fixedOrder(correct, wrong, order);
    return {
      widget: 'choice',
      prompt,
      options,
      answer: { type: 'choice', index },
      hint,
      steps,
      targetSeconds: 20,
      params: { form, n: [m, n], item, names, optionTags },
    };
  },
  diagnose(p, r) {
    if (r.type === 'choice') {
      const dgn = choiceDiagnosis(p.optionTags, r);
      if (p.form === 'method' && r.index !== null)
        return { tags: [], feedback: '量的时候要首尾相接：不重叠，也不留空。' };
      return dgn;
    }
    const x = numOf(r);
    if (x === null) return { tags: [] };
    const bugs: number[] = [];
    if (p.form === 'ruler') {
      const [rulerFrom, , from, to] = p.n;
      bugs.push(to - from + 1);
      if (from > 0) bugs.push(to);
      if (from > rulerFrom) bugs.push(to - rulerFrom);
    } else if (p.form === 'text') {
      const [from, to] = p.n;
      bugs.push(to, to - from + 1);
    } else if (p.form === 'draw') {
      const [start, len] = p.n;
      bugs.push(len, start + len - 1);
    }
    const ans = solveMeasure(p.form, p.n);
    return bugs.includes(x) && x !== ans ? { tags: ['ruler-read'] } : { tags: [] };
  },
});
