import type { ErrorTag } from '@xuexi/shared';
import { MAX_READ_DIGITS, readChineseNumber, sectionsOf } from '../chinese';
import type { Rng } from '../rng';
import type { SolutionStep } from '../types';
import { BLANK, buildChoice, choiceDiagnosis, defineGenerator, sampleUntil, step } from './base';

/**
 * g4.bignum.read — 大数的读法与写法（选择题）。
 *
 * Variants: 'mixed' | 'read' (给数选读法) | 'write' (给读法选写法).
 * Difficulty (number shape):
 *  1 5~6 位，最多一处读「零」
 *  2 6~8 位，中间有 0
 *  3 7~8 位，跨级的 0 / 万级末尾的 0
 *  4 9~10 位（亿级），至少一个「零」
 *  5 10~12 位，至少两个「零」
 * Distractors come from the bug readers (zero-reading) and from numbers whose
 * digits sit in the wrong place (place-value).
 */

export interface BigReadParams {
  mode: 'read' | 'write';
  n: number;
  optionTags: Array<ErrorTag | null>;
}

const zeroCount = (s: string) => [...s].filter((c) => c === '零').length;

/** Digits 'shape' for one difficulty level. */
export function pickBigNumber(rng: Rng, d: number, target?: ErrorTag): number {
  const [lMin, lMax, pz] = [
    [5, 6, 0.25],
    [6, 8, 0.35],
    [7, 8, 0.45],
    [9, 10, 0.45],
    [10, 12, 0.55],
  ][d - 1];
  const wantZeros = target === 'zero-reading';
  const sample = () => {
    const len = rng.int(lMin, lMax);
    let s = String(rng.int(1, 9));
    for (let i = 1; i < len; i++)
      s += rng.chance(wantZeros ? Math.max(pz, 0.5) : pz) ? '0' : String(rng.int(1, 9));
    return Number(s);
  };
  const accept = (n: number) => {
    const r = readChineseNumber(n);
    const z = zeroCount(r);
    if (wantZeros && z < 1) return false;
    switch (d) {
      case 1:
        return z <= 1;
      case 2:
        return z >= 1;
      case 3: {
        // A zero that crosses the 万/个 boundary, or trailing zeros at the end of the 万级.
        const secs = sectionsOf(n);
        const cross =
          secs.length >= 2 &&
          (secs[secs.length - 1].startsWith('0') || secs[secs.length - 2].endsWith('0'));
        return z >= 1 && cross;
      }
      case 4:
        return z >= 1;
      default:
        return z >= 2;
    }
  };
  return sampleUntil(sample, accept, `big number d${d}`);
}

function misplaced(n: number, rng: Rng): number[] {
  const s = String(n);
  const out: number[] = [];
  if (s.length < MAX_READ_DIGITS) out.push(n * 10);
  if (n % 10 === 0) out.push(n / 10);
  // Move one non-zero digit into a neighbouring zero position.
  const idx = rng.shuffle([...s].map((_, i) => i));
  for (const i of idx) {
    for (const j of [i - 1, i + 1]) {
      if (j < 0 || j >= s.length || s[i] === '0' || s[j] !== '0' || (j === 0 && s[i] === '0'))
        continue;
      const arr = [...s];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      if (arr[0] !== '0') out.push(Number(arr.join('')));
    }
  }
  return out.filter((x) => x !== n && String(x).length <= MAX_READ_DIGITS);
}

/** Numbers written with one zero too few / too many inside a zero run. */
function zeroMiswrites(n: number): number[] {
  const s = String(n);
  const out: number[] = [];
  for (let i = 1; i < s.length; i++) {
    if (s[i] === '0' && s[i - 1] !== '0') {
      out.push(Number(s.slice(0, i) + s.slice(i + 1))); // one zero dropped
      if (s.length < MAX_READ_DIGITS) out.push(Number(s.slice(0, i) + '0' + s.slice(i))); // one zero extra
    }
  }
  return out.filter((x) => x !== n);
}

function readSteps(n: number): SolutionStep[] {
  const secs = sectionsOf(n);
  const names = ['个级', '万级', '亿级'];
  const out: SolutionStep[] = [step('从右往左，四位一级分级：', secs.join(' | '))];
  secs.forEach((sec, i) => {
    const level = secs.length - 1 - i;
    const v = Number(sec);
    if (v === 0) {
      out.push(step(`${names[level]} ${sec} 全是 0，不读。`));
      return;
    }
    const lead = i > 0 && sec.startsWith('0') ? '（前面有 0，只读一个「零」）' : '';
    const tail = level > 0 && sec.endsWith('0') ? '（末尾的 0 不读）' : '';
    const unit = level > 0 ? `，读完加「${level === 1 ? '万' : '亿'}」` : '';
    out.push(step(`${names[level]} ${sec}${lead}${tail}${unit}。`));
  });
  out.push(step('合起来读作：', readChineseNumber(n)));
  return out;
}

export const g4BignumRead = defineGenerator<BigReadParams>({
  id: 'g4.bignum.read',
  variants: ['mixed', 'read', 'write'],
  targets: ['zero-reading', 'place-value'],
  build({ difficulty: d, variant, target, rng }) {
    const mode: 'read' | 'write' =
      variant === 'mixed' ? (rng.chance(0.6) ? 'read' : 'write') : (variant as 'read' | 'write');
    const n = pickBigNumber(rng, target === 'place-value' ? Math.max(d, 3) : d, target);
    const correct = readChineseNumber(n);

    let choice;
    if (mode === 'read') {
      const zeroBugs = rng.shuffle(
        [
          readChineseNumber(n, { omitMiddleZeros: true }),
          readChineseNumber(n, { readEveryZero: true }),
          readChineseNumber(n, { zeroForSectionTrailing: true }),
        ].filter((s) => s !== correct),
      );
      const placeBugs = rng.shuffle(misplaced(n, rng).map((x) => readChineseNumber(x)));
      choice = buildChoice(
        rng,
        correct,
        pickDistractors(rng, zeroBugs, placeBugs, correct, n, (x) => readChineseNumber(x)),
      );
    } else {
      const zeroBugs = rng.shuffle(zeroMiswrites(n).map(String));
      const placeBugs = rng.shuffle(misplaced(n, rng).map(String));
      choice = buildChoice(
        rng,
        String(n),
        pickDistractors(rng, zeroBugs, placeBugs, String(n), n, String),
      );
    }
    const steps =
      mode === 'read'
        ? readSteps(n)
        : [
            step('从高位写起，按级写：哪一位上一个单位也没有，就写 0 占位。'),
            ...sectionsOf(n).map((sec, i, all) =>
              step(`${['个级', '万级', '亿级'][all.length - 1 - i]}写作 ${sec}。`),
            ),
            step('合起来写作：', String(n)),
          ];
    return {
      widget: 'choice',
      prompt: mode === 'read' ? `${n} 读作${BLANK}。` : `${correct} 写作${BLANK}。`,
      options: choice.options,
      answer: { type: 'choice', index: choice.index },
      hint:
        mode === 'read'
          ? '先从右往左四位一级分级，再从高级读起。'
          : '先写亿级，再写万级、个级，哪一位没有就写 0。',
      steps,
      targetSeconds: 15 + 5 * d,
      params: { mode, n, optionTags: choice.optionTags },
    };
  },
  diagnose(p, r) {
    return choiceDiagnosis(p.optionTags, r);
  },
});

/** Three distractors: prefer one zero-reading and one place-value mistake. */
function pickDistractors(
  rng: Rng,
  zeroBugs: string[],
  placeBugs: string[],
  correct: string,
  n: number,
  show: (x: number) => string,
): Array<{ text: string; tag: ErrorTag | null }> {
  const out: Array<{ text: string; tag: ErrorTag | null }> = [];
  const used = new Set([correct]);
  const add = (text: string, tag: ErrorTag | null) => {
    if (out.length < 3 && !used.has(text)) {
      used.add(text);
      out.push({ text, tag });
    }
  };
  if (zeroBugs[0]) add(zeroBugs[0], 'zero-reading');
  if (placeBugs[0]) add(placeBugs[0], 'place-value');
  for (let i = 1; i < Math.max(zeroBugs.length, placeBugs.length); i++) {
    if (zeroBugs[i]) add(zeroBugs[i], 'zero-reading');
    if (placeBugs[i]) add(placeBugs[i], 'place-value');
  }
  // Fallback: change one digit (a generic slip, not a typical error).
  const s = String(n);
  for (let guard = 0; out.length < 3 && guard < 100; guard++) {
    const i = rng.int(1, s.length - 1);
    const arr = [...s];
    arr[i] = String((Number(arr[i]) + rng.int(1, 8)) % 10);
    add(show(Number(arr.join(''))), null);
  }
  return out;
}
