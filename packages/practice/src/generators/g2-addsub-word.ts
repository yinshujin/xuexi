import type { ErrorTag } from '@xuexi/shared';
import { MINUS, addCarryBugs, countBorrows, countCarries, subBorrowBugs } from '../arith';
import type { Rng } from '../rng';
import type { SolutionStep } from '../types';
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
import { diagnoseAddSub, pickAddSub } from './g2-addsub-2d';

/**
 * g2.addsub.word — 100 以内加减法解决问题（北师大二上第一单元情境：图书角、摘苹果、借阅图书、收玉米、跳绳、套圈）。
 *
 * 题型（form）：
 *  join       一共 / 又来了多少：a + b
 *  remain     还剩：a − b
 *  part       已知总数和一部分，求另一部分：a − b
 *  diff       比多少（多几 / 少几）：a − b
 *  more       求比一个数多几的数：a + b
 *  less       求比一个数少几的数：a − b
 *  back-more  逆叙：“甲 a，比乙多 b”，求乙：a − b
 *  back-less  逆叙：“甲 a，比乙少 b”，求乙：a + b
 *  back       两步：借走又还回 / 下车又上车：a − b + c
 *  reach      两步：套圈要得到 t 分还差多少：t − a − b
 *  split      两步：两种书合起来再借走：a + b − c
 *
 * 一步题的数用 g2.addsub.2d 的难度（1~2 不进退位，3 一位数进退位，4 两位数进退位，5 更难的数）。
 * 低难度和逆叙题有时改为“列式正确的是”选择题。
 *
 * Variants: 'mixed' | 'add' | 'sub' | 'compare'.
 */

type OneStep = 'join' | 'remain' | 'part' | 'diff' | 'more' | 'less' | 'back-more' | 'back-less';
type TwoStep = 'back' | 'reach' | 'split';
export type WordForm = OneStep | TwoStep;

export interface WordParams {
  form: WordForm;
  /** Template index within the form. */
  tpl: number;
  a: number;
  b: number;
  /** Two-step only: third number (back / split) or target score (reach). */
  c: number;
  /** Compare forms: [first name, second name] indices into NAMES; activity index. */
  names: [number, number];
  act: number;
  choice: boolean;
  optionTags: Array<ErrorTag | null>;
}

const NAMES = ['淘气', '笑笑', '奇思', '妙想'];

/** Compare activities: [first verb, repeated verb, unit, object after the first number]. */
const ACTS: Array<[string, string, string, string]> = [
  ['跳绳跳', '跳', '下', ''],
  ['摘', '摘', '个', '苹果'],
  ['套圈得', '得', '分', ''],
  ['读', '读', '页', '故事书'],
];

interface Template {
  text: (a: number, b: number) => string;
  unit: string;
}

const JOIN: Template[] = [
  { text: (a, b) => `图书角有故事书 ${a} 本，科普书 ${b} 本，一共有多少本？`, unit: '本' },
  { text: (a, b) => `小猴上午摘了 ${a} 个苹果，下午摘了 ${b} 个，一共摘了多少个？`, unit: '个' },
  {
    text: (a, b) => `光明农场第一天收了 ${a} 个玉米，第二天收了 ${b} 个，两天一共收了多少个？`,
    unit: '个',
  },
  {
    text: (a, b) => `地铁车厢里原来有 ${a} 人，到站后又上来 ${b} 人，现在车厢里有多少人？`,
    unit: '人',
  },
];

const REMAIN: Template[] = [
  { text: (a, b) => `图书角有 ${a} 本书，同学们借走了 ${b} 本，还剩多少本？`, unit: '本' },
  { text: (a, b) => `树上有 ${a} 个苹果，摘下 ${b} 个，树上还剩多少个？`, unit: '个' },
  { text: (a, b) => `农场收了 ${a} 个玉米，卖出 ${b} 个，还剩多少个？`, unit: '个' },
  {
    text: (a, b) => `地铁车厢里原来有 ${a} 人，到站后下去 ${b} 人，现在车厢里有多少人？`,
    unit: '人',
  },
];

const PART: Template[] = [
  {
    text: (a, b) => `图书角一共有 ${a} 本书，其中故事书有 ${b} 本，其余是科普书。科普书有多少本？`,
    unit: '本',
  },
  {
    text: (a, b) => `两天一共摘了 ${a} 个苹果，第一天摘了 ${b} 个，第二天摘了多少个？`,
    unit: '个',
  },
  {
    text: (a, b) => `深圳图书馆少儿区一共借出 ${a} 本绘本，上午借出 ${b} 本，下午借出多少本？`,
    unit: '本',
  },
];

const OP_OF: Record<OneStep, '+' | '-'> = {
  join: '+',
  remain: '-',
  part: '-',
  diff: '-',
  more: '+',
  less: '-',
  'back-more': '-',
  'back-less': '+',
};

function isTwoStep(f: WordForm): f is TwoStep {
  return f === 'back' || f === 'reach' || f === 'split';
}

function formsFor(variant: string, d: number, target?: ErrorTag): WordForm[] {
  if (target === 'op-confused')
    return d >= 4 ? ['back-more', 'back-less', 'more', 'less'] : ['more', 'less', 'diff'];
  if (target === 'carry-missed') return variant === 'compare' ? ['more', 'back-less'] : ['join'];
  if (target === 'borrow-missed')
    return variant === 'compare' ? ['diff', 'less', 'back-more'] : ['remain', 'part'];
  switch (variant) {
    case 'add':
      return ['join'];
    case 'sub':
      return d === 1 ? ['remain'] : ['remain', 'part'];
    case 'compare':
      return d <= 4 ? ['diff', 'more', 'less'] : ['back-more', 'back-less', 'more', 'less', 'diff'];
    default:
      return [
        ['join', 'remain'],
        ['join', 'remain', 'part', 'diff'],
        ['join', 'remain', 'part', 'diff', 'more', 'less'],
        ['join', 'remain', 'part', 'diff', 'more', 'less', 'back', 'reach', 'split'],
        ['part', 'more', 'less', 'back-more', 'back-less', 'back', 'reach', 'split'],
      ][d - 1] as WordForm[];
  }
}

// ------------------------------------------------------------------ text

function compareText(form: OneStep, p: WordParams): { text: string; unit: string } {
  const [first, v, u, obj] = ACTS[p.act];
  const P = NAMES[p.names[0]];
  const Q = NAMES[p.names[1]];
  const { a, b } = p;
  const lead = `${P}${first}了 ${a} ${u}${obj}`;
  switch (form) {
    case 'diff':
      return {
        text:
          p.tpl % 2 === 0
            ? `${lead}，${Q}${v}了 ${b} ${u}，${P}比${Q}多${v}多少${u}？`
            : `${lead}，${Q}${v}了 ${b} ${u}，${Q}比${P}少${v}多少${u}？`,
        unit: u,
      };
    case 'more':
      return { text: `${lead}，${Q}比${P}多${v} ${b} ${u}，${Q}${v}了多少${u}？`, unit: u };
    case 'less':
      return { text: `${lead}，${Q}比${P}少${v} ${b} ${u}，${Q}${v}了多少${u}？`, unit: u };
    case 'back-more':
      return { text: `${lead}，比${Q}多${v} ${b} ${u}，${Q}${v}了多少${u}？`, unit: u };
    default:
      return { text: `${lead}，比${Q}少${v} ${b} ${u}，${Q}${v}了多少${u}？`, unit: u };
  }
}

function storyOf(p: WordParams): { text: string; unit: string } {
  const { a, b, c } = p;
  switch (p.form) {
    case 'join':
      return { text: JOIN[p.tpl].text(a, b), unit: JOIN[p.tpl].unit };
    case 'remain':
      return { text: REMAIN[p.tpl].text(a, b), unit: REMAIN[p.tpl].unit };
    case 'part':
      return { text: PART[p.tpl].text(a, b), unit: PART[p.tpl].unit };
    case 'back':
      return p.tpl === 0
        ? { text: `图书角有 ${a} 本书，借走 ${b} 本，又还回 ${c} 本，现在有多少本？`, unit: '本' }
        : {
            text: `公交车上原有 ${a} 人，到站下去 ${b} 人，又上来 ${c} 人，现在车上有多少人？`,
            unit: '人',
          };
    case 'reach':
      return {
        text: `套圈游戏中，${NAMES[p.names[0]]}第一次得了 ${a} 分，第二次得了 ${b} 分，要得到 ${c} 分，还差多少分？`,
        unit: '分',
      };
    case 'split':
      return {
        text: `图书角有故事书 ${a} 本，科普书 ${b} 本，同学们借走 ${c} 本，还剩多少本？`,
        unit: '本',
      };
    default:
      return compareText(p.form, p);
  }
}

export function solveWord(p: WordParams): number {
  switch (p.form) {
    case 'back':
      return p.a - p.b + p.c;
    case 'reach':
      return p.c - p.a - p.b;
    case 'split':
      return p.a + p.b - p.c;
    default:
      return OP_OF[p.form] === '+' ? p.a + p.b : p.a - p.b;
  }
}

/** The correct number sentence, e.g. "45 − 12" or "36 − 18 + 9". */
function expressionOf(p: WordParams): string {
  const { a, b, c } = p;
  switch (p.form) {
    case 'back':
      return `${a} ${MINUS} ${b} + ${c}`;
    case 'reach':
      return `${c} ${MINUS} ${a} ${MINUS} ${b}`;
    case 'split':
      return `${a} + ${b} ${MINUS} ${c}`;
    default:
      return OP_OF[p.form] === '+' ? `${a} + ${b}` : `${a} ${MINUS} ${b}`;
  }
}

/** Wrong number sentences with a flipped operation (all evaluate to other values). */
function wrongExpressions(p: WordParams): string[] {
  const { a, b, c } = p;
  switch (p.form) {
    case 'back':
      return [`${a} ${MINUS} ${b} ${MINUS} ${c}`, `${a} + ${b} + ${c}`];
    case 'reach':
      return [`${c} ${MINUS} ${a} + ${b}`, `${a} + ${b} + ${c}`];
    case 'split':
      return [`${a} + ${b} + ${c}`, `${a} ${MINUS} ${b} + ${c}`];
    default:
      return [OP_OF[p.form] === '+' ? `${a} ${MINUS} ${b}` : `${a} + ${b}`];
  }
}

function reasonOf(p: WordParams): string {
  const P = NAMES[p.names[0]];
  const Q = NAMES[p.names[1]];
  switch (p.form) {
    case 'join':
      return '求一共有多少，就是把两部分合起来，用加法。';
    case 'remain':
      return '从原有的里面去掉一部分，求还剩多少，用减法。';
    case 'part':
      return '已知总数和其中一部分，求另一部分，用总数减去已知的部分。';
    case 'diff':
      return '求一个数比另一个数多几（少几），就是求它们相差多少，用大数减小数。';
    case 'more':
      return `${Q}比${P}多，${Q}的数量 = ${P}的数量 + 多的部分，用加法。`;
    case 'less':
      return `${Q}比${P}少，${Q}的数量 = ${P}的数量 − 少的部分，用减法。`;
    case 'back-more':
      return `“${P}比${Q}多”，说明${Q}比${P}少，求少的那个数用减法。`;
    case 'back-less':
      return `“${P}比${Q}少”，说明${Q}比${P}多，求多的那个数用加法。`;
    case 'back':
      return '先算借走（下去）以后剩多少，再加上还回（上来）的。';
    case 'reach':
      return '先算两次一共得了多少分，再用要得到的分数减去它。';
    default:
      return '先算两种书一共有多少本，再减去借走的。';
  }
}

function hintOf(form: WordForm): string {
  switch (form) {
    case 'join':
      return '是把两部分合起来吗？合起来用加法。';
    case 'remain':
    case 'part':
      return '是从总数里去掉一部分吗？去掉用减法。';
    case 'diff':
      return '求相差多少：用大数减小数。';
    case 'more':
    case 'less':
      return '先找出谁多谁少，画两行圆圈比一比。';
    case 'back-more':
    case 'back-less':
      return '“比谁多”要读仔细：到底是谁多、谁少？画两行圆圈比一比。';
    default:
      return '这是两步计算，想一想先算什么、再算什么。';
  }
}

function calcSteps(p: WordParams): SolutionStep[] {
  const { a, b, c } = p;
  const r = solveWord(p);
  switch (p.form) {
    case 'back':
      return [
        step('第一步：', `${a} ${MINUS} ${b} = ${a - b}`),
        step('第二步：', `${a - b} + ${c} = ${r}`),
      ];
    case 'reach':
      return [
        step('第一步：', `${a} + ${b} = ${a + b}`),
        step('第二步：', `${c} ${MINUS} ${a + b} = ${r}`),
      ];
    case 'split':
      return [
        step('第一步：', `${a} + ${b} = ${a + b}`),
        step('第二步：', `${a + b} ${MINUS} ${c} = ${r}`),
      ];
    default:
      return [step('列式计算：', `${expressionOf(p)} = ${r}`)];
  }
}

// --------------------------------------------------------------- numbers

function regroups(x: number, op: '+' | '-', y: number): boolean {
  return op === '+' ? countCarries(x, y) > 0 : countBorrows(x, y) > 0;
}

function pickTwoStep(rng: Rng, form: TwoStep, d: number): { a: number; b: number; c: number } {
  const need = d >= 5 ? 2 : 1;
  return sampleUntil(
    () => {
      if (form === 'reach') {
        const c = rng.pick([80, 90, 100]);
        return { a: rng.int(11, 59), b: rng.int(11, 49), c };
      }
      if (form === 'back') return { a: rng.int(30, 95), b: rng.int(11, 49), c: rng.int(3, 39) };
      return { a: rng.int(11, 59), b: rng.int(11, 49), c: rng.int(11, 59) };
    },
    ({ a, b, c }) => {
      if (a === b || b === c || a === c) return false;
      let steps: Array<[number, '+' | '-', number]>;
      if (form === 'back') {
        if (b >= a || a - b + c > 100) return false;
        steps = [
          [a, '-', b],
          [a - b, '+', c],
        ];
      } else if (form === 'reach') {
        if (a + b >= c) return false;
        steps = [
          [a, '+', b],
          [c, '-', a + b],
        ];
      } else {
        if (a + b > 100 || c >= a + b) return false;
        steps = [
          [a, '+', b],
          [a + b, '-', c],
        ];
      }
      return steps.filter(([x, op, y]) => regroups(x, op, y)).length >= need;
    },
    `word ${form} d${d}`,
  );
}

// ------------------------------------------------------------- diagnosis

function diagnoseTwoStep(p: WordParams, x: number): Diagnosis {
  const { a, b, c } = p;
  const flipped = wrongExpressions(p).map((e) => evalFlat(e));
  if (flipped.includes(x))
    return {
      tags: ['op-confused'],
      feedback: '两步计算要想清楚每一步是加还是减，再看一遍题目吧！',
    };
  const tags: ErrorTag[] = [];
  if (p.form === 'back') {
    if (subBorrowBugs(a, b).some((t) => t + c === x)) tags.push('borrow-missed');
    if (addCarryBugs(a - b, c).includes(x)) tags.push('carry-missed');
  } else if (p.form === 'reach') {
    if (addCarryBugs(a, b).some((s) => c - s === x)) tags.push('carry-missed');
    if (subBorrowBugs(c, a + b).includes(x)) tags.push('borrow-missed');
    if (subBorrowBugs(c, a).some((t) => t - b === x) || subBorrowBugs(c - a, b).includes(x))
      tags.push('borrow-missed');
  } else {
    if (addCarryBugs(a, b).some((s) => s - c === x)) tags.push('carry-missed');
    if (subBorrowBugs(a + b, c).includes(x)) tags.push('borrow-missed');
  }
  return { tags: [...new Set(tags)] };
}

/** Evaluate "a ± b ± c" left to right (the only shapes this generator writes). */
function evalFlat(expr: string): number {
  const parts = expr.split(' ');
  let v = Number(parts[0]);
  for (let i = 1; i < parts.length; i += 2) {
    const y = Number(parts[i + 1]);
    v = parts[i] === '+' ? v + y : v - y;
  }
  return v;
}

const OP_FEEDBACK: Partial<Record<WordForm, string>> = {
  diff: '求相差多少，要用大数减小数，是减法哦！',
  more: '求比一个数多几的数：同样多的部分再加上多的部分，用加法。',
  less: '求比一个数少几的数：从这个数里去掉少的部分，用减法。',
  'back-more': '读仔细：“比谁多”说明谁多？另一个人少，求少的数用减法。',
  'back-less': '读仔细：“比谁少”说明谁少？另一个人多，求多的数用加法。',
};

// ------------------------------------------------------------- generator

export const g2AddSubWord = defineGenerator<WordParams>({
  id: 'g2.addsub.word',
  variants: ['mixed', 'add', 'sub', 'compare'],
  targets: ['op-confused', 'carry-missed', 'borrow-missed'],
  build({ difficulty: d, variant, target, rng }) {
    const form = rng.pick(formsFor(variant, d, target));
    const n1 = rng.int(0, NAMES.length - 1);
    const n2 = (n1 + rng.int(1, NAMES.length - 1)) % NAMES.length;
    const act = rng.int(0, ACTS.length - 1);
    let a: number;
    let b: number;
    let c = 0;
    let tpl = 0;
    if (isTwoStep(form)) {
      ({ a, b, c } = pickTwoStep(rng, form, d));
      tpl = rng.int(0, 1);
    } else {
      const op = OP_OF[form];
      const force = target === 'carry-missed' || target === 'borrow-missed';
      ({ a, b } = pickAddSub(rng, d, op, force));
      // “比……多 / 少 b”：差 b 比已知数小，读起来才自然（和、进位都不变）。
      if ((form === 'more' || form === 'back-less') && a < b) [a, b] = [b, a];
      const pool =
        form === 'join' ? JOIN : form === 'remain' ? REMAIN : form === 'part' ? PART : null;
      tpl = pool ? rng.int(0, pool.length - 1) : rng.int(0, 1);
    }
    const base: WordParams = {
      form,
      tpl,
      a,
      b,
      c,
      names: [n1, n2],
      act,
      choice: false,
      optionTags: [],
    };
    const { text, unit } = storyOf(base);
    const r = solveWord(base);
    // Distractors must give a different number, or two options would both be right.
    const wrongs = wrongExpressions(base).filter((e) => evalFlat(e) !== r);
    const choice =
      target === undefined &&
      wrongs.length > 0 &&
      (d <= 2 || form === 'back-more' || form === 'back-less' || isTwoStep(form)) &&
      rng.chance(0.3);
    const steps: SolutionStep[] = [
      step(reasonOf(base)),
      ...calcSteps(base),
      step(`答：${r} ${unit}。`),
    ];
    if (choice) {
      const { options, index, optionTags } = buildChoice(
        rng,
        expressionOf(base),
        wrongs.map((t) => ({ text: t, tag: 'op-confused' as ErrorTag })),
      );
      return {
        widget: 'choice',
        prompt: `${text}\n列式正确的是${BLANK}。`,
        options,
        answer: { type: 'choice', index },
        hint: hintOf(form),
        steps,
        targetSeconds: 20,
        params: { ...base, choice: true, optionTags },
      };
    }
    return {
      widget: 'numeric',
      prompt: text,
      answer: { type: 'number', value: r },
      hint: hintOf(form),
      steps,
      targetSeconds: (isTwoStep(form) ? 45 : 25) + 5 * d,
      params: base,
    };
  },
  diagnose(p, r) {
    if (p.choice) {
      const dgn = choiceDiagnosis(p.optionTags, r);
      return {
        ...dgn,
        feedback: dgn.tags.length ? (OP_FEEDBACK[p.form] ?? hintOf(p.form)) : undefined,
      };
    }
    const x = numOf(r);
    if (x === null) return { tags: [] };
    if (isTwoStep(p.form)) return diagnoseTwoStep(p, x);
    const dgn = diagnoseAddSub(p.a, p.b, OP_OF[p.form], x);
    if (dgn.tags.includes('op-confused') && OP_FEEDBACK[p.form]) {
      return {
        tags: dgn.tags,
        feedback: dgn.tags[0] === 'op-confused' ? OP_FEEDBACK[p.form] : dgn.feedback,
      };
    }
    return dgn;
  },
});
