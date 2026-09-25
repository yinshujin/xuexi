import { step } from './base';
import type { ChallengeTemplate } from './challenge';
import {
  changeText,
  choiceAt,
  cmpOf,
  evalExpr,
  num,
  pickN,
  range,
  until,
} from './challenge-g2-util';

/**
 * 第一单元 100 以内数加与减（二）的拔高 / 创新题。
 *  add      进位加法（图书角、摘苹果）
 *  sub      退位减法（借阅图书、收玉米）
 * compare / addsub 在 challenge-g2-compare.ts。
 */

// ------------------------------------------------------------------ shared

/** 找规律填数：等差（period 1）或两种变化轮流（period 2）。 */
interface PatternP {
  terms: number[];
  blank: number;
  period: 1 | 2;
}

function patternTemplate(id: string, family: string, dir: 1 | -1): ChallengeTemplate<PatternP> {
  return {
    id,
    family,
    tier: 'creative',
    make(rng, d) {
      if (d >= 3 && rng.chance(0.5)) {
        // 两种变化轮流：+a、+b（加法）或 −a、+b（减法，整体变小）。
        return until(
          () => {
            const a = rng.int(5, 19);
            const b = dir === 1 ? rng.int(5, 19) : rng.int(3, a - 2);
            const steps = dir === 1 ? [a, b] : [-a, b];
            const start = dir === 1 ? rng.int(5, 30) : rng.int(70, 99);
            const terms = [start];
            for (let i = 1; i < 6; i++) terms.push(terms[i - 1] + steps[(i - 1) % 2]);
            return { terms, blank: rng.int(2, 5), period: 2 as const, a, b };
          },
          (x) => x.a !== x.b && x.terms.every((t) => t >= 1 && t <= 100),
          'alternating pattern',
        );
      }
      return until(
        () => {
          const k = rng.int(6, 19) * dir;
          const start = dir === 1 ? rng.int(5, 35) : rng.int(60, 99);
          const terms = range(0, 4).map((i) => start + i * k);
          return { terms, blank: rng.int(2, 4), period: 1 as const };
        },
        (x) => x.terms.every((t) => t >= 1 && t <= 100) && x.terms[1] % 10 !== x.terms[0] % 10,
        'pattern',
      );
    },
    render({ terms, blank, period }) {
      const shown = terms.map((t, i) => (i === blank ? '□' : String(t))).join('，');
      const prev = terms[blank - 1];
      const ans = terms[blank];
      const diff = ans - prev;
      const rule =
        period === 1
          ? `相邻两个数，后一个都比前一个${changeText(terms[1] - terms[0])}。`
          : `相邻两个数的变化是：${changeText(terms[1] - terms[0])}、${changeText(terms[2] - terms[1])}、${changeText(terms[1] - terms[0])}、${changeText(terms[2] - terms[1])}……轮流出现。`;
      return {
        widget: 'numeric',
        prompt: `找规律，在 □ 里填数：${shown}`,
        answer: num(ans),
        hint: '先看相邻两个数是怎样变化的（多了几、少了几），再照着规律往下推。',
        steps: [
          step(rule),
          step(
            `□ 前面的数是 ${prev}，${prev} ${diff > 0 ? '+' : '−'} ${Math.abs(diff)} = ${ans}。`,
          ),
          step(`再往后检查一下，规律对得上，□ 里填 ${ans}。`),
        ],
        targetSeconds: 60,
      };
    },
    solve({ terms, blank, period }) {
      const fits: number[] = [];
      for (let x = 0; x <= 100; x++) {
        const t = terms.slice();
        t[blank] = x;
        const d = t.slice(1).map((v, i) => v - t[i]);
        if (d.every((v, i) => i < period || v === d[i - period])) fits.push(x);
      }
      if (fits.length !== 1) throw new Error(`pattern: ${fits.length} fits`);
      return num(fits[0]);
    },
  };
}

/** A numbered calculation step shown to the child: x op y = r. */
type Calc = [x: number, y: number, r: number];

// ------------------------------------------------------------------ add

/** 4□ + 27 < 75，□ 里最大能填几？ */
const addMaxFill: ChallengeTemplate<{ a: number; b: number; c: number }> = {
  id: 'add.max-fill',
  family: 'add',
  tier: 'stretch',
  make(rng) {
    const a = rng.int(1, 5);
    const b = rng.int(11, 39);
    const d = rng.int(1, 8);
    return { a, b, c: a * 10 + d + b + 1 };
  },
  render({ a, b, c }) {
    const d = c - 1 - b - a * 10;
    return {
      widget: 'numeric',
      prompt: `${a}□ + ${b} < ${c}，□ 里最大能填几？`,
      answer: num(d),
      hint: '先想：和最大可以是多少？再算 □ 所在的数最大是多少。',
      steps: [
        step(`和要小于 ${c}，最大是 ${c - 1}。`),
        step(`${a}□ 最大是 ${c - 1} − ${b} = ${c - 1 - b}。`),
        step(`所以 □ 里最大填 ${d}。`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ a, b, c }) {
    for (let d = 9; d >= 0; d--) if (a * 10 + d + b < c) return num(d);
    throw new Error('no digit fits');
  },
};

/** □7 + 3□ = 82：第一个加数十位上的 □ 填几？（要先想个位有没有进位） */
const addDigits: ChallengeTemplate<{ a1: number; a0: number; b1: number; b0: number }> = {
  id: 'add.vertical-digits',
  family: 'add',
  tier: 'stretch',
  make(rng) {
    return until(
      () => ({ a1: rng.int(1, 7), a0: rng.int(1, 9), b1: rng.int(1, 7), b0: rng.int(1, 9) }),
      (p) => p.a0 + p.b0 >= 10 && p.a1 + p.b1 + 1 <= 9,
      'add digits',
    );
  },
  render({ a1, a0, b1, b0 }) {
    const A = a1 * 10 + a0;
    const B = b1 * 10 + b0;
    const S = A + B;
    return {
      widget: 'numeric',
      prompt: `在算式 □${a0} + ${b1}□ = ${S} 里，每个 □ 里填一个数字。第一个加数十位上的 □ 里填几？`,
      answer: num(a1),
      hint: '先看个位：个位相加得几？有没有满十、要不要向十位进 1？再看十位。',
      steps: [
        step(
          `先看个位：${a0} + □ 的个位是 ${S % 10}，只能是 ${a0} + ${b0} = ${a0 + b0}，满十向十位进 1。`,
        ),
        step(`再看十位：□ + ${b1} + 1（进位）= ${Math.floor(S / 10)}，所以 □ 里填 ${a1}。`),
        step(`验算：${A} + ${B} = ${S}。`),
      ],
      targetSeconds: 75,
    };
  },
  solve({ a0, b1, a1, b0 }) {
    const S = a1 * 10 + a0 + b1 * 10 + b0;
    const xs = new Set<number>();
    for (let x = 1; x <= 9; x++)
      for (let y = 0; y <= 9; y++) if (x * 10 + a0 + b1 * 10 + y === S) xs.add(x);
    if (xs.size !== 1) throw new Error('add digits not unique');
    return num([...xs][0]);
  },
};

/** 不计算，比较大小：38 + 27 ○ 40 + 25 */
interface SidesP {
  a: number;
  b: number;
  c: number;
  d: number;
}

const addCompare: ChallengeTemplate<SidesP> = {
  id: 'add.compare-no-calc',
  family: 'add',
  tier: 'stretch',
  minDifficulty: 2,
  make(rng) {
    return until(
      () => {
        const a = rng.int(21, 58);
        const b = rng.int(12, 39);
        const form = rng.int(0, 2);
        const k = rng.int(1, 4);
        const j = rng.int(1, 5);
        const [c, d] =
          form === 0
            ? [a, b + rng.pick([-3, -2, -1, 1, 2, 3])]
            : form === 1
              ? [a + k, b - k]
              : [a + k, b - j];
        return rng.chance(0.5) ? { a, b, c, d } : { a: c, b: d, c: a, d: b };
      },
      (p) =>
        p.a + p.b <= 99 &&
        p.c + p.d <= 99 &&
        (p.a % 10) + (p.b % 10) >= 10 &&
        p.b >= 10 &&
        p.d >= 10 &&
        !(p.a === p.c && p.b === p.d),
      'add compare',
    );
  },
  render({ a, b, c, d }) {
    const net = c - a + (d - b);
    return {
      widget: 'compare',
      prompt: `不计算，比较大小：${a} + ${b} ○ ${c} + ${d}`,
      answer: cmpOf(a + b, c + d),
      hint: '不用算出得数：比一比两边的加数，右边的加数比左边多了还是少了？',
      steps: [
        step(`和左边比，右边第一个加数${changeText(c - a)}，第二个加数${changeText(d - b)}。`),
        step(
          net === 0
            ? '一边多几、一边少几，正好抵消，两边的和一样大。'
            : `合起来，右边的和比左边${changeText(net)}。`,
        ),
        step(`所以 ${a} + ${b} ${net > 0 ? '<' : net < 0 ? '>' : '='} ${c} + ${d}。`),
      ],
      targetSeconds: 45,
    };
  },
  solve({ a, b, c, d }) {
    return cmpOf(evalExpr(`${a} + ${b}`), evalExpr(`${c} + ${d}`));
  },
};

/** 从几个数中选两个相加：和大于 t / 和是整十数，有几种选法？ */
const addPickPairs: ChallengeTemplate<{ nums: number[]; mode: 'gt' | 'tens'; t: number }> = {
  id: 'add.pick-pairs',
  family: 'add',
  tier: 'creative',
  make(rng, d) {
    const n = d >= 3 ? 5 : 4;
    const mode = rng.chance(0.5) ? ('gt' as const) : ('tens' as const);
    return until(
      () => {
        const nums = pickN(
          rng,
          range(12, 49).filter((x) => x % 10 !== 0),
          n,
        ).sort((x, y) => x - y);
        return { nums, mode, t: mode === 'gt' ? rng.int(11, 18) * 5 : 0 };
      },
      (p) => {
        let c = 0;
        let pairs = 0;
        for (let i = 0; i < p.nums.length; i++)
          for (let j = i + 1; j < p.nums.length; j++) {
            pairs++;
            const s = p.nums[i] + p.nums[j];
            if (p.mode === 'gt' ? s > p.t : s % 10 === 0) c++;
          }
        return c >= 1 && c < pairs && (p.mode === 'gt' || c <= 3);
      },
      'pick pairs',
    );
  },
  render({ nums, mode, t }) {
    const ok: string[] = [];
    for (let i = 0; i < nums.length; i++)
      for (let j = i + 1; j < nums.length; j++) {
        const s = nums[i] + nums[j];
        if (mode === 'gt' ? s > t : s % 10 === 0) ok.push(`${nums[i]} + ${nums[j]} = ${s}`);
      }
    return {
      widget: 'numeric',
      prompt:
        mode === 'gt'
          ? `从 ${nums.join('、')} 中任选两个数相加，和大于 ${t} 的有几种选法？`
          : `从 ${nums.join('、')} 中任选两个数相加，和是整十数的有几种选法？`,
      answer: num(ok.length),
      hint:
        mode === 'gt'
          ? '按顺序配对：先用第一个数和后面每个数配，再用第二个数和后面的数配……不重复，不遗漏。'
          : '和是整十数，个位上的两个数要正好凑成 10。按顺序一对一对地找。',
      steps: [
        step('按顺序一对一对地试，不重复，也不遗漏。'),
        step(`符合要求的有：${ok.join('，')}。`),
        step(`一共 ${ok.length} 种选法。`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ nums, mode, t }) {
    let c = 0;
    for (const x of nums)
      for (const y of nums) if (x < y && (mode === 'gt' ? x + y > t : (x + y) % 10 === 0)) c++;
    return num(c);
  },
};

/** 判断小明的口算过程哪一步错了（进位）。 */
interface JudgeAddP {
  a: number;
  b: number;
  shown: [Calc, Calc, Calc];
  /** index of the wrong step, -1 when all right */
  wrong: number;
}

const JUDGE_ADD_OPTIONS = ['第①步错了', '第②步错了', '第③步错了', '每一步都对'];

const addJudge: ChallengeTemplate<JudgeAddP> = {
  id: 'add.judge-steps',
  family: 'add',
  tier: 'creative',
  make(rng) {
    const { a, b } = until(
      () => ({ a: rng.int(12, 69), b: rng.int(12, 39) }),
      (p) => (p.a % 10) + (p.b % 10) >= 10 && p.a + p.b <= 99,
      'judge add',
    );
    const tens = Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10;
    const s1: Calc = [Math.floor(a / 10) * 10, Math.floor(b / 10) * 10, tens];
    const units = (a % 10) + (b % 10);
    const kind = rng.int(0, 2);
    if (kind === 1) {
      // 个位相加只写了个位上的数（丢了满十的 1 个十）
      const r2 = units - 10;
      return { a, b, shown: [s1, [a % 10, b % 10, r2], [tens, r2, tens + r2]], wrong: 1 };
    }
    if (kind === 2) {
      // 最后合起来时忘了进上来的十
      return {
        a,
        b,
        shown: [s1, [a % 10, b % 10, units], [tens, units, tens + units - 10]],
        wrong: 2,
      };
    }
    return { a, b, shown: [s1, [a % 10, b % 10, units], [tens, units, tens + units]], wrong: -1 };
  },
  render({ a, b, shown, wrong }) {
    const [s1, s2, s3] = shown;
    const answer = wrong === -1 ? 3 : wrong;
    return {
      widget: 'choice',
      prompt: `小明这样口算 ${a} + ${b}：\n① ${s1[0]} + ${s1[1]} = ${s1[2]}\n② ${s2[0]} + ${s2[1]} = ${s2[2]}\n③ ${s3[0]} + ${s3[1]} = ${s3[2]}\n他哪一步错了？`,
      options: JUDGE_ADD_OPTIONS,
      optionTags: JUDGE_ADD_OPTIONS.map((_, i) =>
        i === answer ? null : i === 3 ? 'carry-missed' : 'reasoning',
      ),
      answer: choiceAt(answer),
      hint: '一步一步检查：每一步的算式本身对不对？个位满十的那个“十”有没有加上？',
      steps: [
        step(
          `${a} + ${b}：先算整十 ${s1[0]} + ${s1[1]} = ${s1[2]}，再算个位 ${a % 10} + ${b % 10} = ${(a % 10) + (b % 10)}。`,
        ),
        step(`合起来：${s1[2]} + ${(a % 10) + (b % 10)} = ${a + b}。`),
        step(
          wrong === -1
            ? '小明每一步都算对了。'
            : wrong === 1
              ? `第②步错了：${a % 10} + ${b % 10} = ${(a % 10) + (b % 10)}，满十了，不能只写 ${s2[2]}。`
              : `第③步错了：${s3[0]} + ${s3[1]} = ${s3[0] + s3[1]}，个位满十要进 1，不是 ${s3[2]}。`,
        ),
      ],
      targetSeconds: 60,
    };
  },
  solve({ a, b, shown }) {
    const [s1, s2, s3] = shown;
    const ok = [
      s1[0] === Math.floor(a / 10) * 10 &&
        s1[1] === Math.floor(b / 10) * 10 &&
        s1[0] + s1[1] === s1[2],
      s2[0] === a % 10 && s2[1] === b % 10 && s2[0] + s2[1] === s2[2],
      s3[0] === s1[2] && s3[1] === s2[2] && s3[0] + s3[1] === s3[2],
    ];
    const first = ok.indexOf(false);
    if (first >= 0) return choiceAt(first);
    if (s3[2] !== a + b) throw new Error('judge add: inconsistent');
    return choiceAt(3);
  },
};

/** 用四张数字卡片摆两个两位数，和最小是多少？ */
const addCards: ChallengeTemplate<{ digits: number[] }> = {
  id: 'add.digit-cards',
  family: 'add',
  tier: 'creative',
  minDifficulty: 3,
  make(rng) {
    return until(
      () => ({ digits: pickN(rng, range(1, 9), 4) }),
      ({ digits }) => {
        const s = digits.slice().sort((x, y) => x - y);
        return 10 * (s[0] + s[1]) + s[2] + s[3] <= 99 && s[0] + s[1] >= 3;
      },
      'digit cards',
    );
  },
  render({ digits }) {
    const s = digits.slice().sort((x, y) => x - y);
    const sum = 10 * (s[0] + s[1]) + s[2] + s[3];
    return {
      widget: 'numeric',
      prompt: `用 ${digits.join('、')} 四张数字卡片摆成两个两位数（每张卡片都要用，只能用一次）。这两个两位数的和最小是多少？`,
      answer: num(sum),
      hint: '和的大小主要看十位：十位上放哪两张卡片，和才最小？',
      steps: [
        step(`十位上的数表示几个十，要让和最小，十位放最小的两张：${s[0]} 和 ${s[1]}。`),
        step(`个位放剩下的 ${s[2]} 和 ${s[3]}。`),
        step(`例如 ${s[0] * 10 + s[2]} + ${s[1] * 10 + s[3]} = ${sum}，和最小是 ${sum}。`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ digits }) {
    let best = Infinity;
    for (const p of permutations(digits))
      best = Math.min(best, p[0] * 10 + p[1] + p[2] * 10 + p[3]);
    return num(best);
  },
};

function permutations(xs: number[]): number[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) =>
    permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]),
  );
}

// ------------------------------------------------------------------ sub

/** 7□ − 38 > 35，□ 里最小能填几？ */
const subMinFill: ChallengeTemplate<{ a: number; b: number; c: number }> = {
  id: 'sub.min-fill',
  family: 'sub',
  tier: 'stretch',
  make(rng) {
    return until(
      () => {
        const a = rng.int(5, 9);
        const b = rng.int(12, 49);
        const d = rng.int(1, 9);
        return { a, b, c: a * 10 + d - b - 1, d };
      },
      (p) => p.c >= 10 && p.d < (p.b % 10) + 3,
      'sub min fill',
    );
  },
  render({ a, b, c }) {
    const d = c + 1 + b - a * 10;
    return {
      widget: 'numeric',
      prompt: `${a}□ − ${b} > ${c}，□ 里最小能填几？`,
      answer: num(d),
      hint: '先想：差最小可以是多少？被减数 = 差 + 减数。',
      steps: [
        step(`差要大于 ${c}，最小是 ${c + 1}。`),
        step(`${a}□ 最小是 ${c + 1} + ${b} = ${c + 1 + b}。`),
        step(`所以 □ 里最小填 ${d}。`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ a, b, c }) {
    for (let d = 0; d <= 9; d++) if (a * 10 + d - b > c) return num(d);
    throw new Error('no digit fits');
  },
};

/** 8□ − □7 = 38：减数十位上的 □ 填几？（个位要退位） */
const subDigits: ChallengeTemplate<{ m1: number; m0: number; s1: number; s0: number }> = {
  id: 'sub.vertical-digits',
  family: 'sub',
  tier: 'stretch',
  make(rng) {
    return until(
      () => ({ m1: rng.int(4, 9), m0: rng.int(0, 8), s1: rng.int(1, 7), s0: rng.int(1, 9) }),
      (p) => p.m0 < p.s0 && p.m1 - 1 - p.s1 >= 1,
      'sub digits',
    );
  },
  render({ m1, m0, s1, s0 }) {
    const M = m1 * 10 + m0;
    const S = s1 * 10 + s0;
    const D = M - S;
    return {
      widget: 'numeric',
      prompt: `在算式 ${m1}□ − □${s0} = ${D} 里，每个 □ 里填一个数字。减数十位上的 □ 里填几？`,
      answer: num(s1),
      hint: '先看个位：被减数的个位够不够减？不够减就要从十位退 1，十位上就少了 1。',
      steps: [
        step(
          `先看个位：${s0} + ${D % 10} = ${s0 + (D % 10)}，所以被减数的个位是 ${m0}。${m0} 减 ${s0} 不够减，要从十位退 1：${10 + m0} − ${s0} = ${D % 10}。`,
        ),
        step(
          `再看十位：退 1 后剩 ${m1} − 1 = ${m1 - 1}，${m1 - 1} − □ = ${Math.floor(D / 10)}，所以 □ 里填 ${s1}。`,
        ),
        step(`验算：${M} − ${S} = ${D}。`),
      ],
      targetSeconds: 75,
    };
  },
  solve({ m1, m0, s1, s0 }) {
    const D = m1 * 10 + m0 - (s1 * 10 + s0);
    const ys = new Set<number>();
    for (let x = 0; x <= 9; x++)
      for (let y = 1; y <= 9; y++) if (m1 * 10 + x - (y * 10 + s0) === D) ys.add(y);
    if (ys.size !== 1) throw new Error('sub digits not unique');
    return num([...ys][0]);
  },
};

/** 把减数 36 看成了 63，得 19，正确的差是多少？ */
const subMisread: ChallengeTemplate<{ m: number; s: number }> = {
  id: 'sub.misread',
  family: 'sub',
  tier: 'stretch',
  minDifficulty: 3,
  make(rng) {
    return until(
      () => {
        const t = rng.int(1, 8);
        const u = rng.int(1, 9);
        return { m: rng.int(40, 99), s: t * 10 + u };
      },
      ({ m, s }) => {
        const r = rev(s);
        return s % 10 !== Math.floor(s / 10) && m - Math.max(s, r) >= 5;
      },
      'misread',
    );
  },
  render({ m, s }) {
    const r = rev(s);
    return {
      widget: 'numeric',
      prompt: `小马虎算一道减法题，把减数 ${s} 看成了 ${r}，算出的差是 ${m - r}。正确的差是多少？`,
      answer: num(m - s),
      hint: '先用看错的算式求出被减数，再用正确的减数去减。',
      steps: [
        step(`被减数没有看错：被减数 = 差 + 减数 = ${m - r} + ${r} = ${m}。`),
        step(`正确的差：${m} − ${s} = ${m - s}。`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ m, s }) {
    const r = rev(s);
    const wrongDiff = m - r;
    for (let M = 0; M <= 100; M++) if (M - r === wrongDiff) return num(M - s);
    throw new Error('misread: no minuend');
  },
};

function rev(n: number): number {
  return (n % 10) * 10 + Math.floor(n / 10);
}

/** 不计算，比较大小：72 − 28 ○ 74 − 30 */
const subCompare: ChallengeTemplate<SidesP> = {
  id: 'sub.compare-no-calc',
  family: 'sub',
  tier: 'stretch',
  minDifficulty: 2,
  make(rng) {
    return until(
      () => {
        const a = rng.int(41, 95);
        const b = rng.int(12, 39);
        const form = rng.int(0, 2);
        const k = rng.int(1, 4);
        const j = rng.int(1, 5);
        const [c, d] =
          form === 0
            ? [a, b + rng.pick([-3, -2, -1, 1, 2, 3])]
            : form === 1
              ? [a + k, b + k]
              : [a + k, b + j];
        return rng.chance(0.5) ? { a, b, c, d } : { a: c, b: d, c: a, d: b };
      },
      (p) =>
        p.a <= 99 &&
        p.c <= 99 &&
        p.a % 10 < p.b % 10 &&
        p.b >= 10 &&
        p.d >= 10 &&
        p.a - p.b >= 10 &&
        p.c - p.d >= 10 &&
        !(p.a === p.c && p.b === p.d),
      'sub compare',
    );
  },
  render({ a, b, c, d }) {
    const dm = c - a;
    const ds = d - b;
    const net = dm - ds;
    const lines = [
      step(`和左边比，右边的被减数${changeText(dm)}，减数${changeText(ds)}。`),
      step(
        '被减数多几，差就多几；减数多几，差反而少几。' +
          (net === 0
            ? '两边的变化正好抵消，差一样大。'
            : `合起来，右边的差比左边${changeText(net)}。`),
      ),
      step(`所以 ${a} − ${b} ${net > 0 ? '<' : net < 0 ? '>' : '='} ${c} − ${d}。`),
    ];
    return {
      widget: 'compare',
      prompt: `不计算，比较大小：${a} − ${b} ○ ${c} − ${d}`,
      answer: cmpOf(a - b, c - d),
      hint: '不用算出得数：被减数变大，差就变大；减数变大，差反而变小。',
      steps: lines,
      targetSeconds: 45,
    };
  },
  solve({ a, b, c, d }) {
    return cmpOf(evalExpr(`${a} − ${b}`), evalExpr(`${c} − ${d}`));
  },
};

/** 判断退位减法的竖式过程哪一步错了。 */
interface JudgeSubP {
  a: number;
  b: number;
  shown: [Calc, Calc];
  wrong: number;
}

const JUDGE_SUB_OPTIONS = ['第①步错了', '第②步错了', '两步都对'];

const subJudge: ChallengeTemplate<JudgeSubP> = {
  id: 'sub.judge-steps',
  family: 'sub',
  tier: 'creative',
  make(rng) {
    const { a, b } = until(
      () => ({ a: rng.int(30, 98), b: rng.int(12, 69) }),
      (p) => p.a % 10 < p.b % 10 && Math.floor(p.a / 10) - 1 > Math.floor(p.b / 10),
      'judge sub',
    );
    const [a1, a0, b1, b0] = [Math.floor(a / 10), a % 10, Math.floor(b / 10), b % 10];
    const kind = rng.int(0, 2);
    if (kind === 0) {
      // 个位倒着减（大数减小数），十位也就没有退位
      return {
        a,
        b,
        shown: [
          [b0, a0, b0 - a0],
          [a1, b1, a1 - b1],
        ],
        wrong: 0,
      };
    }
    if (kind === 1) {
      // 个位退位了，十位忘了减去退掉的 1
      return {
        a,
        b,
        shown: [
          [10 + a0, b0, 10 + a0 - b0],
          [a1, b1, a1 - b1],
        ],
        wrong: 1,
      };
    }
    return {
      a,
      b,
      shown: [
        [10 + a0, b0, 10 + a0 - b0],
        [a1 - 1, b1, a1 - 1 - b1],
      ],
      wrong: -1,
    };
  },
  render({ a, b, shown, wrong }) {
    const [u, t] = shown;
    const a0 = a % 10;
    const unitsText =
      u[0] === 10 + a0
        ? `个位：${a0} 减 ${b % 10} 不够减，从十位退 1，${u[0]} − ${u[1]} = ${u[2]}`
        : `个位：${u[0]} − ${u[1]} = ${u[2]}`;
    const result = t[2] * 10 + u[2];
    const answer = wrong === -1 ? 2 : wrong;
    return {
      widget: 'choice',
      prompt: `小红用竖式计算 ${a} − ${b}，她是这样想的：\n① ${unitsText}\n② 十位：${t[0]} − ${t[1]} = ${t[2]}\n所以 ${a} − ${b} = ${result}。她哪一步错了？`,
      options: JUDGE_SUB_OPTIONS,
      optionTags: JUDGE_SUB_OPTIONS.map((_, i) =>
        i === answer ? null : i === 2 ? 'borrow-missed' : 'reasoning',
      ),
      answer: choiceAt(answer),
      hint: '个位不够减时要从十位退 1，十位上的数就要先减去 1。一步一步检查。',
      steps: [
        step(
          `个位：${a0} 减 ${b % 10} 不够减，从十位退 1，${10 + a0} − ${b % 10} = ${10 + a0 - (b % 10)}。`,
        ),
        step(
          `十位：退 1 后是 ${Math.floor(a / 10) - 1}，${Math.floor(a / 10) - 1} − ${Math.floor(b / 10)} = ${Math.floor(a / 10) - 1 - Math.floor(b / 10)}，所以 ${a} − ${b} = ${a - b}。`,
        ),
        step(
          wrong === -1
            ? '小红两步都算对了。'
            : wrong === 0
              ? `第①步错了：不能用 ${b % 10} − ${a0}，个位不够减要从十位退 1。`
              : '第②步错了：十位已经退给个位 1，要先减去 1 再算。',
        ),
      ],
      targetSeconds: 60,
    };
  },
  solve({ a, b, shown }) {
    const [u, t] = shown;
    const ok = [
      u[0] === 10 + (a % 10) && u[1] === b % 10 && u[0] - u[1] === u[2],
      t[0] === Math.floor(a / 10) - 1 && t[1] === Math.floor(b / 10) && t[0] - t[1] === t[2],
    ];
    const first = ok.indexOf(false);
    if (first >= 0) return choiceAt(first);
    if (t[2] * 10 + u[2] !== a - b) throw new Error('judge sub: inconsistent');
    return choiceAt(2);
  },
};

/** 一个两位数（十位个位相同 / 个位是几）减去 b，差比 c 大，这样的数有几个？ */
const subCount: ChallengeTemplate<{ kind: 'same' | 'unit'; u: number; b: number; c: number }> = {
  id: 'sub.count-numbers',
  family: 'sub',
  tier: 'creative',
  make(rng) {
    return until(
      () => ({
        kind: rng.chance(0.5) ? ('same' as const) : ('unit' as const),
        u: rng.int(1, 9),
        b: rng.int(12, 39),
        c: rng.int(10, 50),
      }),
      (p) => {
        const n = subCountList(p).length;
        return n >= 1 && n <= 6 && p.b + p.c <= 90;
      },
      'sub count',
    );
  },
  render(p) {
    const list = subCountList(p);
    return {
      widget: 'numeric',
      prompt:
        p.kind === 'same'
          ? `一个两位数，十位和个位上的数字相同。它减去 ${p.b}，差比 ${p.c} 大。这样的两位数有几个？`
          : `一个两位数，个位上是 ${p.u}。它减去 ${p.b}，差比 ${p.c} 大。这样的两位数有几个？`,
      answer: num(list.length),
      hint: '差比几大，被减数就要比“那个数 + 减数”大。先算出这个数，再一个一个找。',
      steps: [
        step(`差比 ${p.c} 大，这个两位数要比 ${p.c} + ${p.b} = ${p.c + p.b} 大。`),
        step(`符合条件的有：${list.join('、')}。`),
        step(`一共 ${list.length} 个。`),
      ],
      targetSeconds: 90,
    };
  },
  solve(p) {
    let c = 0;
    for (let n = 10; n <= 99; n++) {
      const t = Math.floor(n / 10);
      const u = n % 10;
      const has = p.kind === 'same' ? t === u : u === p.u;
      if (has && n - p.b > p.c) c++;
    }
    return num(c);
  },
};

function subCountList(p: { kind: 'same' | 'unit'; u: number; b: number; c: number }): number[] {
  const all =
    p.kind === 'same' ? range(1, 9).map((t) => t * 11) : range(1, 9).map((t) => t * 10 + p.u);
  return all.filter((n) => n > p.b + p.c);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ADDSUB_TEMPLATES: ChallengeTemplate<any>[] = [
  addMaxFill,
  addDigits,
  addCompare,
  addPickPairs,
  patternTemplate('add.pattern', 'add', 1),
  addJudge,
  addCards,
  subMinFill,
  subDigits,
  subMisread,
  subCompare,
  subJudge,
  subCount,
  patternTemplate('sub.pattern', 'sub', -1),
];
