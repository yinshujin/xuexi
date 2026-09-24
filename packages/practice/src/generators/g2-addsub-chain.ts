import { addCarryBugs, apply, countBorrows, countCarries, opText, subBorrowBugs } from '../arith';
import type { ErrorTag } from '@xuexi/shared';
import { BLANK, defineGenerator, numOf, sampleUntil, step, type Diagnosis } from './base';

/**
 * g2.addsub.chain — 连加、连减、加减混合、带括号（100 以内）。
 *
 * Difficulty:
 *  1 连加 / 连减，不进位不退位
 *  2 连加 / 连减，至少一步进位或退位
 *  3 加减混合（无括号），至少一步进位或退位
 *  4 带括号 a − (b + c) / a + (b − c)，至少一步进位或退位
 *  5 带括号 a − (b − c) / a − (b + c)，至少两步进位或退位
 */

export interface ChainParams {
  a: number;
  b: number;
  c: number;
  op1: '+' | '-';
  op2: '+' | '-';
  /** true → a op1 (b op2 c) */
  paren: boolean;
}

interface Step {
  x: number;
  op: '+' | '-';
  y: number;
}

/** The two calculation steps in the order they must be done. */
function stepsOf(p: ChainParams): [Step, (first: number) => Step] {
  if (p.paren) {
    return [{ x: p.b, op: p.op2, y: p.c }, (t) => ({ x: p.a, op: p.op1, y: t })];
  }
  return [{ x: p.a, op: p.op1, y: p.b }, (t) => ({ x: t, op: p.op2, y: p.c })];
}

export function evalChain(p: ChainParams): number {
  const [s1, s2] = stepsOf(p);
  const t = apply(s1.x, s1.op, s1.y);
  const s = s2(t);
  return apply(s.x, s.op, s.y);
}

function regroupsIn(s: Step): boolean {
  return s.op === '+' ? countCarries(s.x, s.y) > 0 : countBorrows(s.x, s.y) > 0;
}

function bugsOf(s: Step): number[] {
  return s.op === '+' ? addCarryBugs(s.x, s.y) : subBorrowBugs(s.x, s.y);
}

function stepTag(s: Step): ErrorTag {
  return s.op === '+' ? 'carry-missed' : 'borrow-missed';
}

export function chainText(p: ChainParams): string {
  const o1 = opText(p.op1);
  const o2 = opText(p.op2);
  return p.paren ? `${p.a} ${o1} (${p.b} ${o2} ${p.c})` : `${p.a} ${o1} ${p.b} ${o2} ${p.c}`;
}

type Form = 'add' | 'sub' | 'mix' | 'paren' | 'paren-hard';

export const g2AddSubChain = defineGenerator<ChainParams>({
  id: 'g2.addsub.chain',
  variants: ['default'],
  targets: ['carry-missed', 'borrow-missed', 'order-of-ops'],
  build({ difficulty: d, target, rng }) {
    let forms: Form[] =
      target === 'order-of-ops'
        ? ['paren', 'paren-hard']
        : d === 1 || d === 2
          ? ['add', 'sub']
          : d === 3
            ? ['mix']
            : d === 4
              ? ['paren']
              : ['paren-hard', 'paren'];
    // Remediation needs a step of the right kind: '+' for carries, '−' for borrows.
    if (target === 'carry-missed') forms = forms.filter((f) => f !== 'sub' && f !== 'paren-hard');
    if (target === 'borrow-missed') forms = forms.filter((f) => f !== 'add');
    const form = rng.pick(forms);
    const [aMin, aMax, bMax] = d === 1 ? [10, 60, 30] : d === 2 ? [10, 80, 40] : [20, 99, 60];
    const minRegroups =
      target === 'carry-missed' || target === 'borrow-missed' ? 1 : d === 1 ? 0 : d === 5 ? 2 : 1;

    const sample = (): ChainParams => {
      const a = rng.int(aMin, aMax);
      const b = rng.int(2, bMax);
      const c = rng.int(2, bMax);
      switch (form) {
        case 'add':
          return { a, b, c, op1: '+', op2: '+', paren: false };
        case 'sub':
          return { a, b, c, op1: '-', op2: '-', paren: false };
        case 'mix':
          return rng.chance(0.5)
            ? { a, b, c, op1: '+', op2: '-', paren: false }
            : { a, b, c, op1: '-', op2: '+', paren: false };
        case 'paren':
          return rng.chance(0.7)
            ? { a, b, c, op1: '-', op2: '+', paren: true }
            : { a, b, c, op1: '+', op2: '-', paren: true };
        case 'paren-hard':
          return { a, b, c, op1: '-', op2: '-', paren: true };
      }
    };
    const accept = (p: ChainParams): boolean => {
      const [s1, s2f] = stepsOf(p);
      const t = apply(s1.x, s1.op, s1.y);
      if (t < 0 || t > 100) return false;
      if (t === 0) return false;
      const s2 = s2f(t);
      const r = apply(s2.x, s2.op, s2.y);
      if (r < 0 || r > 100) return false;
      const count = (regroupsIn(s1) ? 1 : 0) + (regroupsIn(s2) ? 1 : 0);
      if (d === 1 && !target && count > 0) return false;
      if (count < minRegroups) return false;
      if (
        target === 'carry-missed' &&
        !((s1.op === '+' && regroupsIn(s1)) || (s2.op === '+' && regroupsIn(s2)))
      )
        return false;
      if (
        target === 'borrow-missed' &&
        !((s1.op === '-' && regroupsIn(s1)) || (s2.op === '-' && regroupsIn(s2)))
      )
        return false;
      // Parentheses must matter, so that ignoring them gives a different result.
      if (p.paren && p.op1 === '-' && leftToRight(p) === r) return false;
      return true;
    };
    const p = sampleUntil(sample, accept, `chain d${d} ${form}`);
    const [s1, s2f] = stepsOf(p);
    const t = apply(s1.x, s1.op, s1.y);
    const s2 = s2f(t);
    const res = apply(s2.x, s2.op, s2.y);
    const expr = chainText(p);
    const steps = [
      step(
        p.paren ? '有括号，先算括号里面的：' : '没有括号，从左往右算。先算：',
        `${s1.x} ${opText(s1.op)} ${s1.y} = ${t}`,
      ),
      step('再算：', `${s2.x} ${opText(s2.op)} ${s2.y} = ${res}`),
      step('所以', `${expr} = ${res}`),
    ];
    return {
      widget: 'numeric',
      prompt: `${expr} = ${BLANK}`,
      answer: { type: 'number', value: res },
      hint: p.paren ? '有括号的要先算括号里面的。' : '从左往右，一步一步算。',
      steps,
      targetSeconds: [12, 15, 15, 18, 20][d - 1],
      params: p,
    };
  },
  diagnose(p, r) {
    const x = numOf(r);
    if (x === null) return { tags: [] };
    const tags: Diagnosis['tags'] = [];
    // Order of operations: ignoring the parentheses, or (for no parentheses) computing the right part first.
    if (p.paren ? leftToRight(p) === x : apply(p.a, p.op1, apply(p.b, p.op2, p.c)) === x)
      tags.push('order-of-ops');
    // A carry / borrow bug in one of the two steps (the other step done right).
    const [s1, s2f] = stepsOf(p);
    const t = apply(s1.x, s1.op, s1.y);
    for (const bad of bugsOf(s1)) {
      const s2 = s2f(bad);
      if (apply(s2.x, s2.op, s2.y) === x) tags.push(stepTag(s1));
      if (bugsOf(s2).includes(x)) tags.push(stepTag(s1), stepTag(s2));
    }
    const s2 = s2f(t);
    if (bugsOf(s2).includes(x)) tags.push(stepTag(s2));
    return { tags: [...new Set(tags)] };
  },
});

function leftToRight(p: ChainParams): number {
  return apply(apply(p.a, p.op1, p.b), p.op2, p.c);
}
