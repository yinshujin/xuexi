import { MINUS } from '../arith';
import type { SolutionStep } from '../types';
import { BLANK, step } from './base';

/**
 * A tiny unit-conversion engine shared by 人民币 and 长度.
 *
 * A question is `left (op right)? = prefix ( ) target`, e.g.
 *   「3元5角 = ( )角」, 「35角 = 3元( )角」, 「2元5角 + 8角 = ( )角」.
 * Diagnosis recomputes the answer with wrong unit rates (10 ↔ 100, or 1 = no
 * conversion at all) to detect 进率 mistakes.
 */

export interface UnitSystem {
  /** Units from large to small, e.g. ['元', '角', '分']. */
  units: string[];
  /** Rate between neighbours, e.g. [10, 10] (1元=10角, 1角=10分). */
  rates: number[];
  /** Wrong rates a child may use for each neighbour pair. */
  wrongRates: number[][];
}

export type Qty = Array<{ value: number; unit: string }>;

export interface UnitQuestion {
  left: Qty;
  op?: '+' | '-';
  right?: Qty;
  /** Fixed part before the blank, e.g. 3元 in 「35角 = 3元( )角」. */
  prefix?: Qty;
  target: string;
}

export const MONEY: UnitSystem = {
  units: ['元', '角', '分'],
  rates: [10, 10],
  wrongRates: [
    [1, 100],
    [1, 100],
  ],
};
export const LENGTH: UnitSystem = {
  units: ['米', '厘米'],
  rates: [100],
  wrongRates: [[1, 10, 1000]],
};

/** Size of each unit measured in the smallest unit. */
function sizes(sys: UnitSystem, rates: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  let size = 1;
  for (let i = sys.units.length - 1; i >= 0; i--) {
    out[sys.units[i]] = size;
    if (i > 0) size *= rates[i - 1];
  }
  return out;
}

function valueOf(q: Qty | undefined, sz: Record<string, number>): number {
  return (q ?? []).reduce((s, t) => s + t.value * sz[t.unit], 0);
}

/** Answer with the given rates; null when not a whole number. */
export function solveUnits(sys: UnitSystem, q: UnitQuestion, rates = sys.rates): number | null {
  const sz = sizes(sys, rates);
  const l = valueOf(q.left, sz);
  const r = valueOf(q.right, sz);
  const total = q.op === '-' ? l - r : l + r;
  const rest = total - valueOf(q.prefix, sz);
  const ans = rest / sz[q.target];
  return Number.isInteger(ans) ? ans : null;
}

/** Answers produced by every combination of wrong rates. */
export function wrongRateAnswers(sys: UnitSystem, q: UnitQuestion): number[] {
  const correct = solveUnits(sys, q);
  const combos: number[][] = [[]];
  sys.rates.forEach((rate, i) => {
    const next: number[][] = [];
    for (const c of combos) for (const r of [rate, ...sys.wrongRates[i]]) next.push([...c, r]);
    combos.splice(0, combos.length, ...next);
  });
  const out = new Set<number>();
  for (const c of combos) {
    const a = solveUnits(sys, q, c);
    if (a !== null && a !== correct && a >= 0) out.add(a);
  }
  return [...out];
}

export function qtyText(q: Qty): string {
  return q.map((t) => `${t.value}${t.unit}`).join('');
}

export function unitPrompt(q: UnitQuestion): string {
  const lhs =
    qtyText(q.left) + (q.op ? ` ${q.op === '+' ? '+' : MINUS} ${qtyText(q.right ?? [])}` : '');
  return `${lhs} = ${q.prefix ? qtyText(q.prefix) : ''}${BLANK}${q.target}`;
}

function rateFacts(sys: UnitSystem, used: Set<string>): string {
  const facts: string[] = [];
  for (let i = 0; i < sys.rates.length; i++) {
    const big = sys.units[i];
    const small = sys.units[i + 1];
    if (used.has(big) && used.has(small)) facts.push(`1${big} = ${sys.rates[i]}${small}`);
  }
  // 元 and 分 together without 角: mention 1元 = 100分.
  if (
    facts.length === 0 &&
    sys.units.length === 3 &&
    used.has(sys.units[0]) &&
    used.has(sys.units[2])
  ) {
    facts.push(`1${sys.units[0]} = ${sys.rates[0] * sys.rates[1]}${sys.units[2]}`);
  }
  return facts.join('，');
}

/** Worked steps: convert everything to the smallest unit involved, compute, convert back. */
export function unitSteps(sys: UnitSystem, q: UnitQuestion): SolutionStep[] {
  const used = new Set<string>([
    q.target,
    ...q.left.map((t) => t.unit),
    ...(q.right ?? []).map((t) => t.unit),
    ...(q.prefix ?? []).map((t) => t.unit),
  ]);
  const small = [...sys.units].reverse().find((u) => used.has(u)) as string;
  const sz = sizes(sys, sys.rates);
  const inSmall = (x: Qty) => valueOf(x, sz) / sz[small];
  const out: SolutionStep[] = [];
  const facts = rateFacts(sys, used);
  if (facts) out.push(step(`记住进率：${facts}。`));
  const conv = (x: Qty) => {
    const v = inSmall(x);
    if (x.length === 1 && x[0].unit === small) return;
    out.push(step(`把 ${qtyText(x)} 化成${small}：`, `${qtyText(x)} = ${v}${small}`));
  };
  conv(q.left);
  let total = inSmall(q.left);
  if (q.op && q.right) {
    conv(q.right);
    const r = inSmall(q.right);
    const res = q.op === '+' ? total + r : total - r;
    out.push(
      step(
        '再计算：',
        `${total}${small} ${q.op === '+' ? '+' : MINUS} ${r}${small} = ${res}${small}`,
      ),
    );
    total = res;
  }
  if (q.prefix) {
    const pv = inSmall(q.prefix);
    out.push(
      step(
        `${qtyText(q.prefix)} = ${pv}${small}，从 ${total}${small} 里去掉：`,
        `${total}${small} ${MINUS} ${pv}${small} = ${total - pv}${small}`,
      ),
    );
    total -= pv;
  }
  const ans = solveUnits(sys, q) as number;
  if (q.target !== small)
    out.push(step(`再化成${q.target}：`, `${total}${small} = ${ans}${q.target}`));
  out.push(step(`所以括号里填 ${ans}。`));
  return out;
}
