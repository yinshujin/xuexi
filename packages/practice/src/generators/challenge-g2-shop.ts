import type { ErrorTag } from '@xuexi/shared';
import { step } from './base';
import type { ChallengeTemplate } from './challenge';
import { choiceAt, evalExpr, koujue, num, range, until } from './challenge-g2-util';

/**
 * 综合实践：参加欢乐购物活动（第八单元后）的拔高 / 创新题（family 'shop'）。
 * 价格都是整元（不用角、分），计算都在表内乘除法和 100 以内加减法范围里。
 */

const GOODS = [
  { name: '文具盒', unit: '个' },
  { name: '笔记本', unit: '本' },
  { name: '小汽车', unit: '辆' },
  { name: '皮球', unit: '个' },
  { name: '毛绒小熊', unit: '只' },
  { name: '跳绳', unit: '根' },
  { name: '水彩笔', unit: '盒' },
];

/** 买两种东西一共多少元？ */
const shopTwoItems: ChallengeTemplate<{
  g1: number;
  p1: number;
  n1: number;
  g2: number;
  p2: number;
  n2: number;
}> = {
  id: 'shop.two-items',
  family: 'shop',
  tier: 'stretch',
  make(rng) {
    return until(
      () => {
        const [g1, g2] = rng.shuffle(range(0, GOODS.length - 1));
        return {
          g1,
          p1: rng.int(3, 9),
          n1: rng.int(2, 9),
          g2,
          p2: rng.int(2, 9),
          n2: rng.int(2, 9),
        };
      },
      (p) => p.p1 !== p.p2 && p.n1 !== p.n2 && p.p1 * p.n1 + p.p2 * p.n2 <= 100,
      'two items',
    );
  },
  render({ g1, p1, n1, g2, p2, n2 }) {
    const a = GOODS[g1];
    const b = GOODS[g2];
    const t1 = p1 * n1;
    const t2 = p2 * n2;
    return {
      widget: 'numeric',
      prompt: `欢乐购物：一${a.unit}${a.name} ${p1} 元，一${b.unit}${b.name} ${p2} 元。买 ${n1} ${a.unit}${a.name}和 ${n2} ${b.unit}${b.name}，一共要多少元？`,
      answer: num(t1 + t2),
      hint: '先分别算两种东西各要多少元（几个几用乘法），再合起来。',
      steps: [
        step(`${a.name}：${n1} × ${p1} = ${t1}（元），想口诀“${koujue(n1, p1)}”。`),
        step(`${b.name}：${n2} × ${p2} = ${t2}（元），想口诀“${koujue(n2, p2)}”。`),
        step(`一共：${t1} + ${t2} = ${t1 + t2}（元）。`),
      ],
      targetSeconds: 75,
    };
  },
  solve({ p1, n1, p2, n2 }) {
    return num(evalExpr(`${n1} × ${p1} + ${n2} × ${p2}`));
  },
};

/** 带了 M 元，买 n 个 p 元的，还剩多少元？ */
const shopChange: ChallengeTemplate<{ M: number; g: number; p: number; n: number }> = {
  id: 'shop.change',
  family: 'shop',
  tier: 'stretch',
  make(rng) {
    return until(
      () => ({
        M: rng.pick([20, 30, 50, 100]),
        g: rng.int(0, GOODS.length - 1),
        p: rng.int(3, 9),
        n: rng.int(2, 9),
      }),
      (x) => x.M - x.p * x.n >= 1 && x.M - x.p * x.n <= 30 && x.p !== x.n,
      'change',
    );
  },
  render({ M, g, p, n }) {
    const it = GOODS[g];
    const cost = p * n;
    return {
      widget: 'numeric',
      prompt: `欢乐购物：妈妈带了 ${M} 元，买了 ${n} ${it.unit}${it.name}，每${it.unit} ${p} 元。还剩多少元？`,
      answer: num(M - cost),
      hint: '先算买东西花了多少元，再从带的钱里减去。',
      steps: [
        step(`花了：${n} × ${p} = ${cost}（元），想口诀“${koujue(n, p)}”。`),
        step(`还剩：${M} − ${cost} = ${M - cost}（元）。`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ M, p, n }) {
    let money = M;
    for (let i = 0; i < n; i++) money -= p; // 一个一个付钱
    return num(money);
  },
};

/** 买 a 个 p 元的钱，可以买几个 q 元的？ */
const shopSameMoney: ChallengeTemplate<{
  a: number;
  p: number;
  q: number;
  g1: number;
  g2: number;
}> = {
  id: 'shop.same-money',
  family: 'shop',
  tier: 'stretch',
  make(rng) {
    return until(
      () => {
        const [g1, g2] = rng.shuffle(range(0, GOODS.length - 1));
        return { a: rng.int(2, 9), p: rng.int(2, 9), q: rng.int(2, 9), g1, g2 };
      },
      (x) =>
        x.p !== x.q &&
        (x.a * x.p) % x.q === 0 &&
        (x.a * x.p) / x.q <= 9 &&
        (x.a * x.p) / x.q !== x.a,
      'same money',
    );
  },
  render({ a, p, q, g1, g2 }) {
    const A = GOODS[g1];
    const B = GOODS[g2];
    const money = a * p;
    const b = money / q;
    return {
      widget: 'numeric',
      prompt: `欢乐购物：一${A.unit}${A.name} ${p} 元，一${B.unit}${B.name} ${q} 元。买 ${a} ${A.unit}${A.name}的钱，正好可以买几${B.unit}${B.name}？`,
      answer: num(b),
      hint: `先算买 ${a} ${A.unit}${A.name}要多少元，再想这些钱里有几个 ${q} 元。`,
      steps: [
        step(`买 ${A.name}的钱：${a} × ${p} = ${money}（元）。`),
        step(`${money} 元里有几个 ${q} 元：${money} ÷ ${q} = ${b}，想口诀“${koujue(b, q)}”。`),
        step(`可以买 ${b} ${B.unit}${B.name}。`),
      ],
      targetSeconds: 75,
    };
  },
  solve({ a, p, q }) {
    const money = evalExpr(`${a} × ${p}`);
    let count = 0;
    for (let left = money; left >= q; left -= q) count++;
    return num(count);
  },
};

/** 用 M 元正好买两种玩具（每种至少 1 个），有几种买法？ */
const shopWays: ChallengeTemplate<{ M: number; p: number; q: number; g1: number; g2: number }> = {
  id: 'shop.ways',
  family: 'shop',
  tier: 'creative',
  make(rng) {
    return until(
      () => {
        const [g1, g2] = rng.shuffle(range(0, GOODS.length - 1));
        return { M: rng.int(12, 40), p: rng.int(2, 9), q: rng.int(2, 9), g1, g2 };
      },
      (x) => {
        const ways = shopWayList(x);
        return (
          x.p < x.q &&
          ways.length >= 1 &&
          ways.length <= 4 &&
          ways.every(([a, b]) => a <= 9 && b <= 9)
        );
      },
      'shop ways',
    );
  },
  render(x) {
    const A = GOODS[x.g1];
    const B = GOODS[x.g2];
    const ways = shopWayList(x);
    return {
      widget: 'numeric',
      prompt: `欢乐购物：一${A.unit}${A.name} ${x.p} 元，一${B.unit}${B.name} ${x.q} 元。小明要用 ${x.M} 元正好买这两种东西（两种都要买，钱正好用完），有几种不同的买法？`,
      answer: num(ways.length),
      hint: `按顺序试：${B.name}买 1 ${B.unit}、2 ${B.unit}……剩下的钱能不能正好买整数个${A.name}？`,
      steps: [
        step(`${B.name}按 1 ${B.unit}、2 ${B.unit}……一个一个试，剩下的钱要正好是几个 ${x.p} 元。`),
        step(
          `可以：${ways.map(([a, b]) => `${b} ${B.unit}${B.name}（${b * x.q} 元）和 ${a} ${A.unit}${A.name}（${a * x.p} 元）`).join('；')}。`,
        ),
        step(`一共 ${ways.length} 种买法。`),
      ],
      targetSeconds: 120,
    };
  },
  solve({ M, p, q }) {
    let c = 0;
    for (let a = 1; a * p <= M; a++)
      for (let b = 1; a * p + b * q <= M; b++) if (a * p + b * q === M) c++;
    return num(c);
  },
};

function shopWayList({ M, p, q }: { M: number; p: number; q: number }): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let b = 1; b * q < M; b++) {
    const rest = M - b * q;
    if (rest % p === 0) out.push([rest / p, b]);
  }
  return out;
}

/** 单个买还是整盒买：买 n 块橡皮最少花多少元？ */
const shopBundle: ChallengeTemplate<{ p: number; size: number; box: number; n: number }> = {
  id: 'shop.bundle',
  family: 'shop',
  tier: 'creative',
  make(rng) {
    return until(
      () => {
        const p = rng.int(2, 5);
        const size = rng.int(4, 6);
        return { p, size, box: p * size - rng.int(2, 5), n: rng.int(size + 1, 2 * size + 3) };
      },
      (x) =>
        x.box > x.p &&
        x.n * x.p <= 60 &&
        x.n % x.size !== 0 &&
        (x.n % x.size) * x.p < x.box && // 剩下的单买比再买一盒便宜
        x.box * 2 <= 60,
      'bundle',
    );
  },
  render({ p, size, box, n }) {
    const boxes = Math.floor(n / size);
    const singles = n - boxes * size;
    const cost = boxes * box + singles * p;
    return {
      widget: 'numeric',
      prompt: `欢乐购物：橡皮 ${p} 元一块；也可以整盒买，一盒 ${size} 块卖 ${box} 元（整盒不拆开）。小红要买 ${n} 块橡皮，最少要花多少元？`,
      answer: num(cost),
      hint: `整盒买便宜吗？先比一比 ${size} 块单买要多少元。再想买几盒、剩下的单买。`,
      steps: [
        step(
          `${size} 块单买要 ${size} × ${p} = ${size * p}（元），整盒只要 ${box} 元，整盒买便宜。`,
        ),
        step(
          `${n} 块里装满 ${boxes} 盒，还剩 ${singles} 块单买：${boxes} 盒 ${boxes * box} 元，${singles} 块 ${singles * p} 元。`,
        ),
        step(`最少要花 ${boxes * box} + ${singles * p} = ${cost}（元）。`),
      ],
      targetSeconds: 120,
    };
  },
  solve({ p, size, box, n }) {
    // 试遍买 0 盒、1 盒、2 盒……（多买的也可以，只要不少于 n 块）
    let best = Infinity;
    for (let b = 0; b * size <= n + size; b++) {
      const rest = Math.max(0, n - b * size);
      best = Math.min(best, b * box + rest * p);
    }
    return num(best);
  },
};

/** 带的钱够不够？ */
type EnoughOpt = { enough: boolean; v: number };

const shopEnough: ChallengeTemplate<{
  M: number;
  p: number;
  n: number;
  g: number;
  options: EnoughOpt[];
}> = {
  id: 'shop.enough',
  family: 'shop',
  tier: 'creative',
  make(rng) {
    const { M, p, n, g } = until(
      () => ({
        M: rng.pick([20, 30, 40, 50]),
        p: rng.int(3, 9),
        n: rng.int(3, 9),
        g: rng.int(0, GOODS.length - 1),
      }),
      (x) => Math.abs(x.M - x.p * x.n) >= 1 && Math.abs(x.M - x.p * x.n) <= 9 && x.p !== x.n,
      'enough',
    );
    const d = Math.abs(M - p * n);
    const opts: EnoughOpt[] = [
      { enough: true, v: d },
      { enough: false, v: d },
      { enough: M > p * n, v: d + p },
      { enough: M > p * n, v: Math.abs(M - p * (n - 1)) },
    ];
    const seen = new Set<string>();
    const options = opts.filter((o) => {
      const k = `${o.enough}${o.v}`;
      return seen.has(k) ? false : (seen.add(k), true);
    });
    return { M, p, n, g, options: rng.shuffle(options) };
  },
  render({ M, p, n, g, options }) {
    const it = GOODS[g];
    const cost = p * n;
    const text = (o: EnoughOpt) => (o.enough ? `够，还剩 ${o.v} 元` : `不够，还差 ${o.v} 元`);
    const idx = options.findIndex((o) => o.enough === M >= cost && o.v === Math.abs(M - cost));
    return {
      widget: 'choice',
      prompt: `欢乐购物：小明带了 ${M} 元，想买 ${n} ${it.unit}${it.name}，每${it.unit} ${p} 元。钱够吗？`,
      options: options.map(text),
      optionTags: options.map((_, i): ErrorTag | null => (i === idx ? null : 'reasoning')),
      answer: choiceAt(idx),
      hint: '先算一共要多少元，再和带的钱比一比。',
      steps: [
        step(`一共要：${n} × ${p} = ${cost}（元），想口诀“${koujue(n, p)}”。`),
        step(
          M >= cost
            ? `${M} > ${cost}，够，还剩 ${M} − ${cost} = ${M - cost}（元）。`
            : `${M} < ${cost}，不够，还差 ${cost} − ${M} = ${cost - M}（元）。`,
        ),
      ],
      targetSeconds: 60,
    };
  },
  solve({ M, p, n, options }) {
    let money = M;
    for (let i = 0; i < n; i++) money -= p;
    const want: EnoughOpt = { enough: money >= 0, v: Math.abs(money) };
    const hits = options
      .map((o, i) => (o.enough === want.enough && o.v === want.v ? i : -1))
      .filter((i) => i >= 0);
    if (hits.length !== 1) throw new Error('enough not unique');
    return choiceAt(hits[0]);
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SHOP_TEMPLATES: ChallengeTemplate<any>[] = [
  shopTwoItems,
  shopChange,
  shopSameMoney,
  shopWays,
  shopBundle,
  shopEnough,
];
