import type { ErrorTag } from '@xuexi/shared';
import { step } from './base';
import type { ChallengeTemplate } from './challenge';
import { shuffledOptions } from './challenge';
import {
  choiceParts,
  num,
  onlyOption,
  optionIndex,
  pairs,
  type ChoiceParams,
} from './challenge-g4-util';

/**
 * 四年级上册（2024 修订版）：
 *   quantity — 运用数量关系解决问题：总量与分量、单价×数量=总价、速度×时间=路程、相遇问题
 *              （只用三位数乘两位数、除以一位数，不用除数是两位数的除法）
 *   figures  — 数学好玩·数图形的学问：数线段、数角、数三角形、数长方形 / 正方形
 */

const count = (n: number) => Array.from({ length: n }, (_, i) => n - i).join(' + ');

// ---------------------------------------------------------------- quantity · 拔高

type MeetAsk = 'distance' | 'more' | 'still';

/** 相遇问题：两地相距多少米 / 甲比乙多走多少米 / 还相距多少时两地相距多少。 */
const meet: ChallengeTemplate<{ a: number; b: number; t: number; ask: MeetAsk; r: number }> = {
  id: 'quantity.meet',
  family: 'quantity',
  tier: 'stretch',
  make(rng) {
    const ask = rng.pick<MeetAsk>(['distance', 'more', 'still']);
    const a = rng.int(6, 9) * 10 + rng.pick([0, 5]);
    let b = rng.int(5, 8) * 10 + rng.pick([0, 5]);
    if (b >= a) b = a - rng.pick([5, 10, 15]);
    return { a, b, t: rng.int(8, 25), ask, r: ask === 'still' ? rng.int(2, 9) * 100 : 0 };
  },
  render({ a, b, t, ask, r }) {
    const both = (a + b) * t;
    const head = `小明和小红同时从两地出发，相向而行。小明每分钟走 ${a} 米，小红每分钟走 ${b} 米，`;
    if (ask === 'more') {
      return {
        widget: 'numeric',
        prompt: `${head}${t} 分钟后两人相遇。相遇时小明比小红多走了多少米？`,
        answer: num((a - b) * t),
        hint: '每分钟小明比小红多走几米？走了几分钟？',
        steps: [
          step(`每分钟小明比小红多走 ${a} − ${b} = ${a - b}（米）。`),
          step(`${t} 分钟多走：${a - b} × ${t} = ${(a - b) * t}（米）`),
        ],
        targetSeconds: 90,
      };
    }
    if (ask === 'still') {
      return {
        widget: 'numeric',
        prompt: `${head}走了 ${t} 分钟后，两人还相距 ${r} 米。两地相距多少米？`,
        answer: num(both + r),
        hint: '先算两人一共走了多少米，再加上还没走的那一段。',
        steps: [
          step(`两人每分钟一共走 ${a} + ${b} = ${a + b}（米）。`),
          step(`${t} 分钟一共走 ${a + b} × ${t} = ${both}（米）。`),
          step(`两地相距 ${both} + ${r} = ${both + r}（米）`),
        ],
        targetSeconds: 120,
      };
    }
    return {
      widget: 'numeric',
      prompt: `${head}${t} 分钟后两人相遇。两地相距多少米？`,
      answer: num(both),
      hint: '两人一起走完了两地之间的路。每分钟两人一共走多少米？',
      steps: [
        step(`两人每分钟一共走 ${a} + ${b} = ${a + b}（米）。`),
        step(`${t} 分钟：${a + b} × ${t} = ${both}（米）`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ a, b, t, ask, r }) {
    let x = 0;
    let y = 0;
    for (let m = 0; m < t; m++) {
      x += a;
      y += b;
    }
    return num(ask === 'more' ? x - y : ask === 'still' ? x + y + r : x + y);
  },
};

/** 两辆车，谁快？每小时快多少千米？ */
const fasterBy: ChallengeTemplate<{ v1: number; t1: number; v2: number; t2: number }> = {
  id: 'quantity.faster-by',
  family: 'quantity',
  tier: 'stretch',
  make(rng) {
    const v1 = rng.int(45, 95);
    let v2 = rng.int(45, 95);
    if (v2 === v1) v2 += rng.chance(0.5) ? 3 : -3;
    let t2 = rng.int(2, 9);
    const t1 = rng.int(2, 9);
    if (t2 === t1) t2 = t1 === 9 ? 8 : t1 + 1;
    return { v1, t1, v2, t2 };
  },
  render({ v1, t1, v2, t2 }) {
    const [s1, s2] = [v1 * t1, v2 * t2];
    const fast = v1 > v2 ? '货车' : '客车';
    return {
      widget: 'numeric',
      prompt: `一辆货车 ${t1} 小时行驶了 ${s1} 千米，一辆客车 ${t2} 小时行驶了 ${s2} 千米。行驶得快的车每小时比慢的车多行多少千米？`,
      answer: num(Math.abs(v1 - v2)),
      hint: '不能直接比路程，要先算出每辆车每小时行多少千米（速度）。',
      steps: [
        step(`货车的速度：${s1} ÷ ${t1} = ${v1}（千米/时）。`),
        step(`客车的速度：${s2} ÷ ${t2} = ${v2}（千米/时）。`),
        step(
          `${fast}快，每小时多行 ${Math.max(v1, v2)} − ${Math.min(v1, v2)} = ${Math.abs(v1 - v2)}（千米）`,
        ),
      ],
      targetSeconds: 120,
    };
  },
  solve({ v1, t1, v2, t2 }) {
    const speed = (s: number, t: number) => {
      let v = 0;
      while (v * t < s) v++;
      return v;
    };
    return num(Math.abs(speed(v1 * t1, t1) - speed(v2 * t2, t2)));
  },
};

/** 用买 n 支钢笔的钱，可以买几本笔记本？ */
const samePrice: ChallengeTemplate<{ n: number; a: number; b: number }> = {
  id: 'quantity.same-money',
  family: 'quantity',
  tier: 'stretch',
  make(rng) {
    for (;;) {
      const b = rng.int(2, 9);
      const a = rng.int(11, 48);
      const n = rng.int(3, 24);
      if ((n * a) % b === 0 && a !== b && (n * a) / b !== n) return { n, a, b };
    }
  },
  render({ n, a, b }) {
    const total = n * a;
    return {
      widget: 'numeric',
      prompt: `一支钢笔 ${a} 元，一本笔记本 ${b} 元。用买 ${n} 支钢笔的钱，可以买多少本笔记本？`,
      answer: num(total / b),
      hint: '先用“单价 × 数量 = 总价”算出这笔钱一共有多少，再想这些钱里有几个笔记本的单价。',
      steps: [
        step(`买 ${n} 支钢笔的钱：${a} × ${n} = ${total}（元）。`),
        step(`能买笔记本：${total} ÷ ${b} = ${total / b}（本）`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ n, a, b }) {
    let money = n * a;
    let books = 0;
    while (money >= b) {
      money -= b;
      books++;
    }
    return num(books);
  },
};

type PartKind = 'diff' | 'times';

/** 总量与分量：和差、和倍。 */
const partWhole: ChallengeTemplate<{
  kind: PartKind;
  small: number;
  x: number;
  ask: 'big' | 'small';
}> = {
  id: 'quantity.part-whole',
  family: 'quantity',
  tier: 'stretch',
  minDifficulty: 2,
  make(rng) {
    const kind = rng.chance(0.5) ? 'diff' : 'times';
    return {
      kind,
      small: kind === 'diff' ? rng.int(80, 260) : rng.int(25, 180),
      x: kind === 'diff' ? rng.int(6, 60) : rng.int(2, 4),
      ask: rng.chance(0.5) ? 'big' : 'small',
    };
  },
  render({ kind, small, x, ask }) {
    if (kind === 'diff') {
      const big = small + x;
      const total = small + big;
      return {
        widget: 'numeric',
        prompt: `三年级和四年级一共有 ${total} 名同学，四年级比三年级多 ${x} 人。${ask === 'big' ? '四年级' : '三年级'}有多少人？`,
        answer: num(ask === 'big' ? big : small),
        hint: '如果从总人数里去掉四年级多出来的人，剩下的就是两个同样多的三年级。',
        steps: [
          step(`去掉多出来的 ${x} 人：${total} − ${x} = ${total - x}，正好是三年级人数的 2 倍。`),
          step(`三年级：${total - x} ÷ 2 = ${small}（人）。`),
          step(`四年级：${small} + ${x} = ${big}（人）。`),
        ],
        targetSeconds: 150,
      };
    }
    const big = small * x;
    const total = small + big;
    return {
      widget: 'numeric',
      prompt: `图书角的故事书和科技书一共有 ${total} 本，故事书的本数是科技书的 ${x} 倍。${ask === 'big' ? '故事书' : '科技书'}有多少本？`,
      answer: num(ask === 'big' ? big : small),
      hint: `把科技书看成 1 份，故事书就是 ${x} 份，一共是几份？`,
      steps: [
        step(`科技书 1 份，故事书 ${x} 份，一共 ${x + 1} 份。`),
        step(`科技书：${total} ÷ ${x + 1} = ${small}（本）。`),
        step(`故事书：${small} × ${x} = ${big}（本）。`),
      ],
      targetSeconds: 150,
    };
  },
  solve({ kind, small, x, ask }) {
    const total = kind === 'diff' ? 2 * small + x : small * (x + 1);
    for (let s = 1; s < total; s++) {
      const b = kind === 'diff' ? s + x : s * x;
      if (s + b === total) return num(ask === 'big' ? b : s);
    }
    throw new Error('no split fits');
  },
};

/** 行了一段后，剩下的路每小时要行多少千米才能按时到？ */
const speedUp: ChallengeTemplate<{ v: number; t: number; w: number; left: number }> = {
  id: 'quantity.speed-up',
  family: 'quantity',
  tier: 'stretch',
  minDifficulty: 3,
  make(rng) {
    const v = rng.int(5, 8) * 10;
    return { v, t: rng.int(2, 4), w: v + rng.int(1, 3) * 10, left: rng.int(2, 3) };
  },
  render({ v, t, w, left }) {
    const s = v * t + w * left;
    const gone = v * t;
    return {
      widget: 'numeric',
      prompt: `一辆汽车从甲地开往乙地，全程 ${s} 千米。前 ${t} 小时每小时行 ${v} 千米。要想再用 ${left} 小时正好到达乙地，剩下的路每小时要行多少千米？`,
      answer: num(w),
      hint: '先算已经行了多少千米、还剩多少千米，再想剩下的路要在几小时内行完。',
      steps: [
        step(`已行：${v} × ${t} = ${gone}（千米）。`),
        step(`还剩：${s} − ${gone} = ${s - gone}（千米）。`),
        step(`每小时要行：${s - gone} ÷ ${left} = ${w}（千米）`),
      ],
      targetSeconds: 150,
    };
  },
  solve({ v, t, w, left }) {
    const s = v * t + w * left;
    for (let speed = 1; speed <= 300; speed++) if (v * t + speed * left === s) return num(speed);
    throw new Error('no speed fits');
  },
};

// ---------------------------------------------------------------- quantity · 创新

const WAYS = [
  { name: '步行', v: 4, cost: 0 },
  { name: '骑自行车', v: 12, cost: 2 },
  { name: '坐公交车', v: 24, cost: 4 },
  { name: '打车', v: 48, cost: 40 },
] as const;

/** 出行：能按时到达、又最省钱的方式。 */
const chooseWay: ChallengeTemplate<ChoiceParams & { s: number; h: number }> = {
  id: 'quantity.choose-way',
  family: 'quantity',
  tier: 'creative',
  make(rng) {
    const idx = rng.int(0, 3);
    const h = rng.int(1, 2);
    const lo = idx === 0 ? 1 : WAYS[idx - 1].v * h + 1;
    const s = rng.int(lo, WAYS[idx].v * h);
    const right = WAYS[idx].name;
    const wrong = WAYS.filter((_, i) => i !== idx).map(
      (w) => [w.name, 'reasoning'] as [string, ErrorTag],
    );
    return { ...shuffledOptions(rng, right, wrong), s, h };
  },
  render(p) {
    const right = p.options[p.tags.indexOf(null)];
    return {
      ...choiceParts(p),
      prompt: `从家到科技馆大约 ${p.s} 千米，要在 ${p.h} 小时内到达。步行每小时约行 4 千米（不花钱），骑自行车每小时约 12 千米（2 元），坐公交车每小时约 24 千米（4 元），打车每小时约 48 千米（40 元）。能按时到达、又最省钱的方式是？`,
      hint: `用“速度 × 时间 = 路程”，算出每种方式 ${p.h} 小时能走多远，再从能到达的方式里挑最省钱的。`,
      steps: [
        ...WAYS.map((w) =>
          step(
            `${w.name}：${w.v} × ${p.h} = ${w.v * p.h}（千米），${w.v * p.h >= p.s ? '能' : '不能'}按时到达。`,
          ),
        ),
        step(`能按时到达的方式里，最省钱的是${right}。`),
      ],
      targetSeconds: 120,
    };
  },
  solve(p) {
    const ok = WAYS.filter((w) => w.v * p.h >= p.s);
    const cheapest = ok.reduce((m, w) => (w.cost < m.cost ? w : m));
    return optionIndex(p.options, cheapest.name);
  },
};

const THINGS = [
  { name: '一个同学步行', value: 60, unit: '米/分', lo: 30, hi: 120 },
  { name: '骑自行车', value: 250, unit: '米/分', lo: 120, hi: 500 },
  { name: '高铁', value: 300, unit: '千米/时', lo: 3000, hi: 6000 },
  { name: '在高速公路上行驶的小汽车', value: 100, unit: '千米/时', lo: 1000, hi: 2200 },
  { name: '深圳地铁列车', value: 80, unit: '千米/时', lo: 500, hi: 2000 },
] as const;
const UNITS = ['米/分', '米/时', '千米/时', '千米/分'] as const;
const perMinute = (value: number, unit: string) =>
  unit === '米/分'
    ? value
    : unit === '米/时'
      ? value / 60
      : unit === '千米/时'
        ? (value * 1000) / 60
        : value * 1000;

/** 速度单位的量感：哪个最可能是它的速度？ */
const unitSense: ChallengeTemplate<ChoiceParams & { thing: number }> = {
  id: 'quantity.unit-sense',
  family: 'quantity',
  tier: 'creative',
  make(rng) {
    const thing = rng.int(0, THINGS.length - 1);
    const t = THINGS[thing];
    return {
      ...shuffledOptions(
        rng,
        `${t.value} ${t.unit}`,
        UNITS.filter((u) => u !== t.unit).map(
          (u) => [`${t.value} ${u}`, 'reasoning'] as [string, ErrorTag],
        ),
      ),
      thing,
    };
  },
  render(p) {
    const t = THINGS[p.thing];
    return {
      ...choiceParts(p),
      prompt: `${t.name}的速度大约是多少？`,
      hint: '想一想：1 分钟或 1 小时，它大约能走（行）多远？“千米/时”表示每小时行多少千米。',
      steps: [
        ...p.options.map((o) => {
          const [v, u] = o.split(' ');
          return step(`${o}：每${u.endsWith('分') ? '分钟' : '小时'}行 ${v} ${u.split('/')[0]}。`);
        }),
        step(`符合实际的是 ${p.options[p.tags.indexOf(null)]}。`),
      ],
      targetSeconds: 60,
    };
  },
  solve(p) {
    const t = THINGS[p.thing];
    return onlyOption(p.options, (o) => {
      const [v, u] = o.split(' ');
      const m = perMinute(Number(v), u);
      return m >= t.lo && m <= t.hi;
    });
  },
};

/** 购物预算：买了书包后，剩下的钱最多能买几支笔？ */
const budget: ChallengeTemplate<{ money: number; a: number; b: number }> = {
  id: 'quantity.budget',
  family: 'quantity',
  tier: 'creative',
  make(rng) {
    for (;;) {
      const money = rng.pick([100, 150, 200, 300]);
      const a = rng.int(35, money - 20);
      const b = rng.int(3, 9);
      if ((money - a) % b !== 0 && money - a >= 2 * b) return { money, a, b };
    }
  },
  render({ money, a, b }) {
    const rest = money - a;
    const k = Math.floor(rest / b);
    return {
      widget: 'numeric',
      prompt: `妈妈带了 ${money} 元，先买了一个 ${a} 元的书包，剩下的钱买 ${b} 元一支的笔，最多能买几支？`,
      answer: num(k),
      hint: '先算剩下多少钱。剩下的钱不一定正好用完，想一想“最多”该怎么取。',
      steps: [
        step(`剩下：${money} − ${a} = ${rest}（元）。`),
        step(`${rest} ÷ ${b} = ${k}……${rest % b}，剩下的 ${rest % b} 元不够再买一支。`),
        step(`所以最多能买 ${k} 支。`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ money, a, b }) {
    let k = 0;
    while (a + (k + 1) * b <= money) k++;
    return num(k);
  },
};

/** 促销：甲店买 3 送 1，乙店每瓶便宜 1 元。只在一家店买，最少花多少元？ */
const promo: ChallengeTemplate<{ p: number; n: number }> = {
  id: 'quantity.promo',
  family: 'quantity',
  tier: 'creative',
  minDifficulty: 2,
  make(rng) {
    for (;;) {
      const p = rng.int(3, 8);
      const n = rng.int(8, 30);
      const a = (n - Math.floor(n / 4)) * p;
      const b = n * (p - 1);
      if (a !== b) return { p, n };
    }
  },
  render({ p, n }) {
    const groups = Math.floor(n / 4);
    const pay = n - groups;
    const a = pay * p;
    const b = n * (p - 1);
    return {
      widget: 'numeric',
      prompt: `一种饮料每瓶 ${p} 元。甲商店“买 3 瓶送 1 瓶”，乙商店每瓶便宜 1 元。要买 ${n} 瓶，只能在一家商店买，最少要花多少元？`,
      answer: num(Math.min(a, b)),
      hint: '两家商店分别算一算：甲商店要付几瓶的钱？乙商店每瓶多少元？',
      steps: [
        step(
          `甲商店：每 4 瓶只付 3 瓶的钱。${n} 瓶里有 ${groups} 个 4 瓶，送 ${groups} 瓶，要付 ${pay} 瓶的钱：${pay} × ${p} = ${a}（元）。`,
        ),
        step(`乙商店：${n} × ${p - 1} = ${b}（元）。`),
        step(`${a < b ? '甲' : '乙'}商店便宜，最少花 ${Math.min(a, b)} 元。`),
      ],
      targetSeconds: 150,
    };
  },
  solve({ p, n }) {
    let paid = 0;
    while (paid + Math.floor(paid / 3) < n) paid++;
    return num(Math.min(paid * p, n * (p - 1)));
  },
};

// ---------------------------------------------------------------- figures · 拔高

/** 从三角形的一个顶点向对边画 k 条线段，一共有几个三角形？（可再加一条平行于底边的线段） */
const triangleFan: ChallengeTemplate<{ k: number; cut: boolean }> = {
  id: 'figures.triangle-fan',
  family: 'figures',
  tier: 'stretch',
  make(rng, difficulty) {
    return { k: rng.int(1, 5), cut: difficulty >= 3 && rng.chance(0.5) };
  },
  render({ k, cut }) {
    const pts = k + 2;
    const one = pairs(pts);
    return {
      widget: 'numeric',
      prompt: cut
        ? `从三角形 ABC 的顶点 A 向对边 BC 画了 ${k} 条线段，再画一条和 BC 平行的线段，与 AB、AC 和这 ${k} 条线段都相交。图中一共有几个三角形？`
        : `从三角形 ABC 的顶点 A 向对边 BC 画了 ${k} 条线段。图中一共有几个三角形？`,
      answer: num(cut ? one * 2 : one),
      hint: '每个三角形都以 A 为顶点，它的底边是 BC 上的一条线段。先数 BC 上一共有几条线段。',
      steps: [
        step(`BC 上一共有 ${pts} 个点，能数出 ${count(pts - 1)} = ${one} 条线段。`),
        step(`每条线段和顶点 A 组成一个三角形，有 ${one} 个。`),
        ...(cut
          ? [step(`平行线段上也同样有 ${one} 个，一共 ${one} × 2 = ${one * 2}（个）。`)]
          : []),
      ],
      targetSeconds: 120,
    };
  },
  solve({ k, cut }) {
    let c = 0;
    const layers = cut ? 2 : 1;
    for (let layer = 0; layer < layers; layer++)
      for (let i = 0; i < k + 2; i++) for (let j = i + 1; j < k + 2; j++) c++;
    return num(c);
  },
};

/** 长方形被分成 r 行 c 列的小长方形，一共有几个长方形？ */
const rectGrid: ChallengeTemplate<{ r: number; c: number }> = {
  id: 'figures.rect-grid',
  family: 'figures',
  tier: 'stretch',
  make(rng, difficulty) {
    return { r: difficulty >= 3 ? rng.int(1, 3) : 1, c: rng.int(2, 5) };
  },
  render({ r, c }) {
    const across = pairs(c + 1);
    const down = pairs(r + 1);
    const prompt =
      r === 1
        ? `一个长方形被 ${c - 1} 条竖线分成了 ${c} 个小长方形（排成一行）。图中一共有几个长方形？`
        : `一个长方形被横线和竖线分成了 ${r} 行、每行 ${c} 个的小长方形。图中一共有几个长方形（包括正方形）？`;
    return {
      widget: 'numeric',
      prompt,
      answer: num(across * down),
      hint:
        r === 1
          ? '把长方形的一条长边看成一条线段，上面有几个点？每条线段对应一个长方形。'
          : '先看横着一行能数出几种宽度，再看竖着能数出几种高度。',
      steps:
        r === 1
          ? [
              step(`长边上有 ${c + 1} 个点，能数出 ${count(c)} = ${across} 条线段。`),
              step(`每条线段对应一个长方形，一共 ${across} 个。`),
            ]
          : [
              step(
                `横边上有 ${c + 1} 个点，有 ${across} 条线段；竖边上有 ${r + 1} 个点，有 ${down} 条线段。`,
              ),
              step(
                `每一条横边线段和每一条竖边线段都能组成一个长方形：${across} × ${down} = ${across * down}（个）。`,
              ),
            ],
      targetSeconds: 150,
    };
  },
  solve({ r, c }) {
    let n = 0;
    for (let top = 0; top < r; top++)
      for (let bottom = top + 1; bottom <= r; bottom++)
        for (let left = 0; left < c; left++) for (let right = left + 1; right <= c; right++) n++;
    return num(n);
  },
};

// ---------------------------------------------------------------- figures · 创新

/** n × n 的方格图里一共有几个正方形？（找规律） */
const squaresGrid: ChallengeTemplate<{ n: number }> = {
  id: 'figures.squares-grid',
  family: 'figures',
  tier: 'creative',
  make(rng) {
    return { n: rng.int(2, 5) };
  },
  render({ n }) {
    const bySize = Array.from({ length: n }, (_, i) => ({ s: i + 1, c: (n - i) * (n - i) }));
    const total = bySize.reduce((x, b) => x + b.c, 0);
    return {
      widget: 'numeric',
      prompt: `一个大正方形被分成 ${n} × ${n} 个同样大小的小正方形方格。图中一共有几个正方形？`,
      answer: num(total),
      hint: '按大小分类数：边长是 1 格的有几个？边长是 2 格的有几个？……',
      steps: [
        ...bySize.map((b) =>
          step(`边长 ${b.s} 格的：${n - b.s + 1} × ${n - b.s + 1} = ${b.c}（个）。`),
        ),
        step(`一共：${bySize.map((b) => b.c).join(' + ')} = ${total}（个）`),
      ],
      targetSeconds: 150,
    };
  },
  solve({ n }) {
    let c = 0;
    for (let size = 1; size <= n; size++)
      for (let x = 0; x + size <= n; x++) for (let y = 0; y + size <= n; y++) c++;
    return num(c);
  },
};

/** 圆上有 n 个点：能连几条线段 / 能画几个三角形？ */
const circlePoints: ChallengeTemplate<{ n: number; ask: 'segments' | 'triangles' }> = {
  id: 'figures.circle-points',
  family: 'figures',
  tier: 'creative',
  make(rng, difficulty) {
    const ask = difficulty >= 3 && rng.chance(0.5) ? 'triangles' : 'segments';
    return { n: ask === 'triangles' ? rng.int(4, 6) : rng.int(4, 9), ask };
  },
  render({ n, ask }) {
    if (ask === 'segments') {
      return {
        widget: 'numeric',
        prompt: `圆上有 ${n} 个点，每两个点之间连一条线段。一共能连几条线段？`,
        answer: num(pairs(n)),
        hint: '有序地连：第一个点和其余每个点各连一条，第二个点再和后面的点连……',
        steps: [step(`${count(n - 1)} = ${pairs(n)}（条）`)],
        targetSeconds: 90,
      };
    }
    const tri: string[] = [];
    const names = 'ABCDEF';
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        for (let k = j + 1; k < n; k++) tri.push(`${names[i]}${names[j]}${names[k]}`);
    return {
      widget: 'numeric',
      prompt: `圆上有 ${n} 个点 ${names.slice(0, n).split('').join('、')}，以其中任意三个点为顶点画三角形。一共能画几个不同的三角形？`,
      answer: num(tri.length),
      hint: '按字母顺序有序地列出来：先列含 A 和 B 的，再列含 A 和 C 的……不重复、不遗漏。',
      steps: [step(`有序地列：${tri.join('、')}。`), step(`一共 ${tri.length} 个。`)],
      targetSeconds: 180,
    };
  },
  solve({ n, ask }) {
    const size = ask === 'segments' ? 2 : 3;
    let c = 0;
    for (let mask = 0; mask < 1 << n; mask++) {
      let bits = 0;
      for (let i = 0; i < n; i++) if (mask & (1 << i)) bits++;
      if (bits === size) c++;
    }
    return num(c);
  },
};

/** 反过来想：一条线段上一共能数出 N 条线段，线段上有几个点？ */
const pointsFromSegments: ChallengeTemplate<{ n: number }> = {
  id: 'figures.points-from-segments',
  family: 'figures',
  tier: 'creative',
  make(rng) {
    return { n: rng.int(4, 10) };
  },
  render({ n }) {
    const total = pairs(n);
    return {
      widget: 'numeric',
      prompt: `一条线段上有几个点（包括两个端点），以这些点为端点，一共能数出 ${total} 条线段。这条线段上一共有几个点？`,
      answer: num(n),
      hint:
        '先想：2 个点有 1 条，3 个点有 1 + 2 条，4 个点有 1 + 2 + 3 条……一直加到 ' + total + '。',
      steps: [
        step('点数和线段条数：2 个点 1 条，3 个点 3 条，4 个点 6 条，5 个点 10 条……'),
        step(`${count(n - 1)} = ${total}，所以有 ${n} 个点。`),
      ],
      targetSeconds: 120,
    };
  },
  solve({ n }) {
    const total = pairs(n);
    for (let pts = 2; pts <= 50; pts++) {
      let segs = 0;
      for (let i = 0; i < pts; i++) for (let j = i + 1; j < pts; j++) segs++;
      if (segs === total) return num(pts);
    }
    throw new Error('no count fits');
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const APP_TEMPLATES: ChallengeTemplate<any>[] = [
  meet,
  fasterBy,
  samePrice,
  partWhole,
  speedUp,
  chooseWay,
  unitSense,
  budget,
  promo,
  triangleFan,
  rectGrid,
  squaresGrid,
  circlePoints,
  pointsFromSegments,
];
