import { roundTo } from '../arith';
import type { Rng } from '../rng';
import type { SolutionStep } from '../types';
import {
  BLANK,
  defineGenerator,
  numOf,
  sampleUntil,
  step,
  type Diagnosis,
  type Draft,
} from './base';

/**
 * g4.bignum.rewrite — 改写成以「万 / 亿」作单位（准确数），以及四舍五入求近似数。
 * 四上还没有学小数，所以改写题的数都能整除，近似数都是整数。
 *
 * Forms:
 *  rw-wan     340000 = ( )万                      (exact)
 *  rw-yi      1200000000 = ( )亿                  (exact)
 *  ap-wan     345800 ≈ ( )万   省略万位后面的尾数
 *  ap-yi      省略亿位后面的尾数
 *  ap-shiwan  3460000 ≈ ( )万  四舍五入到十万位（易与改写混淆）
 *
 * Difficulty:
 *  1 rw-wan, k 2~3 位
 *  2 rw-wan / rw-yi / 简单的 ap-wan（尾数最高位不是 4、5）
 *  3 ap-wan / ap-yi，尾数最高位是 4 或 5（临界）
 *  4 ap 带连续进位（399600 ≈ 40万）/ ap-shiwan
 *  5 改写与近似混合：rw-wan（k 末位不是 0）/ ap-shiwan / 进位的 ap-yi
 *
 * 快速推理 (difficulty 4–5, form ap-range): 一个五位数省略万位后面的尾数约是 5 万，
 * 这个数最大是（　）→ 54999（四舍：千位最大填 4，后面全填 9）；最小是（　）→ 45000
 * （五入：万位少 1，千位填 5，后面全填 0）。Difficulty 5 also asks about 亿.
 */

type Form = 'rw-wan' | 'rw-yi' | 'ap-wan' | 'ap-yi' | 'ap-shiwan';

export interface RewriteParams {
  form: Form | 'ap-range';
  n: number;
  /** ap-range: the rounded value is `n` 万 / 亿; asks for the largest or smallest number. */
  range?: { unit: '万' | '亿'; want: 'max' | 'min'; digits: number };
}

const CN_COUNT = '零一二三四五六七八九十';

export function rangeAnswer(k: number, unit: '万' | '亿', want: 'max' | 'min'): number {
  const u = unit === '万' ? WAN : YI;
  return want === 'max' ? k * u + u / 2 - 1 : k * u - u / 2;
}

const WAN = 10_000;
const YI = 100_000_000;

export function rewriteAnswer(form: Form, n: number): number {
  switch (form) {
    case 'rw-wan':
      return n / WAN;
    case 'rw-yi':
      return n / YI;
    case 'ap-wan':
      return roundTo(n, WAN) / WAN;
    case 'ap-yi':
      return roundTo(n, YI) / YI;
    case 'ap-shiwan':
      return roundTo(n, 10 * WAN) / WAN;
  }
}

/** Digit right below the rounding place. */
function decidingDigit(form: Form, n: number): number {
  const unit = form === 'ap-yi' ? YI : form === 'ap-shiwan' ? 10 * WAN : WAN;
  return Math.floor(n / (unit / 10)) % 10;
}

function pick(rng: Rng, d: number, form: Form): number {
  const tail = (unit: number, digit: number) => digit * (unit / 10) + rng.int(0, unit / 10 - 1);
  switch (form) {
    case 'rw-wan': {
      const k = d === 1 ? rng.int(2, 999) : d >= 5 ? rng.int(101, 9999) : rng.int(12, 9999);
      return k * WAN;
    }
    case 'rw-yi':
      return (d >= 5 ? rng.int(101, 999) : rng.int(2, 99)) * YI;
    case 'ap-wan':
    case 'ap-yi':
    case 'ap-shiwan': {
      const unit = form === 'ap-yi' ? YI : form === 'ap-shiwan' ? 10 * WAN : WAN;
      const kMax = form === 'ap-yi' ? 999 : form === 'ap-shiwan' ? 99 : 9999;
      let k = rng.int(form === 'ap-yi' ? 1 : 10, kMax);
      let digit: number;
      if (d <= 2) digit = rng.pick([0, 1, 2, 3, 6, 7, 8, 9]);
      else if (d === 3) digit = rng.pick([4, 5]);
      else {
        digit = rng.int(5, 9);
        // 连续进位: k ends with 9 / 99.
        k = Math.floor(k / 10) * 10 + 9;
        if (k > kMax) k = kMax;
      }
      return k * unit + tail(unit, digit);
    }
  }
}

function formsFor(d: number, target?: string): Array<Form | 'ap-range'> {
  if (target === 'rewrite-vs-approx') return ['rw-wan', 'ap-shiwan'];
  if (target === 'rounding') return ['ap-wan', 'ap-yi'];
  return [
    ['rw-wan'],
    ['rw-wan', 'rw-yi', 'ap-wan'],
    ['ap-wan', 'ap-yi'],
    ['ap-wan', 'ap-yi', 'ap-shiwan', 'ap-range'],
    ['rw-wan', 'ap-shiwan', 'ap-yi', 'ap-range'],
  ][d - 1] as Array<Form | 'ap-range'>;
}

function stepsFor(form: Form, n: number, ans: number): SolutionStep[] {
  if (form === 'rw-wan' || form === 'rw-yi') {
    const zeros = form === 'rw-wan' ? 4 : 8;
    const u = form === 'rw-wan' ? '万' : '亿';
    return [
      step(`改写成以「${u}」作单位，数的大小不变，用「=」。`),
      step(
        `${form === 'rw-wan' ? '个级' : '万级和个级'}都是 0，把这末尾的 ${zeros} 个 0 去掉，再添上「${u}」字。`,
      ),
      step('所以', `${n} = ${ans}${u}`),
    ];
  }
  const dig = decidingDigit(form, n);
  const [place, below, u] =
    form === 'ap-wan'
      ? ['万位', '千位', '万']
      : form === 'ap-yi'
        ? ['亿位', '千万位', '亿']
        : ['十万位', '万位', '万'];
  const up = dig >= 5;
  return [
    step(
      `求近似数用「≈」。${form === 'ap-shiwan' ? '四舍五入到十万位' : `省略${place}后面的尾数`}，要看${below}上的数。`,
    ),
    step(
      `${below}上是 ${dig}，${up ? `${dig} ≥ 5，向${place}进 1（五入）` : `${dig} < 5，直接舍去（四舍）`}。`,
    ),
    step('所以', `${n} ≈ ${ans}${u}`),
  ];
}

function buildRange(rng: Rng, d: number): Draft<RewriteParams> {
  const unit = d >= 5 && rng.chance(0.4) ? '亿' : '万';
  // 五位数 / 六位数 (万) or 九位数 (亿); k keeps both extremes at the same digit count.
  const digits = unit === '亿' ? 9 : rng.pick([5, 6]);
  const k = digits === 6 ? rng.int(11, 99) : rng.int(2, 9);
  const want = rng.pick(['max', 'min'] as const);
  const answer = rangeAnswer(k, unit, want);
  const below = unit === '万' ? '千位' : '千万位';
  return {
    widget: 'numeric',
    prompt:
      `一个${CN_COUNT[digits]}位数，省略${unit}位后面的尾数约是 ${k} ${unit}，` +
      `这个数最${want === 'max' ? '大' : '小'}是${BLANK}。`,
    answer: { type: 'number', value: answer },
    hint: '想一想：最大的数是“四舍”得到的，还是“五入”得到的？',
    steps:
      want === 'max'
        ? [
            step(`求最大，要用“四舍”：舍去尾数后，还是 ${k} 个${unit}。`),
            step(`${below}上最大只能填 4，后面的数位全都填 9。`),
            step('所以', `最大是 ${answer}，${answer} ≈ ${k}${unit}`),
          ]
        : [
            step(
              `求最小，要用“五入”：五入以后才变成 ${k} 个${unit}，说明原来是 ${k - 1} 个${unit}。`,
            ),
            step(`${below}上最小填 5，后面的数位全都填 0。`),
            step('所以', `最小是 ${answer}，${answer} ≈ ${k}${unit}`),
          ],
    targetSeconds: 30,
    params: { form: 'ap-range', n: k, range: { unit, want, digits } },
  };
}

export const g4BignumRewrite = defineGenerator<RewriteParams>({
  id: 'g4.bignum.rewrite',
  variants: ['mixed', 'rewrite', 'approx'],
  targets: ['rewrite-vs-approx', 'rounding'],
  build({ difficulty: d, variant, target, rng }) {
    let forms = formsFor(d, target);
    if (variant === 'rewrite') forms = d <= 1 ? ['rw-wan'] : ['rw-wan', 'rw-yi'];
    if (variant === 'approx') forms = forms.filter((f) => f.startsWith('ap'));
    if (forms.length === 0) forms = d <= 2 ? ['ap-wan'] : ['ap-wan', 'ap-yi'];
    const picked = rng.pick(forms);
    if (picked === 'ap-range') return buildRange(rng, d);
    const form = picked;
    const n = sampleUntil(
      () => pick(rng, d, form),
      (x) => {
        if (form === 'ap-wan' || form === 'ap-yi') return x % (form === 'ap-yi' ? YI : WAN) !== 0;
        if (form === 'ap-shiwan') return Math.floor(x / WAN) % 10 !== 0;
        if (form === 'rw-wan' && d >= 2) return (x / WAN) % 10 !== 0; // k keeps a non-zero 万位 so rounding differs
        return true;
      },
      'rewrite number',
    );
    const ans = rewriteAnswer(form, n);
    const prompt = {
      'rw-wan': `把 ${n} 改写成用「万」作单位的数：${n} = ${BLANK}万`,
      'rw-yi': `把 ${n} 改写成用「亿」作单位的数：${n} = ${BLANK}亿`,
      'ap-wan': `省略万位后面的尾数，求近似数：${n} ≈ ${BLANK}万`,
      'ap-yi': `省略亿位后面的尾数，求近似数：${n} ≈ ${BLANK}亿`,
      'ap-shiwan': `把 ${n} 四舍五入到十万位：${n} ≈ ${BLANK}万`,
    }[form];
    return {
      widget: 'numeric',
      prompt,
      answer: { type: 'number', value: ans },
      hint: form.startsWith('rw')
        ? '改写用「=」，数的大小不变。'
        : '求近似数要看省略部分的最高位，四舍五入。',
      steps: stepsFor(form, n, ans),
      targetSeconds: form.startsWith('rw') ? 15 : 20,
      params: { form, n },
    };
  },
  diagnose({ form, n, range }, r) {
    const x = numOf(r);
    if (x === null) return { tags: [] };
    if (form === 'ap-range') {
      if (!range) return { tags: [] };
      const u = range.unit === '万' ? WAN : YI;
      // Any number near n 万 that is not the extreme: 四舍 / 五入 boundary not worked out.
      if (Math.abs(x - n * u) <= u)
        return {
          tags: ['rounding'],
          feedback:
            range.want === 'max'
              ? '求最大要用“四舍”：看的那一位最大填 4，后面全填 9。'
              : '求最小要用“五入”：前一位少 1，看的那一位填 5，后面全填 0。',
        };
      return { tags: [] };
    }
    const tags: Diagnosis['tags'] = [];
    const ans = rewriteAnswer(form, n);
    if (form === 'rw-wan' || form === 'rw-yi') {
      const k = ans;
      // Answered with a rounded number although an exact rewrite was asked.
      if ([roundTo(k, 10), roundTo(k, 100), roundTo(k, 1000)].some((v) => v === x && v !== k))
        tags.push('rewrite-vs-approx');
      return { tags };
    }
    const unit = form === 'ap-yi' ? YI : WAN;
    const exact = n / unit;
    if (form === 'ap-shiwan') {
      if (x === Math.floor(exact) || x === Math.ceil(exact)) tags.push('rewrite-vs-approx'); // 只改写到万，没有求近似
      const tens = Math.floor(n / (10 * WAN)) * 10;
      if ((x === tens || x === tens + 10) && x !== ans) tags.push('rounding');
      return { tags };
    }
    if ((x === Math.floor(exact) || x === Math.floor(exact) + 1) && x !== ans)
      tags.push('rounding');
    if (x === roundTo(n, 10 * unit) / unit && x !== ans) tags.push('rounding'); // rounded at the wrong place
    return { tags };
  },
});
