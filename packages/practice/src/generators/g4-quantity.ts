import type { ErrorTag } from '@xuexi/shared';
import type { Answer } from '../types';
import { step } from './base';
import { wordGenerator, type WordTemplate } from './word-templates';

/**
 * g4.quantity — 四上（2024 修订）第七单元“运用数量关系解决问题”的常规练习。
 *
 * Variants (one per knowledge point):
 *   part-whole  总量与分量：总量 = 分量 + 分量；分量 = 总量 − 另一分量
 *   unit-price  单价 × 数量 = 总价，及两个变式
 *   speed       速度 × 时间 = 路程，及两个变式
 *   meeting     相遇问题：两人一共走的路程 = 速度和 × 时间
 *
 * Only what the child has learned: 三位数乘两位数, 除以一位数, 整十数的
 * 口算除法（想乘算除，商是一位数）, 加减。
 * Difficulty: 1–2 two-digit numbers; 3+ 三位数乘两位数 and two-step problems.
 */

const num = (value: number): Answer => ({ type: 'number', value });
const RC: ErrorTag = 'relation-confused';

// ---------------------------------------------------------------- 总量与分量

const GOODS = [
  { a: '大米', b: '面粉', pack: '袋', unit: '千克', who: '学校食堂' },
  { a: '苹果', b: '橙子', pack: '箱', unit: '千克', who: '水果店' },
  { a: '故事书', b: '科技书', pack: '包', unit: '本', who: '图书室' },
] as const;

/** 两种物品各几袋，每袋多少，一共多少？ */
const totalOfParts: WordTemplate<{ g: number; n: number; a: number; m: number; b: number }> = {
  id: 'part.total',
  variant: 'part-whole',
  make(rng, d) {
    const big = d >= 3;
    return {
      g: rng.int(0, GOODS.length - 1),
      n: big ? rng.int(12, 35) : rng.int(3, 9),
      a: big ? rng.int(15, 50) : rng.int(10, 30),
      m: big ? rng.int(12, 35) : rng.int(3, 9),
      b: big ? rng.int(15, 50) : rng.int(10, 30),
    };
  },
  render({ g, n, a, m, b }) {
    const G = GOODS[g];
    const t = n * a + m * b;
    return {
      widget: 'numeric',
      prompt: `${G.who}买来 ${n} ${G.pack}${G.a}，每${G.pack} ${a} ${G.unit}；又买来 ${m} ${G.pack}${G.b}，每${G.pack} ${b} ${G.unit}。一共买来多少${G.unit}？`,
      answer: num(t),
      hint: '总量 = 一部分 + 另一部分。先分别算出两部分各是多少。',
      steps: [
        step(`${G.a}：${a} × ${n} = ${a * n}（${G.unit}）`),
        step(`${G.b}：${b} × ${m} = ${b * m}（${G.unit}）`),
        step(`一共：${a * n} + ${b * m} = ${t}（${G.unit}）`),
      ],
      targetSeconds: 120,
    };
  },
  solve({ n, a, m, b }) {
    let t = 0;
    for (let i = 0; i < n; i++) t += a;
    for (let i = 0; i < m; i++) t += b;
    return num(t);
  },
  bugs: ({ n, a, m, b }) => [
    [n * a, RC],
    [m * b, RC],
  ],
};

/** 总量里去掉一部分，求另一部分。 */
const partFromTotal: WordTemplate<{ total: number; n: number; a: number }> = {
  id: 'part.rest',
  variant: 'part-whole',
  make(rng, d) {
    const n = d >= 3 ? rng.int(12, 40) : rng.int(3, 9);
    const a = d >= 3 ? rng.int(12, 30) : rng.int(10, 25);
    return { total: n * a + rng.int(d >= 3 ? 100 : 20, d >= 3 ? 600 : 200), n, a };
  },
  render({ total, n, a }) {
    const apples = n * a;
    return {
      widget: 'numeric',
      prompt: `果园今年一共收获水果 ${total} 千克，其中苹果装了 ${n} 箱，每箱 ${a} 千克，其余的是梨。梨有多少千克？`,
      answer: num(total - apples),
      hint: '总量 = 苹果 + 梨，所以梨 = 总量 − 苹果。先算苹果有多少千克。',
      steps: [
        step(`苹果：${a} × ${n} = ${apples}（千克）`),
        step(`梨：${total} − ${apples} = ${total - apples}（千克）`),
      ],
      targetSeconds: 120,
    };
  },
  solve({ total, n, a }) {
    let left = total;
    for (let i = 0; i < n; i++) left -= a;
    return num(left);
  },
  bugs: ({ total, n, a }) => [
    [total + n * a, RC],
    [n * a, RC],
  ],
};

/** 拿走一部分，剩下的平均分给几个班。 */
const shareRest: WordTemplate<{ total: number; kept: number; k: number }> = {
  id: 'part.share',
  variant: 'part-whole',
  minDifficulty: 2,
  make(rng, d) {
    const k = rng.int(3, 9);
    const each = d >= 4 ? rng.int(25, 99) : rng.int(12, 40);
    const kept = rng.int(10, 90);
    return { total: k * each + kept, kept, k };
  },
  render({ total, kept, k }) {
    const rest = total - kept;
    return {
      widget: 'numeric',
      prompt: `学校买来 ${total} 本练习本，留下 ${kept} 本备用，其余的平均分给 ${k} 个班。每个班分到多少本？`,
      answer: num(rest / k),
      hint: '先算要分给各班的一共有多少本（总量 − 备用），再平均分。',
      steps: [
        step(`要分的：${total} − ${kept} = ${rest}（本）`),
        step(`每班：${rest} ÷ ${k} = ${rest / k}（本）`),
      ],
      targetSeconds: 120,
    };
  },
  solve({ total, kept, k }) {
    let rest = total - kept;
    let each = 0;
    while (rest >= k) {
      rest -= k;
      each++;
    }
    return num(each);
  },
};

// ---------------------------------------------------------------- 单价、数量与总价

const ITEMS = [
  { name: '校服', unit: '套', lo: 85, hi: 180 },
  { name: '足球', unit: '个', lo: 60, hi: 150 },
  { name: '台灯', unit: '盏', lo: 45, hi: 120 },
  { name: '书包', unit: '个', lo: 70, hi: 160 },
] as const;

/** 总价 = 单价 × 数量。 */
const totalPrice: WordTemplate<{ it: number; a: number; n: number }> = {
  id: 'price.total',
  variant: 'unit-price',
  make(rng, d) {
    const it = rng.int(0, ITEMS.length - 1);
    const I = ITEMS[it];
    return {
      it,
      a: d >= 3 ? rng.int(I.lo, I.hi) : rng.int(2, 9) * 10,
      n: d >= 3 ? rng.int(12, 48) : rng.int(3, 9),
    };
  },
  render({ it, a, n }) {
    const I = ITEMS[it];
    return {
      widget: 'numeric',
      prompt: `每${I.unit}${I.name} ${a} 元，学校买了 ${n} ${I.unit}，一共要付多少元？`,
      answer: num(a * n),
      hint: '单价 × 数量 = 总价。',
      steps: [step('单价 × 数量 = 总价'), step(`${a} × ${n} = ${a * n}（元）`)],
      targetSeconds: 90,
    };
  },
  solve({ a, n }) {
    let t = 0;
    for (let i = 0; i < n; i++) t += a;
    return num(t);
  },
  bugs: ({ a, n }) => [[a + n, RC]],
};

/** 单价 = 总价 ÷ 数量（除以一位数）。 */
const unitPrice: WordTemplate<{ it: number; a: number; n: number }> = {
  id: 'price.unit',
  variant: 'unit-price',
  make(rng, d) {
    const it = rng.int(0, ITEMS.length - 1);
    const I = ITEMS[it];
    return { it, a: d >= 3 ? rng.int(I.lo, I.hi) : rng.int(12, 45), n: rng.int(2, 9) };
  },
  render({ it, a, n }) {
    const I = ITEMS[it];
    const t = a * n;
    return {
      widget: 'numeric',
      prompt: `买 ${n} ${I.unit}${I.name}一共花了 ${t} 元，每${I.unit}多少元？`,
      answer: num(a),
      hint: '总价 ÷ 数量 = 单价。',
      steps: [step('总价 ÷ 数量 = 单价'), step(`${t} ÷ ${n} = ${a}（元）`)],
      targetSeconds: 90,
    };
  },
  solve({ a, n }) {
    const t = a * n;
    for (let price = 1; price <= t; price++) if (price * n === t) return num(price);
    throw new Error('no price fits');
  },
  bugs: ({ a, n }) => [[a * n * n, RC]],
};

/** 数量 = 总价 ÷ 单价（单价是一位数或整十数，商能口算）。 */
const howMany: WordTemplate<{ a: number; n: number; round: boolean }> = {
  id: 'price.count',
  variant: 'unit-price',
  make(rng, d) {
    const round = d >= 3 && rng.chance(0.6);
    return round
      ? { a: rng.int(2, 9) * 10, n: rng.int(2, 9), round }
      : { a: rng.int(3, 9), n: rng.int(12, d >= 3 ? 99 : 30), round };
  },
  render({ a, n }) {
    const t = a * n;
    return {
      widget: 'numeric',
      prompt: `一本笔记本 ${a} 元，用 ${t} 元正好可以买多少本？`,
      answer: num(n),
      hint: '总价 ÷ 单价 = 数量。',
      steps: [step('总价 ÷ 单价 = 数量'), step(`${t} ÷ ${a} = ${n}（本）`)],
      targetSeconds: 90,
    };
  },
  solve({ a, n }) {
    let money = a * n;
    let k = 0;
    while (money > 0) {
      money -= a;
      k++;
    }
    return num(k);
  },
  bugs: ({ a, n }) => [[a * n * a, RC]],
};

const RELATIONS = {
  total: { right: '总价 = 单价 × 数量', wrong: ['总价 = 单价 + 数量', '总价 = 单价 ÷ 数量'] },
  unit: { right: '单价 = 总价 ÷ 数量', wrong: ['单价 = 总价 × 数量', '单价 = 数量 ÷ 总价'] },
  count: { right: '数量 = 总价 ÷ 单价', wrong: ['数量 = 单价 ÷ 总价', '数量 = 总价 × 单价'] },
} as const;

/** 选出正确的数量关系式。 */
const relation: WordTemplate<{ ask: keyof typeof RELATIONS; options: string[] }> = {
  id: 'price.relation',
  variant: 'unit-price',
  make(rng) {
    const ask = rng.pick(['total', 'unit', 'count'] as const);
    const R = RELATIONS[ask];
    return { ask, options: rng.shuffle([R.right, ...R.wrong]) };
  },
  render({ ask, options }) {
    const right = RELATIONS[ask].right;
    const name = right.split(' = ')[0];
    return {
      widget: 'choice',
      prompt: `求${name}，下面哪个关系式是正确的？`,
      options,
      answer: { type: 'choice', index: options.indexOf(right) },
      optionTags: options.map((o) => (o === right ? null : RC)),
      hint: '用一个例子试一试：每支笔 6 元，买 4 支，一共 24 元。',
      steps: [
        step('例子：单价 6 元，数量 4 支，总价 24 元。'),
        step(`6 × 4 = 24，24 ÷ 4 = 6，24 ÷ 6 = 4，所以 ${right}。`),
      ],
      targetSeconds: 45,
    };
  },
  solve({ options }) {
    // Check each formula with a worked example: 单价 6，数量 4，总价 24.
    const v: Record<string, number> = { 单价: 6, 数量: 4, 总价: 24 };
    const hits = options.flatMap((o, i) => {
      const [lhs, rhs] = o.split(' = ');
      const [x, op, y] = rhs.split(' ');
      const r = op === '×' ? v[x] * v[y] : op === '÷' ? v[x] / v[y] : v[x] + v[y];
      return r === v[lhs] ? [i] : [];
    });
    if (hits.length !== 1) throw new Error('relation not unique');
    return { type: 'choice', index: hits[0] };
  },
};

// ---------------------------------------------------------------- 速度、时间与路程

const MOVERS = [
  { who: '一列高铁', per: '小时', unit: '千米', lo: 20, hi: 35, mul: 10 },
  { who: '一辆汽车', per: '小时', unit: '千米', lo: 6, hi: 9, mul: 10 },
  { who: '小明步行', per: '分钟', unit: '米', lo: 55, hi: 85, mul: 1 },
  { who: '声音在空气中', per: '秒', unit: '米', lo: 340, hi: 340, mul: 1 },
] as const;

/** 路程 = 速度 × 时间。 */
const distance: WordTemplate<{ m: number; v: number; t: number }> = {
  id: 'speed.distance',
  variant: 'speed',
  make(rng, d) {
    const m = d >= 3 ? rng.int(0, MOVERS.length - 1) : rng.int(0, 2);
    const M = MOVERS[m];
    const t = M.per === '小时' ? rng.int(2, 9) : d >= 3 ? rng.int(12, 45) : rng.int(3, 9);
    return { m, v: rng.int(M.lo, M.hi) * M.mul, t };
  },
  render({ m, v, t }) {
    const M = MOVERS[m];
    const verb = M.who === '声音在空气中' ? '传播' : '行';
    return {
      widget: 'numeric',
      prompt: `${M.who}每${M.per}${verb} ${v} ${M.unit}，${t} ${M.per}${verb}多少${M.unit}？`,
      answer: num(v * t),
      hint: '速度 × 时间 = 路程。',
      steps: [
        step(`速度是 ${v} ${M.unit}/${M.per === '分钟' ? '分' : M.per === '小时' ? '时' : '秒'}。`),
        step(`${v} × ${t} = ${v * t}（${M.unit}）`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ v, t }) {
    let s = 0;
    for (let i = 0; i < t; i++) s += v;
    return num(s);
  },
  bugs: ({ v, t }) => [[v + t, RC]],
};

/** 速度 = 路程 ÷ 时间（除以一位数）。 */
const speedOf: WordTemplate<{ v: number; t: number; bike: boolean }> = {
  id: 'speed.speed',
  variant: 'speed',
  make(rng, d) {
    const bike = rng.chance(0.5);
    return {
      v: bike ? rng.int(18, 30) * 10 : d >= 3 ? rng.int(55, 99) : rng.int(6, 9) * 10,
      t: rng.int(2, 9),
      bike,
    };
  },
  render({ v, t, bike }) {
    const s = v * t;
    const [who, per, unit, u] = bike
      ? ['小红骑自行车', '分钟', '米', '米/分']
      : ['一辆货车', '小时', '千米', '千米/时'];
    return {
      widget: 'numeric',
      prompt: `${who} ${t} ${per}行了 ${s} ${unit}，平均每${per}行多少${unit}？`,
      answer: num(v),
      hint: '路程 ÷ 时间 = 速度。',
      steps: [step('路程 ÷ 时间 = 速度'), step(`${s} ÷ ${t} = ${v}（${u}）`)],
      targetSeconds: 90,
    };
  },
  solve({ v, t }) {
    const s = v * t;
    let speed = 0;
    while ((speed + 1) * t <= s) speed++;
    return num(speed);
  },
  bugs: ({ v, t }) => [[v * t * t, RC]],
};

/** 时间 = 路程 ÷ 速度（速度是整十数，商是一位数）。 */
const timeOf: WordTemplate<{ v: number; t: number }> = {
  id: 'speed.time',
  variant: 'speed',
  make(rng) {
    return { v: rng.int(4, 12) * 10, t: rng.int(2, 9) };
  },
  render({ v, t }) {
    const s = v * t;
    return {
      widget: 'numeric',
      prompt: `一辆汽车每小时行 ${v} 千米，行 ${s} 千米要用几小时？`,
      answer: num(t),
      hint: '路程 ÷ 速度 = 时间。想一想：几个 ' + v + ' 是 ' + s + '？',
      steps: [step('路程 ÷ 速度 = 时间'), step(`${s} ÷ ${v} = ${t}（时）`)],
      targetSeconds: 60,
    };
  },
  solve({ v, t }) {
    const s = v * t;
    let hours = 0;
    for (let gone = 0; gone < s; gone += v) hours++;
    return num(hours);
  },
  bugs: ({ v, t }) => [[v * t * v, RC]],
};

// ---------------------------------------------------------------- 相遇问题

const PAIRS = [
  ['小明', '小红'],
  ['爸爸', '妈妈'],
  ['淘淘', '笑笑'],
] as const;

type MeetAsk = 'distance' | 'time' | 'left' | 'more';

const meetingT: WordTemplate<{
  pair: number;
  a: number;
  b: number;
  t: number;
  ask: MeetAsk;
  s: number;
}> = {
  id: 'meeting.basic',
  variant: 'meeting',
  make(rng, d) {
    const ask = rng.pick<MeetAsk>(
      d >= 3 ? ['distance', 'time', 'left', 'more'] : ['distance', 'time'],
    );
    const pair = rng.int(0, PAIRS.length - 1);
    if (ask === 'time') {
      const sum = rng.int(6, 15) * 10;
      const a = rng.int(sum / 2 + 1, sum - 20);
      const t = rng.int(3, 9);
      return { pair, a, b: sum - a, t, ask, s: sum * t };
    }
    const a = rng.int(60, 90);
    const b = rng.int(50, a - 1);
    const t = d >= 3 ? rng.int(12, 25) : rng.int(3, 9);
    const s = ask === 'left' ? (a + b) * t + rng.int(2, 9) * 100 : 0;
    return { pair, a, b, t, ask, s };
  },
  render({ pair, a, b, t, ask, s }) {
    const [x, y] = PAIRS[pair];
    const head = `${x}和${y}同时从两地出发，相向而行。${x}每分钟走 ${a} 米，${y}每分钟走 ${b} 米，`;
    const both = (a + b) * t;
    if (ask === 'time') {
      return {
        widget: 'numeric',
        prompt: `两地相距 ${s} 米。${head}经过几分钟两人相遇？`,
        answer: num(t),
        hint: '两人每分钟一共走近多少米？几个这样的路程合起来是两地的距离？',
        steps: [step(`速度和：${a} + ${b} = ${a + b}（米）`), step(`${s} ÷ ${a + b} = ${t}（分）`)],
        targetSeconds: 120,
      };
    }
    if (ask === 'left') {
      return {
        widget: 'numeric',
        prompt: `两地相距 ${s} 米。${head}走了 ${t} 分钟后，两人还相距多少米？`,
        answer: num(s - both),
        hint: '先算两人一共已经走了多少米，再从两地的距离里减去。',
        steps: [
          step(`速度和：${a} + ${b} = ${a + b}（米）`),
          step(`已走：${a + b} × ${t} = ${both}（米）`),
          step(`还相距：${s} − ${both} = ${s - both}（米）`),
        ],
        targetSeconds: 150,
      };
    }
    if (ask === 'more') {
      return {
        widget: 'numeric',
        prompt: `${head}${t} 分钟后两人相遇。相遇时${x}比${y}多走了多少米？`,
        answer: num((a - b) * t),
        hint: `每分钟${x}比${y}多走几米？`,
        steps: [
          step(`每分钟多走：${a} − ${b} = ${a - b}（米）`),
          step(`${a - b} × ${t} = ${(a - b) * t}（米）`),
        ],
        targetSeconds: 120,
      };
    }
    return {
      widget: 'numeric',
      prompt: `${head}${t} 分钟后两人相遇。两地相距多少米？`,
      answer: num(both),
      hint: '两人一起走完了两地之间的路：速度和 × 相遇时间 = 路程。',
      steps: [
        step(`速度和：${a} + ${b} = ${a + b}（米）`),
        step(`${a + b} × ${t} = ${both}（米）`),
      ],
      targetSeconds: 120,
    };
  },
  solve({ a, b, t, ask, s }) {
    // Walk minute by minute.
    let gap = s;
    let x = 0;
    let y = 0;
    let minutes = 0;
    if (ask === 'time') {
      while (gap > 0) {
        gap -= a + b;
        minutes++;
      }
      return num(minutes);
    }
    for (let i = 0; i < t; i++) {
      x += a;
      y += b;
    }
    return num(ask === 'left' ? s - x - y : ask === 'more' ? x - y : x + y);
  },
  bugs: ({ a, b, t, ask }) =>
    ask === 'distance'
      ? [
          [a * t, RC],
          [(a - b) * t, RC],
        ]
      : ask === 'more'
        ? [[(a + b) * t, RC]]
        : ask === 'left'
          ? [[(a + b) * t, RC]]
          : [],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TEMPLATES: WordTemplate<any>[] = [
  totalOfParts,
  partFromTotal,
  shareRest,
  totalPrice,
  unitPrice,
  howMany,
  relation,
  distance,
  speedOf,
  timeOf,
  meetingT,
];

export const g4Quantity = wordGenerator('g4.quantity', TEMPLATES);
