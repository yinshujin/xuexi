import type { ErrorTag } from '@xuexi/shared';
import type { Rng } from '../rng';
import { step } from './base';
import type { ChallengeTemplate } from './challenge';
import { choiceAt, cmpOf, evalExpr, koujue, num, range, relText, until } from './challenge-g2-util';

/**
 * 除法的拔高 / 创新题（family 'div'）。
 * 难度 1~2 只用 2~5 的口诀（第五单元，除数、商都在 2~5），
 * 难度 3~5 用到 6~9 的口诀（第八单元，除数、商在 2~9，至少一个 ≥ 6）。
 */

/** [divisor, quotient] allowed at a difficulty. */
function divPairs(d: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const hi = d <= 2 ? 5 : 9;
  for (let q = 2; q <= hi; q++)
    for (let p = 2; p <= hi; p++) if (d <= 2 || Math.max(q, p) >= 6) out.push([q, p]);
  return out;
}

function pickDiv(rng: Rng, d: number): [number, number] {
  return rng.pick(divPairs(d));
}

const inScope = (d: number, a: number, b: number) => {
  const hi = d <= 2 ? 5 : 9;
  return a >= 1 && b >= 1 && a <= hi && b <= hi;
};

// ------------------------------------------------------------------ stretch

/** 不计算，比较：24 ÷ 4 ○ 24 ÷ 3 / 20 ÷ 5 ○ 15 ÷ 5 */
const divCompare: ChallengeTemplate<{ left: [number, number]; right: [number, number] }> = {
  id: 'div.compare',
  family: 'div',
  tier: 'stretch',
  make(rng, d) {
    const sameDividend = rng.chance(0.6);
    return until(
      () => {
        const [q1, p1] = pickDiv(rng, d);
        if (sameDividend) {
          const N = q1 * p1;
          const others = divPairs(d).filter(([q, p]) => q * p === N && q !== q1);
          if (others.length === 0) return null;
          const [q2] = rng.pick(others);
          return { left: [N, q1] as [number, number], right: [N, q2] as [number, number] };
        }
        const [, p2] = pickDiv(rng, d);
        return {
          left: [q1 * p1, q1] as [number, number],
          right: [q1 * p2, q1] as [number, number],
        };
      },
      (x) => x !== null && !(x.left[0] === x.right[0] && x.left[1] === x.right[1]),
      'div compare',
    )!;
  },
  render({ left, right }) {
    const [N1, q1] = left;
    const [N2, q2] = right;
    const l = N1 / q1;
    const r = N2 / q2;
    const why =
      N1 === N2
        ? `被除数都是 ${N1}，平均分的份数越多，每份就越少：除数大的，商反而小。`
        : `除数都是 ${q1}，被除数大的，商就大。`;
    return {
      widget: 'compare',
      prompt: `不计算，比较大小：${N1} ÷ ${q1} ○ ${N2} ÷ ${q2}`,
      answer: cmpOf(l, r),
      hint: '先看两边哪里一样、哪里不一样。同样多的东西，分的份数越多，每份越多还是越少？',
      steps: [
        step(why),
        step(
          `所以 ${N1} ÷ ${q1} ${relText(l, r)} ${N2} ÷ ${q2}。（算一算：左边是 ${l}，右边是 ${r}）`,
        ),
      ],
      targetSeconds: 45,
    };
  },
  solve({ left, right }) {
    // 用“连减”数一数能分几次
    const share = ([N, q]: [number, number]) => {
      let times = 0;
      for (let rest = N; rest >= q; rest -= q) times++;
      return times;
    };
    return cmpOf(share(left), share(right));
  },
};

/** 两步：先吃掉 k 个再平均分 / 平均分后每只又吃 k 个 */
const divTwoStep: ChallengeTemplate<{ q: number; p: number; k: number; eatFirst: boolean }> = {
  id: 'div.two-step',
  family: 'div',
  tier: 'stretch',
  make(rng, d) {
    const eatFirst = rng.chance(0.5);
    return until(
      () => {
        const [q, p] = pickDiv(rng, d);
        return { q, p, k: eatFirst ? rng.int(2, 9) : rng.int(1, p - 1), eatFirst };
      },
      (x) => x.p >= 2 && x.k >= 1 && x.q * x.p + (x.eatFirst ? x.k : 0) <= 90,
      'div two step',
    );
  },
  render({ q, p, k, eatFirst }) {
    if (eatFirst) {
      const N = q * p + k;
      return {
        widget: 'numeric',
        prompt: `猴妈妈摘了 ${N} 个桃，自己先吃了 ${k} 个，剩下的平均分给 ${q} 只小猴。每只小猴分到几个？`,
        answer: num(p),
        hint: '先算剩下多少个，再平均分。',
        steps: [
          step(`剩下：${N} − ${k} = ${q * p}（个）。`),
          step(`平均分给 ${q} 只：${q * p} ÷ ${q} = ${p}（个），想口诀“${koujue(q, p)}”。`),
        ],
        targetSeconds: 75,
      };
    }
    const N = q * p;
    return {
      widget: 'numeric',
      prompt: `猴妈妈把 ${N} 个桃平均分给 ${q} 只小猴，每只小猴又吃了 ${k} 个。每只小猴还剩几个？`,
      answer: num(p - k),
      hint: '先算每只小猴分到几个，再想它吃掉以后还剩几个。',
      steps: [
        step(`每只分到：${N} ÷ ${q} = ${p}（个），想口诀“${koujue(q, p)}”。`),
        step(`还剩：${p} − ${k} = ${p - k}（个）。`),
      ],
      targetSeconds: 75,
    };
  },
  solve({ q, p, k, eatFirst }) {
    const N = eatFirst ? q * p + k : q * p;
    const piles = new Array<number>(q).fill(0);
    let rest = eatFirst ? N - k : N;
    for (let i = 0; rest > 0; i = (i + 1) % q, rest--) piles[i]++; // 一个一个轮流分
    return num(eatFirst ? piles[0] : piles[0] - k);
  },
};

/** 平均分给 q 只，每只 p 个，还剩 k 个：一共几个？ */
const divTotalLeft: ChallengeTemplate<{ q: number; p: number; k: number }> = {
  id: 'div.total-left',
  family: 'div',
  tier: 'stretch',
  make(rng, d) {
    const [q, p] = pickDiv(rng, d);
    return { q, p, k: rng.int(1, q - 1) };
  },
  render({ q, p, k }) {
    const N = q * p + k;
    return {
      widget: 'numeric',
      prompt: `一些桃平均分给 ${q} 只小猴，每只分到 ${p} 个，还剩下 ${k} 个。这些桃一共有几个？`,
      answer: num(N),
      hint: `分掉的是 ${q} 个 ${p}，再加上剩下的。`,
      steps: [
        step(`分掉的：${q} × ${p} = ${q * p}（个），想口诀“${koujue(q, p)}”。`),
        step(`一共：${q * p} + ${k} = ${N}（个）。`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ q, p, k }) {
    for (let N = 0; N <= 100; N++)
      if (N >= k && (N - k) % q === 0 && (N - k) / q === p) return num(N);
    throw new Error('total left');
  },
};

/** 蝴蝶的只数是蜻蜓的 k 倍，蝴蝶 N 只，蜻蜓几只？ */
const divTimesReverse: ChallengeTemplate<{ k: number; x: number; ctx: number }> = {
  id: 'div.times-reverse',
  family: 'div',
  tier: 'stretch',
  make(rng, d) {
    const [k, x] = pickDiv(rng, d);
    return { k, x, ctx: rng.int(0, 2) };
  },
  render({ k, x, ctx }) {
    const [small, big, unit] = [
      ['蜻蜓', '蝴蝶', '只'],
      ['黄花', '红花', '朵'],
      ['鸭', '鸡', '只'],
    ][ctx];
    const N = k * x;
    return {
      widget: 'numeric',
      prompt: `${big}的${unit === '朵' ? '朵数' : '只数'}是${small}的 ${k} 倍，${big}有 ${N} ${unit}。${small}有几${unit}？`,
      answer: num(x),
      hint: `把${small}看作 1 份，${big}有这样的 ${k} 份。${N} 平均分成 ${k} 份，1 份是多少？`,
      steps: [
        step(`${small}是 1 份，${big}是 ${k} 份，${k} 份是 ${N} ${unit}。`),
        step(`1 份：${N} ÷ ${k} = ${x}（${unit}），想口诀“${koujue(k, x)}”。`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ k, x }) {
    const N = k * x;
    const fits = range(1, 50).filter((s) => evalExpr(`${s} × ${k}`) === N);
    if (fits.length !== 1) throw new Error('times reverse');
    return num(fits[0]);
  },
};

// ------------------------------------------------------------------ creative

/** N 个苹果装盘，每盘一样多，盘数和每盘个数都在 2~hi 之间，有几种装法？ */
const divShareWays: ChallengeTemplate<{ N: number; hi: number }> = {
  id: 'div.share-ways',
  family: 'div',
  tier: 'creative',
  make(rng, d) {
    const hi = d <= 2 ? 5 : 9;
    const Ns = [...new Set(divPairs(d).map(([q, p]) => q * p))];
    return { N: rng.pick(Ns), hi };
  },
  render({ N, hi }) {
    const ways = range(2, hi).filter((per) => N % per === 0 && N / per >= 2 && N / per <= hi);
    return {
      widget: 'numeric',
      prompt: `把 ${N} 个苹果装进盘子，每盘装得一样多。盘数和每盘的个数都要在 2~${hi} 之间，有几种不同的装法？`,
      answer: num(ways.length),
      hint: `从每盘 2 个开始，一个一个地试：${N} 里面有几个 2？有几个 3？……用口诀想。`,
      steps: [
        step(
          `按每盘的个数试：${ways.map((per) => `每盘 ${per} 个，装 ${N / per} 盘（${N} ÷ ${per} = ${N / per}）`).join('；')}。`,
        ),
        step(`一共 ${ways.length} 种装法。`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ N, hi }) {
    let c = 0;
    for (let plates = 2; plates <= hi; plates++)
      for (let per = 2; per <= hi; per++) if (plates * per === N) c++;
    return num(c);
  },
};

/** 用 24 ÷ 6（− / +）可以解决下面哪个问题？ */
type FarmQ = 'times' | 'more' | 'total';
const FARM_OPS: Record<FarmQ, string> = { times: '÷', more: '−', total: '+' };

const divChooseQuestion: ChallengeTemplate<{
  a: number;
  b: number;
  want: FarmQ;
  options: FarmQ[];
}> = {
  id: 'div.choose-question',
  family: 'div',
  tier: 'creative',
  make(rng, d) {
    const { a, b } = until(
      () => {
        const [b, k] = pickDiv(rng, d);
        return { a: b * k, b, k };
      },
      (x) => new Set([x.a / x.b, x.a - x.b, x.a + x.b]).size === 3,
      'choose question',
    );
    return {
      a,
      b,
      want: rng.pick<FarmQ>(['times', 'times', 'more', 'total']),
      options: rng.shuffle<FarmQ>(['times', 'more', 'total']),
    };
  },
  render({ a, b, want, options }) {
    const text: Record<FarmQ, string> = {
      times: '鸡的只数是鸭的几倍？',
      more: '鸡比鸭多几只？',
      total: '鸡和鸭一共有几只？',
    };
    const idx = options.indexOf(want);
    return {
      widget: 'choice',
      prompt: `农家小院里有 ${a} 只鸡、${b} 只鸭。用算式 ${a} ${FARM_OPS[want]} ${b} 可以解决下面哪个问题？`,
      options: options.map((o) => text[o]),
      optionTags: options.map((_, i): ErrorTag | null => (i === idx ? null : 'reasoning')),
      answer: choiceAt(idx),
      hint: '三问法：求一共用加法；求多几用减法；求几倍，是看一个数里有几个另一个数，用除法。',
      steps: [
        step(
          `鸡的只数是鸭的几倍：${a} ÷ ${b} = ${a / b}；鸡比鸭多几只：${a} − ${b} = ${a - b}；一共几只：${a} + ${b} = ${a + b}。`,
        ),
        step(`所以 ${a} ${FARM_OPS[want]} ${b} 解决的是“${text[want]}”`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ a, b, want, options }) {
    // 每个问题的答案都按意思重新算
    let times = 0;
    for (let rest = a; rest >= b; rest -= b) times++;
    const value: Record<FarmQ, number> = { times, more: a - b, total: a + b };
    const target = evalExpr(`${a} ${FARM_OPS[want]} ${b}`);
    const hits = options.map((o, i) => (value[o] === target ? i : -1)).filter((i) => i >= 0);
    if (hits.length !== 1) throw new Error('choose question not unique');
    return choiceAt(hits[0]);
  },
};

/** 哪道算式不能用口诀“六七四十二”计算？ */
type FactOpt = [op: '×' | '÷', x: number, y: number];

const divFactFamily: ChallengeTemplate<{ a: number; b: number; options: FactOpt[] }> = {
  id: 'div.fact-family',
  family: 'div',
  tier: 'creative',
  make(rng, d) {
    const hi = d <= 2 ? 5 : 9;
    const { a, b, n } = until(
      () => {
        const [a, b] = pickDiv(rng, d);
        const n = rng.pick([b - 1, b + 1]);
        return { a, b, n };
      },
      (x) => x.a !== x.b && x.n >= 2 && x.n <= hi && inScope(d, x.a, x.n),
      'fact family',
    );
    const odd: FactOpt = ['÷', a * n, a];
    const good: FactOpt[] = [
      ['÷', a * b, a],
      ['÷', a * b, b],
      rng.chance(0.5) ? ['×', a, b] : ['×', b, a],
    ];
    return { a, b, options: rng.shuffle([odd, ...good]) };
  },
  render({ a, b, options }) {
    const text = ([op, x, y]: FactOpt) => `${x} ${op} ${y}`;
    const idx = options.findIndex(([op, x]) => op === '÷' && x !== a * b);
    const [, ox, oy] = options[idx];
    return {
      widget: 'choice',
      prompt: `下面哪道算式不能用口诀“${koujue(a, b)}”来计算？`,
      options: options.map(text),
      optionTags: options.map((_, i): ErrorTag | null => (i === idx ? null : 'div-wrong-table')),
      answer: choiceAt(idx),
      hint: '一句口诀可以算两道乘法、两道除法。看看每道算式里的数是不是都在这句口诀里。',
      steps: [
        step(
          `“${koujue(a, b)}”可以算：${a} × ${b}、${b} × ${a}、${a * b} ÷ ${a}、${a * b} ÷ ${b}。`,
        ),
        step(`${ox} ÷ ${oy} 要用口诀“${koujue(oy, ox / oy)}”，不能用“${koujue(a, b)}”。`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ a, b, options }) {
    const uses = ([op, x, y]: FactOpt) => {
      const nums = op === '×' ? [x, y, x * y] : [x, y, x / y];
      return (
        nums
          .slice()
          .sort((m, n) => m - n)
          .join() === [a, b, a * b].sort((m, n) => m - n).join()
      );
    };
    const bad = options.map((o, i) => (uses(o) ? -1 : i)).filter((i) => i >= 0);
    if (bad.length !== 1) throw new Error('fact family not unique');
    return choiceAt(bad[0]);
  },
};

/** N 人坐船，每条船最多坐 q 人，至少要几条船？ */
const divBoats: ChallengeTemplate<{ N: number; q: number }> = {
  id: 'div.boats',
  family: 'div',
  tier: 'creative',
  make(rng, d) {
    const [q, p] = pickDiv(rng, d);
    const extra = rng.chance(0.3) ? 0 : rng.int(1, q - 1);
    return { N: q * (p - (extra > 0 ? 1 : 0)) + extra, q };
  },
  render({ N, q }) {
    const full = Math.floor(N / q);
    const left = N % q;
    const boats = full + (left > 0 ? 1 : 0);
    return {
      widget: 'numeric',
      prompt: `${N} 个同学去公园划船，每条船最多坐 ${q} 人。至少要租几条船？`,
      answer: num(boats),
      hint: `想 ${q} 的口诀：几条船坐满是 ${N} 人左右？如果还有人没坐上，要怎么办？`,
      steps:
        left === 0
          ? [
              step(
                `${full} 条船正好坐满：${full} × ${q} = ${N}（人），想口诀“${koujue(full, q)}”。`,
              ),
              step(`至少要 ${boats} 条船。`),
            ]
          : [
              step(
                `${full} 条船坐满是 ${full} × ${q} = ${full * q}（人），还有 ${N} − ${full * q} = ${left}（人）没坐上。`,
              ),
              step(`剩下的 ${left} 人也要坐船，再租 1 条：${full} + 1 = ${boats}（条）。`),
            ],
      targetSeconds: 75,
    };
  },
  solve({ N, q }) {
    let boats = 0;
    for (let waiting = N; waiting > 0; waiting -= q) boats++;
    return num(boats);
  },
};

/** 下面哪个问题要用乘法（除法）解答？ */
type StoryOp = '×' | '÷' | '+' | '−';

const divWhichStory: ChallengeTemplate<{ q: number; p: number; want: '×' | '÷'; ops: StoryOp[] }> =
  {
    id: 'div.which-story',
    family: 'div',
    tier: 'creative',
    make(rng, d) {
      const [q, p] = until(
        () => pickDiv(rng, d),
        ([x, y]) => x !== y,
        'which story',
      );
      const want = rng.chance(0.5) ? ('×' as const) : ('÷' as const);
      return { q, p, want, ops: rng.shuffle<StoryOp>(['×', '÷', '+', '−']) };
    },
    render({ q, p, want, ops }) {
      const story: Record<StoryOp, string> = {
        '×': `每笼有 ${p} 只鸡，${q} 笼一共有几只？`,
        '÷': `${q * p} 只鸭平均分到 ${q} 个圈里，每个圈几只？`,
        '+': `有 ${p} 只鹅，又来了 ${q} 只，现在有几只？`,
        '−': `有 ${q * p} 个鸡蛋，卖了 ${p} 个，还剩几个？`,
      };
      const idx = ops.indexOf(want);
      return {
        widget: 'choice',
        prompt: `下面哪个问题要用${want === '×' ? '乘法' : '除法'}来解答？`,
        options: ops.map((o) => story[o]),
        optionTags: ops.map((o): ErrorTag | null =>
          o === want ? null : want === '×' ? 'mul-meaning' : 'div-wrong-table',
        ),
        answer: choiceAt(idx),
        hint: '求“几个几是多少”用乘法；把一些东西平均分，求每份是多少或能分成几份，用除法。',
        steps: [
          step(
            '“每笼几只，几笼一共几只”是求几个几，用乘法；“平均分到几个圈”用除法；“又来了”用加法；“卖了还剩”用减法。',
          ),
          step(`所以用${want === '×' ? '乘法' : '除法'}的是：${story[want]}`),
        ],
        targetSeconds: 60,
      };
    },
    solve({ want, ops }) {
      // 结构判断：乘法 = “每…有几，几份一共”；除法 = “平均分”。
      const kind = (o: StoryOp) => (o === '×' ? 'groups' : o === '÷' ? 'share' : 'other');
      const hits = ops
        .map((o, i) => (kind(o) === (want === '×' ? 'groups' : 'share') ? i : -1))
        .filter((i) => i >= 0);
      if (hits.length !== 1) throw new Error('which story');
      return choiceAt(hits[0]);
    },
  };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DIV_TEMPLATES: ChallengeTemplate<any>[] = [
  divCompare,
  divTwoStep,
  divTotalLeft,
  divTimesReverse,
  divShareWays,
  divChooseQuestion,
  divFactFamily,
  divBoats,
  divWhichStory,
];
