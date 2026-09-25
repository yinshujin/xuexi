import type { Rng } from '../rng';
import type { Answer } from '../types';

/**
 * Small helpers shared by the 二年级 拔高 / 创新 templates (challenge-g2*.ts).
 */

export const num = (value: number): Answer => ({ type: 'number', value });
export const choiceAt = (index: number): Answer => ({ type: 'choice', index });
export const cmpOf = (a: number, b: number): Answer => ({
  type: 'compare',
  value: a < b ? '<' : a > b ? '>' : '=',
});
export const relText = (a: number, b: number): string => (a < b ? '<' : a > b ? '>' : '=');

export function range(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let i = lo; i <= hi; i++) out.push(i);
  return out;
}

/** Draw from `sample` until `ok` holds (templates are built so this is quick). */
export function until<T>(sample: () => T, ok: (x: T) => boolean, what: string): T {
  for (let i = 0; i < 20000; i++) {
    const x = sample();
    if (ok(x)) return x;
  }
  throw new Error(`challenge-g2: could not build ${what}`);
}

/** Pick `n` distinct items. */
export function pickN<T>(rng: Rng, items: readonly T[], n: number): T[] {
  return rng.shuffle(items).slice(0, n);
}

/** "多 3" / "少 3" / "不变" for a change of `d`. */
export function changeText(d: number): string {
  return d > 0 ? `多 ${d}` : d < 0 ? `少 ${-d}` : '不变';
}

/** "3 + 3 + 3" */
export function repeatAdd(m: number, times: number): string {
  return Array.from({ length: times }, () => String(m)).join(' + ');
}

/**
 * Evaluate an expression with + − × ÷ and parentheses (the symbols the
 * questions print). Used by `solve` so the check goes through the printed text.
 */
export function evalExpr(src: string): number {
  const s = src.replace(/\s+/g, '');
  let i = 0;
  const peek = () => s[i];
  const number = (): number => {
    if (peek() === '(') {
      i++;
      const v = sum();
      if (s[i] !== ')') throw new Error(`evalExpr: missing ) in ${src}`);
      i++;
      return v;
    }
    const m = /^\d+/.exec(s.slice(i));
    if (!m) throw new Error(`evalExpr: bad expression ${src}`);
    i += m[0].length;
    return Number(m[0]);
  };
  const product = (): number => {
    let v = number();
    while (peek() === '×' || peek() === '÷') {
      const op = s[i++];
      const r = number();
      if (op === '×') v *= r;
      else {
        if (r === 0 || v % r !== 0) throw new Error(`evalExpr: inexact division in ${src}`);
        v /= r;
      }
    }
    return v;
  };
  const sum = (): number => {
    let v = product();
    while (peek() === '+' || peek() === '−' || peek() === '-') {
      const op = s[i++];
      const r = product();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  const v = sum();
  if (i !== s.length) throw new Error(`evalExpr: trailing input in ${src}`);
  return v;
}

const CN = '零一二三四五六七八九';

/** 乘法口诀, smaller factor first: koujue(4, 3) = "三四十二"; `product` may be a wrong one. */
export function koujue(a: number, b: number, product = a * b): string {
  const [x, y] = a <= b ? [a, b] : [b, a];
  const head = CN[x] + CN[y];
  if (product < 10) return `${head}得${CN[product]}`;
  const t = Math.floor(product / 10);
  const u = product % 10;
  const tens = t === 1 ? (u === 0 ? '一十' : '十') : `${CN[t]}十`;
  return head + tens + (u === 0 ? '' : CN[u]);
}

/**
 * Which 口诀 a question may use at a difficulty.
 *  table25 (第四单元 2~5 的口诀): d1 只有 5 的口诀，d2 加上 2 的口诀，d3+ 2~5 的口诀；另一个因数 1~5。
 *  table69 (第七单元 6~9 的口诀): d1 学到 6 的口诀，d2 学到 7，d3+ 九九口诀全部；一个因数是 6~9。
 */
export interface TableScope {
  rows: number[];
  /** Largest other factor. */
  maxM: number;
}

export function scope25(d: number): TableScope {
  return { rows: d <= 1 ? [5] : d === 2 ? [2, 5] : [2, 3, 4, 5], maxM: 5 };
}

export function scope69(d: number): TableScope {
  const lim = d <= 1 ? 6 : d === 2 ? 7 : 9;
  return { rows: range(6, lim), maxM: lim };
}
