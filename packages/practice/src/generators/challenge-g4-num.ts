import { readChineseNumber } from '../chinese';
import type { Rng } from '../rng';
import { step } from './base';
import type { ChallengeTemplate } from './challenge';
import { shuffledOptions } from './challenge';
import {
  arrangements,
  choiceParts,
  fromDigits,
  num,
  onlyOption,
  type ChoiceParams,
} from './challenge-g4-util';

/**
 * 四年级上册 第一单元 认识更大的数：
 *   bignum — 计数单位、读写大数、比较大小
 *   approx — 近似数（四舍五入、改写）
 */

const UNIT = ['一', '十', '百', '千', '万', '十万', '百万', '千万', '亿'];

/** Distinct digits from `from..9`, in random order. */
function distinctDigits(rng: Rng, k: number, from = 1): number[] {
  const pool: number[] = [];
  for (let d = from; d <= 9; d++) pool.push(d);
  return rng.shuffle(pool).slice(0, k);
}

const zerosRead = (n: number): number => (readChineseNumber(n).match(/零/g) ?? []).length;

/**
 * How many 零 a number reads, by the digit rule (independent of readChineseNumber):
 * each run of zeros between two non-zero digits reads one 零, except a run that
 * sits only at the end of a level, right before the next level's 千位.
 */
function zerosByRule(n: number): number {
  const d = String(n).split('').reverse().map(Number); // d[i] = digit at place i
  const nonzero = d.flatMap((x, i) => (x !== 0 ? [i] : []));
  let count = 0;
  for (let k = 0; k + 1 < nonzero.length; k++) {
    const lo = nonzero[k];
    const hi = nonzero[k + 1];
    if (hi - lo === 1) continue; // no zeros in between
    const quietAtLevelEnd = lo % 4 === 3 && hi <= lo + 4;
    if (!quietAtLevelEnd) count++;
  }
  return count;
}

// ---------------------------------------------------------------- bignum · 拔高

/** 用 8 张卡片（含 0）组成一个零也不读的最小八位数。 */
const cardsNoZeroMin: ChallengeTemplate<{ nonzero: number[]; zeros: number }> = {
  id: 'bignum.cards-no-zero-min',
  family: 'bignum',
  tier: 'stretch',
  minDifficulty: 2,
  make(rng) {
    const zeros = rng.int(2, 4);
    return { nonzero: distinctDigits(rng, 8 - zeros).sort((a, b) => a - b), zeros };
  },
  render({ nonzero, zeros }) {
    const inHigh = Math.min(zeros, 3);
    const high = [...nonzero.slice(0, 4 - inHigh), ...Array(inHigh).fill(0)];
    const low = [...nonzero.slice(4 - inHigh), ...Array(zeros - inHigh).fill(0)];
    const value = fromDigits([...high, ...low]);
    const cards = [...Array(zeros).fill(0), ...nonzero].join('、');
    return {
      widget: 'numeric',
      prompt: `用 ${cards} 这 8 张数字卡片组成一个八位数（卡片都要用上），要求读的时候一个“零”也不读。这样的数最小是多少？`,
      answer: num(value),
      hint: '想一想：0 放在每一级的什么位置，读的时候就不读出来？',
      steps: [
        step('每一级末尾的 0 都不读，所以 0 只能放在万级或个级的末尾。'),
        step(`最高位放最小的 ${nonzero[0]}；万级后面尽量多放 0，万级是 ${high.join('')}。`),
        step(`个级要从非 0 的数字开始，剩下的数字从小到大排：${low.join('')}。`),
        step(`最小是 ${value}，读作${readChineseNumber(value)}。`),
      ],
      targetSeconds: 120,
    };
  },
  solve({ nonzero, zeros }) {
    // Arrangements come out in increasing order; the first one reading no 零 is the smallest.
    for (const ds of arrangements([...Array(zeros).fill(0), ...nonzero])) {
      if (ds[0] === 0) continue;
      const n = fromDigits(ds);
      if (zerosByRule(n) === 0) return num(n);
    }
    throw new Error('no arrangement fits');
  },
};

/** 3600 个万是多少个百万？ */
const unitConvert: ChallengeTemplate<{ small: number; big: number; m: number }> = {
  id: 'bignum.unit-convert',
  family: 'bignum',
  tier: 'stretch',
  make(rng) {
    const small = rng.int(3, 5);
    const big = rng.int(small + 1, Math.min(small + 3, 8));
    let m = rng.int(2, 99);
    if (m % 10 === 0) m += rng.int(1, 9);
    return { small, big, m };
  },
  render({ small, big, m }) {
    const gap = big - small;
    const count = m * 10 ** gap;
    const value = count * 10 ** small;
    return {
      widget: 'numeric',
      prompt: `${count} 个${UNIT[small]}是多少个${UNIT[big]}？`,
      answer: num(m),
      hint: `先把 ${count} 个${UNIT[small]}写成一个数，再看它里面有几个${UNIT[big]}。`,
      steps: [
        step(`${count} 个${UNIT[small]}是 ${value}。`),
        step(
          `从${UNIT[small]}到${UNIT[big]}要进 ${gap} 次十，${UNIT[big]}位和它左边的数合起来是 ${m}。`,
        ),
        step(`所以是 ${m} 个${UNIT[big]}。`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ small, big, m }) {
    const value = m * 10 ** (big - small) * 10 ** small;
    return num(value / 10 ** big);
  },
};

/** 比 3975300 大、比 4030000 小的整万数有几个？ */
const betweenCount: ChallengeTemplate<{ a: number; b: number }> = {
  id: 'bignum.between-count',
  family: 'bignum',
  tier: 'stretch',
  make(rng) {
    const pivot = rng.chance(0.5) ? rng.int(2, 9) * 1_000_000 : rng.int(11, 99) * 100_000;
    const below = rng.int(1, 4);
    const above = rng.int(1, 4);
    return { a: pivot - below * 10_000 - rng.int(1, 9999), b: pivot + above * 10_000 };
  },
  render({ a, b }) {
    const first = Math.ceil(a / 10_000) * 10_000;
    const list: number[] = [];
    for (let n = first; n < b; n += 10_000) list.push(n);
    return {
      widget: 'numeric',
      prompt: `比 ${a} 大、比 ${b} 小的整万数有几个？`,
      answer: num(list.length),
      hint: '先找出比第一个数大的最小整万数，再一个一个往后数，注意不要超过第二个数。',
      steps: [
        step(`比 ${a} 大的最小整万数是 ${first}。`),
        step(`依次是：${list.join('、')}。`),
        step(`${b} 本身不算（要比它小），一共有 ${list.length} 个。`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ a, b }) {
    let c = 0;
    for (let n = 0; n <= b; n += 10_000) if (n > a && n < b) c++;
    return num(c);
  },
};

// ---------------------------------------------------------------- bignum · 创新

/** 用 a、b 和几个 0 组成 L 位数，一个零也不读 / 只读一个零的有几个？ */
const zeroReadCount: ChallengeTemplate<{ a: number; b: number; len: number; want: 0 | 1 }> = {
  id: 'bignum.zero-read-count',
  family: 'bignum',
  tier: 'creative',
  make(rng) {
    const [a, b] = distinctDigits(rng, 2).sort((x, y) => x - y);
    return { a, b, len: rng.int(6, 8), want: rng.int(0, 1) as 0 | 1 };
  },
  render({ a, b, len, want }) {
    const all = [...arrangements([a, b, ...Array(len - 2).fill(0)])]
      .filter((ds) => ds[0] !== 0)
      .map(fromDigits);
    const hits = all.filter((n) => zerosRead(n) === want);
    const need = want === 0 ? '一个“零”也不读' : '只读一个“零”';
    return {
      widget: 'numeric',
      prompt: `用 ${a}、${b} 和 ${len - 2} 个 0 组成${['', '', '', '', '', '', '六', '七', '八'][len]}位数（卡片都要用上），读的时候${need}的数有几个？`,
      answer: num(hits.length),
      hint: '最高位不能是 0。有序地摆：先定最高位，再移动另一个数字的位置，每摆一个就读一读。',
      steps: [
        step(
          `最高位是 ${a} 或 ${b}，另一个数字可以放在后面 ${len - 1} 个数位中的任意一位，一共 ${all.length} 个数。`,
        ),
        step('每级末尾的 0 不读，其他地方连着的 0 只读一个“零”。'),
        step(`${need}的是：${hits.map((n) => `${n}（${readChineseNumber(n)}）`).join('、')}。`),
        step(`一共 ${hits.length} 个。`),
      ],
      targetSeconds: 180,
    };
  },
  solve({ a, b, len, want }) {
    let c = 0;
    for (const hi of [a, b]) {
      const lo = hi === a ? b : a;
      for (let place = 0; place < len - 1; place++) {
        const n = hi * 10 ** (len - 1) + lo * 10 ** place;
        if (zerosByRule(n) === want) c++;
      }
    }
    return num(c);
  },
};

/** 用六张卡片组成最接近 50 万的六位数。 */
const closestTo: ChallengeTemplate<{ cards: number[]; t: number }> = {
  id: 'bignum.closest',
  family: 'bignum',
  tier: 'creative',
  minDifficulty: 2,
  make(rng) {
    for (;;) {
      const t = rng.int(2, 8);
      const cards = distinctDigits(rng, 6, 0).sort((x, y) => x - y);
      const lower = cards.filter((d) => d !== 0 && d < t);
      const upper = cards.filter((d) => d >= t);
      if (lower.length === 0 || upper.length === 0) continue;
      const { above, below } = candidates(cards, t);
      if (above - t * 100_000 !== t * 100_000 - below) return { cards, t };
    }
  },
  render({ cards, t }) {
    const target = t * 100_000;
    const { above, below } = candidates(cards, t);
    const best = above - target < target - below ? above : below;
    return {
      widget: 'numeric',
      prompt: `用 ${cards.join('、')} 这六张数字卡片组成一个六位数（每张都要用上），最接近 ${t}0 万的数是多少？`,
      answer: num(best),
      hint: `分两种情况想：比 ${t}0 万大一点的数怎么摆最小？比 ${t}0 万小一点的数怎么摆最大？`,
      steps: [
        step(`比 ${target} 大的数里最小的：${above}，相差 ${above - target}。`),
        step(`比 ${target} 小的数里最大的：${below}，相差 ${target - below}。`),
        step(`相差越少越接近，所以是 ${best}。`),
      ],
      targetSeconds: 180,
    };
  },
  solve({ cards, t }) {
    let best = -1;
    let bestGap = Infinity;
    for (const ds of arrangements(cards)) {
      if (ds[0] === 0) continue;
      const n = fromDigits(ds);
      const gap = Math.abs(n - t * 100_000);
      if (gap < bestGap) {
        best = n;
        bestGap = gap;
      }
    }
    return num(best);
  },
};

function candidates(cards: number[], t: number): { above: number; below: number } {
  const up = cards.filter((d) => d >= t)[0];
  const restUp = cards.filter((d) => d !== up); // ascending
  const down = cards.filter((d) => d !== 0 && d < t).slice(-1)[0];
  const restDown = cards.filter((d) => d !== down).reverse();
  return { above: fromDigits([up, ...restUp]), below: fromDigits([down, ...restDown]) };
}

/** 下面哪个数读的时候要读出两个“零”？ */
const zeroReadingChoice: ChallengeTemplate<ChoiceParams & { want: number }> = {
  id: 'bignum.zero-reading-choice',
  family: 'bignum',
  tier: 'creative',
  make(rng) {
    const want = rng.int(0, 2);
    const sample = () => {
      const len = rng.int(7, 9);
      let s = String(rng.int(1, 9));
      for (let i = 1; i < len; i++) s += rng.chance(0.5) ? '0' : String(rng.int(1, 9));
      return Number(s);
    };
    let right = sample();
    while (zerosRead(right) !== want) right = sample();
    const wrong = new Set<number>();
    while (wrong.size < 3) {
      const n = sample();
      if (zerosRead(n) !== want && n !== right) wrong.add(n);
    }
    const { options, tags } = shuffledOptions(
      rng,
      String(right),
      [...wrong].map((n) => [String(n), 'zero-reading'] as [string, 'zero-reading']),
    );
    return { options, tags, want };
  },
  render(p) {
    const need = ['一个“零”也不读', '只读一个“零”', '要读出两个“零”'][p.want];
    return {
      ...choiceParts(p),
      prompt: `下面哪个数读的时候${need}？`,
      hint: '先从右往左四位一级分好级，再想：每级末尾的 0 不读，中间连着的 0 只读一个“零”。',
      steps: [
        ...p.options.map((o) => step(`${o} 读作${readChineseNumber(Number(o))}。`)),
        step(`${need}的是 ${p.options[p.tags.indexOf(null)]}。`),
      ],
      targetSeconds: 120,
    };
  },
  solve(p) {
    return onlyOption(p.options, (o) => zerosByRule(Number(o)) === p.want);
  },
};

// ---------------------------------------------------------------- approx · 拔高

/** 一个五位数，四舍五入到万位约是 5 万，这个数最大 / 最小是多少？ */
const approxBound: ChallengeTemplate<{ w: number; max: boolean }> = {
  id: 'approx.bound',
  family: 'approx',
  tier: 'stretch',
  make(rng) {
    return { w: rng.int(2, 9), max: rng.int(0, 1) === 1 };
  },
  render({ w, max }) {
    const value = max ? w * 10000 + 4999 : (w - 1) * 10000 + 5000;
    return {
      widget: 'numeric',
      prompt: `一个五位数，四舍五入到万位约是 ${w} 万。这个数${max ? '最大' : '最小'}是多少？`,
      answer: num(value),
      hint: max
        ? '“四舍”：千位最大能是几？后面的数位呢？'
        : '“五入”：从哪个数进上来？千位最小是几？',
      steps: max
        ? [
            step(`约是 ${w} 万，最大时是“四舍”得来的：万位是 ${w}，千位最大是 4。`),
            step(`后面各位都取 9，最大是 ${value}。`),
          ]
        : [
            step(`最小时是“五入”得来的：万位是 ${w - 1}，千位最小是 5。`),
            step(`后面各位都取 0，最小是 ${value}。`),
          ],
      targetSeconds: 60,
    };
  },
  solve({ w, max }) {
    const fits = (n: number) => Math.round(n / 10000) === w;
    if (max) {
      for (let n = 99999; n >= 10000; n--) if (fits(n)) return num(n);
    } else {
      for (let n = 10000; n <= 99999; n++) if (fits(n)) return num(n);
    }
    throw new Error('no number fits');
  },
};

/** 3□6820 ≈ 40 万，□ 里填几？ */
const fillDigit: ChallengeTemplate<{ a: number; d: number; q: number; tail: number }> = {
  id: 'approx.fill-digit',
  family: 'approx',
  tier: 'stretch',
  make(rng) {
    const carry = rng.chance(0.35);
    return {
      a: rng.int(1, 8),
      d: carry ? 9 : rng.int(0, 9),
      q: carry ? rng.int(5, 9) : rng.int(0, 9),
      tail: rng.int(0, 999),
    };
  },
  render({ a, d, q, tail }) {
    const t = String(tail).padStart(3, '0');
    const k = 10 * a + d + (q >= 5 ? 1 : 0);
    const up = q >= 5;
    return {
      widget: 'numeric',
      prompt: `${a}□${q}${t} ≈ ${k} 万（四舍五入到万位），□ 里填几？`,
      answer: num(d),
      hint: '先看千位上的数，判断是“四舍”还是“五入”，再想□里的数。',
      steps: up
        ? [
            step(`千位上是 ${q}，${q} ≥ 5，要“五入”：万位上的数加 1 后才是 ${k} 万。`),
            step(`所以 ${a}□ 是 ${k} − 1 = ${k - 1}，□ 里填 ${d}。`),
          ]
        : [
            step(`千位上是 ${q}，${q} < 5，是“四舍”：${a}□ 就是 ${k}。`),
            step(`所以 □ 里填 ${d}。`),
          ],
      targetSeconds: 60,
    };
  },
  solve({ a, d, q, tail }) {
    const k = Math.round((a * 100000 + d * 10000 + q * 1000 + tail) / 10000);
    const fits: number[] = [];
    for (let x = 0; x <= 9; x++) {
      if (Math.round((a * 100000 + x * 10000 + q * 1000 + tail) / 10000) === k) fits.push(x);
    }
    if (fits.length !== 1) throw new Error('digit not unique');
    return num(fits[0]);
  },
};

/** 由 3 个亿、56 个百万和 8 个千组成的数，省略亿位后面的尾数约是几亿？ */
const composeRound: ChallengeTemplate<{ a: number; b: number; c: number }> = {
  id: 'approx.compose-round',
  family: 'approx',
  tier: 'stretch',
  make(rng) {
    let b = rng.int(11, 99);
    if (b % 10 === 0) b += 1;
    return { a: rng.int(1, 9), b, c: rng.int(2, 99) };
  },
  render({ a, b, c }) {
    const n = a * 1e8 + b * 1e6 + c * 1e3;
    const top = Math.floor(b / 10);
    const ans = top >= 5 ? a + 1 : a;
    return {
      widget: 'numeric',
      prompt: `一个数由 ${a} 个亿、${b} 个百万和 ${c} 个千组成。这个数省略亿位后面的尾数约是几亿？（只填数）`,
      answer: num(ans),
      hint: `先写出这个数；${b} 个百万是多少，它的最高位在哪一位？`,
      steps: [
        step(`这个数是 ${n}。`),
        step(`${b} 个百万是 ${b * 1e6}，千万位上是 ${top}。`),
        step(`看千万位：${top} ${top >= 5 ? '≥ 5，向亿位进 1' : '< 5，舍去'}。`),
        step(`${n} ≈ ${ans} 亿`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ a, b, c }) {
    const n = a * 1e8 + b * 1e6 + c * 1e3;
    return num(Math.floor((n + 5e7) / 1e8));
  },
};

// ---------------------------------------------------------------- approx · 创新

/** 一个整千的五位数约是 k 万，各位数字之和是 s，这个数是多少？ */
const digitSumPuzzle: ChallengeTemplate<{ k: number; s: number }> = {
  id: 'approx.digit-sum',
  family: 'approx',
  tier: 'creative',
  make(rng) {
    const k = rng.int(2, 9);
    let s = k + rng.int(0, 8);
    if (s === k + 4) s += rng.chance(0.5) ? 1 : -1;
    return { k, s };
  },
  render({ k, s }) {
    const low = [5, 6, 7, 8, 9].map((t) => (k - 1) * 10000 + t * 1000);
    const high = [0, 1, 2, 3, 4].map((t) => k * 10000 + t * 1000);
    const ans = s >= k + 4 ? (k - 1) * 10000 + (s - k + 1) * 1000 : k * 10000 + (s - k) * 1000;
    return {
      widget: 'numeric',
      prompt: `一个五位数是整千数，四舍五入到万位约是 ${k} 万，它各个数位上的数字之和是 ${s}。这个数是多少？`,
      answer: num(ans),
      hint: `先把约是 ${k} 万的整千数都列出来，再算每个数的数字之和。`,
      steps: [
        step(`“五入”得来的：${low.join('、')}。`),
        step(`“四舍”得来的：${high.join('、')}。`),
        step(`其中数字之和是 ${s} 的只有 ${ans}。`),
      ],
      targetSeconds: 150,
    };
  },
  solve({ k, s }) {
    const hits: number[] = [];
    for (let n = 10000; n <= 99999; n += 1000) {
      const sum = String(n)
        .split('')
        .reduce((x, d) => x + Number(d), 0);
      if (Math.round(n / 10000) === k && sum === s) hits.push(n);
    }
    if (hits.length !== 1) throw new Error('not unique');
    return num(hits[0]);
  },
};

/** 哪个写法正确：= / ≈，四舍五入方向，漏写“万”。 */
const judgeWriting: ChallengeTemplate<ChoiceParams & { n: number }> = {
  id: 'approx.judge-writing',
  family: 'approx',
  tier: 'creative',
  make(rng) {
    let n = rng.int(1_000_000, 9_999_999);
    if (n % 10000 === 0) n += rng.int(1, 999) * 10;
    const r = Math.round(n / 10000);
    const other = n % 10000 >= 5000 ? Math.floor(n / 10000) : Math.floor(n / 10000) + 1;
    const { options, tags } = shuffledOptions(rng, `${n} ≈ ${r} 万`, [
      [`${n} = ${r} 万`, 'rewrite-vs-approx'],
      [`${n} ≈ ${other} 万`, 'rounding'],
      [`${n} ≈ ${r}`, 'place-value'],
    ]);
    return { options, tags, n };
  },
  render(p) {
    const n = p.n;
    const r = Math.round(n / 10000);
    const q = Math.floor(n / 1000) % 10;
    return {
      ...choiceParts(p),
      prompt: `把 ${n} 省略万位后面的尾数，下面哪个写法是正确的？`,
      hint: '想三件事：用“=”还是“≈”？千位上是几，舍还是入？单位“万”写了没有？',
      steps: [
        step(`省略尾数得到的是近似数，要用“≈”。`),
        step(
          `千位上是 ${q}，${q >= 5 ? '≥ 5，向万位进 1' : '< 5，舍去'}，约是 ${r} 万，“万”字不能丢。`,
        ),
        step(`正确的是：${n} ≈ ${r} 万`),
      ],
      targetSeconds: 60,
    };
  },
  solve(p) {
    return onlyOption(p.options, (o) => {
      const m = /^(\d+) (=|≈) (\d+)( 万)?$/.exec(o);
      if (!m) throw new Error(`bad option ${o}`);
      const [n, sym, v, wan] = [Number(m[1]), m[2], Number(m[3]), m[4] !== undefined];
      const value = wan ? v * 10000 : v;
      if (sym === '=') return n === value;
      // ≈ k 万: n is not exactly k 万 and rounds (half up) to it.
      return wan && n !== value && n - value >= -5000 && n - value < 5000;
    });
  },
};

/** 一个六位数约是 k 万，下面哪个数可能是它？ */
const whichCould: ChallengeTemplate<ChoiceParams & { k: number }> = {
  id: 'approx.which-could',
  family: 'approx',
  tier: 'creative',
  make(rng) {
    const k = rng.int(11, 98);
    const right = k * 10000 + rng.int(-5000, 4999);
    const { options, tags } = shuffledOptions(rng, String(right), [
      [String(k * 10000 + rng.int(5000, 9999)), 'rounding'],
      [String((k - 1) * 10000 + rng.int(1000, 4999)), 'rounding'],
      [String(k * 1000 + rng.int(100, 999)), 'place-value'],
    ]);
    return { options, tags, k };
  },
  render(p) {
    const k = p.k;
    return {
      ...choiceParts(p),
      prompt: `一个六位数四舍五入到万位约是 ${k} 万。下面哪个数可能是它？`,
      hint: `约是 ${k} 万的数，可能比 ${k} 万大一点（四舍），也可能比 ${k} 万小一点（五入）。`,
      steps: [
        step(`约是 ${k} 万的六位数在 ${k * 10000 - 5000} 到 ${k * 10000 + 4999} 之间。`),
        ...p.options.map((o) =>
          step(
            `${o}：${o.length === 6 ? `约是 ${Math.round(Number(o) / 10000)} 万` : `不是六位数`}。`,
          ),
        ),
        step(`所以是 ${p.options[p.tags.indexOf(null)]}。`),
      ],
      targetSeconds: 90,
    };
  },
  solve(p) {
    return onlyOption(p.options, (o) => {
      const n = Number(o);
      return n >= 100000 && n <= 999999 && Math.floor((n + 5000) / 10000) === p.k;
    });
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const NUM_TEMPLATES: ChallengeTemplate<any>[] = [
  cardsNoZeroMin,
  unitConvert,
  betweenCount,
  zeroReadCount,
  closestTo,
  zeroReadingChoice,
  approxBound,
  fillDigit,
  composeRound,
  digitSumPuzzle,
  judgeWriting,
  whichCould,
];
