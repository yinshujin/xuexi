import type { Rng } from '../rng';
import type { SolutionStep } from '../types';
import { BLANK, defineGenerator, numOf, sampleUntil, step } from './base';

/**
 * g4.bignum.compare — 大数比较大小（compare widget）。
 *
 * Difficulty:
 *  1 位数不同
 *  2 位数相同，最高位不同
 *  3 位数相同，前几位相同，中间某一位不同
 *  4 「350万 ○ 3490000」一边带单位，或 8~10 位中间有 0 的数
 *  5 「2亿 ○ 19999万」单位不同 / 相等的情况「35万 ○ 350000」
 *
 * From difficulty 4 about a third of the questions are 快速推理 instead:
 * 「58□300 < 584000，□ 里最大能填几？」(numeric). The digits before □ match, so □ is
 * compared with one digit; whether that digit itself works depends on the digits after.
 */

export interface Side {
  /** Numeric part as displayed. */
  k: number;
  unit: '' | '万' | '亿';
}

export interface CompareParams {
  left: Side;
  right: Side;
  /** Set for 「□ 里最大 / 最小能填几」 questions (then left / right are unused). */
  blank?: BlankParams;
}

export interface BlankParams {
  /** Left number with 「□」 in it, e.g. "58□300". */
  a: string;
  op: '<' | '>';
  b: number;
  answer: number;
}

type Cmp = '<' | '>' | '=';

const UNIT: Record<Side['unit'], number> = { '': 1, 万: 10_000, 亿: 100_000_000 };

export const sideValue = (s: Side) => s.k * UNIT[s.unit];
export const sideText = (s: Side) => `${s.k}${s.unit}`;

function cmp(a: number, b: number): Cmp {
  return a < b ? '<' : a > b ? '>' : '=';
}

function randomDigits(rng: Rng, len: number, pz = 0.25): string {
  let s = String(rng.int(1, 9));
  for (let i = 1; i < len; i++) s += rng.chance(pz) ? '0' : String(rng.int(0, 9));
  return s;
}

function build(rng: Rng, d: number): CompareParams {
  const plain = (k: number): Side => ({ k, unit: '' });
  switch (d) {
    case 1: {
      const l1 = rng.int(5, 8);
      let l2 = rng.int(5, 8);
      if (l2 === l1) l2 = l1 === 8 ? 7 : l1 + 1;
      return {
        left: plain(Number(randomDigits(rng, l1))),
        right: plain(Number(randomDigits(rng, l2))),
      };
    }
    case 2: {
      const len = rng.int(6, 8);
      const a = randomDigits(rng, len);
      let b = randomDigits(rng, len);
      if (b[0] === a[0]) b = String(((Number(a[0]) + rng.int(1, 8) - 1) % 9) + 1) + b.slice(1);
      return { left: plain(Number(a)), right: plain(Number(b)) };
    }
    case 3: {
      const len = rng.int(7, 8);
      const a = randomDigits(rng, len);
      const i = rng.int(2, len - 2);
      const b =
        a.slice(0, i) +
        String((Number(a[i]) + rng.int(1, 9)) % 10) +
        randomDigits(rng, len - i - 1 + 1).slice(1);
      return { left: plain(Number(a)), right: plain(Number(b)) };
    }
    case 4: {
      if (rng.chance(0.5)) {
        const k = rng.int(12, 999);
        const near = k * 10_000 + rng.int(-9_999, 9_999);
        const [l, r] = rng.chance(0.5)
          ? [{ k, unit: '万' as const }, plain(near)]
          : [plain(near), { k, unit: '万' as const }];
        return { left: l, right: r };
      }
      const len = rng.int(8, 10);
      const a = randomDigits(rng, len, 0.4);
      const i = rng.int(3, len - 2);
      const b =
        a.slice(0, i) +
        String((Number(a[i]) + rng.int(1, 9)) % 10) +
        randomDigits(rng, len - i, 0.4).slice(1);
      return { left: plain(Number(a)), right: plain(Number(b)) };
    }
    default: {
      const kind = rng.int(0, 2);
      if (kind === 0) {
        const y = rng.int(1, 9);
        const w = y * 10_000 + rng.int(-99, 99) * (rng.chance(0.5) ? 1 : 10);
        return rng.chance(0.5)
          ? { left: { k: y, unit: '亿' }, right: { k: w, unit: '万' } }
          : { left: { k: w, unit: '万' }, right: { k: y, unit: '亿' } };
      }
      if (kind === 1) {
        const k = rng.int(12, 9999);
        return rng.chance(0.5)
          ? { left: { k, unit: '万' }, right: plain(k * 10_000) }
          : { left: plain(k * 10_000), right: { k, unit: '万' } };
      }
      const k = rng.int(12, 999);
      const near =
        k * 10_000 + rng.int(1, 9) * (rng.chance(0.5) ? 1 : -1) * rng.pick([1, 10, 100, 1000]);
      return { left: { k, unit: '万' }, right: plain(near) };
    }
  }
}

const PLACE = ['个', '十', '百', '千', '万', '十万', '百万', '千万', '亿', '十亿', '百亿', '千亿'];

function buildBlank(rng: Rng, d: number): BlankParams {
  return sampleUntil(
    () => {
      const len = d <= 4 ? rng.int(6, 7) : rng.int(7, 9);
      const b = randomDigits(rng, len);
      const pos = rng.int(1, len - 2);
      const after = String(rng.int(0, 10 ** (len - pos - 1) - 1)).padStart(len - pos - 1, '0');
      const op = rng.pick(['<', '>'] as const);
      const digit = Number(b[pos]);
      const rest = b.slice(pos + 1);
      // With □ = digit the numbers only differ after □.
      const equalWorks = op === '<' ? after < rest : after > rest;
      const answer = op === '<' ? (equalWorks ? digit : digit - 1) : equalWorks ? digit : digit + 1;
      return { a: b.slice(0, pos) + '□' + after, op, b: Number(b), answer };
    },
    (x) => {
      // The digits after □ must differ, otherwise □ = digit makes the numbers equal.
      const pos = x.a.indexOf('□');
      return x.answer >= 0 && x.answer <= 9 && x.a.slice(pos + 1) !== String(x.b).slice(pos + 1);
    },
    'blank compare',
  );
}

function blankSteps(p: BlankParams): SolutionStep[] {
  const b = String(p.b);
  const pos = p.a.indexOf('□');
  const digit = Number(b[pos]);
  const place = PLACE[b.length - 1 - pos];
  const withDigit = Number(p.a.replace('□', String(digit)));
  const ok = p.op === '<' ? withDigit < p.b : withDigit > p.b;
  const most = p.op === '<' ? '大' : '小';
  return [
    step(
      `两个数都是 ${b.length} 位数${pos > 0 ? `，前 ${pos} 位都相同` : ''}，所以先比${place}位：□ 和 ${digit}。`,
    ),
    step(`□ 比 ${digit} ${p.op === '<' ? '小' : '大'}时，一定成立。`),
    step(
      `□ 填 ${digit} 时，${withDigit} ${withDigit < p.b ? '<' : '>'} ${p.b}，${ok ? '也成立' : '不成立'}。`,
    ),
    step('所以', `□ 里最${most}能填 ${p.answer}`),
  ];
}

function explain(p: CompareParams): SolutionStep[] {
  const L = sideValue(p.left);
  const R = sideValue(p.right);
  const out: SolutionStep[] = [];
  const withUnit = [p.left, p.right].filter((s) => s.unit);
  if (withUnit.length > 0) {
    out.push(
      step(
        '单位不同，先化成没有单位的数：',
        withUnit.map((s) => `${sideText(s)} = ${sideValue(s)}`).join('，'),
      ),
    );
  }
  const a = String(L);
  const b = String(R);
  if (a.length !== b.length) {
    out.push(step(`${L} 是 ${a.length} 位数，${R} 是 ${b.length} 位数，位数多的数大。`));
  } else if (a === b) {
    out.push(step('两个数完全一样，所以相等。'));
  } else {
    const i = [...a].findIndex((c, j) => c !== b[j]);
    const names = [
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
    out.push(
      step(
        `位数相同，从最高位比起${i > 0 ? `，前 ${i} 位都相同` : ''}，${names[a.length - 1 - i]}位上 ${a[i]} ${a[i] > b[i] ? '>' : '<'} ${b[i]}。`,
      ),
    );
  }
  out.push(step('所以', `${sideText(p.left)} ${cmp(L, R)} ${sideText(p.right)}`));
  return out;
}

export const g4BignumCompare = defineGenerator<CompareParams>({
  id: 'g4.bignum.compare',
  variants: ['default'],
  targets: ['place-value'],
  build({ difficulty: d, target, rng }) {
    const level = target === 'place-value' ? Math.max(d, 4) : d;
    if (level >= 4 && rng.chance(0.35)) {
      const blank = buildBlank(rng, level);
      return {
        widget: 'numeric',
        prompt: `${blank.a} ${blank.op} ${blank.b}，□ 里最${blank.op === '<' ? '大' : '小'}能填几？${BLANK}`,
        answer: { type: 'number', value: blank.answer },
        hint: '先找出 □ 要和哪一位上的数字比，再试一试 □ 等于这个数字时行不行。',
        steps: blankSteps(blank),
        targetSeconds: 25,
        params: { left: { k: 0, unit: '' }, right: { k: 0, unit: '' }, blank },
      };
    }
    const p = sampleUntil(
      () => build(rng, level),
      (x) => {
        const L = sideValue(x.left);
        const R = sideValue(x.right);
        if (L <= 0 || R <= 0) return false;
        if (level <= 4 && L === R) return false;
        if (level === 3 || level === 2) return String(L).length === String(R).length;
        return true;
      },
      'compare pair',
    );
    const ans = cmp(sideValue(p.left), sideValue(p.right));
    return {
      widget: 'compare',
      prompt: `比较大小：${sideText(p.left)} ○ ${sideText(p.right)}`,
      answer: { type: 'compare', value: ans },
      hint:
        p.left.unit || p.right.unit
          ? '单位不同时，先化成相同的单位再比。'
          : '先比位数，位数相同再从最高位比起。',
      steps: explain(p),
      targetSeconds: 8 + 2 * d,
      params: p,
    };
  },
  diagnose(p, r) {
    if (p.blank) {
      const x = numOf(r);
      // Off by one at the boundary: the equal digit was not checked (or wrongly ruled out).
      if (x !== null && Math.abs(x - p.blank.answer) === 1)
        return {
          tags: ['place-value'],
          feedback: '□ 等于那一位的数字时，前面都一样，要接着往后比，看看行不行。',
        };
      return { tags: [] };
    }
    if (r.type !== 'compare' || r.value === null) return { tags: [] };
    const x = r.value;
    const a = String(p.left.k);
    const b = String(p.right.k);
    const buggy: Cmp[] = [
      // Comparing digit strings from the left without looking at the number of digits.
      a < b ? '<' : a > b ? '>' : '=',
      // Ignoring the units 万 / 亿.
      cmp(p.left.k, p.right.k),
      // Comparing only the first digit.
      cmp(Number(a[0]), Number(b[0])),
    ];
    return { tags: buggy.includes(x) ? ['place-value'] : [] };
  },
});
