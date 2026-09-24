import { MINUS, addCarryBugs, countBorrows, countCarries, numLen, subBorrowBugs } from '../arith';
import type { Rng } from '../rng';
import type { SolutionStep } from '../types';
import { BLANK, defineGenerator, numOf, sampleUntil, step, type Diagnosis } from './base';
import { columnAddSteps, columnSubSteps } from './steps';

/**
 * g2.addsub.2d — 100 以内两位数加减法（口算 / 竖式）。
 *
 * Difficulty:
 *  1 两位数 ± 一位数 / 整十数，不进位不退位
 *  2 两位数 ± 两位数，不进位不退位
 *  3 两位数 ± 一位数，进位 / 退位
 *  4 两位数 ± 两位数，进位 / 退位
 *  5 进位加得 90~100，或整十数减两位数 / 差小于 10 的退位减
 */

export interface AddSubParams {
  a: number;
  b: number;
  op: '+' | '-';
}

function regroups(a: number, b: number, op: '+' | '-'): boolean {
  return op === '+' ? countCarries(a, b) > 0 : countBorrows(a, b) > 0;
}

/** Pick operands for one difficulty level. Exported for reuse in tests. */
export function pickAddSub(
  rng: Rng,
  difficulty: number,
  op: '+' | '-',
  forceRegroup: boolean,
): AddSubParams {
  const d = forceRegroup && difficulty < 3 ? 3 : difficulty;
  const wantRegroup = forceRegroup || d >= 3;
  const sample = (): AddSubParams => {
    switch (d) {
      case 1: {
        const a = rng.int(11, op === '+' ? 89 : 99);
        const b = rng.chance(0.5) ? rng.int(1, 9) : rng.int(1, 8) * 10;
        return { a, b, op };
      }
      case 2:
        return { a: rng.int(21, 99), b: rng.int(11, 88), op };
      case 3:
        return { a: rng.int(11, 99), b: rng.int(2, 9), op };
      case 4:
        return { a: rng.int(11, 99), b: rng.int(11, 89), op };
      default:
        return op === '+'
          ? { a: rng.int(11, 89), b: rng.int(11, 89), op }
          : {
              a: rng.int(3, 9) * 10 + (rng.chance(0.5) ? 0 : rng.int(1, 9)),
              b: rng.int(11, 89),
              op,
            };
    }
  };
  const accept = ({ a, b }: AddSubParams): boolean => {
    if (op === '+' && a + b > (d === 5 ? 100 : 99)) return false;
    if (op === '-' && b >= a) return false;
    if (b % 10 === 0 && d >= 2 && d !== 5) return false;
    if (regroups(a, b, op) !== wantRegroup) return false;
    if (d === 5) {
      if (op === '+') return a + b >= 90;
      return a % 10 === 0 || a - b < 10;
    }
    return true;
  };
  return sampleUntil(sample, accept, `addsub d${d}`);
}

function oralSteps(a: number, b: number, op: '+' | '-'): SolutionStep[] {
  const res = op === '+' ? a + b : a - b;
  const sign = op === '+' ? '+' : MINUS;
  const bt = Math.floor(b / 10) * 10;
  const bo = b % 10;
  if (bt > 0 && bo > 0) {
    const mid = op === '+' ? a + bt : a - bt;
    return [
      step(`把 ${b} 分成 ${bt} 和 ${bo}。`),
      step(`先${op === '+' ? '加' : '减'}整十数：`, `${a} ${sign} ${bt} = ${mid}`),
      step(`再${op === '+' ? '加' : '减'}一位数：`, `${mid} ${sign} ${bo} = ${res}`),
    ];
  }
  if (bt === 0 && regroups(a, b, op)) {
    if (op === '+') {
      const toTen = 10 - (a % 10);
      return [
        step(`凑十法：把 ${b} 分成 ${toTen} 和 ${b - toTen}。`),
        step(`${a} 先加 ${toTen} 凑成整十：`, `${a} + ${toTen} = ${a + toTen}`),
        step('再加剩下的：', `${a + toTen} + ${b - toTen} = ${res}`),
      ];
    }
    const ones = a % 10;
    return [
      step(`把 ${b} 分成 ${ones} 和 ${b - ones}。`),
      step(`先减到整十：`, `${a} ${MINUS} ${ones} = ${a - ones}`),
      step('再减剩下的：', `${a - ones} ${MINUS} ${b - ones} = ${res}`),
    ];
  }
  const what = bt === 0 ? '个位' : '十位';
  return [
    step(`${what}上的数相${op === '+' ? '加' : '减'}，另一位不变。`),
    step('所以', `${a} ${sign} ${b} = ${res}`),
  ];
}

export function diagnoseAddSub(a: number, b: number, op: '+' | '-', x: number): Diagnosis {
  const tags: Diagnosis['tags'] = [];
  let feedback: string | undefined;
  if (op === '+') {
    if (addCarryBugs(a, b).includes(x)) {
      tags.push('carry-missed');
      feedback = `个位 ${a % 10} + ${b % 10} 满十了，要向十位进 1 哦！`;
    }
    if (x === Math.abs(a - b)) tags.push('op-confused');
  } else {
    if (subBorrowBugs(a, b).includes(x)) {
      tags.push('borrow-missed');
      feedback = `个位 ${a % 10} 不够减 ${b % 10}，向十位借 1 以后，十位要少 1 哦！`;
    }
    if (x === a + b) tags.push('op-confused');
  }
  if (!feedback && tags[0] === 'op-confused')
    feedback = `这是${op === '+' ? '加法' : '减法'}，先看清楚符号再算哦！`;
  return { tags, feedback };
}

export const g2AddSub2d = defineGenerator<AddSubParams>({
  id: 'g2.addsub.2d',
  variants: ['oral', 'vertical'],
  targets: ['carry-missed', 'borrow-missed', 'op-confused'],
  build({ difficulty, variant, target, rng }) {
    const op: '+' | '-' =
      target === 'carry-missed'
        ? '+'
        : target === 'borrow-missed'
          ? '-'
          : rng.chance(0.5)
            ? '+'
            : '-';
    const forceRegroup = target === 'carry-missed' || target === 'borrow-missed';
    const p = pickAddSub(rng, difficulty, op, forceRegroup);
    const { a, b } = p;
    const res = op === '+' ? a + b : a - b;
    const sign = op === '+' ? '+' : MINUS;
    const hard = regroups(a, b, op);
    const hint =
      op === '+'
        ? hard
          ? '个位相加满十了吗？满十要向十位进 1。'
          : '先算个位，再算十位。'
        : hard
          ? '个位不够减时，要从十位借 1，十位就少了 1。'
          : '个位减个位，十位减十位。';
    if (variant === 'vertical') {
      return {
        widget: 'vertical',
        prompt: `用竖式计算：${a} ${sign} ${b} = ${BLANK}`,
        vertical: {
          op,
          operands: [a, b],
          partialRows: 0,
          columns: Math.max(numLen(a), numLen(b), numLen(res)),
        },
        answer: { type: 'number', value: res },
        hint,
        steps: op === '+' ? columnAddSteps(a, b) : columnSubSteps(a, b),
        targetSeconds: 20 + (hard ? 10 : 0) + (difficulty >= 4 ? 5 : 0),
        params: p,
      };
    }
    return {
      widget: 'numeric',
      prompt: `${a} ${sign} ${b} = ${BLANK}`,
      answer: { type: 'number', value: res },
      hint,
      steps: oralSteps(a, b, op),
      targetSeconds: [6, 8, 8, 10, 12][difficulty - 1],
      params: p,
    };
  },
  diagnose({ a, b, op }, r) {
    const x = numOf(r);
    return x === null ? { tags: [] } : diagnoseAddSub(a, b, op, x);
  },
});
