import type { ErrorTag } from '@xuexi/shared';
import { MINUS } from '../arith';
import type { Answer } from '../types';

/** Small helpers shared by the 四年级 拔高 / 创新 templates (challenge-g4*.ts). */

export const num = (value: number): Answer => ({ type: 'number', value });
export const chosen = (index: number): Answer => ({ type: 'choice', index });

/** Choice answer: the index of the one option equal to `text` (throws unless exactly one). */
export function optionIndex(options: readonly string[], text: string): Answer {
  const hits = options.flatMap((o, i) => (o === text ? [i] : []));
  if (hits.length !== 1) throw new Error(`expected one option "${text}", got ${hits.length}`);
  return chosen(hits[0]);
}

/** Choice answer: the index of the one option satisfying `pred` (throws unless exactly one). */
export function onlyOption(
  options: readonly string[],
  pred: (o: string, i: number) => boolean,
): Answer {
  const hits = options.flatMap((o, i) => (pred(o, i) ? [i] : []));
  if (hits.length !== 1)
    throw new Error(`expected one matching option, got ${hits.length}: ${options}`);
  return chosen(hits[0]);
}

/** Options chosen in `make`: text plus the mistake each wrong one reveals (null = correct). */
export interface ChoiceParams {
  options: string[];
  tags: Array<ErrorTag | null>;
}

/** The choice-widget part of a draft, from options decided in `make`. */
export function choiceParts(p: ChoiceParams) {
  const index = p.tags.indexOf(null);
  if (index < 0 || p.tags.lastIndexOf(null) !== index)
    throw new Error('choice needs exactly one correct option');
  return {
    widget: 'choice' as const,
    options: p.options,
    answer: chosen(index),
    optionTags: p.tags,
  };
}

export const sgn = (n: number): string => (n < 0 ? `${MINUS}${-n}` : `+${n}`);

/** Distinct arrangements of a multiset of digits, in increasing (lexicographic) order. */
export function* arrangements(digits: readonly number[]): Generator<number[]> {
  const counts = new Map<number, number>();
  for (const d of digits) counts.set(d, (counts.get(d) ?? 0) + 1);
  const keys = [...counts.keys()].sort((a, b) => a - b);
  const cur: number[] = [];
  function* rec(): Generator<number[]> {
    if (cur.length === digits.length) {
      yield cur.slice();
      return;
    }
    for (const k of keys) {
      const c = counts.get(k)!;
      if (c === 0) continue;
      counts.set(k, c - 1);
      cur.push(k);
      yield* rec();
      cur.pop();
      counts.set(k, c);
    }
  }
  yield* rec();
}

export const fromDigits = (ds: readonly number[]): number => ds.reduce((n, d) => n * 10 + d, 0);

/** n choose 2 */
export const pairs = (n: number): number => (n * (n - 1)) / 2;

/**
 * Evaluates a printed expression: integers, + − × ÷, ( ) and [ ].
 * Used by solvers as an independent check of what the child sees.
 */
export function evalText(src: string): number {
  const s = src.replace(/\s+/g, '').replace(/−/g, '-').replace(/\[/g, '(').replace(/\]/g, ')');
  let i = 0;
  const peek = () => s[i];
  const expr = (): number => {
    let v = term();
    while (peek() === '+' || peek() === '-') {
      const op = s[i++];
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  const term = (): number => {
    let v = factor();
    while (peek() === '×' || peek() === '÷') {
      const op = s[i++];
      const r = factor();
      v = op === '×' ? v * r : v / r;
    }
    return v;
  };
  const factor = (): number => {
    if (peek() === '(') {
      i++;
      const v = expr();
      if (s[i++] !== ')') throw new Error(`evalText: missing ) in ${src}`);
      return v;
    }
    const m = /^\d+/.exec(s.slice(i));
    if (!m) throw new Error(`evalText: bad expression ${src}`);
    i += m[0].length;
    return Number(m[0]);
  };
  const v = expr();
  if (i !== s.length) throw new Error(`evalText: trailing input in ${src}`);
  return v;
}
