/**
 * Column-arithmetic helpers and the "bug library" procedures: each buggy
 * procedure reproduces what a child gets with a typical wrong method, so that
 * diagnosis can compare the child's answer with these results.
 */

/** Decimal digits, least significant first. 0 → [0]. */
export function digitsOf(n: number): number[] {
  const s = String(Math.abs(Math.trunc(n)));
  const out: number[] = [];
  for (let i = s.length - 1; i >= 0; i--) out.push(s.charCodeAt(i) - 48);
  return out;
}

export function numLen(n: number): number {
  return String(Math.abs(Math.trunc(n))).length;
}

export function pow10(k: number): number {
  return 10 ** k;
}

/** Number of trailing zeros (0 for n = 0). */
export function trailingZeros(n: number): number {
  if (n === 0) return 0;
  let k = 0;
  while (n % 10 === 0) {
    n /= 10;
    k++;
  }
  return k;
}

/** Round half up to a multiple of `unit` (四舍五入). */
export function roundTo(n: number, unit: number): number {
  return Math.floor(n / unit + 0.5) * unit;
}

/** Non-empty subsets of a small list. */
export function nonEmptySubsets<T>(items: readonly T[]): T[][] {
  const out: T[][] = [];
  const n = Math.min(items.length, 10);
  for (let mask = 1; mask < 1 << n; mask++) {
    const s: T[] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) s.push(items[i]);
    out.push(s);
  }
  return out;
}

function uniqueExcept(values: number[], except: number): number[] {
  return [...new Set(values)].filter((v) => v !== except && Number.isFinite(v));
}

// ---------------------------------------------------------------- addition

/**
 * Column addition where the carries INTO the listed columns are dropped
 * (column 0 = ones). A carry out of the top column counts as column `len`.
 */
export function addDroppingCarries(a: number, b: number, drop: ReadonlySet<number>): number {
  const A = digitsOf(a);
  const B = digitsOf(b);
  const n = Math.max(A.length, B.length);
  let carry = 0;
  let res = 0;
  let place = 1;
  for (let i = 0; i < n; i++) {
    const s = (A[i] ?? 0) + (B[i] ?? 0) + (drop.has(i) ? 0 : carry);
    res += (s % 10) * place;
    carry = s >= 10 ? 1 : 0;
    place *= 10;
  }
  if (carry && !drop.has(n)) res += carry * place;
  return res;
}

/** Columns that receive a carry in the correct column addition. */
export function carryColumns(a: number, b: number): number[] {
  const A = digitsOf(a);
  const B = digitsOf(b);
  const n = Math.max(A.length, B.length);
  const cols: number[] = [];
  let carry = 0;
  for (let i = 0; i < n; i++) {
    if (carry) cols.push(i);
    carry = (A[i] ?? 0) + (B[i] ?? 0) + carry >= 10 ? 1 : 0;
  }
  if (carry) cols.push(n);
  return cols;
}

export function countCarries(a: number, b: number): number {
  return carryColumns(a, b).length;
}

/** Results of column addition with one or more carries forgotten. */
export function addCarryBugs(a: number, b: number): number[] {
  const cols = carryColumns(a, b);
  return uniqueExcept(
    nonEmptySubsets(cols).map((s) => addDroppingCarries(a, b, new Set(s))),
    a + b,
  );
}

// ------------------------------------------------------------- subtraction

/** Columns that must pay back a borrow in the correct subtraction a − b (a ≥ b). */
export function borrowColumns(a: number, b: number): number[] {
  const A = digitsOf(a);
  const B = digitsOf(b);
  const cols: number[] = [];
  let borrow = 0;
  for (let i = 0; i < A.length; i++) {
    if (borrow) cols.push(i);
    borrow = A[i] - (B[i] ?? 0) - borrow < 0 ? 1 : 0;
  }
  return cols;
}

export function countBorrows(a: number, b: number): number {
  return borrowColumns(a, b).length;
}

/** Subtraction where the listed columns "forget" to subtract the borrowed 1. */
export function subSkippingDecrement(a: number, b: number, skip: ReadonlySet<number>): number {
  const A = digitsOf(a);
  const B = digitsOf(b);
  let borrow = 0;
  let res = 0;
  let place = 1;
  for (let i = 0; i < A.length; i++) {
    let d = A[i] - (B[i] ?? 0) - (skip.has(i) ? 0 : borrow);
    if (d < 0) {
      d += 10;
      borrow = 1;
    } else borrow = 0;
    res += d * place;
    place *= 10;
  }
  return res;
}

/** "Smaller from larger" in every column: |a_i − b_i|. */
export function subAbsColumns(a: number, b: number): number {
  const A = digitsOf(a);
  const B = digitsOf(b);
  const n = Math.max(A.length, B.length);
  let res = 0;
  for (let i = 0; i < n; i++) res += Math.abs((A[i] ?? 0) - (B[i] ?? 0)) * pow10(i);
  return res;
}

/** Results of typical borrow mistakes for a − b. */
export function subBorrowBugs(a: number, b: number): number[] {
  if (a < b) return [];
  const cols = borrowColumns(a, b);
  if (cols.length === 0) return [];
  const vals = nonEmptySubsets(cols).map((s) => subSkippingDecrement(a, b, new Set(s)));
  vals.push(subAbsColumns(a, b));
  return uniqueExcept(vals, a - b);
}

// ---------------------------------------------------------- multiplication

/** a × d (d a single digit) with the carries into the listed columns dropped. */
export function mulDigitDroppingCarries(a: number, d: number, drop: ReadonlySet<number>): number {
  const A = digitsOf(a);
  let carry = 0;
  let res = 0;
  let place = 1;
  for (let i = 0; i < A.length; i++) {
    const p = A[i] * d + (drop.has(i) ? 0 : carry);
    res += (p % 10) * place;
    carry = Math.floor(p / 10);
    place *= 10;
  }
  if (carry && !drop.has(A.length)) res += carry * place;
  return res;
}

/** Columns receiving a carry in a × d. */
export function mulCarryColumns(a: number, d: number): number[] {
  const A = digitsOf(a);
  const cols: number[] = [];
  let carry = 0;
  for (let i = 0; i < A.length; i++) {
    if (carry) cols.push(i);
    carry = Math.floor((A[i] * d + carry) / 10);
  }
  return cols; // the final carry is written down, not added, so it is not a "carry column"
}

export function countMulCarries(a: number, d: number): number {
  return mulCarryColumns(a, d).length;
}

/** a × d with one or more carries forgotten. */
export function mulDigitCarryBugs(a: number, d: number): number[] {
  const cols = mulCarryColumns(a, d);
  return uniqueExcept(
    nonEmptySubsets(cols).map((s) => mulDigitDroppingCarries(a, d, new Set(s))),
    a * d,
  );
}

/**
 * a × d with exactly one multiplication fact wrong by a "neighbouring" fact
 * (a_i × (d ± 1) or (a_i ± 1) × d in one column).
 */
export function mulDigitFactBugs(a: number, d: number): number[] {
  const A = digitsOf(a);
  const vals: number[] = [];
  for (let i = 0; i < A.length; i++) {
    if (A[i] === 0) continue;
    const place = pow10(i);
    vals.push(a * d + d * place, a * d - d * place, a * d + A[i] * place, a * d - A[i] * place);
  }
  return uniqueExcept(
    vals.filter((v) => v >= 0),
    a * d,
  );
}

/** Neighbouring multiplication-table products of a × b (both 1..9). */
export function neighborProducts(a: number, b: number): number[] {
  const vals: number[] = [];
  for (const [x, y] of [
    [a - 1, b],
    [a + 1, b],
    [a, b - 1],
    [a, b + 1],
  ]) {
    if (x >= 1 && x <= 9 && y >= 1 && y <= 9) vals.push(x * y);
  }
  return uniqueExcept(vals, a * b);
}

// -------------------------------------------------------------- formatting

/** Minus sign used in all prompts (U+2212), readable on tablets. */
export const MINUS = '−';

export function fmtSigned(n: number): string {
  return n < 0 ? `${MINUS}${-n}` : String(n);
}

export function opText(op: '+' | '-'): string {
  return op === '+' ? '+' : MINUS;
}

export function apply(x: number, op: '+' | '-', y: number): number {
  return op === '+' ? x + y : x - y;
}

const PLACE_NAMES = [
  '个',
  '十',
  '百',
  '千',
  '万',
  '十万',
  '百万',
  '千万',
  '亿',
  '十亿',
  '百亿',
  '千亿',
];

export function placeName(i: number): string {
  return PLACE_NAMES[i] ?? `10^${i}`;
}
