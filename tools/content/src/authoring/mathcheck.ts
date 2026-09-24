/**
 * Arithmetic checker for AI-authored lesson text. Finds simple equations such as
 * "326 × 8 = 2608", "2608 + 13040 = 15648", "96 ÷ 12 = 8" or "100 - 37 = 63"
 * and verifies them. Chains like "a + b + c = d", parenthesised expressions and
 * worked chains like "408 × 23 = 408 × 20 + 408 × 3 = 8160 + 1224 = 9384" are
 * evaluated too: every part of a chain must equal the first part. Numbers
 * written with 万 / 亿 count as that many ("35万 = 350000", "3 × 10万 = 30万").
 * Anything it cannot parse is ignored, never reported.
 */

export interface MathIssue {
  expression: string;
  expected: number;
  written: number;
}

const NUM = String.raw`\d+(?:\.\d+)?`;
const OP = String.raw`[+\-−×x*÷/]`;
// A number, optionally followed by 万 / 亿 (but not 万位 / 万级). A number followed by
// 个 / 十 / 百 / 千 / 位 / 级 ("3 个十万", "5 百万", "第 3 位") is a count, not a value,
// so it cannot be part of an equation.
const TERM = String.raw`\(?\s*${NUM}(?![\d.])(?:\s*[万亿](?![位级])|(?!\s*[个十百千位级]))\s*\)?`;
const SIDE = String.raw`${TERM}(?:\s*${OP}\s*${TERM})*`;
// Two or more sides joined by "=". Starts at a number boundary so "205" is never read as "05".
const CHAIN = new RegExp(String.raw`(?<![\d.])${SIDE}(?:\s*=\s*${SIDE})+`, 'g');

const UNIT_VALUE: Record<string, number> = { 万: 10_000, 亿: 100_000_000 };

function normalize(expr: string): string {
  return expr
    .replace(new RegExp(String.raw`(${NUM})\s*([万亿])`, 'g'), (_, n, u) => `(${n}*${UNIT_VALUE[u]})`)
    .replace(/[×x*]/g, '*')
    .replace(/[÷/]/g, '/')
    .replace(/−/g, '-');
}

/** Tiny recursive-descent evaluator for + - * / and parentheses (no unary minus). */
export function evaluate(expr: string): number | null {
  const src = normalize(expr).replace(/\s+/g, '');
  let i = 0;
  const peek = () => src[i];
  const number = (): number | null => {
    if (peek() === '(') {
      i++;
      const v = sum();
      if (v === null || peek() !== ')') return null;
      i++;
      return v;
    }
    const m = /^\d+(?:\.\d+)?/.exec(src.slice(i));
    if (!m) return null;
    i += m[0].length;
    return Number(m[0]);
  };
  const product = (): number | null => {
    let v = number();
    while (v !== null && (peek() === '*' || peek() === '/')) {
      const op = src[i++];
      const r = number();
      if (r === null) return null;
      if (op === '/' && r === 0) return null;
      v = op === '*' ? v * r : v / r;
    }
    return v;
  };
  const sum = (): number | null => {
    let v = product();
    while (v !== null && (peek() === '+' || peek() === '-')) {
      const op = src[i++];
      const r = product();
      if (r === null) return null;
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  const v = sum();
  return v !== null && i === src.length ? v : null;
}

const round6 = (x: number) => Math.round(x * 1e6) / 1e6;
const hasOp = (side: string) => new RegExp(OP).test(side.replace(/^\s*\(|\)\s*$/g, ''));
const hasUnit = (side: string) => /[万亿]/.test(side);

export function checkArithmetic(text: string): MathIssue[] {
  const issues: MathIssue[] = [];
  // Division with remainder ("47 ÷ 5 = 9……2") is checked separately.
  const remainderRe = new RegExp(String.raw`(${NUM})\s*÷\s*(${NUM})\s*=\s*(${NUM})\s*(?:…+|\.{3,}|余)\s*(${NUM})`, 'g');
  const masked = text.replace(remainderRe, (all, a, b, q, r) => {
    const [A, B, Q, R] = [a, b, q, r].map(Number);
    if (B === 0 || Q * B + R !== A || R >= B) {
      issues.push({ expression: all, expected: Math.floor(A / B), written: Q });
    }
    return ' '.repeat(all.length);
  });
  for (const m of masked.matchAll(CHAIN)) {
    const sides = m[0].split('=').map((s) => s.trim());
    // "1 米 = 100 厘米" or "第 3 = 3": plain numbers on every side are not arithmetic.
    if (!sides.some((s) => hasOp(s) || hasUnit(s))) continue;
    // Unbalanced parentheses mean we caught a fragment; skip it.
    if (sides.some((s) => (s.match(/\(/g)?.length ?? 0) !== (s.match(/\)/g)?.length ?? 0))) continue;
    const values = sides.map(evaluate);
    if (values.some((v) => v === null)) continue;
    const expected = values[0]!;
    // Each wrong part is reported against the last part that was still right.
    let lastGood = 0;
    for (let i = 1; i < sides.length; i++) {
      if (Math.abs(values[i]! - expected) <= 1e-9) {
        lastGood = i;
        continue;
      }
      issues.push({
        expression: `${sides[lastGood]} = ${sides[i]}`,
        expected: round6(expected),
        written: round6(values[i]!),
      });
    }
  }
  return issues;
}
