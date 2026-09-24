import type { ErrorTag } from '@xuexi/shared';
import { sectionsOf } from '../chinese';
import type { Rng } from '../rng';
import type { SolutionStep } from '../types';
import {
  BLANK,
  buildChoice,
  choiceDiagnosis,
  defineGenerator,
  numOf,
  sampleUntil,
  step,
  type Diagnosis,
} from './base';

/**
 * g4.bignum.place — 计数单位、数位与数的组成（四上「数一数」「从结绳计数说起」）。
 *
 * Forms:
 *  next      10 个一万是（　）。                          choice of counting units
 *  rate      一亿里面有（　）个一千万。                   numeric (10, 100, …)
 *  position  38472000 中的「4」在（　）上。               choice of 数位 names
 *  unit      38472000 中的「4」表示 4 个（　）。          choice of 计数单位 names
 *  value     38472000 中的「4」表示（　）。               numeric
 *  compose   由 3 个亿、5 个百万和 2 个千组成的数是（　）。numeric
 *
 * Difficulty:
 *  1 next / rate between neighbouring units, position in 5~6 位数
 *  2 next up to 亿, position / unit in 7~8 位数
 *  3 100 个…是（　）, rate two places apart, value in 6~8 位数, compose within 千万
 *  4 rate 3~4 places apart (一亿里面有 10000 个一万), position / unit in 9~10 位数, compose with 亿
 *  5 compose with the parts out of order, value / position in 9~12 位数
 */

/** 数位 names, index = place (0 = 个位). */
export const PLACE_NAMES = [
  '个位',
  '十位',
  '百位',
  '千位',
  '万位',
  '十万位',
  '百万位',
  '千万位',
  '亿位',
  '十亿位',
  '百亿位',
  '千亿位',
];
/** 计数单位 as used after 「个」: 3 个亿, 5 个百万, 7 个一. */
export const UNIT_NAMES = [
  '一',
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
/** 计数单位 read on its own: 10 个一万是十万, 一亿里面有 10 个一千万. */
export const UNIT_WORDS = [
  '一',
  '十',
  '一百',
  '一千',
  '一万',
  '十万',
  '一百万',
  '一千万',
  '一亿',
  '十亿',
  '一百亿',
  '一千亿',
];

type Form = 'next' | 'rate' | 'position' | 'unit' | 'value' | 'compose';

export interface Part {
  count: number;
  place: number;
}

export interface PlaceParams {
  form: Form;
  /** position / unit / value: the number and the place of the asked digit. */
  n?: number;
  place?: number;
  /** next: 10 or 100 of `place`; rate: how many `place` units fit into `big`. */
  count?: number;
  big?: number;
  /** compose: the parts in the order they are listed. */
  parts?: Part[];
  optionTags?: Array<ErrorTag | null>;
}

const pow10 = (k: number) => 10 ** k;
const digitAt = (n: number, place: number) => Math.floor(n / pow10(place)) % 10;

function formsFor(d: number, target?: ErrorTag): Form[] {
  if (target === 'zero-reading') return ['compose'];
  if (target === 'place-value')
    return d <= 2 ? ['position', 'unit'] : ['position', 'unit', 'value'];
  return (
    [
      ['next', 'rate', 'position'],
      ['next', 'position', 'unit'],
      ['next', 'rate', 'value', 'compose'],
      ['rate', 'position', 'unit', 'compose'],
      ['compose', 'value', 'position'],
    ] as Form[][]
  )[d - 1];
}

/** Digit count of the numbers in position / unit / value questions. */
function lengthRange(d: number): [number, number] {
  return (
    [
      [5, 6],
      [7, 8],
      [6, 8],
      [9, 10],
      [9, 12],
    ] as Array<[number, number]>
  )[d - 1];
}

/** A number whose digit at `place` is non-zero and appears only once. */
function pickNumber(rng: Rng, d: number): { n: number; place: number } {
  const [lMin, lMax] = lengthRange(d);
  return sampleUntil(
    () => {
      const len = rng.int(lMin, lMax);
      let s = String(rng.int(1, 9));
      for (let i = 1; i < len; i++) s += rng.chance(0.3) ? '0' : String(rng.int(1, 9));
      // Ask about the more interesting high places (万位 and up) from difficulty 2.
      const lowest = d === 1 ? 2 : 4;
      const place = rng.int(Math.min(lowest, len - 1), len - 1);
      return { n: Number(s), place };
    },
    ({ n, place }) => {
      const s = String(n);
      const ch = s[s.length - 1 - place];
      return ch !== '0' && s.indexOf(ch) === s.lastIndexOf(ch);
    },
    'place-value number',
  );
}

function pickParts(rng: Rng, d: number, target?: ErrorTag): Part[] {
  const [topMin, topMax] = d <= 3 ? [5, 7] : d === 4 ? [8, 9] : [8, 10];
  return sampleUntil(
    () => {
      const top = rng.int(topMin, topMax);
      const k = d >= 5 ? rng.int(3, 4) : 3;
      const places = new Set([top]);
      while (places.size < k) places.add(rng.int(0, top - 1));
      const parts = [...places]
        .sort((a, b) => b - a)
        .map((place) => ({ place, count: rng.int(1, 9) }));
      return d >= 5 ? rng.shuffle(parts) : parts;
    },
    (parts) => {
      const places = parts.map((p) => p.place).sort((a, b) => b - a);
      const gaps = places[0] + 1 - places.length; // zero digits inside the number
      // Out-of-order listing at level 5 must really be out of order.
      if (d >= 5 && parts.every((p, i) => i === 0 || p.place < parts[i - 1].place)) return false;
      return gaps >= (target === 'zero-reading' || d >= 4 ? 3 : 1);
    },
    'compose parts',
  );
}

const composeValue = (parts: Part[]) => parts.reduce((s, p) => s + p.count * pow10(p.place), 0);

function listParts(parts: Part[]): string {
  const items = parts.map((p) => `${p.count} 个${UNIT_NAMES[p.place]}`);
  return items.length === 1
    ? items[0]
    : `${items.slice(0, -1).join('、')}和 ${items[items.length - 1]}`;
}

/** Steps shared by position / unit / value: find the digit in the 数位顺序表. */
function placeSteps(n: number, place: number): SolutionStep[] {
  const digit = digitAt(n, place);
  const order = PLACE_NAMES.slice(0, place + 1).join('、');
  return [
    step('先从右往左四位一级分级：', sectionsOf(n).join(' | ')),
    step(`「${digit}」从右往左数是第 ${place + 1} 位。数位顺序表从右往左是：${order}。`),
    step(
      `所以「${digit}」在${PLACE_NAMES[place]}上，${PLACE_NAMES[place]}的计数单位是「${UNIT_NAMES[place]}」，` +
        `表示 ${digit} 个${UNIT_NAMES[place]}。`,
      `${digit} 个${UNIT_NAMES[place]} = ${digit * pow10(place)}`,
    ),
  ];
}

export const g4BignumPlace = defineGenerator<PlaceParams>({
  id: 'g4.bignum.place',
  variants: ['mixed'],
  targets: ['place-value', 'zero-reading'],
  feedback: {
    'place-value': '先从右往左数一数这是第几位，再对照数位顺序表：个、十、百、千、万、十万……',
    'zero-reading': '哪一位上一个单位也没有，就写 0 占位；写完数一数一共有几位。',
  },
  build({ difficulty: d, target, rng }) {
    const form = rng.pick(formsFor(d, target));
    switch (form) {
      case 'next': {
        const count = d >= 3 ? rng.pick([10, 100]) : 10;
        const gap = count === 10 ? 1 : 2;
        const place = rng.int(3, (d === 1 ? 6 : 8) - gap);
        const answer = place + gap;
        const distractors = [answer + 1, answer - 1, answer + 2]
          .filter((k) => k > place && k < UNIT_WORDS.length && k !== answer)
          .map((k) => ({ text: UNIT_WORDS[k], tag: 'place-value' as ErrorTag }));
        distractors.push({ text: PLACE_NAMES[answer], tag: 'place-value' });
        const choice = buildChoice(rng, UNIT_WORDS[answer], distractors.slice(-3));
        return {
          widget: 'choice',
          prompt: `${count} 个${UNIT_WORDS[place]}是${BLANK}。`,
          options: choice.options,
          answer: { type: 'choice', index: choice.index },
          hint: '相邻两个计数单位之间的进率都是十。',
          steps: [
            step('相邻两个计数单位之间的进率都是十。'),
            ...Array.from({ length: gap }, (_, i) =>
              step(`10 个${UNIT_WORDS[place + i]}是${UNIT_WORDS[place + i + 1]}。`),
            ),
            step('所以', `${count} 个${UNIT_WORDS[place]}是${UNIT_WORDS[answer]}`),
          ],
          targetSeconds: 10,
          params: { form, place, count, optionTags: choice.optionTags },
        };
      }
      case 'rate': {
        const gap = d <= 2 ? 1 : d === 3 ? 2 : rng.int(3, 4);
        const big = rng.int(Math.max(4, 3 + gap), 8);
        const place = big - gap;
        return {
          widget: 'numeric',
          prompt: `${UNIT_WORDS[big]}里面有${BLANK}个${UNIT_WORDS[place]}。`,
          answer: { type: 'number', value: pow10(gap) },
          hint: '相邻两个计数单位之间的进率是十，数一数相差几位。',
          steps: [
            step(
              `从${UNIT_NAMES[place]}到${UNIT_NAMES[big]}：${UNIT_NAMES.slice(place, big + 1).join(' → ')}，每进一位都是十倍。`,
            ),
            step(`相差 ${gap} 位，就是 ${gap} 个十相乘。`),
            step('所以', `${UNIT_WORDS[big]} = ${pow10(gap)} 个${UNIT_WORDS[place]}`),
          ],
          targetSeconds: 12,
          params: { form, big, place, count: pow10(gap) },
        };
      }
      case 'position':
      case 'unit': {
        const { n, place } = pickNumber(rng, d);
        const digit = digitAt(n, place);
        const names = form === 'position' ? PLACE_NAMES : UNIT_NAMES;
        const near = [place - 1, place + 1, place + 2, place - 2].filter(
          (k) => k >= 0 && k < names.length,
        );
        const distractors = near
          .slice(0, form === 'position' ? 3 : 2)
          .map((k) => ({ text: names[k], tag: 'place-value' as ErrorTag }));
        // 数位 vs 计数单位: "表示 4 个十万位".
        if (form === 'unit') distractors.push({ text: PLACE_NAMES[place], tag: 'place-value' });
        const choice = buildChoice(rng, names[place], distractors);
        return {
          widget: 'choice',
          prompt:
            form === 'position'
              ? `${n} 中的「${digit}」在${BLANK}上。`
              : `${n} 中的「${digit}」表示 ${digit} 个${BLANK}。`,
          options: choice.options,
          answer: { type: 'choice', index: choice.index },
          hint: '从右往左四位一级分好级，再对照数位顺序表数一数。',
          steps: placeSteps(n, place),
          targetSeconds: 12 + 2 * d,
          params: { form, n, place, optionTags: choice.optionTags },
        };
      }
      case 'value': {
        const { n, place } = pickNumber(rng, d);
        const digit = digitAt(n, place);
        return {
          widget: 'numeric',
          prompt: `${n} 中的「${digit}」表示${BLANK}。`,
          answer: { type: 'number', value: digit * pow10(place) },
          hint: '先找出这个数字在哪一位上，再想这一位的计数单位是什么。',
          steps: placeSteps(n, place),
          targetSeconds: 15 + 2 * d,
          params: { form, n, place },
        };
      }
      case 'compose': {
        const parts = pickParts(rng, d, target);
        const value = composeValue(parts);
        const top = Math.max(...parts.map((p) => p.place));
        const digits = Array.from({ length: top + 1 }, (_, i) => top - i).map(
          (k) => `${PLACE_NAMES[k]} ${parts.find((p) => p.place === k)?.count ?? 0}`,
        );
        return {
          widget: 'numeric',
          prompt: `由 ${listParts(parts)}组成的数是${BLANK}。`,
          answer: { type: 'number', value },
          hint: '最高位是哪一位？从最高位写起，哪一位上一个单位也没有就写 0。',
          steps: [
            step(`最高的计数单位是「${UNIT_NAMES[top]}」，所以这是一个 ${top + 1} 位数。`),
            step(`按数位顺序表从高到低写，没有的数位写 0：${digits.join('，')}。`),
            step('所以', `这个数是 ${value}`),
          ],
          targetSeconds: 20 + 5 * d,
          params: { form, parts },
        };
      }
    }
  },
  diagnose(p, r) {
    if (p.optionTags) return choiceDiagnosis(p.optionTags, r);
    const x = numOf(r);
    if (x === null) return { tags: [] };
    const tags: Diagnosis['tags'] = [];
    switch (p.form) {
      case 'rate': {
        // Counted the places wrong: 10 / 1000 instead of 100, or wrote the gap itself.
        const gap = Math.round(Math.log10(p.count!));
        if ([0, 1, 2, 3, 4, 5].some((k) => k !== gap && x === pow10(k)) || x === gap)
          tags.push('place-value');
        return { tags };
      }
      case 'value': {
        const digit = digitAt(p.n!, p.place!);
        // The digit with the wrong number of zeros, i.e. read at another place.
        if (PLACE_NAMES.some((_, k) => k !== p.place && x === digit * pow10(k)))
          tags.push('place-value');
        return { tags };
      }
      case 'compose': {
        const parts = p.parts!;
        const value = composeValue(parts);
        const concat = Number(
          [...parts]
            .sort((a, b) => b.place - a.place)
            .map((q) => q.count)
            .join(''),
        );
        const s = String(value);
        const zeroSlips = new Set<number>();
        for (let i = 1; i < s.length; i++) {
          if (s[i] !== '0') continue;
          zeroSlips.add(Number(s.slice(0, i) + s.slice(i + 1))); // one 0 too few
          zeroSlips.add(Number(s.slice(0, i) + '0' + s.slice(i))); // one 0 too many
        }
        if (x === concat || zeroSlips.has(x)) tags.push('zero-reading');
        // One part written one place too high or too low.
        const shifted = parts.some((q) =>
          [q.place - 1, q.place + 1].some(
            (k) =>
              k >= 0 &&
              !parts.some((o) => o.place === k) &&
              x === value - q.count * pow10(q.place) + q.count * pow10(k),
          ),
        );
        if (shifted) tags.push('place-value');
        return { tags };
      }
      default:
        return { tags };
    }
  },
});
