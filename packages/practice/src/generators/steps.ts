import { MINUS, digitsOf, placeName } from '../arith';
import type { SolutionStep } from '../types';
import { step } from './base';

/** Column-by-column worked steps for a + b. */
export function columnAddSteps(a: number, b: number): SolutionStep[] {
  const A = digitsOf(a);
  const B = digitsOf(b);
  const n = Math.max(A.length, B.length);
  const out: SolutionStep[] = [step('相同数位对齐，从个位加起。')];
  let carry = 0;
  for (let i = 0; i < n; i++) {
    const x = A[i] ?? 0;
    const y = B[i] ?? 0;
    const s = x + y + carry;
    const expr = `${x} + ${y}` + (carry ? ` + ${carry}（进位）` : '') + ` = ${s}`;
    const tail = s >= 10 ? `，写 ${s % 10}，向${placeName(i + 1)}位进 1` : `，写 ${s}`;
    const last = i === n - 1 && s >= 10 ? `，${placeName(i + 1)}位写 1` : '';
    out.push(step(`${placeName(i)}位：${expr}${tail}${last}。`));
    carry = s >= 10 ? 1 : 0;
  }
  out.push(step('所以', `${a} + ${b} = ${a + b}`));
  return out;
}

/** Column-by-column worked steps for a − b (a ≥ b). */
export function columnSubSteps(a: number, b: number): SolutionStep[] {
  const A = digitsOf(a);
  const B = digitsOf(b);
  const out: SolutionStep[] = [step('相同数位对齐，从个位减起。')];
  let borrow = 0;
  for (let i = 0; i < A.length; i++) {
    const top = A[i] - borrow;
    const y = B[i] ?? 0;
    const topText = borrow ? `${A[i]} 被借走 1 后是 ${top}，` : '';
    if (i === A.length - 1 && top === 0 && y === 0) break; // leading zero, nothing to write
    if (top < 0) {
      // 连续退位：this column is 0 and was borrowed from.
      out.push(
        step(
          `${placeName(i)}位：是 0，不够借，先从${placeName(i + 1)}位退 1 当 10，借走 1 后是 9，9 ${MINUS} ${y} = ${9 - y}。`,
        ),
      );
      borrow = 1;
    } else if (top < y) {
      out.push(
        step(
          `${placeName(i)}位：${topText}${top} 不够减 ${y}，从${placeName(i + 1)}位退 1，${top + 10} ${MINUS} ${y} = ${top + 10 - y}。`,
        ),
      );
      borrow = 1;
    } else {
      out.push(step(`${placeName(i)}位：${topText}${top} ${MINUS} ${y} = ${top - y}。`));
      borrow = 0;
    }
  }
  out.push(step('所以', `${a} ${MINUS} ${b} = ${a - b}`));
  return out;
}
