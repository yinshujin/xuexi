import type { ErrorTag } from '@xuexi/shared';
import { step } from './base';
import type { ChallengeTemplate } from './challenge';
import { choiceAt, num, range, until } from './challenge-g2-util';

/**
 * 数学好玩：猜数游戏（第一单元后）的拔高 / 创新题（family 'guess'）。
 * 只用“比几大吗？”这样的问题时，每次从中间问能排除大约一半的数。
 */

/** Fewest 比大 questions that always find a number among m candidates (minimax, by DP). */
function fewestQuestions(m: number): number {
  const f = [0, 0];
  for (let n = 2; n <= m; n++) {
    let best = Infinity;
    for (let k = 1; k < n; k++) best = Math.min(best, 1 + Math.max(f[k], f[n - k]));
    f[n] = best;
  }
  return f[m];
}

/** m → 大约一半（多的那一半）→ … → 1 */
function halvings(m: number): number[] {
  const out = [m];
  while (out[out.length - 1] > 1) out.push(Math.ceil(out[out.length - 1] / 2));
  return out;
}

/** 最少问几次一定能猜中？ */
const guessMinTimes: ChallengeTemplate<{ lo: number; hi: number; known: boolean }> = {
  id: 'guess.min-times',
  family: 'guess',
  tier: 'stretch',
  make(rng, d) {
    if (d >= 4 && rng.chance(0.5)) {
      const lo = rng.int(2, 8) * 10 + 1;
      return { lo, hi: lo + rng.pick([9, 14, 19, 24]), known: true };
    }
    return { lo: 1, hi: rng.pick(d <= 2 ? [8, 10, 16, 20] : [20, 30, 50, 64, 100]), known: false };
  },
  render({ lo, hi, known }) {
    const m = hi - lo + 1;
    const h = halvings(m);
    return {
      widget: 'numeric',
      prompt: known
        ? `猜数游戏：小红已经知道小明想的数在 ${lo}~${hi} 之间。接下来她只问“比几大吗？”这样的问题，用最好的方法，最少再问几次就一定能知道这个数？`
        : `猜数游戏：小明在 1~${hi} 中想了一个数。小红只问“比几大吗？”这样的问题，用最好的方法，最少问几次就一定能知道这个数？`,
      answer: num(h.length - 1),
      hint: '每次都从中间问，不管回答什么，都能排除大约一半的数。想一想：剩下的数怎样一半一半地变少，变到只剩 1 个。',
      steps: [
        step(`一共有 ${m} 个数。每次从中间问，运气最差时剩下多的那一半。`),
        step(`剩下的个数：${h.join(' → ')}。`),
        step(`变到只剩 1 个，要问 ${h.length - 1} 次。`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ lo, hi }) {
    return num(fewestQuestions(hi - lo + 1));
  },
};

/** 每次从中间问，问了 k 次以后最多还剩几个数？ */
const guessHalvingLeft: ChallengeTemplate<{ N: number; k: number }> = {
  id: 'guess.halving-left',
  family: 'guess',
  tier: 'stretch',
  make(rng, d) {
    return until(
      () => ({
        N: rng.pick(d <= 2 ? [20, 40, 50] : [50, 60, 80, 100]),
        k: rng.int(2, d <= 2 ? 2 : 4),
      }),
      (p) => Math.ceil(p.N / 2 ** p.k) >= 2,
      'halving',
    );
  },
  render({ N, k }) {
    const h = halvings(N).slice(0, k + 1);
    return {
      widget: 'numeric',
      prompt: `猜数游戏：小明在 1~${N} 中想了一个数。小红每次都从剩下的数的中间问“比几大吗？”。问了 ${k} 次以后，最多还剩几个数可能是小明想的数？`,
      answer: num(h[k]),
      hint: '从中间问，每问一次，剩下的数大约减少一半。运气不好时剩下多的那一半，一次一次算下去。',
      steps: [
        step(`开始有 ${N} 个数，每问一次最多剩下大约一半（多的那一半）。`),
        step(`${h.map((v, i) => (i === 0 ? `${v}` : `第 ${i} 次后最多剩 ${v}`)).join('，')}。`),
        step(`问了 ${k} 次以后，最多还剩 ${h[k]} 个数。`),
      ],
      targetSeconds: 75,
    };
  },
  solve({ N, k }) {
    // 真的去问：每次问中间的数，回答总是让剩下的数更多的那一种。
    let left = range(1, N);
    for (let i = 0; i < k; i++) {
      const x = left[Math.floor(left.length / 2) - 1];
      const big = left.filter((n) => n > x);
      const small = left.filter((n) => n <= x);
      left = big.length >= small.length ? big : small;
    }
    return num(left.length);
  },
};

/** “比 50 大吗？”“不对。”哪个数可能是小明想的数？ */
const guessBoundTrap: ChallengeTemplate<{ x: number; big: boolean; options: number[] }> = {
  id: 'guess.bound-trap',
  family: 'guess',
  tier: 'stretch',
  make(rng) {
    const x = rng.int(3, 8) * 10 + rng.pick([0, 0, 5]);
    const big = rng.chance(0.5);
    const s = big ? 1 : -1;
    return { x, big, options: rng.shuffle([x, x + s, x + 3 * s, x + 10 * s]) };
  },
  render({ x, big, options }) {
    const idx = options.indexOf(x);
    return {
      widget: 'choice',
      prompt: `猜数游戏：小红问：“比 ${x} ${big ? '大' : '小'}吗？”小明回答：“不对。”下面哪个数可能是小明想的数？`,
      options: options.map(String),
      optionTags: options.map((_, i): ErrorTag | null => (i === idx ? null : 'guess-range')),
      answer: choiceAt(idx),
      hint: `“不比 ${x} ${big ? '大' : '小'}”是什么意思？${x} 本身比 ${x} ${big ? '大' : '小'}吗？`,
      steps: [
        step(
          `“比 ${x} ${big ? '大' : '小'}吗？”回答“不对”，说明这个数不比 ${x} ${big ? '大' : '小'}。`,
        ),
        step(
          `${x} 不比 ${x} ${big ? '大' : '小'}，所以这个数可能是 ${x}，也可能比 ${x} ${big ? '小' : '大'}。`,
        ),
        step(`选项里只有 ${x} 可能。`),
      ],
      targetSeconds: 45,
    };
  },
  solve({ x, big, options }) {
    const fits = options.map((n, i) => ((big ? n > x : n < x) ? -1 : i)).filter((i) => i >= 0);
    if (fits.length !== 1) throw new Error('bound trap not unique');
    return choiceAt(fits[0]);
  },
};

/** 第一次问哪个问题最好？ */
type FirstQ = ['gt' | 'eq', number];

const guessFirstQuestion: ChallengeTemplate<{ N: number; options: FirstQ[] }> = {
  id: 'guess.first-question',
  family: 'guess',
  tier: 'creative',
  make(rng, d) {
    const N = rng.pick(d <= 2 ? [20, 40] : [50, 60, 100]);
    const mid = N / 2;
    const options: FirstQ[] = [
      ['gt', mid],
      ['eq', mid],
      ['eq', 1],
      ['gt', rng.pick([N / 10, N - N / 10])],
    ];
    return { N, options: rng.shuffle(options) };
  },
  render({ N, options }) {
    const text = ([k, x]: FirstQ) => (k === 'gt' ? `比 ${x} 大吗？` : `是 ${x} 吗？`);
    const idx = options.findIndex(([k, x]) => k === 'gt' && x === N / 2);
    return {
      widget: 'choice',
      prompt: `猜数游戏：小明在 1~${N} 中想了一个数。小红第一次问哪个问题最好？`,
      options: options.map(text),
      optionTags: options.map((_, i): ErrorTag | null => (i === idx ? null : 'guess-range')),
      answer: choiceAt(idx),
      hint: '想一想：每个问题，如果回答“不对”（或“对”），还剩多少个数？要让运气最差时剩下的数最少。',
      steps: [
        step(`“是几吗？”回答“不对”，只排除 1 个数，还剩 ${N - 1} 个。`),
        step(`“比 ${N / 2} 大吗？”不管回答什么，都只剩 ${N / 2} 个数，一下排除了一半。`),
        step('问靠近两头的数（比如很小或很大的数），运气不好时剩下的数还是很多。'),
      ],
      targetSeconds: 60,
    };
  },
  solve({ N, options }) {
    const worst = ([k, x]: FirstQ) => {
      const yes = range(1, N).filter((n) => (k === 'gt' ? n > x : n === x)).length;
      return Math.max(yes, N - yes);
    };
    const scores = options.map(worst);
    const best = Math.min(...scores);
    const hits = scores.map((s, i) => (s === best ? i : -1)).filter((i) => i >= 0);
    if (hits.length !== 1) throw new Error('first question not unique');
    return choiceAt(hits[0]);
  },
};

/** 两种猜法比一比：运气最差时谁问的次数少？ */
const STRATEGY_OPTIONS = [
  '笑笑的方法好，每次都能排除大约一半的数',
  '淘气的方法好，一个一个问不会漏掉',
  '两种方法一样好',
  '笑笑的方法好，因为她问的数比较大',
];

const guessStrategy: ChallengeTemplate<{ N: number; order: number[] }> = {
  id: 'guess.strategy',
  family: 'guess',
  tier: 'creative',
  make(rng) {
    return { N: rng.pick([20, 30, 50, 100]), order: rng.shuffle([0, 1, 2, 3]) };
  },
  render({ N, order }) {
    const idx = order.indexOf(0);
    const slow = N - 1;
    const fast = halvings(N).length - 1;
    return {
      widget: 'choice',
      prompt: `猜 1~${N} 中的一个数。淘气一个一个地问：“是 1 吗？”“是 2 吗？”……笑笑先问“比 ${N / 2} 大吗？”，以后每次都从剩下的数的中间问。运气最差的时候，谁的方法问的次数少？`,
      options: order.map((i) => STRATEGY_OPTIONS[i]),
      optionTags: order.map((i): ErrorTag | null => (i === 0 ? null : 'guess-range')),
      answer: choiceAt(idx),
      hint: '运气最差时，淘气要问到快最后一个数；笑笑每问一次，剩下的数就少一半。各要问几次？',
      steps: [
        step(`淘气：运气最差时要问 ${slow} 次（问到 ${N - 1} 还不是，才知道是 ${N}）。`),
        step(`笑笑：${halvings(N).join(' → ')}，最多问 ${fast} 次。`),
        step('所以笑笑的方法好：从中间问，每次排除大约一半的数。'),
      ],
      targetSeconds: 60,
    };
  },
  solve({ N, order }) {
    const slow = N - 1;
    const fast = fewestQuestions(N);
    // option 0: 笑笑好（对的理由）；2: 一样；1: 淘气好；3: 理由不对
    const right = fast < slow ? 0 : fast === slow ? 2 : 1;
    return choiceAt(order.indexOf(right));
  },
};

/** 猜数谜语：比 a 大、比 b 小，个位和十位有关系，这个数是几？ */
type DigitRule = 'more' | 'less' | 'same' | 'sum';

const guessRiddle: ChallengeTemplate<{ lo: number; hi: number; rule: DigitRule; k: number }> = {
  id: 'guess.riddle',
  family: 'guess',
  tier: 'creative',
  make(rng) {
    return until(
      () => {
        const s = rng.int(12, 98);
        const t = Math.floor(s / 10);
        const u = s % 10;
        const rule: DigitRule = rng.pick(['more', 'less', 'same', 'sum'] as const);
        const k = rule === 'more' ? u - t : rule === 'less' ? t - u : rule === 'sum' ? t + u : 0;
        const lo = s - rng.int(3, 12);
        const hi = s + rng.int(3, 12);
        return { lo, hi, rule, k };
      },
      (p) =>
        p.lo >= 10 && p.hi <= 100 && (p.rule === 'same' || p.k >= 1) && riddleFits(p).length === 1,
      'riddle',
    );
  },
  render(p) {
    const s = riddleFits(p)[0];
    const ruleText =
      p.rule === 'more'
        ? `个位上的数比十位上的数大 ${p.k}`
        : p.rule === 'less'
          ? `个位上的数比十位上的数小 ${p.k}`
          : p.rule === 'same'
            ? '个位和十位上的数相同'
            : `个位和十位上的数加起来是 ${p.k}`;
    return {
      widget: 'numeric',
      prompt: `猜一猜：我想的数比 ${p.lo} 大，比 ${p.hi} 小，${ruleText}。我想的数是几？`,
      answer: num(s),
      hint: `先写出比 ${p.lo} 大、比 ${p.hi} 小的数有哪些，再一个一个看个位和十位。`,
      steps: [
        step(`比 ${p.lo} 大、比 ${p.hi} 小：${p.lo + 1}~${p.hi - 1}。`),
        step(`其中${ruleText}的只有 ${s}。`),
      ],
      targetSeconds: 75,
    };
  },
  solve(p) {
    const fits = riddleFits(p);
    if (fits.length !== 1) throw new Error('riddle not unique');
    return num(fits[0]);
  },
};

function riddleFits({
  lo,
  hi,
  rule,
  k,
}: {
  lo: number;
  hi: number;
  rule: DigitRule;
  k: number;
}): number[] {
  return range(lo + 1, hi - 1).filter((n) => {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (n < 10 || n > 99) return false;
    return rule === 'more'
      ? u - t === k
      : rule === 'less'
        ? t - u === k
        : rule === 'same'
          ? t === u
          : t + u === k;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GUESS_TEMPLATES: ChallengeTemplate<any>[] = [
  guessMinTimes,
  guessHalvingLeft,
  guessBoundTrap,
  guessFirstQuestion,
  guessStrategy,
  guessRiddle,
];
