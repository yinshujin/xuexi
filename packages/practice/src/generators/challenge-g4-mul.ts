import type { ErrorTag } from '@xuexi/shared';
import { MINUS } from '../arith';
import type { Rng } from '../rng';
import { step } from './base';
import type { ChallengeTemplate } from './challenge';
import { shuffledOptions } from './challenge';
import {
  choiceParts,
  evalText,
  num,
  onlyOption,
  optionIndex,
  type ChoiceParams,
} from './challenge-g4-util';

/**
 * 四年级上册 乘法与运算律：
 *   mul    — 三位数乘两位数（积的变化、竖式填数、卡片组数、积末尾的 0、找错、找规律）
 *   mulest — 乘法估算（够不够、估大估小、谁估得更接近）
 *   order  — 混合运算的顺序与中括号
 *   law    — 加法交换律、加法结合律、乘法交换律
 *   lawmul — 乘法结合律、乘法分配律
 */

// ---------------------------------------------------------------- mul · 拔高

type ChangeMode = 'mulA' | 'mulB' | 'both10' | 'divA';

/** 已知 125 × 24 = 3000，写出 250 × 24 的积。 */
const productChange: ChallengeTemplate<{ a: number; b: number; mode: ChangeMode; k: number }> = {
  id: 'mul.product-change',
  family: 'mul',
  tier: 'stretch',
  make(rng) {
    const mode = rng.pick<ChangeMode>(['mulA', 'mulB', 'both10', 'divA']);
    if (mode === 'divA') {
      const k = rng.pick([2, 3, 4, 5]);
      return {
        a: k * rng.int(Math.ceil(100 / k) + 5, Math.floor(999 / k)),
        b: rng.int(12, 98),
        mode,
        k,
      };
    }
    const k = mode === 'both10' ? 10 : rng.pick([2, 3, 10]);
    return { a: rng.int(101, 499), b: rng.int(12, 49), mode, k };
  },
  render({ a, b, mode, k }) {
    const p = a * b;
    const [x, y, ans, how] =
      mode === 'mulA'
        ? [a * k, b, p * k, `第一个因数乘 ${k}，另一个因数不变，积也乘 ${k}`]
        : mode === 'mulB'
          ? [a, b * k, p * k, `第二个因数乘 ${k}，另一个因数不变，积也乘 ${k}`]
          : mode === 'both10'
            ? [a * 10, b * 10, p * 100, '两个因数都乘 10，积就乘 10 × 10 = 100']
            : [a / k, b, p / k, `第一个因数除以 ${k}，另一个因数不变，积也除以 ${k}`];
    return {
      widget: 'numeric',
      prompt: `已知 ${a} × ${b} = ${p}。不用竖式，直接写出 ${x} × ${y} 的积。`,
      answer: num(ans),
      hint: '比一比两个算式：哪个因数变了？变成了原来的几倍？',
      steps: [step(`${x} × ${y} 和 ${a} × ${b} 比：${how}。`), step(`${x} × ${y} = ${ans}`)],
      targetSeconds: 60,
    };
  },
  solve({ a, b, mode, k }) {
    const x = mode === 'mulA' ? a * k : mode === 'both10' ? a * 10 : mode === 'divA' ? a / k : a;
    const y = mode === 'mulB' ? b * k : mode === 'both10' ? b * 10 : b;
    return num(x * y);
  },
};

/** 竖式填数：3□5 × 24 = 8520，□ 里填几？ */
const missingDigit: ChallengeTemplate<{ a: number; b: number; where: 'a100' | 'a10' | 'b10' }> = {
  id: 'mul.missing-digit',
  family: 'mul',
  tier: 'stretch',
  make(rng) {
    return {
      a: rng.int(102, 989),
      b: rng.int(12, 98),
      where: rng.pick(['a100', 'a10', 'b10'] as const),
    };
  },
  render({ a, b, where }) {
    const p = a * b;
    const sa = String(a);
    const sb = String(b);
    const [shownA, shownB, digit] =
      where === 'a100'
        ? [`□${sa.slice(1)}`, sb, Number(sa[0])]
        : where === 'a10'
          ? [`${sa[0]}□${sa[2]}`, sb, Number(sa[1])]
          : [sa, `□${sb[1]}`, Number(sb[0])];
    const low = digit - 1;
    const tryLow =
      low < (where === 'a10' ? 0 : 1)
        ? null
        : where === 'a100'
          ? `${low}${sa.slice(1)} × ${sb}`
          : where === 'a10'
            ? `${sa[0]}${low}${sa[2]} × ${sb}`
            : `${sa} × ${low}${sb[1]}`;
    return {
      widget: 'numeric',
      prompt: `${shownA} × ${shownB} = ${p}，□ 里填几？`,
      answer: num(digit),
      hint: '先估一估 □ 大约是几，再把这个数填进去算一算，看积是不是正好相等；大了就改小，小了就改大。',
      steps: [
        ...(tryLow !== null
          ? [step(`试 □ = ${digit - 1}：${tryLow} = ${evalText(tryLow)}，比 ${p} 小。`)]
          : []),
        step(`试 □ = ${digit}：${a} × ${b} = ${p}，正好相等。`),
        step(`所以 □ 里填 ${digit}。`),
      ],
      targetSeconds: 120,
    };
  },
  solve({ a, b, where }) {
    const p = a * b;
    const hits: number[] = [];
    for (let d = where === 'a10' ? 0 : 1; d <= 9; d++) {
      const x =
        where === 'a100'
          ? d * 100 + (a % 100)
          : where === 'a10'
            ? a - (Math.floor(a / 10) % 10) * 10 + d * 10
            : a;
      const y = where === 'b10' ? d * 10 + (b % 10) : b;
      if (x * y === p) hits.push(d);
    }
    if (hits.length !== 1) throw new Error('digit not unique');
    return num(hits[0]);
  },
};

/** 五张数字卡片组成三位数 × 两位数，积最大是多少？ */
const maxProduct: ChallengeTemplate<{ cards: number[] }> = {
  id: 'mul.max-product',
  family: 'mul',
  tier: 'stretch',
  minDifficulty: 3,
  make(rng) {
    return {
      cards: rng
        .shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])
        .slice(0, 5)
        .sort((x, y) => x - y),
    };
  },
  render({ cards }) {
    const [d5, d4, d3, d2, d1] = cards; // d1 largest
    const two = d1 * 10 + d4;
    const three = d2 * 100 + d3 * 10 + d5;
    return {
      widget: 'numeric',
      prompt: `用 ${cards.join('、')} 这五张数字卡片组成一个三位数和一个两位数（每张用一次），使它们的积最大。最大的积是多少？`,
      answer: num(two * three),
      hint: '大的数字要放在高位。最大的两个数字分别放在两个数的最高位，再试一试剩下的数字怎么放。',
      steps: [
        step(`最大的 ${d1} 和 ${d2} 放在两个数的最高位。`),
        step(
          `两位数的十位比三位数的百位“更值钱”：把 ${d1} 给两位数，接下来较大的数字先配给三位数。`,
        ),
        step(`比一比几种摆法，最大的是 ${three} × ${two}。`),
        step(`${three} × ${two} = ${two * three}`),
      ],
      targetSeconds: 240,
    };
  },
  solve({ cards }) {
    let best = 0;
    const perm = (rest: number[], cur: number[]) => {
      if (rest.length === 0) {
        const three = cur[0] * 100 + cur[1] * 10 + cur[2];
        const two = cur[3] * 10 + cur[4];
        best = Math.max(best, three * two);
        return;
      }
      rest.forEach((d, i) => perm([...rest.slice(0, i), ...rest.slice(i + 1)], [...cur, d]));
    };
    perm(cards, []);
    return num(best);
  },
};

/** 250 × 40 的积末尾有几个 0？ */
const zeroCount: ChallengeTemplate<{ a: number; b: number }> = {
  id: 'mul.zero-count',
  family: 'mul',
  tier: 'stretch',
  make(rng) {
    const pairs: Array<[number, number]> = [
      [25, 4],
      [25, 8],
      [25, 12],
      [25, 16],
      [125, 8],
      [125, 16],
      [75, 4],
      [75, 8],
      [15, 2],
      [15, 4],
      [15, 6],
      [35, 2],
      [35, 4],
      [45, 2],
      [45, 4],
      [12, 5],
      [24, 5],
      [36, 5],
      [16, 5],
      [32, 5],
      [48, 5],
      [14, 5],
      [18, 5],
      [12, 3],
      [23, 4],
      [31, 7],
    ];
    const [x, y] = rng.pick(pairs);
    const a = x < 100 ? x * 10 : x;
    const b = y < 10 ? y * 10 : y;
    return { a, b };
  },
  render({ a, b }) {
    const tz = (n: number) => String(n).match(/0+$/)?.[0].length ?? 0;
    const ca = a / 10 ** tz(a);
    const cb = b / 10 ** tz(b);
    const core = ca * cb;
    const ans = tz(a) + tz(b) + tz(core);
    return {
      widget: 'numeric',
      prompt: `${a} × ${b} 的积的末尾一共有几个 0？`,
      answer: num(ans),
      hint: '先数两个因数末尾一共有几个 0，再算 0 前面的数相乘，看看积的末尾会不会又出现 0。',
      steps: [
        step(`两个因数末尾一共有 ${tz(a) + tz(b)} 个 0。`),
        step(
          `0 前面的数相乘：${ca} × ${cb} = ${core}，末尾${tz(core) > 0 ? `又有 ${tz(core)} 个 0` : '没有 0'}。`,
        ),
        step(`${a} × ${b} = ${a * b}，末尾一共有 ${ans} 个 0。`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ a, b }) {
    let p = a * b;
    let c = 0;
    while (p % 10 === 0) {
      p /= 10;
      c++;
    }
    return num(c);
  },
};

// ---------------------------------------------------------------- mul · 创新

const MUL_JUDGE = {
  right: '他算对了',
  shift: '错了：第二个部分积没有和十位对齐',
  zero: '错了：积的末尾少添了一个 0',
  swap: '错了：两个因数的位置写反了',
} as const;

/** 判断小明的三位数乘两位数错在哪里。 */
const mulJudge: ChallengeTemplate<ChoiceParams & { a: number; b: number; shown: number }> = {
  id: 'mul.judge',
  family: 'mul',
  tier: 'creative',
  make(rng) {
    const kind = rng.pick(['right', 'shift', 'zero'] as const);
    if (kind === 'zero') {
      const a = rng.int(11, 99) * 10;
      let b = rng.int(12, 98);
      if (b % 10 === 0) b += 1;
      return { ...judgeOptions(rng, kind), a, b, shown: (a * b) / 10 };
    }
    let b = rng.int(12, 98);
    if (b % 10 === 0) b += 1;
    const a = rng.int(101, 999);
    const shown = kind === 'shift' ? a * (b % 10) + a * Math.floor(b / 10) : a * b;
    return { ...judgeOptions(rng, kind), a, b, shown };
  },
  render(p) {
    const { a, b } = p;
    const right = a * b;
    return {
      ...choiceParts(p),
      prompt: `小明用竖式计算 ${a} × ${b}，得数是 ${p.shown}。下面说法正确的是？`,
      hint: '先估一估积大约是多少，再看小明的得数差得多不多、差在哪里。',
      steps: [
        step(
          `估一估：${a} × ${b} 的积大约是 ${Math.round(a / 100) * 100 || a} × ${Math.round(b / 10) * 10}。`,
        ),
        step(`正确的积：${a} × ${b} = ${right}`),
        step(`所以选“${p.options[p.tags.indexOf(null)]}”。`),
      ],
      targetSeconds: 150,
    };
  },
  solve(p) {
    const { a, b, shown } = p;
    const right = a * b;
    const unshifted = a * (b % 10) + a * Math.floor(b / 10);
    const text =
      shown === right
        ? MUL_JUDGE.right
        : shown === unshifted
          ? MUL_JUDGE.shift
          : shown * 10 === right
            ? MUL_JUDGE.zero
            : '';
    return optionIndex(p.options, text);
  },
};

function judgeOptions(rng: Rng, kind: 'right' | 'shift' | 'zero'): ChoiceParams {
  const bugTag: Record<typeof kind, ErrorTag> = {
    right: 'reasoning',
    shift: 'partial-shift',
    zero: 'trailing-zero',
  };
  const all = (['right', 'shift', 'zero', 'swap'] as const).filter((k) => k !== kind);
  return shuffledOptions(
    rng,
    MUL_JUDGE[kind],
    all.map(
      (k) => [MUL_JUDGE[k], k === 'right' ? bugTag[kind] : 'reasoning'] as [string, ErrorTag],
    ),
  );
}

const PATTERNS = [
  { base: 37, step: 3, len: 3 },
  { base: 15873, step: 7, len: 6 },
  { base: 12345679, step: 9, len: 9 },
] as const;

/** 找规律：37 × 3 = 111，37 × 6 = 222 …… */
const mulPattern: ChallengeTemplate<{ which: number; k: number }> = {
  id: 'mul.pattern',
  family: 'mul',
  tier: 'creative',
  make(rng) {
    return { which: rng.int(0, PATTERNS.length - 1), k: rng.int(4, 9) };
  },
  render({ which, k }) {
    const { base, step: s, len } = PATTERNS[which];
    const line = (i: number) => `${base} × ${s * i} = ${String(i).repeat(len)}`;
    const ans = Number(String(k).repeat(len));
    return {
      widget: 'numeric',
      prompt: `找规律：${line(1)}，${line(2)}，${line(3)}，……照这样，${base} × ${s * k} = ？`,
      answer: num(ans),
      hint: `第二个因数是 ${s} 的几倍，积的每一位就是几。`,
      steps: [
        step(`${s * k} 是 ${s} 的 ${k} 倍。`),
        step(`积是 ${len} 个 ${k}：${base} × ${s * k} = ${ans}`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ which, k }) {
    const { base, step: s } = PATTERNS[which];
    return num(base * s * k);
  },
};

const STAR_DEFS = [
  { text: 'a × b − a', f: (a: number, b: number) => a * (b - 1) },
  { text: 'a × b + a', f: (a: number, b: number) => a * (b + 1) },
  { text: 'a × b + b', f: (a: number, b: number) => (a + 1) * b },
  { text: 'a × b − b', f: (a: number, b: number) => (a - 1) * b },
] as const;

/** 新定义运算：a ◎ b = a × b − a。 */
const mulStar: ChallengeTemplate<{ def: number; a: number; b: number; ea: number; eb: number }> = {
  id: 'mul.star-op',
  family: 'mul',
  tier: 'creative',
  make(rng) {
    const ea = rng.int(2, 9);
    const eb = rng.int(2, 8);
    return {
      def: rng.int(0, STAR_DEFS.length - 1),
      a: rng.int(101, 499),
      b: rng.int(12, 49),
      ea,
      eb: eb >= ea ? eb + 1 : eb,
    };
  },
  render({ def, a, b, ea, eb }) {
    const t = STAR_DEFS[def].text;
    const sub = (x: number, y: number) => t.replace(/a/g, String(x)).replace(/b/g, String(y));
    const ex = evalText(sub(ea, eb));
    const ans = evalText(sub(a, b));
    return {
      widget: 'numeric',
      prompt: `规定：a ◎ b = ${t}。例如 ${ea} ◎ ${eb} = ${sub(ea, eb)} = ${ex}。求 ${a} ◎ ${b}。`,
      answer: num(ans),
      hint: '照着例子，把 a 换成 ◎ 前面的数，把 b 换成 ◎ 后面的数，再按运算顺序算。',
      steps: [
        step(`a = ${a}，b = ${b}：`, `${a} ◎ ${b} = ${sub(a, b)}`),
        step(`先算乘法：${a} × ${b} = ${a * b}。`),
        step(`${sub(a, b)} = ${ans}`),
      ],
      targetSeconds: 120,
    };
  },
  solve({ def, a, b }) {
    return num(STAR_DEFS[def].f(a, b));
  },
};

// ---------------------------------------------------------------- mulest · 拔高

/** 估算判断够不够：钱够不够（估大）、座位够不够（估小）。 */
const enough: ChallengeTemplate<
  ChoiceParams & { ctx: 'money' | 'seats'; a: number; b: number; m: number }
> = {
  id: 'mulest.enough',
  family: 'mulest',
  tier: 'stretch',
  make(rng) {
    const ctx = rng.chance(0.5) ? 'money' : 'seats';
    const isEnough = rng.chance(0.5);
    // money: estimate up when enough (both round up), down when not enough.
    // seats: estimate down when enough, up when not enough.
    const roundUp = ctx === 'money' ? isEnough : !isEnough;
    const pickNear = (lo: number, hi: number) => {
      const tens = rng.int(lo, hi);
      return roundUp ? tens * 10 - rng.int(1, 3) : tens * 10 + rng.int(1, 3);
    };
    const a = ctx === 'money' ? pickNear(3, 9) : pickNear(2, 6);
    const b = ctx === 'money' ? pickNear(2, 6) : pickNear(2, 4);
    const m = Math.round(a / 10) * 10 * (Math.round(b / 10) * 10);
    const right = isEnough ? '够' : '不够';
    const { options, tags } = shuffledOptions(rng, right, [
      [isEnough ? '不够' : '够', 'reasoning'],
      ['不算出准确结果，没法判断', 'reasoning'],
    ]);
    return { options, tags, ctx, a, b, m };
  },
  render(p) {
    const { ctx, a, b, m } = p;
    const ra = Math.round(a / 10) * 10;
    const rb = Math.round(b / 10) * 10;
    const up = ra > a;
    const isEnough = p.options[p.tags.indexOf(null)] === '够';
    const prompt =
      ctx === 'money'
        ? `学校要买 ${b} 套图书，每套 ${a} 元。带 ${m} 元够吗？`
        : `礼堂有 ${a} 排座位，每排 ${b} 个。有 ${m} 名同学来看演出，座位够吗？`;
    return {
      ...choiceParts(p),
      prompt,
      hint: '不用算出准确结果：把两个数都看成整十数估一估，想一想估大了还是估小了。',
      steps: [
        step(`把 ${a} 看成 ${ra}，${b} 看成 ${rb}：${ra} × ${rb} = ${ra * rb}。`),
        step(`两个数都${up ? '看大了' : '看小了'}，准确结果比 ${ra * rb} ${up ? '小' : '大'}。`),
        step(
          ctx === 'money'
            ? `要花的钱${up ? '不到' : '超过'} ${m} 元，所以${isEnough ? '够' : '不够'}。`
            : `座位${up ? '不到' : '超过'} ${m} 个，所以${isEnough ? '够' : '不够'}。`,
        ),
      ],
      targetSeconds: 60,
    };
  },
  solve(p) {
    const { ctx, a, b, m } = p;
    const ok = ctx === 'money' ? a * b <= m : a * b >= m;
    return optionIndex(p.options, ok ? '够' : '不够');
  },
};

/** 把 a × b 看成 A × B，估大了还是估小了？ */
const overUnder: ChallengeTemplate<
  ChoiceParams & { a: number; b: number; ra: number; rb: number }
> = {
  id: 'mulest.over-under',
  family: 'mulest',
  tier: 'stretch',
  make(rng) {
    const up = rng.chance(0.5);
    const hund = rng.int(2, 8);
    const a = up ? hund * 100 - rng.int(1, 30) : hund * 100 + rng.int(1, 30);
    const tens = rng.int(2, 8);
    const b = up ? tens * 10 - rng.int(1, 3) : tens * 10 + rng.int(1, 3);
    const { options, tags } = shuffledOptions(rng, up ? '估大了' : '估小了', [
      [up ? '估小了' : '估大了', 'reasoning'],
      ['和准确的积正好相等', 'reasoning'],
    ]);
    return { options, tags, a, b, ra: hund * 100, rb: tens * 10 };
  },
  render(p) {
    const { a, b, ra, rb } = p;
    const up = ra > a;
    return {
      ...choiceParts(p),
      prompt: `估算 ${a} × ${b} 时，小明把它看成 ${ra} × ${rb}。和准确的积比，他是估大了还是估小了？`,
      hint: '比较一下：两个因数都是往大了看，还是往小了看？',
      steps: [
        step(
          `${a} 看成 ${ra}，是看${up ? '大' : '小'}了；${b} 看成 ${rb}，也是看${up ? '大' : '小'}了。`,
        ),
        step(
          `两个因数都${up ? '变大' : '变小'}，积也${up ? '变大' : '变小'}，所以${up ? '估大了' : '估小了'}。`,
        ),
      ],
      targetSeconds: 45,
    };
  },
  solve(p) {
    const est = p.ra * p.rb;
    const exact = p.a * p.b;
    return optionIndex(
      p.options,
      est > exact ? '估大了' : est < exact ? '估小了' : '和准确的积正好相等',
    );
  },
};

// ---------------------------------------------------------------- mulest · 创新

const estimateOf = (a: number, b: number) => Math.round(a / 100) * 100 * (Math.round(b / 10) * 10);

/** 下面哪个算式的积大约是 6000？ */
const whichAbout: ChallengeTemplate<ChoiceParams & { x: number }> = {
  id: 'mulest.which-about',
  family: 'mulest',
  tier: 'creative',
  make(rng) {
    for (;;) {
      const mk = () => {
        const a = rng.int(2, 9) * 100 + rng.int(-30, 30);
        const b = rng.int(2, 9) * 10 + rng.int(-3, 3);
        return { a, b, e: estimateOf(a, b), exact: a * b };
      };
      const right = mk();
      const others = [mk(), mk(), mk()];
      const x = right.e;
      if (others.some((o) => o.e === x)) continue;
      const texts = [right, ...others].map((o) => `${o.a} × ${o.b}`);
      if (new Set(texts).size !== 4) continue;
      const gaps = [right, ...others].map((o) => Math.abs(o.exact - x));
      if (gaps.slice(1).some((g) => g <= gaps[0])) continue;
      const { options, tags } = shuffledOptions(
        rng,
        texts[0],
        texts.slice(1).map((t) => [t, 'reasoning'] as [string, ErrorTag]),
      );
      return { options, tags, x };
    }
  },
  render(p) {
    return {
      ...choiceParts(p),
      prompt: `下面哪个算式的积大约是 ${p.x}？`,
      hint: '把三位数看成整百数，两位数看成整十数，估一估每个算式。',
      steps: [
        ...p.options.map((o) => {
          const [a, b] = o.split(' × ').map(Number);
          return step(
            `${o} ≈ ${Math.round(a / 100) * 100} × ${Math.round(b / 10) * 10} = ${estimateOf(a, b)}`,
          );
        }),
        step(`积大约是 ${p.x} 的是 ${p.options[p.tags.indexOf(null)]}。`),
      ],
      targetSeconds: 120,
    };
  },
  solve(p) {
    const gaps = p.options.map((o) => Math.abs(evalText(o) - p.x));
    const min = Math.min(...gaps);
    return onlyOption(p.options, (_, i) => gaps[i] === min);
  },
};

/** 两个人估算同一个算式，谁更接近准确的积？ */
const whoCloser: ChallengeTemplate<
  ChoiceParams & { a: number; b: number; e1: [number, number]; e2: [number, number] }
> = {
  id: 'mulest.who-closer',
  family: 'mulest',
  tier: 'creative',
  minDifficulty: 2,
  make(rng) {
    for (;;) {
      const a = rng.int(2, 8) * 100 + rng.int(-40, 40);
      const b = rng.int(2, 8) * 10 + rng.int(-4, 4);
      if (a % 10 === 0 || b % 10 === 0) continue;
      const e1: [number, number] = [Math.round(a / 100) * 100, Math.round(b / 10) * 10];
      const e2: [number, number] = [
        Math.round(a / 10) * 10,
        rng.chance(0.5) ? Math.floor(b / 10) * 10 : Math.ceil(b / 10) * 10,
      ];
      const g1 = Math.abs(e1[0] * e1[1] - a * b);
      const g2 = Math.abs(e2[0] * e2[1] - a * b);
      if (g1 === g2 || (e1[0] === e2[0] && e1[1] === e2[1])) continue;
      const { options, tags } = shuffledOptions(rng, g1 < g2 ? '小明' : '小红', [
        [g1 < g2 ? '小红' : '小明', 'reasoning'],
        ['两人一样接近', 'reasoning'],
      ]);
      return { options, tags, a, b, e1, e2 };
    }
  },
  render(p) {
    const { a, b, e1, e2 } = p;
    const exact = a * b;
    const v1 = e1[0] * e1[1];
    const v2 = e2[0] * e2[1];
    return {
      ...choiceParts(p),
      prompt: `估算 ${a} × ${b}：小明看成 ${e1[0]} × ${e1[1]}，小红看成 ${e2[0]} × ${e2[1]}。谁的估算结果更接近准确的积？`,
      hint: '先算出两人的估算结果，再算出准确的积，比一比谁相差得少。',
      steps: [
        step(`小明：${e1[0]} × ${e1[1]} = ${v1}；小红：${e2[0]} × ${e2[1]} = ${v2}。`),
        step(`准确的积：${a} × ${b} = ${exact}。`),
        step(
          `小明相差 ${Math.abs(v1 - exact)}，小红相差 ${Math.abs(v2 - exact)}，${p.options[p.tags.indexOf(null)]}更接近。`,
        ),
      ],
      targetSeconds: 180,
    };
  },
  solve(p) {
    const exact = evalText(`${p.a} × ${p.b}`);
    const g1 = Math.abs(evalText(`${p.e1[0]} × ${p.e1[1]}`) - exact);
    const g2 = Math.abs(evalText(`${p.e2[0]} × ${p.e2[1]}`) - exact);
    return optionIndex(p.options, g1 < g2 ? '小明' : g2 < g1 ? '小红' : '两人一样接近');
  },
};

// ---------------------------------------------------------------- order · 拔高

type Op = '+' | '−' | '×';
const SHAPES: Op[][] = [
  ['+', '×', '−'],
  ['×', '+', '×'],
  ['+', '×', '+'],
  ['×', '+', '−'],
  ['−', '×', '+'],
];

/**
 * Value of n0 op n1 op n2 op n3 with brackets around numbers i..j (inclusive),
 * by collapsing the bracket first. NaN when a step would go below 0.
 */
function valueWithBracket(ns: number[], ops: Op[], i: number, j: number): number {
  const two = (x: number[], o: Op[]) => {
    // × first, then + − from left to right
    const xs = [x[0]];
    const os: Op[] = [];
    o.forEach((op, k) => {
      if (op === '×') xs[xs.length - 1] *= x[k + 1];
      else {
        xs.push(x[k + 1]);
        os.push(op);
      }
    });
    return os.reduce((v, op, k) => {
      const r = op === '+' ? v + xs[k + 1] : v - xs[k + 1];
      return r < 0 ? NaN : r;
    }, xs[0]);
  };
  const inner = two(ns.slice(i, j + 1), ops.slice(i, j));
  return two([...ns.slice(0, i), inner, ...ns.slice(j + 1)], [...ops.slice(0, i), ...ops.slice(j)]);
}

const withBracket = (ns: number[], ops: Op[], i: number, j: number) =>
  ns
    .map((n, k) => `${k === i ? '(' : ''}${n}${k === j ? ')' : ''}`)
    .reduce((s, t, k) => (k === 0 ? t : `${s} ${ops[k - 1]} ${t}`), '');

const PLACEMENTS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [0, 2],
  [1, 3],
];

/** 添一个小括号，使结果最大。 */
const bracketMax: ChallengeTemplate<{ ns: number[]; shape: number }> = {
  id: 'order.bracket-max',
  family: 'order',
  tier: 'stretch',
  make(rng) {
    for (;;) {
      const shape = rng.int(0, SHAPES.length - 1);
      const ns = [rng.int(2, 30), rng.int(2, 12), rng.int(2, 12), rng.int(2, 20)];
      const ops = SHAPES[shape];
      // Every placement (and the plain expression) must stay out of negatives at every step.
      const vals = [
        ...PLACEMENTS.map(([i, j]) => valueWithBracket(ns, ops, i, j)),
        valueWithBracket(ns, ops, 0, 0),
      ];
      if (vals.every((v) => v >= 0)) return { ns, shape };
    }
  },
  render({ ns, shape }) {
    const ops = SHAPES[shape];
    const plain = withBracket(ns, ops, -1, -1);
    const rows = PLACEMENTS.map(([i, j]) => ({
      text: withBracket(ns, ops, i, j),
      v: valueWithBracket(ns, ops, i, j),
    }));
    const best = rows.reduce((m, r) => (r.v > m.v ? r : m));
    return {
      widget: 'numeric',
      prompt: `在算式 ${plain} 里添上一个小括号，使计算结果最大。最大的结果是多少？`,
      answer: num(best.v),
      hint: '把括号放在不同的位置，分别算一算。想一想：先算加法再乘，结果会不会变大？',
      steps: [
        ...rows.map((r) => step(`${r.text} = ${r.v}`)),
        step(`最大的是 ${best.text}，结果是 ${best.v}。`),
      ],
      targetSeconds: 180,
    };
  },
  solve({ ns, shape }) {
    const ops = SHAPES[shape];
    let best = -Infinity;
    for (let i = 0; i < 4; i++)
      for (let j = i + 1; j < 4; j++) {
        if (i === 0 && j === 3) continue;
        const text = ns
          .map((n, k) => `${k === i ? '(' : ''}${n}${k === j ? ')' : ''}`)
          .map((t, k) => (k === 0 ? t : `${ops[k - 1]}${t}`))
          .join('');
        best = Math.max(best, evalText(text));
      }
    return num(best);
  },
};

/** 购物：带的钱买了两样东西后找回多少 / 剩下的钱还能买几个。 */
const shopping: ChallengeTemplate<{
  kind: 'change' | 'rest';
  n: number;
  a: number;
  m: number;
  b: number;
  money: number;
}> = {
  id: 'order.shopping',
  family: 'order',
  tier: 'stretch',
  make(rng) {
    const kind = rng.chance(0.5) ? 'change' : 'rest';
    const n = rng.int(2, 6);
    const a = rng.int(3, 25);
    const b = rng.int(2, 9);
    if (kind === 'change') {
      const m = rng.int(2, 5);
      const cost = n * a + m * b;
      return { kind, n, a, m, b, money: Math.ceil((cost + 1) / 50) * 50 };
    }
    const k = rng.int(3, 12);
    return { kind, n, a, m: k, b, money: n * a + k * b };
  },
  render({ kind, n, a, m, b, money }) {
    if (kind === 'change') {
      const ans = money - (n * a + m * b);
      return {
        widget: 'numeric',
        prompt: `妈妈带了 ${money} 元去超市，买了 ${n} 千克苹果，每千克 ${a} 元；又买了 ${m} 盒牛奶，每盒 ${b} 元。应找回多少元？`,
        answer: num(ans),
        hint: '先分别算出苹果和牛奶的钱，合起来，再从带的钱里减去。可以列一个综合算式。',
        steps: [
          step('列综合算式：', `${money} − (${n} × ${a} + ${m} × ${b})`),
          step(`先算括号里的乘法：${n * a} + ${m * b} = ${n * a + m * b}。`),
          step(`${money} − ${n * a + m * b} = ${ans}`),
        ],
        targetSeconds: 120,
      };
    }
    return {
      widget: 'numeric',
      prompt: `小明带了 ${money} 元，先买了 ${n} 个文具盒，每个 ${a} 元，剩下的钱全部用来买笔记本，每本 ${b} 元，正好用完。他买了几本笔记本？`,
      answer: num(m),
      hint: '先算买文具盒花了多少钱，再算剩下多少钱，最后看剩下的钱里有几个笔记本的价钱。',
      steps: [
        step('列综合算式：', `(${money} − ${n} × ${a}) ÷ ${b}`),
        step(
          `先算乘法：${n} × ${a} = ${n * a}；再算括号：${money} − ${n * a} = ${money - n * a}。`,
        ),
        step(`${money - n * a} ÷ ${b} = ${m}`),
      ],
      targetSeconds: 120,
    };
  },
  solve({ kind, n, a, m, b, money }) {
    let left = money;
    for (let i = 0; i < n; i++) left -= a;
    if (kind === 'change') {
      for (let i = 0; i < m; i++) left -= b;
      return num(left);
    }
    let count = 0;
    while (left >= b) {
      left -= b;
      count++;
    }
    return num(count);
  },
};

// ---------------------------------------------------------------- order · 创新

const OPS4: Array<'+' | '−' | '×' | '÷'> = ['+', '−', '×', '÷'];

/** 在 a ○ b ○ c = X 的 ○ 里填运算符号。 */
const fillOps: ChallengeTemplate<ChoiceParams & { ns: number[]; x: number }> = {
  id: 'order.fill-ops',
  family: 'order',
  tier: 'creative',
  make(rng) {
    for (;;) {
      const ns = [rng.int(2, 30), rng.int(2, 9), rng.int(2, 9)];
      const combos: string[] = [];
      for (const o1 of OPS4) for (const o2 of OPS4) combos.push(`${o1} ${o2}`);
      // Whole numbers only: a step that is negative or does not divide exactly gives NaN.
      const ap = (x: number, o: string, y: number) => {
        const r = o === '+' ? x + y : o === '−' ? x - y : o === '×' ? x * y : x / y;
        return Number.isInteger(r) && r >= 0 ? r : NaN;
      };
      const high = (o: string) => o === '×' || o === '÷';
      const value = (c: string) => {
        const [o1, o2] = c.split(' ');
        return high(o2) && !high(o1)
          ? ap(ns[0], o1, ap(ns[1], o2, ns[2]))
          : ap(ap(ns[0], o1, ns[1]), o2, ns[2]);
      };
      const leftToRight = (c: string) => {
        const [o1, o2] = c.split(' ');
        return ap(ap(ns[0], o1, ns[1]), o2, ns[2]);
      };
      const printed = (c: string) => {
        const [o1, o2] = c.split(' ');
        return evalText(`${ns[0]}${o1}${ns[1]}${o2}${ns[2]}`);
      };
      const right = rng.pick(combos.filter((c) => c.includes('×') || c.includes('÷')));
      const x = value(right);
      if (Number.isNaN(x) || Number.isNaN(leftToRight(right)) || leftToRight(right) === x) continue;
      if (combos.filter((c) => printed(c) === x).length !== 1) continue;
      // A trap: an option that gives X when worked from left to right.
      const trap = combos.find(
        (c) => c !== right && leftToRight(c) === x && !Number.isNaN(value(c)),
      );
      const others = rng.shuffle(
        combos.filter((c) => c !== right && c !== trap && !Number.isNaN(value(c))),
      );
      const wrong: Array<[string, ErrorTag]> = [
        ...(trap ? [[trap, 'order-of-ops'] as [string, ErrorTag]] : []),
        ...others.map((c) => [c, 'reasoning'] as [string, ErrorTag]),
      ].slice(0, 3);
      if (wrong.length < 3) continue;
      return { ...shuffledOptions(rng, right, wrong), ns, x };
    }
  },
  render(p) {
    const [a, b, c] = p.ns;
    const right = p.options[p.tags.indexOf(null)];
    const [o1, o2] = right.split(' ');
    return {
      ...choiceParts(p),
      prompt: `在 ${a} ○ ${b} ○ ${c} = ${p.x} 的两个 ○ 里依次填上运算符号，使等式成立。应该填？`,
      hint: '把每个选项填进去，按“先乘除、后加减”的顺序算一算。',
      steps: [
        ...p.options.map((o) => {
          const [x1, x2] = o.split(' ');
          const v = evalText(`${a}${x1}${b}${x2}${c}`);
          return step(
            `填 ${o}：${a} ${x1} ${b} ${x2} ${c} = ${Number.isInteger(v) ? v : '不能整除'}`,
          );
        }),
        step(`所以填 ${o1} 和 ${o2}。`),
      ],
      targetSeconds: 150,
    };
  },
  solve(p) {
    const [a, b, c] = p.ns;
    return onlyOption(p.options, (o) => {
      const [x1, x2] = o.split(' ');
      return evalText(`${a} ${x1} ${b} ${x2} ${c}`) === p.x;
    });
  },
};

const ORDER_JUDGE = {
  right: '他算对了',
  mul: '错了：要先算乘法，再算加减',
  bracket: '错了：要先算小括号里面的',
  rtl: '错了：同级运算要从右往左算',
} as const;

/** 判断小明的混合运算哪里错了。 */
const orderJudge: ChallengeTemplate<ChoiceParams & { expr: string; shown: number }> = {
  id: 'order.judge',
  family: 'order',
  tier: 'creative',
  make(rng) {
    const kind = rng.pick(['right', 'mul', 'bracket'] as const);
    let expr = '';
    let shown = 0;
    for (;;) {
      const a = rng.int(10, 90);
      const b = rng.int(2, 9);
      const c = rng.int(2, 9);
      const d = rng.int(2, 9);
      if (kind === 'bracket') {
        // a × (b + c) − d, worked as a × b + c − d
        expr = `${b} × (${c} + ${d}) ${MINUS} ${rng.int(1, 9)}`;
        const stripped = expr.replace(/[()]/g, '');
        shown = evalText(stripped);
      } else {
        expr = rng.chance(0.5) ? `${a} + ${b} × ${c}` : `${a} ${MINUS} ${b} × ${c}`;
        shown = kind === 'mul' ? ltr(expr) : evalText(expr);
      }
      if (shown >= 0 && evalText(expr) >= 0 && (kind === 'right' || shown !== evalText(expr)))
        break;
    }
    const tag: ErrorTag = kind === 'right' ? 'reasoning' : 'order-of-ops';
    const all = (['right', 'mul', 'bracket', 'rtl'] as const).filter((k) => k !== kind);
    return {
      ...shuffledOptions(
        rng,
        ORDER_JUDGE[kind],
        all.map((k) => [ORDER_JUDGE[k], k === 'right' ? tag : 'reasoning'] as [string, ErrorTag]),
      ),
      expr,
      shown,
    };
  },
  render(p) {
    const right = evalText(p.expr);
    return {
      ...choiceParts(p),
      prompt: `小明计算 ${p.expr}，得数是 ${p.shown}。下面说法正确的是？`,
      hint: '先想一想这个算式应该先算什么，再自己算一遍，和小明的得数比一比。',
      steps: [
        step('运算顺序：有括号先算括号里面的；没有括号先算乘除，再算加减。'),
        step(`${p.expr} = ${right}`),
        step(`所以选“${p.options[p.tags.indexOf(null)]}”。`),
      ],
      targetSeconds: 120,
    };
  },
  solve(p) {
    const right = evalText(p.expr);
    const text =
      p.shown === right
        ? ORDER_JUDGE.right
        : p.expr.includes('(')
          ? evalText(p.expr.replace(/[()]/g, '')) === p.shown
            ? ORDER_JUDGE.bracket
            : ''
          : ltr(p.expr) === p.shown
            ? ORDER_JUDGE.mul
            : '';
    return optionIndex(p.options, text);
  },
};

/** Strictly left to right, ignoring precedence (the typical mistake). */
function ltr(expr: string): number {
  const t = expr.replace(/[()]/g, '').split(' ');
  let v = Number(t[0]);
  for (let i = 1; i < t.length; i += 2) {
    const y = Number(t[i + 1]);
    v = t[i] === '+' ? v + y : t[i] === '×' ? v * y : v - y;
  }
  return v;
}

const DIAMOND = [
  { text: 'a × 2 + b', f: (a: number, b: number) => a * 2 + b },
  { text: 'a + b × 2', f: (a: number, b: number) => a + b * 2 },
  { text: 'a × b − a', f: (a: number, b: number) => a * b - a },
] as const;

/** 新定义运算：a ★ b = a × 2 + b，求 (x ★ y) ★ z。 */
const orderStar: ChallengeTemplate<{
  def: number;
  x: number;
  y: number;
  z: number;
  leftFirst: boolean;
}> = {
  id: 'order.star-op',
  family: 'order',
  tier: 'creative',
  make(rng) {
    const def = rng.int(0, DIAMOND.length - 1);
    const small = def === 2;
    return {
      def,
      x: rng.int(2, small ? 9 : 30),
      y: rng.int(2, small ? 9 : 30),
      z: rng.int(2, small ? 6 : 30),
      leftFirst: rng.chance(0.5),
    };
  },
  render({ def, x, y, z, leftFirst }) {
    const d = DIAMOND[def];
    const sub = (a: number, b: number) => d.text.replace(/a/g, String(a)).replace(/b/g, String(b));
    const inner = leftFirst ? d.f(x, y) : d.f(y, z);
    const ans = leftFirst ? d.f(inner, z) : d.f(x, inner);
    return {
      widget: 'numeric',
      prompt: `规定：a ★ b = ${d.text}。例如 3 ★ 4 = ${sub(3, 4)} = ${d.f(3, 4)}。求 ${leftFirst ? `(${x} ★ ${y}) ★ ${z}` : `${x} ★ (${y} ★ ${z})`}。`,
      answer: num(ans),
      hint: '先算小括号里的 ★，得到一个数，再用这个数算外面的 ★。',
      steps: leftFirst
        ? [
            step(`先算 ${x} ★ ${y} = ${sub(x, y)} = ${inner}。`),
            step(`再算 ${inner} ★ ${z} = ${sub(inner, z)} = ${ans}`),
          ]
        : [
            step(`先算 ${y} ★ ${z} = ${sub(y, z)} = ${inner}。`),
            step(`再算 ${x} ★ ${inner} = ${sub(x, inner)} = ${ans}`),
          ],
      targetSeconds: 120,
    };
  },
  solve({ def, x, y, z, leftFirst }) {
    const t = DIAMOND[def].text;
    const star = (a: number, b: number) =>
      evalText(t.replace(/a/g, String(a)).replace(/b/g, String(b)));
    return num(leftFirst ? star(star(x, y), z) : star(x, star(y, z)));
  },
};

// ---------------------------------------------------------------- law · 拔高

/** 首尾配对：s + (s+1) + … + e。 */
const gauss: ChallengeTemplate<{ s: number; n: number }> = {
  id: 'law.gauss',
  family: 'law',
  tier: 'stretch',
  make(rng) {
    return { s: rng.chance(0.4) ? 1 : rng.int(2, 30), n: 2 * rng.int(5, 10) };
  },
  render({ s, n }) {
    const e = s + n - 1;
    const ans = ((s + e) * n) / 2;
    return {
      widget: 'numeric',
      prompt: `用简便方法计算：${s} + ${s + 1} + ${s + 2} + … + ${e - 1} + ${e}（相邻两个数相差 1）`,
      answer: num(ans),
      hint: '用加法交换律和结合律，把第一个数和最后一个数、第二个数和倒数第二个数……两两配成一对。',
      steps: [
        step(
          `一共有 ${n} 个数。首尾配对：${s} + ${e} = ${s + e}，${s + 1} + ${e - 1} = ${s + e}……`,
        ),
        step(`每一对的和都是 ${s + e}，一共 ${n} ÷ 2 = ${n / 2} 对。`),
        step(`${s + e} × ${n / 2} = ${ans}`),
      ],
      targetSeconds: 120,
    };
  },
  solve({ s, n }) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += s + i;
    return num(sum);
  },
};

/** 几个接近整百的数相加：以 100 为基准。 */
const baseNumber: ChallengeTemplate<{ base: number; devs: number[] }> = {
  id: 'law.base-number',
  family: 'law',
  tier: 'stretch',
  make(rng) {
    const base = rng.pick([100, 100, 200, 500, 1000]);
    const k = rng.int(4, 6);
    return { base, devs: Array.from({ length: k }, () => rng.pick([-4, -3, -2, -1, 1, 2, 3, 4])) };
  },
  render({ base, devs }) {
    const ns = devs.map((d) => base + d);
    const adj = devs.reduce((s, d) => s + d, 0);
    const total = base * ns.length + adj;
    return {
      widget: 'numeric',
      prompt: `用简便方法计算：${ns.join(' + ')}`,
      answer: num(total),
      hint: `这几个数都接近 ${base}。先把它们都看成 ${base}，再把多算的减去、少算的加上。`,
      steps: [
        step(`都看成 ${base}：${base} × ${ns.length} = ${base * ns.length}。`),
        step(
          `每个数比 ${base} 多或少：${devs.map((d) => (d > 0 ? `多 ${d}` : `少 ${-d}`)).join('，')}，合起来${adj > 0 ? `多 ${adj}` : adj < 0 ? `少 ${-adj}` : '正好抵消'}。`,
        ),
        step(
          adj === 0
            ? `所以和就是 ${total}。`
            : `${base * ns.length} ${adj > 0 ? '+' : MINUS} ${Math.abs(adj)} = ${total}`,
        ),
      ],
      targetSeconds: 120,
    };
  },
  solve({ base, devs }) {
    return num(evalText(devs.map((d) => base + d).join(' + ')));
  },
};

// ---------------------------------------------------------------- law · 创新

const LAWS = ['加法交换律', '加法结合律', '乘法交换律', '乘法结合律'] as const;
type LawKind = 'add-commute' | 'add-assoc' | 'mul-commute';

/** 这个等式运用了什么运算律？ */
const whichLaw: ChallengeTemplate<ChoiceParams & { left: string; right: string }> = {
  id: 'law.which-law',
  family: 'law',
  tier: 'creative',
  make(rng) {
    const kind = rng.pick<LawKind>(['add-commute', 'add-assoc', 'mul-commute']);
    const [a, b, c] = rng.shuffle(Array.from({ length: 88 }, (_, i) => i + 12)).slice(0, 3);
    const [left, right] =
      kind === 'add-commute'
        ? [`${a} + ${b}`, `${b} + ${a}`]
        : kind === 'add-assoc'
          ? rng.chance(0.5)
            ? [`(${a} + ${b}) + ${c}`, `${a} + (${b} + ${c})`]
            : [`${a} + (${b} + ${c})`, `(${a} + ${b}) + ${c}`]
          : [`${a} × ${b}`, `${b} × ${a}`];
    const name = { 'add-commute': LAWS[0], 'add-assoc': LAWS[1], 'mul-commute': LAWS[2] }[kind];
    const { options, tags } = shuffledOptions(
      rng,
      name,
      LAWS.filter((l) => l !== name).map((l) => [l, 'reasoning'] as [string, ErrorTag]),
    );
    return { options, tags, left, right };
  },
  render(p) {
    const name = p.options[p.tags.indexOf(null)];
    return {
      ...choiceParts(p),
      prompt: `${p.left} = ${p.right} 运用了什么运算律？`,
      hint: '看一看：等号两边是加法还是乘法？是数的位置变了，还是先算的部分（括号）变了？',
      steps: [
        step(
          name.includes('交换')
            ? '等号两边只是交换了两个数的位置。'
            : '等号两边数的位置没变，变的是先算哪两个数（括号的位置）。',
        ),
        step(`所以运用了${name}。`),
      ],
      targetSeconds: 45,
    };
  },
  solve(p) {
    const op = p.left.includes('×') ? '乘法' : '加法';
    const nums = (s: string) => s.match(/\d+/g)!.join(',');
    const orderChanged = nums(p.left) !== nums(p.right);
    return optionIndex(p.options, `${op}${orderChanged ? '交换律' : '结合律'}`);
  },
};

/** 下面哪个等式成立？ */
const trueEquation: ChallengeTemplate<ChoiceParams> = {
  id: 'law.true-equation',
  family: 'law',
  tier: 'creative',
  make(rng) {
    for (;;) {
      const a = rng.int(40, 99);
      const b = rng.int(5, 19);
      const c = rng.int(2, 9);
      const truths = [
        `${a} + ${b} + ${c} = ${a} + (${b} + ${c})`,
        `${a} + ${b} + ${c} = ${c} + ${b} + ${a}`,
        `${a} × ${b} = ${b} × ${a}`,
      ];
      const lies: Array<[string, ErrorTag]> = [
        [`${a} ${MINUS} ${b} ${MINUS} ${c} = ${a} ${MINUS} (${b} ${MINUS} ${c})`, 'reasoning'],
        [`${a} × ${b} + ${c} = ${a} × (${b} + ${c})`, 'order-of-ops'],
        [`${a} + ${b} × ${c} = (${a} + ${b}) × ${c}`, 'order-of-ops'],
        [`${a} ${MINUS} (${b} + ${c}) = ${a} ${MINUS} ${b} + ${c}`, 'reasoning'],
      ];
      const holds = (s: string) => {
        const [l, r] = s.split(' = ');
        return evalText(l) === evalText(r);
      };
      if (b <= c || lies.some(([s]) => holds(s))) continue;
      return shuffledOptions(rng, rng.pick(truths), rng.shuffle(lies).slice(0, 3));
    }
  },
  render(p) {
    const right = p.options[p.tags.indexOf(null)];
    return {
      ...choiceParts(p),
      prompt: '下面哪个等式是成立的？',
      hint: '可以把等号两边分别算一算，也可以想一想：用的是哪条运算律？减法能随便加括号吗？',
      steps: [
        ...p.options.map((o) => {
          const [l, r] = o.split(' = ');
          const [x, y] = [evalText(l), evalText(r)];
          return step(`${o}：左边 ${x}，右边 ${y}，${x === y ? '成立' : '不成立'}。`);
        }),
        step(`成立的是 ${right}。`),
      ],
      targetSeconds: 150,
    };
  },
  solve(p) {
    return onlyOption(p.options, (o) => {
      const [l, r] = o.split(' = ');
      return evalText(l) === evalText(r);
    });
  },
};

/** 从一组数中找“凑整好朋友”：和是整百数的有几对？ */
const partnerPairs: ChallengeTemplate<{ ns: number[] }> = {
  id: 'law.partner-pairs',
  family: 'law',
  tier: 'creative',
  make(rng) {
    const set = new Set<number>();
    const k = rng.int(2, 3);
    while (set.size < 2 * k) {
      const x = rng.int(11, 189);
      const y = 100 * rng.int(1, 2) - x;
      if (x % 10 === 0 || y <= 10 || set.has(x) || set.has(y) || x === y) continue;
      set.add(x);
      set.add(y);
    }
    while (set.size < 2 * k + 2) {
      const z = rng.int(11, 189);
      if (z % 10 !== 0) set.add(z);
    }
    return { ns: rng.shuffle([...set]) };
  },
  render({ ns }) {
    const found: string[] = [];
    for (let i = 0; i < ns.length; i++)
      for (let j = i + 1; j < ns.length; j++)
        if ((ns[i] + ns[j]) % 100 === 0) found.push(`${ns[i]} + ${ns[j]} = ${ns[i] + ns[j]}`);
    return {
      widget: 'numeric',
      prompt: `从 ${ns.join('、')} 中任选两个数相加，和是整百数的一共有几对？`,
      answer: num(found.length),
      hint: '先看个位：个位上的数相加要得 10；再看十位，加上进上来的 1 要凑成整十。',
      steps: [
        step('个位相加得 10、十位相加再加 1 得 10 的两个数，和是整百数。'),
        step(`找到：${found.join('，')}。`),
        step(`一共 ${found.length} 对。`),
      ],
      targetSeconds: 120,
    };
  },
  solve({ ns }) {
    const have = new Set(ns);
    let c = 0;
    for (const x of ns) for (let h = 100; h <= 400; h += 100) if (have.has(h - x) && h - x > x) c++;
    return num(c);
  },
};

// ---------------------------------------------------------------- lawmul · 拔高

/** 拆数凑整：125 × 88 = 125 × 8 × 11。 */
const splitFactor: ChallengeTemplate<{ a: 25 | 125; k: number }> = {
  id: 'lawmul.split-factor',
  family: 'lawmul',
  tier: 'stretch',
  make(rng) {
    const a = rng.chance(0.5) ? 25 : 125;
    const k = a === 25 ? rng.int(3, 24) : rng.int(2, 12);
    return { a, k: k % 10 === 0 ? k + 1 : k };
  },
  render({ a, k }) {
    const m = a === 25 ? 4 : 8;
    const b = m * k;
    return {
      widget: 'numeric',
      prompt: `用简便方法计算：${a} × ${b}`,
      answer: num(a * b),
      hint: `${a} 和哪个数相乘能得到整百、整千？把 ${b} 拆成这个数乘另一个数。`,
      steps: [
        step(`把 ${b} 拆成 ${m} × ${k}，用乘法结合律：`, `${a} × ${b} = ${a} × ${m} × ${k}`),
        step(`${a} × ${m} = ${a * m}`),
        step(`${a * m} × ${k} = ${a * b}`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ a, k }) {
    return num(evalText(`${a} × ${(a === 25 ? 4 : 8) * k}`));
  },
};

/** a × x + a × y + a × z，x + y + z 凑成整百。 */
const threeTerms: ChallengeTemplate<{ a: number; xs: number[]; minus: boolean }> = {
  id: 'lawmul.three-terms',
  family: 'lawmul',
  tier: 'stretch',
  make(rng) {
    const a = rng.int(12, 99);
    const minus = rng.chance(0.4);
    if (minus) {
      const z = rng.int(11, 49);
      const x = rng.int(20, 80);
      return { a, xs: [x, 100 + z - x, z], minus };
    }
    const x = rng.int(11, 60);
    const y = rng.int(11, 89 - x);
    return { a, xs: [x, y, 100 - x - y], minus };
  },
  render({ a, xs, minus }) {
    const [x, y, z] = xs;
    const s3 = minus ? MINUS : '+';
    const expr = `${a} × ${x} + ${a} × ${y} ${s3} ${a} × ${z}`;
    return {
      widget: 'numeric',
      prompt: `用简便方法计算：${expr}`,
      answer: num(a * 100),
      hint: `三个乘法算式里都有 ${a}，想一想乘法分配律能不能反过来用。`,
      steps: [
        step('三个积里都有相同的因数，用乘法分配律：', `${expr} = ${a} × (${x} + ${y} ${s3} ${z})`),
        step(`括号里：${x} + ${y} ${s3} ${z} = 100。`),
        step(`${a} × 100 = ${a * 100}`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ a, xs, minus }) {
    const [x, y, z] = xs;
    return num(evalText(`${a}×${x}+${a}×${y}${minus ? '−' : '+'}${a}×${z}`));
  },
};

/** 长方形的长增加后面积增加多少（用面积解释分配律）。 */
const areaAdd: ChallengeTemplate<{ l: number; w: number; c: number }> = {
  id: 'lawmul.area-add',
  family: 'lawmul',
  tier: 'stretch',
  make(rng) {
    return { l: rng.int(12, 60), w: rng.int(8, 35), c: rng.int(3, 20) };
  },
  render({ l, w, c }) {
    return {
      widget: 'numeric',
      prompt: `一块长方形菜地，长 ${l} 米，宽 ${w} 米。宽不变，把长增加 ${c} 米，面积增加了多少平方米？`,
      answer: num(c * w),
      hint: '画一画：增加的部分也是一个长方形，它的长和宽各是多少？',
      steps: [
        step(`增加的部分是一个长 ${c} 米、宽 ${w} 米的长方形。`),
        step(
          `也可以这样想：(${l} + ${c}) × ${w} = ${l} × ${w} + ${c} × ${w}，多出来的就是 ${c} × ${w}。`,
        ),
        step(`${c} × ${w} = ${c * w}（平方米）`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ l, w, c }) {
    return num((l + c) * w - l * w);
  },
};

// ---------------------------------------------------------------- lawmul · 创新

const DIST_JUDGE = {
  right: '他做对了',
  confuse: '错了：把乘法分配律和乘法结合律弄混了',
  miss: '错了：括号里的两个数都要乘，他漏乘了一个',
} as const;

/** 判断小明的简算：结合律 / 分配律混淆、漏乘、正确。 */
const distJudge: ChallengeTemplate<ChoiceParams & { work: string; shown: number }> = {
  id: 'lawmul.judge',
  family: 'lawmul',
  tier: 'creative',
  make(rng) {
    const kind = rng.pick(['right', 'confuse', 'miss'] as const);
    let work: string;
    let shown: number;
    if (kind === 'confuse') {
      const [a, m] = rng.pick([
        [25, 4],
        [125, 8],
      ] as const);
      const k = rng.int(2, 9);
      work = `${a} × (${m} + ${k}) = ${a} × ${m} × ${k}`;
      shown = a * m * k;
    } else {
      const c = rng.int(12, 49);
      const a = rng.int(20, 80);
      const b = 100 - a;
      work =
        kind === 'miss'
          ? `(${a} + ${b}) × ${c} = ${a} × ${c} + ${b}`
          : `(${a} + ${b}) × ${c} = ${a} × ${c} + ${b} × ${c}`;
      shown = kind === 'miss' ? a * c + b : a * c + b * c;
    }
    const tag: ErrorTag = kind === 'miss' ? 'distributive-miss' : 'reasoning';
    const all = (['right', 'confuse', 'miss'] as const).filter((k) => k !== kind);
    return {
      ...shuffledOptions(
        rng,
        DIST_JUDGE[kind],
        all.map((k) => [DIST_JUDGE[k], k === 'right' ? tag : 'reasoning'] as [string, ErrorTag]),
      ),
      work,
      shown,
    };
  },
  render(p) {
    const [left] = p.work.split(' = ');
    return {
      ...choiceParts(p),
      prompt: `小明这样简算：${p.work} = ${p.shown}。他做得对吗？`,
      hint: '括号里是加法时，乘法分配律要求括号里的每个数都和外面的数相乘。',
      steps: [
        step('乘法分配律：(a + b) × c = a × c + b × c，两个数都要乘。'),
        step(`正确的结果：${left} = ${evalText(left)}`),
        step(`所以选“${p.options[p.tags.indexOf(null)]}”。`),
      ],
      targetSeconds: 90,
    };
  },
  solve(p) {
    const [left, middle] = p.work.split(' = ');
    const correct = evalText(left);
    if (evalText(middle) === correct && p.shown === correct)
      return optionIndex(p.options, DIST_JUDGE.right);
    // (a + m) × k written as a × m × k: a product of three numbers, no addition left.
    return optionIndex(p.options, middle.includes('+') ? DIST_JUDGE.miss : DIST_JUDGE.confuse);
  },
};

const SETS = [
  { one: '一件上衣', a: [60, 150], two: '一条裤子', b: [40, 120], unit: '套' },
  { one: '一张桌子', a: [80, 200], two: '一把椅子', b: [30, 90], unit: '套' },
  { one: '一个篮球', a: [60, 150], two: '一个足球', b: [50, 120], unit: '组' },
] as const;

/** 买 n 套：哪个算式不能解决问题？ */
const notFit: ChallengeTemplate<ChoiceParams & { a: number; b: number; n: number; ctx: number }> = {
  id: 'lawmul.not-fit',
  family: 'lawmul',
  tier: 'creative',
  make(rng) {
    const ctx = rng.int(0, SETS.length - 1);
    const s = SETS[ctx];
    const a = rng.int(s.a[0], s.a[1]);
    let b = rng.int(s.b[0], s.b[1]);
    if (b === a) b += 1;
    const n = rng.int(12, 45);
    const wrong = `${a} + ${b} × ${n}`;
    const ok: Array<[string, ErrorTag]> = [
      [`(${a} + ${b}) × ${n}`, 'reasoning'],
      [`${a} × ${n} + ${b} × ${n}`, 'reasoning'],
      [`${n} × ${a} + ${n} × ${b}`, 'reasoning'],
    ];
    return { ...shuffledOptions(rng, wrong, ok), a, b, n, ctx };
  },
  render(p) {
    const s = SETS[p.ctx];
    const total = (p.a + p.b) * p.n;
    return {
      ...choiceParts(p),
      prompt: `${s.one} ${p.a} 元，${s.two} ${p.b} 元。学校买 ${p.n} ${s.unit}（每${s.unit}是${s.one}和${s.two}），一共要多少元？下面哪个算式不能解决这个问题？`,
      hint: '每个算式按运算顺序算一算，看看算的是不是“一套的钱 × 套数”或“分别算再相加”。',
      steps: [
        step(
          `可以先算一${s.unit}多少钱：(${p.a} + ${p.b}) × ${p.n}；也可以分别算再相加：${p.a} × ${p.n} + ${p.b} × ${p.n}。`,
        ),
        step(`一共 ${total} 元。`),
        step(
          `${p.options[p.tags.indexOf(null)]} 要先算乘法，算的是 ${p.n} ${s.two.slice(1)}加 1 ${s.one.slice(1)}的钱，不对。`,
        ),
      ],
      targetSeconds: 120,
    };
  },
  solve(p) {
    const total = (p.a + p.b) * p.n;
    return onlyOption(p.options, (o) => evalText(o) !== total);
  },
};

/** 填数：a × □ + a × c = a × 100；□ × b + □ × c = N。 */
const fillDist: ChallengeTemplate<{
  form: 'common-a' | 'common-box';
  a: number;
  c: number;
  b: number;
}> = {
  id: 'lawmul.fill',
  family: 'lawmul',
  tier: 'creative',
  make(rng) {
    const form = rng.chance(0.5) ? 'common-a' : 'common-box';
    const c = rng.int(11, 89);
    return form === 'common-a'
      ? { form, a: rng.int(12, 99), c, b: 0 }
      : { form, a: rng.int(12, 99), c, b: 100 - c };
  },
  render({ form, a, c, b }) {
    if (form === 'common-a') {
      return {
        widget: 'numeric',
        prompt: `□ 里填几，才能使 ${a} × □ + ${a} × ${c} = ${a * 100} 成立？`,
        answer: num(100 - c),
        hint: `${a * 100} 是 ${a} 乘几？用乘法分配律把左边合起来想一想。`,
        steps: [
          step(`左边 = ${a} × (□ + ${c})，右边 ${a * 100} = ${a} × 100。`),
          step(`所以 □ + ${c} = 100，□ = 100 − ${c} = ${100 - c}`),
        ],
        targetSeconds: 90,
      };
    }
    return {
      widget: 'numeric',
      prompt: `□ 里填同一个数，使 □ × ${b} + □ × ${c} = ${a * 100} 成立。□ 里填几？`,
      answer: num(a),
      hint: `两个积里都有 □，用乘法分配律把左边合起来：□ × (${b} + ${c})。`,
      steps: [
        step(`左边 = □ × (${b} + ${c}) = □ × 100。`),
        step(`□ × 100 = ${a * 100}，所以 □ = ${a}`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ form, a, c, b }) {
    for (let x = 1; x <= 999; x++) {
      const ok = form === 'common-a' ? a * x + a * c === a * 100 : x * b + x * c === a * 100;
      if (ok) return num(x);
    }
    throw new Error('no number fits');
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MUL_TEMPLATES: ChallengeTemplate<any>[] = [
  productChange,
  missingDigit,
  maxProduct,
  zeroCount,
  mulJudge,
  mulPattern,
  mulStar,
  enough,
  overUnder,
  whichAbout,
  whoCloser,
  bracketMax,
  shopping,
  fillOps,
  orderJudge,
  orderStar,
  gauss,
  baseNumber,
  whichLaw,
  trueEquation,
  partnerPairs,
  splitFactor,
  threeTerms,
  areaAdd,
  distJudge,
  notFit,
  fillDist,
];
