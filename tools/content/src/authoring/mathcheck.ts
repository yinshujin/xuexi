/**
 * Arithmetic checker for AI-authored lesson text. Finds simple equations such as
 * "326 × 8 = 2608", "2608 + 13040 = 15648", "96 ÷ 12 = 8" or "100 - 37 = 63"
 * and verifies them. Chains like "a + b + c = d" and parenthesised expressions
 * are evaluated too. Anything it cannot parse is ignored, never reported.
 */

export interface MathIssue {
  expression: string;
  expected: number;
  written: number;
}

const NUM = String.raw`\d+(?:\.\d+)?`;
const OP = String.raw`[+\-−×x*÷/]`;
// A left side made of numbers, operators, spaces and parentheses, followed by "= number".
const EQUATION = new RegExp(String.raw`((?:\(?\s*${NUM}\s*\)?\s*${OP}\s*)+\(?\s*${NUM}\s*\)?)\s*=\s*(${NUM})(?![\d.])`, 'g');

function normalize(expr: string): string {
  return expr.replace(/[×x*]/g, '*').replace(/[÷/]/g, '/').replace(/−/g, '-');
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
  for (const m of masked.matchAll(EQUATION)) {
    const left = m[1];
    // Unbalanced parentheses mean we caught a fragment; skip it.
    if ((left.match(/\(/g)?.length ?? 0) !== (left.match(/\)/g)?.length ?? 0)) continue;
    const expected = evaluate(left);
    const written = Number(m[2]);
    if (expected === null) continue;
    if (Math.abs(expected - written) > 1e-9) {
      issues.push({ expression: m[0].trim(), expected: Math.round(expected * 1e6) / 1e6, written });
    }
  }
  return issues;
}
