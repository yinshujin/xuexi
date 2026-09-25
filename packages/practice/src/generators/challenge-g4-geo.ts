import type { ErrorTag } from '@xuexi/shared';
import { step } from './base';
import type { ChallengeTemplate } from './challenge';
import { shuffledOptions } from './challenge';
import { choiceParts, num, onlyOption, pairs, type ChoiceParams } from './challenge-g4-util';

/**
 * 四年级上册 第二单元 线与角：
 *   lines — 线段、射线、直线（数线段、数射线、画直线）
 *   perp  — 相交与垂直、平移与平行
 *   angle — 旋转与角、角的度量
 */

const LETTERS = 'ABCDEFGH';

// ---------------------------------------------------------------- lines · 拔高

/** 一条直线上有 n 个点：射线有几条？线段和射线一共有几条？ */
const countRays: ChallengeTemplate<{ n: number; withSegments: boolean }> = {
  id: 'lines.count-rays',
  family: 'lines',
  tier: 'stretch',
  make(rng) {
    return { n: rng.int(3, 7), withSegments: rng.chance(0.5) };
  },
  render({ n, withSegments }) {
    const rays = 2 * n;
    const segs = pairs(n);
    const pts = LETTERS.slice(0, n).split('').join('、');
    return {
      widget: 'numeric',
      prompt: withSegments
        ? `一条直线上依次有 ${pts} ${n} 个点。图中以这些点为端点的线段和射线一共有几条？`
        : `一条直线上依次有 ${pts} ${n} 个点。图中以这些点为端点的射线一共有几条？`,
      answer: num(withSegments ? rays + segs : rays),
      hint: '射线只有一个端点：每个点可以向左、向右各引出一条射线。',
      steps: [
        step(`每个点向左、向右各有一条射线，射线有 ${n} × 2 = ${rays} 条。`),
        ...(withSegments
          ? [
              step(
                `线段有两个端点，有序地数：${Array.from({ length: n - 1 }, (_, i) => n - 1 - i).join(' + ')} = ${segs} 条。`,
              ),
              step(`一共 ${rays} + ${segs} = ${rays + segs} 条。`),
            ]
          : []),
      ],
      targetSeconds: 90,
    };
  },
  solve({ n, withSegments }) {
    let c = 0;
    for (let p = 0; p < n; p++) for (const _dir of ['left', 'right']) c++;
    if (withSegments) for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) c++;
    return num(c);
  },
};

/** 线段上依次有几个点，已知相邻两点间的长度，求图中所有线段的长度和。 */
const segmentSum: ChallengeTemplate<{ gaps: number[] }> = {
  id: 'lines.segment-sum',
  family: 'lines',
  tier: 'stretch',
  minDifficulty: 2,
  make(rng) {
    const k = rng.int(2, 4);
    return { gaps: Array.from({ length: k }, () => rng.int(1, 9)) };
  },
  render({ gaps }) {
    const n = gaps.length + 1;
    const names = LETTERS.slice(0, n).split('');
    const used = gaps.map((_, i) => (i + 1) * (n - 1 - i));
    const total = gaps.reduce((s, g, i) => s + g * used[i], 0);
    return {
      widget: 'numeric',
      prompt: `线段 ${names[0]}${names[n - 1]} 上依次有 ${names.join('、')} ${n} 个点，${gaps
        .map((g, i) => `${names[i]}${names[i + 1]} = ${g} 厘米`)
        .join('，')}。图中所有线段的长度加起来是多少厘米？`,
      answer: num(total),
      hint: '先有序地数出图中所有的线段，再把它们的长度加起来。也可以想：每一小段被算了几次？',
      steps: [
        step(`图中一共有 ${pairs(n)} 条线段。`),
        ...gaps.map((g, i) =>
          step(
            `${names[i]}${names[i + 1]} 这一小段在 ${used[i]} 条线段里，算了 ${used[i]} 次：${g} × ${used[i]} = ${g * used[i]}。`,
          ),
        ),
        step(`加起来：${gaps.map((g, i) => g * used[i]).join(' + ')} = ${total}（厘米）。`),
      ],
      targetSeconds: 180,
    };
  },
  solve({ gaps }) {
    const pos = [0];
    for (const g of gaps) pos.push(pos[pos.length - 1] + g);
    let s = 0;
    for (let i = 0; i < pos.length; i++)
      for (let j = i + 1; j < pos.length; j++) s += pos[j] - pos[i];
    return num(s);
  },
};

/** n 个点，其中 k 个在同一条直线上，过每两点画直线，一共几条？ */
const linesCollinear: ChallengeTemplate<{ n: number; k: number }> = {
  id: 'lines.collinear',
  family: 'lines',
  tier: 'stretch',
  minDifficulty: 3,
  make(rng) {
    const n = rng.int(5, 8);
    return { n, k: rng.int(3, n - 1) };
  },
  render({ n, k }) {
    const all = pairs(n);
    const inLine = pairs(k);
    const ans = all - inLine + 1;
    return {
      widget: 'numeric',
      prompt: `平面上有 ${n} 个点，其中有 ${k} 个点在同一条直线上，除此以外任意三个点都不在同一条直线上。经过每两个点画一条直线，一共能画几条直线？`,
      answer: num(ans),
      hint: `先当作任意三点都不在一条直线上来数，再想：那 ${k} 个点之间连出的直线其实是同一条。`,
      steps: [
        step(
          `如果任意三点都不在一条直线上，可以画 ${Array.from({ length: n - 1 }, (_, i) => n - 1 - i).join(' + ')} = ${all} 条。`,
        ),
        step(`在同一条直线上的 ${k} 个点，每两点连线有 ${inLine} 种，但它们都是同一条直线。`),
        step(`所以一共 ${all} − ${inLine} + 1 = ${ans} 条。`),
      ],
      targetSeconds: 180,
    };
  },
  solve({ n, k }) {
    // Points 0..k-1 are on one line; list the distinct lines through pairs.
    const lines = new Set<string>();
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) lines.add(i < k && j < k ? 'common' : `${i}-${j}`);
    return num(lines.size);
  },
};

// ---------------------------------------------------------------- lines · 创新

const TICKET_CTX = [
  {
    kind: 'ticket-same',
    text: (n: number) =>
      `一条地铁线路一共有 ${n} 个站（包括起点站和终点站）。任意两站之间都有一种票价，往返的票价相同。这条线路一共有几种不同的票价？`,
  },
  {
    kind: 'ticket-diff',
    text: (n: number) =>
      `一条高铁线路一共有 ${n} 个站（包括起点站和终点站）。从一站到另一站要准备一种车票，往返的车票不同（例如“甲站到乙站”和“乙站到甲站”是两种）。一共要准备几种车票？`,
  },
  { kind: 'handshake', text: (n: number) => `${n} 位同学见面，每两人都握一次手。一共握了几次手？` },
  {
    kind: 'games',
    text: (n: number) => `${n} 个班进行篮球比赛，每两个班都要比赛一场。一共要比赛几场？`,
  },
] as const;

/** 数线段的方法用在车票、握手、比赛里。 */
const ticketCount: ChallengeTemplate<{ n: number; ctx: number }> = {
  id: 'lines.tickets',
  family: 'lines',
  tier: 'creative',
  make(rng) {
    return { n: rng.int(4, 10), ctx: rng.int(0, TICKET_CTX.length - 1) };
  },
  render({ n, ctx }) {
    const c = TICKET_CTX[ctx];
    const once = pairs(n);
    const twice = c.kind === 'ticket-diff';
    const ans = twice ? once * 2 : once;
    return {
      widget: 'numeric',
      prompt: c.text(n),
      answer: num(ans),
      hint: `把 ${n} 个${c.kind.startsWith('ticket') ? '站' : c.kind === 'games' ? '班' : '人'}看成一条直线上的 ${n} 个点，像数线段一样有序地数。`,
      steps: [
        step(`像数线段一样：第 1 个和后面 ${n - 1} 个各配一次，第 2 个再和后面 ${n - 2} 个配……`),
        step(`${Array.from({ length: n - 1 }, (_, i) => n - 1 - i).join(' + ')} = ${once}。`),
        ...(twice ? [step(`往返不同，每一对要准备 2 种：${once} × 2 = ${ans}（种）。`)] : []),
      ],
      targetSeconds: 120,
    };
  },
  solve({ n, ctx }) {
    const ordered = TICKET_CTX[ctx].kind === 'ticket-diff';
    let c = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && (ordered || i < j)) c++;
    return num(c);
  },
};

/** 同一平面内 n 条直线最多有几个交点？（找规律） */
const maxIntersections: ChallengeTemplate<{ n: number }> = {
  id: 'lines.max-intersections',
  family: 'lines',
  tier: 'creative',
  make(rng) {
    return { n: rng.int(4, 9) };
  },
  render({ n }) {
    const seq = [2, 3, 4].map((k) => `${k} 条最多 ${pairs(k)} 个`);
    return {
      widget: 'numeric',
      prompt: `在同一平面内画直线：2 条直线最多有 1 个交点，3 条直线最多有 3 个交点，4 条直线最多有 6 个交点……照这样，${n} 条直线最多有几个交点？`,
      answer: num(pairs(n)),
      hint: '每多画一条直线，它最多能和前面的每一条直线各交出一个新的交点。',
      steps: [
        step(`${seq.join('，')}：每多 1 条直线，就多出“前面直线的条数”个交点。`),
        step(
          `${n} 条：${Array.from({ length: n - 1 }, (_, i) => i + 1).join(' + ')} = ${pairs(n)}（个）。`,
        ),
      ],
      targetSeconds: 120,
    };
  },
  solve({ n }) {
    let points = 0;
    for (let line = 1; line <= n; line++) points += line - 1;
    return num(points);
  },
};

// ---------------------------------------------------------------- perp · 拔高

/** 横线、竖线组成的图中，平行 / 垂直的直线有几组？ */
const gridPairs: ChallengeTemplate<{ a: number; b: number; ask: 'parallel' | 'perp' }> = {
  id: 'perp.grid-pairs',
  family: 'perp',
  tier: 'stretch',
  make(rng) {
    return { a: rng.int(2, 5), b: rng.int(2, 5), ask: rng.chance(0.5) ? 'parallel' : 'perp' };
  },
  render({ a, b, ask }) {
    const par = pairs(a) + pairs(b);
    const perp = a * b;
    return {
      widget: 'numeric',
      prompt: `在同一平面内画了 ${a} 条横线和 ${b} 条竖线，横线都互相平行，竖线也都互相平行，每条横线都和每条竖线互相垂直。图中${ask === 'parallel' ? '互相平行' : '互相垂直'}的直线一共有几组？（每两条算一组）`,
      answer: num(ask === 'parallel' ? par : perp),
      hint:
        ask === 'parallel'
          ? '横线和横线配对，竖线和竖线配对，分别有序地数。'
          : '每条横线和每一条竖线都能组成一组。',
      steps:
        ask === 'parallel'
          ? [
              step(`${a} 条横线每两条一组：${pairs(a)} 组。`),
              step(`${b} 条竖线每两条一组：${pairs(b)} 组。`),
              step(`一共 ${pairs(a)} + ${pairs(b)} = ${par}（组）。`),
            ]
          : [step(`每条横线和 ${b} 条竖线各组成一组，${a} 条横线：${a} × ${b} = ${perp}（组）。`)],
      targetSeconds: 90,
    };
  },
  solve({ a, b, ask }) {
    const dirs = [...Array(a).fill(0), ...Array(b).fill(90)];
    let c = 0;
    for (let i = 0; i < dirs.length; i++)
      for (let j = i + 1; j < dirs.length; j++) {
        const perp = Math.abs(dirs[i] - dirs[j]) === 90;
        if ((ask === 'perp') === perp) c++;
      }
    return num(c);
  },
};

/** 把字的每一笔看成线段：平行 / 垂直的线段有几组？ */
const STROKES = [
  { name: '汉字“工”', h: 2, v: 1 },
  { name: '汉字“王”', h: 3, v: 1 },
  { name: '汉字“土”', h: 2, v: 1 },
  { name: '汉字“干”', h: 2, v: 1 },
  { name: '汉字“丰”', h: 3, v: 1 },
  { name: '汉字“十”', h: 1, v: 1 },
  { name: '大写字母 E', h: 3, v: 1 },
  { name: '大写字母 F', h: 2, v: 1 },
  { name: '大写字母 H', h: 1, v: 2 },
  { name: '大写字母 T', h: 1, v: 1 },
  { name: '大写字母 L', h: 1, v: 1 },
];

const letterStrokes: ChallengeTemplate<{ shape: number; ask: 'parallel' | 'perp' }> = {
  id: 'perp.strokes',
  family: 'perp',
  tier: 'stretch',
  make(rng) {
    const shape = rng.int(0, STROKES.length - 1);
    const s = STROKES[shape];
    const canParallel = s.h >= 2 || s.v >= 2;
    return { shape, ask: canParallel && rng.chance(0.5) ? 'parallel' : 'perp' };
  },
  render({ shape, ask }) {
    const s = STROKES[shape];
    const par = pairs(s.h) + pairs(s.v);
    const perp = s.h * s.v;
    return {
      widget: 'numeric',
      prompt: `把${s.name}（印刷体，横平竖直）的每一笔都看成一条线段。其中${ask === 'parallel' ? '互相平行' : '互相垂直'}的线段有几组？（每两条算一组）`,
      answer: num(ask === 'parallel' ? par : perp),
      hint: '先数一数有几条横的线段、几条竖的线段。',
      steps: [
        step(
          `${s.name}${/[A-Z]$/.test(s.name) ? ' ' : ''}有 ${s.h} 条横的线段、${s.v} 条竖的线段。`,
        ),
        ask === 'parallel'
          ? step(`横的和横的平行、竖的和竖的平行：${pairs(s.h)} + ${pairs(s.v)} = ${par}（组）。`)
          : step(`每条横的都和每条竖的垂直：${s.h} × ${s.v} = ${perp}（组）。`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ shape, ask }) {
    const s = STROKES[shape];
    const segs = [...Array(s.h).fill('h'), ...Array(s.v).fill('v')];
    let c = 0;
    for (let i = 0; i < segs.length; i++)
      for (let j = i + 1; j < segs.length; j++)
        if ((segs[i] === segs[j]) === (ask === 'parallel')) c++;
    return num(c);
  },
};

// ---------------------------------------------------------------- perp · 创新

const REL_TEXT = { perp: '互相垂直', par: '互相平行' } as const;

/** 同一平面内 a⊥b，b⊥c，a 和 c 什么关系？ */
const perpChain: ChallengeTemplate<ChoiceParams & { rels: Array<'perp' | 'par'> }> = {
  id: 'perp.chain',
  family: 'perp',
  tier: 'creative',
  make(rng, difficulty) {
    const k = difficulty >= 3 && rng.chance(0.5) ? 3 : 2;
    const rels = Array.from(
      { length: k },
      () => (rng.chance(0.6) ? 'perp' : 'par') as 'perp' | 'par',
    );
    const odd = rels.filter((r) => r === 'perp').length % 2 === 1;
    const right = odd ? REL_TEXT.perp : REL_TEXT.par;
    const wrong: Array<[string, ErrorTag]> = [
      [odd ? REL_TEXT.par : REL_TEXT.perp, 'perp-parallel'],
      ['相交，但不垂直', 'perp-parallel'],
    ];
    return { ...shuffledOptions(rng, right, wrong), rels };
  },
  render(p) {
    const names = 'abcd';
    const last = names[p.rels.length];
    const facts = p.rels.map((r, i) => `直线 ${names[i]} 和直线 ${names[i + 1]} ${REL_TEXT[r]}`);
    const perps = p.rels.filter((r) => r === 'perp').length;
    return {
      ...choiceParts(p),
      prompt: `在同一平面内，${facts.join('，')}。那么直线 a 和直线 ${last} 的位置关系是？`,
      hint: '画一画：先画直线 a，再按顺序一条一条画出后面的直线。',
      steps: [
        step('垂直一次，方向就转了一个直角；平行，方向不变。'),
        step(
          `一共垂直了 ${perps} 次，${perps % 2 === 1 ? '方向和 a 成直角' : '转回了和 a 相同的方向'}。`,
        ),
        step(`所以直线 a 和直线 ${last} ${p.options[p.tags.indexOf(null)]}。`),
      ],
      targetSeconds: 90,
    };
  },
  solve(p) {
    let dir = 0;
    for (const r of p.rels) dir = (dir + (r === 'perp' ? 90 : 0)) % 180;
    return onlyOption(p.options, (o) => o === (dir === 90 ? REL_TEXT.perp : REL_TEXT.par));
  },
};

/** a 条横线、b 条竖线能围成多少个长方形？ */
const rectCount: ChallengeTemplate<{ a: number; b: number }> = {
  id: 'perp.rect-count',
  family: 'perp',
  tier: 'creative',
  make(rng) {
    return { a: rng.int(2, 4), b: rng.int(2, 4) };
  },
  render({ a, b }) {
    const ans = pairs(a) * pairs(b);
    return {
      widget: 'numeric',
      prompt: `在同一平面内画 ${a} 条互相平行的横线，再画 ${b} 条互相平行的竖线，横线和竖线互相垂直。图中一共能数出多少个长方形（正方形也算）？`,
      answer: num(ans),
      hint: '一个长方形由两条横线和两条竖线围成。先数能选出几对横线，再数能选出几对竖线。',
      steps: [
        step(`选两条横线：有 ${pairs(a)} 种选法。`),
        step(`选两条竖线：有 ${pairs(b)} 种选法。`),
        step(
          `每种横线选法都能和每种竖线选法围成一个长方形：${pairs(a)} × ${pairs(b)} = ${ans}（个）。`,
        ),
      ],
      targetSeconds: 150,
    };
  },
  solve({ a, b }) {
    let c = 0;
    for (let t = 0; t < a; t++)
      for (let bt = t + 1; bt < a; bt++)
        for (let l = 0; l < b; l++) for (let r = l + 1; r < b; r++) c++;
    return num(c);
  },
};

const ROUTE_CTX = [
  { from: '小明家', to: '公路', what: '修一条小路通到公路' },
  { from: '村子', to: '河边', what: '挖一条水渠把河水引到村子' },
  { from: '学校门口', to: '地铁线路', what: '修一条通道到地铁线路（看成一条直线）' },
  { from: '小红站的地方', to: '跑道的直道', what: '跑到跑道的直道上' },
];

/** 生活中的“垂线段最短”：怎样修路最近？ */
const shortestRoute: ChallengeTemplate<ChoiceParams & { ctx: number }> = {
  id: 'perp.shortest-route',
  family: 'perp',
  tier: 'creative',
  make(rng) {
    const ctx = rng.int(0, ROUTE_CTX.length - 1);
    const to = ROUTE_CTX[ctx].to;
    return {
      ...shuffledOptions(rng, `沿着和${to}垂直的方向`, [
        [`沿着和${to}平行的方向`, 'perp-parallel'],
        [`斜着走向${to}`, 'perp-parallel'],
        ['怎么走都一样长', 'reasoning'],
      ]),
      ctx,
    };
  },
  render(p) {
    const c = ROUTE_CTX[p.ctx];
    return {
      ...choiceParts(p),
      prompt: `从${c.from}${c.what}，要使路程最短，应该怎样走？`,
      hint: `把${c.to}看成一条直线，${c.from}看成直线外的一点。从这一点到直线的所有线段中，哪一条最短？`,
      steps: [
        step('从直线外一点到这条直线画的所有线段中，垂线段最短。'),
        step(`所以应该${p.options[p.tags.indexOf(null)]}。`),
      ],
      targetSeconds: 45,
    };
  },
  solve(p) {
    return onlyOption(p.options, (o) => o.includes('垂直'));
  },
};

// ---------------------------------------------------------------- angle · 拔高

/** 钟面上 h 时整，时针和分针所成的角是多少度？ */
const clockAngle: ChallengeTemplate<{ h: number }> = {
  id: 'angle.clock',
  family: 'angle',
  tier: 'stretch',
  make(rng) {
    return { h: rng.int(1, 11) };
  },
  render({ h }) {
    const gaps = Math.min(h, 12 - h);
    return {
      widget: 'numeric',
      prompt: `钟面上 ${h} 时整，时针和分针所成的角（较小的那个）是多少度？`,
      answer: num(gaps * 30),
      hint: '钟面一周是 360°，被分成 12 个大格。一个大格是多少度？',
      steps: [
        step('钟面一周 360°，平均分成 12 个大格，每个大格 360° ÷ 12 = 30°。'),
        step(`${h} 时整，分针指着 12，时针指着 ${h}，中间隔 ${gaps} 个大格。`),
        step(`${gaps} × 30° = ${gaps * 30}°`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ h }) {
    const hour = (h * 360) / 12;
    const minute = 0;
    const d = Math.abs(hour - minute);
    return num(Math.min(d, 360 - d));
  },
};

/** 从角的顶点在角内引出 k 条射线，图中一共有几个角？ */
const countAngles: ChallengeTemplate<{ k: number }> = {
  id: 'angle.count',
  family: 'angle',
  tier: 'stretch',
  make(rng) {
    return { k: rng.int(1, 5) };
  },
  render({ k }) {
    const rays = k + 2;
    return {
      widget: 'numeric',
      prompt: `从 ∠AOB 的顶点 O 出发，在这个角的内部画了 ${k} 条射线。图中一共有几个角？`,
      answer: num(pairs(rays)),
      hint: '每两条从 O 出发的射线组成一个角。先数一共有几条射线，再有序地数。',
      steps: [
        step(`从 O 出发一共有 ${rays} 条射线（包括 OA 和 OB）。`),
        step(
          `像数线段一样有序地数：${Array.from({ length: rays - 1 }, (_, i) => rays - 1 - i).join(' + ')} = ${pairs(rays)}（个）。`,
        ),
      ],
      targetSeconds: 90,
    };
  },
  solve({ k }) {
    const rays = k + 2;
    let c = 0;
    for (let i = 0; i < rays; i++) for (let j = i + 1; j < rays; j++) c++;
    return num(c);
  },
};

/** ∠1 和 ∠2 合起来是平角（直角），∠1 比 ∠2 大 d°，求 ∠1 或 ∠2。 */
const sumDiff: ChallengeTemplate<{ total: number; d: number; ask: 1 | 2 }> = {
  id: 'angle.sum-diff',
  family: 'angle',
  tier: 'stretch',
  minDifficulty: 2,
  make(rng) {
    const total = rng.chance(0.6) ? 180 : 90;
    const d = 2 * rng.int(5, total === 180 ? 70 : 35);
    return { total, d, ask: rng.chance(0.5) ? 1 : 2 };
  },
  render({ total, d, ask }) {
    const small = (total - d) / 2;
    const big = small + d;
    const name = total === 180 ? '平角' : '直角';
    return {
      widget: 'numeric',
      prompt: `∠1 和 ∠2 合起来正好是一个${name}，∠1 比 ∠2 大 ${d}°。∠${ask} 是多少度？`,
      answer: num(ask === 1 ? big : small),
      hint: `一个${name}是 ${total}°。如果从 ${total}° 里先去掉多出来的 ${d}°，剩下的两个角就一样大了。`,
      steps: [
        step(`一个${name}是 ${total}°。`),
        step(`∠2 = (${total}° − ${d}°) ÷ 2 = ${small}°`),
        step(`∠1 = ${small}° + ${d}° = ${big}°`),
        ...(ask === 2 ? [step(`所以 ∠2 是 ${small}°。`)] : []),
      ],
      targetSeconds: 120,
    };
  },
  solve({ total, d, ask }) {
    for (let a1 = 0; a1 <= total; a1++) {
      const a2 = total - a1;
      if (a1 - a2 === d) return num(ask === 1 ? a1 : a2);
    }
    throw new Error('no angle fits');
  },
};

/** 时针 / 分针转过的角度。 */
const handTurn: ChallengeTemplate<{ hand: 'minute' | 'hour'; from: number; span: number }> = {
  id: 'angle.hand-turn',
  family: 'angle',
  tier: 'stretch',
  make(rng) {
    const hand = rng.chance(0.5) ? 'minute' : 'hour';
    return hand === 'minute'
      ? { hand, from: 0, span: 5 * rng.int(1, 11) }
      : { hand, from: rng.int(1, 8), span: rng.int(1, 4) };
  },
  render({ hand, from, span }) {
    if (hand === 'minute') {
      return {
        widget: 'numeric',
        prompt: `分针从 12 开始走了 ${span} 分钟，分针转过了多少度？`,
        answer: num(span * 6),
        hint: '分针走一圈（60 分钟）转 360°，走 5 分钟转一个大格。',
        steps: [
          step('分针 60 分钟转 360°，1 分钟转 360° ÷ 60 = 6°。'),
          step(`${span} 分钟：${span} × 6° = ${span * 6}°`),
        ],
        targetSeconds: 60,
      };
    }
    return {
      widget: 'numeric',
      prompt: `从 ${from} 时到 ${from + span} 时，时针转过了多少度？`,
      answer: num(span * 30),
      hint: '时针每走 1 小时，走过钟面上的一个大格。一个大格是多少度？',
      steps: [
        step('钟面 12 个大格是 360°，一个大格是 30°。'),
        step(`时针走了 ${span} 个大格：${span} × 30° = ${span * 30}°`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ hand, from, span }) {
    // Tick minute by minute: the minute hand turns 6° a minute, the hour hand 0.5°.
    const minutes = hand === 'minute' ? span : (from + span - from) * 60;
    let turned = 0;
    for (let m = 0; m < minutes; m++) turned += hand === 'minute' ? 6 : 0.5;
    return num(turned);
  },
};

// ---------------------------------------------------------------- angle · 创新

const SQUARE_A = [30, 60, 90];
const SQUARE_B = [45, 90];
const NOT_MADE = [
  20, 25, 35, 40, 50, 55, 65, 70, 80, 85, 95, 100, 110, 115, 125, 130, 140, 145, 155, 160, 170,
];

/** 用一副三角尺拼角。 */
const setSquare: ChallengeTemplate<ChoiceParams> = {
  id: 'angle.set-square',
  family: 'angle',
  tier: 'creative',
  make(rng) {
    const sums = [75, 105, 120, 135, 150];
    const right = rng.pick(sums);
    const wrong = rng.shuffle(NOT_MADE).slice(0, 3);
    return shuffledOptions(
      rng,
      `${right}°`,
      wrong.map((w) => [`${w}°`, 'angle-sum'] as [string, ErrorTag]),
    );
  },
  render(p) {
    return {
      ...choiceParts(p),
      prompt:
        '一副三角尺，一块的角是 30°、60°、90°，另一块的角是 45°、45°、90°。从两块中各取一个角拼在一起，能拼出下面哪个角？',
      hint: '把两块三角尺上的角各取一个加一加，列出能拼出的所有角。',
      steps: [
        step('30° + 45° = 75°，60° + 45° = 105°，30° + 90° = 120°，'),
        step('90° + 45° = 135°，60° + 90° = 150°，90° + 90° = 180°。'),
        step(`所以能拼出的是 ${p.options[p.tags.indexOf(null)]}。`),
      ],
      targetSeconds: 90,
    };
  },
  solve(p) {
    const made = new Set<number>();
    for (const a of SQUARE_A) for (const b of SQUARE_B) made.add(a + b);
    return onlyOption(p.options, (o) => made.has(parseInt(o, 10)));
  },
};

/** 放大镜 / 延长边：角的大小不变。 */
const magnifier: ChallengeTemplate<{ x: number; mode: 'glass' | 'extend' }> = {
  id: 'angle.magnifier',
  family: 'angle',
  tier: 'creative',
  make(rng) {
    return { x: 5 * rng.int(4, 34), mode: rng.chance(0.5) ? 'glass' : 'extend' };
  },
  render({ x, mode }) {
    const glass = mode === 'glass';
    return {
      widget: 'numeric',
      prompt: glass
        ? `用一个能放大 ${x >= 100 ? 5 : 10} 倍的放大镜看一个 ${x}° 的角，看到的角是多少度？`
        : `把一个 ${x}° 的角的两条边各延长 3 厘米，这个角变成了多少度？`,
      answer: num(x),
      hint: '角的大小和什么有关？和边的长短有没有关系？',
      steps: [
        step('角的大小只看两条边张开得多大，和边画得长还是短没有关系。'),
        step(glass ? '放大镜把边放长了，但张开的程度没有变。' : '边延长了，张开的程度没有变。'),
        step(`所以还是 ${x}°。`),
      ],
      targetSeconds: 45,
    };
  },
  solve({ x }) {
    // The opening between the two sides is unchanged: compare directions, not lengths.
    const sideA = { dir: 0, len: 1 };
    const sideB = { dir: x, len: 1 };
    const scaled = [sideA, sideB].map((s) => ({ ...s, len: s.len * 10 }));
    return num(scaled[1].dir - scaled[0].dir);
  },
};

const TYPES = ['锐角', '直角', '钝角', '平角'] as const;
const clockDegrees = (h: number) => {
  const d = Math.abs(h * 30 - 0);
  return Math.min(d, 360 - d);
};
const typeOf = (deg: number) => (deg < 90 ? 0 : deg === 90 ? 1 : deg < 180 ? 2 : 3);

/** 哪个整时，时针和分针成钝角 / 锐角 / 直角 / 平角？ */
const clockType: ChallengeTemplate<ChoiceParams & { want: number }> = {
  id: 'angle.clock-type',
  family: 'angle',
  tier: 'creative',
  make(rng) {
    const want = rng.int(0, 3);
    const hours = Array.from({ length: 11 }, (_, i) => i + 1);
    const right = rng.pick(
      hours.filter((h) => typeOf(h * 30 > 180 ? 360 - h * 30 : h * 30) === want),
    );
    const others = rng.shuffle(
      hours.filter((h) => typeOf(Math.min(h * 30, 360 - h * 30)) !== want),
    );
    const picked: number[] = [];
    const seen = new Set<number>();
    for (const h of others) {
      const t = typeOf(Math.min(h * 30, 360 - h * 30));
      if (!seen.has(t) || picked.length >= 2) {
        seen.add(t);
        picked.push(h);
      }
      if (picked.length === 3) break;
    }
    return {
      ...shuffledOptions(
        rng,
        `${right} 时整`,
        picked.map((h) => [`${h} 时整`, 'angle-type'] as [string, ErrorTag]),
      ),
      want,
    };
  },
  render(p) {
    const right = parseInt(p.options[p.tags.indexOf(null)], 10);
    const deg = Math.min(right * 30, 360 - right * 30);
    return {
      ...choiceParts(p),
      prompt: `下面哪个时刻，钟面上时针和分针所成的角（较小的那个）是${TYPES[p.want]}？`,
      hint: '整时的时候分针指着 12。数一数时针和分针之间隔了几个大格，一个大格是 30°。',
      steps: [
        ...p.options.map((o) => {
          const h = parseInt(o, 10);
          const d = Math.min(h * 30, 360 - h * 30);
          return step(`${o}：隔 ${d / 30} 个大格，${d}°，是${TYPES[typeOf(d)]}。`);
        }),
        step(`所以是 ${right} 时整（${deg}°）。`),
      ],
      targetSeconds: 90,
    };
  },
  solve(p) {
    return onlyOption(p.options, (o) => typeOf(clockDegrees(parseInt(o, 10))) === p.want);
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GEO_TEMPLATES: ChallengeTemplate<any>[] = [
  countRays,
  segmentSum,
  linesCollinear,
  ticketCount,
  maxIntersections,
  gridPairs,
  letterStrokes,
  perpChain,
  rectCount,
  shortestRoute,
  clockAngle,
  countAngles,
  sumDiff,
  handTurn,
  setSquare,
  magnifier,
  clockType,
];
