import type { ErrorTag } from '@xuexi/shared';
import { step } from './base';
import type { ChallengeTemplate } from './challenge';
import { choiceAt, cmpOf, num, pickN, range, repeatAdd, until } from './challenge-g2-util';

/**
 * 第二单元 测量（一）的拔高 / 创新题。
 *  informal  用不同方法测量（拃、脚长、小棒、回形针），不出现厘米
 *  cm        认识厘米，用刻度尺量
 *  meter     认识米，米和厘米的换算（计算只在 100 以内）
 */

// ------------------------------------------------------------------ informal

/** 跳绳对折（再对折）后量得 n 拃，原来长几拃？ */
const informalFold: ChallengeTemplate<{ n: number; folds: 1 | 2 }> = {
  id: 'informal.fold',
  family: 'informal',
  tier: 'stretch',
  make(rng, d) {
    const folds = d >= 3 && rng.chance(0.5) ? 2 : 1;
    return { folds, n: folds === 1 ? rng.int(3, 9) : rng.int(2, 5) };
  },
  render({ n, folds }) {
    const parts = folds === 1 ? 2 : 4;
    return {
      widget: 'numeric',
      prompt: `一根跳绳${folds === 1 ? '对折' : '对折再对折'}后，量得长 ${n} 拃。这根跳绳原来长几拃？`,
      answer: num(n * parts),
      hint: `折一折纸条试试：${folds === 1 ? '对折' : '对折再对折'}后，跳绳变成了同样长的几段？`,
      steps: [
        step(
          `${folds === 1 ? '对折' : '对折再对折'}后，跳绳变成了同样长的 ${parts} 段，每段长 ${n} 拃。`,
        ),
        step(`原来的长：${repeatAdd(n, parts)} = ${n * parts}（拃）。`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ n, folds }) {
    let len = n;
    for (let i = 0; i < folds; i++) len = len + len; // 打开一次，长度翻一番
    return num(len);
  },
};

/** 1 支铅笔和 3 块橡皮一样长，课桌长 5 支铅笔，有几块橡皮那么长？ */
const informalConvert: ChallengeTemplate<{ e: number; p: number }> = {
  id: 'informal.convert',
  family: 'informal',
  tier: 'stretch',
  make(rng) {
    return until(
      () => ({ e: rng.int(2, 4), p: rng.int(2, 5) }),
      (x) => x.e * x.p <= 20,
      'convert',
    );
  },
  render({ e, p }) {
    return {
      widget: 'numeric',
      prompt: `1 支铅笔和 ${e} 块橡皮一样长。一张课桌长 ${p} 支铅笔，课桌有几块橡皮那么长？`,
      answer: num(e * p),
      hint: '把每支铅笔都换成同样长的橡皮，一支一支地换。',
      steps: [
        step(`1 支铅笔换成 ${e} 块橡皮，${p} 支铅笔就要换 ${p} 次。`),
        step(`${repeatAdd(e, p)} = ${e * p}（块）。`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ e, p }) {
    let blocks = 0;
    for (let pencil = 0; pencil < p; pencil++) blocks += e;
    return num(blocks);
  },
};

/** 三个人用拃量同一张课桌：谁的一拃最长 / 最短？ */
const HAND_KIDS = ['淘气', '笑笑', '奇思'];

const informalWhoHand: ChallengeTemplate<{ counts: number[]; longest: boolean }> = {
  id: 'informal.who-hand',
  family: 'informal',
  tier: 'stretch',
  make(rng) {
    return { counts: pickN(rng, range(5, 10), 3), longest: rng.chance(0.6) };
  },
  render({ counts, longest }) {
    const target = longest ? Math.min(...counts) : Math.max(...counts);
    const idx = counts.indexOf(target);
    const tags = counts.map((c): ErrorTag | null =>
      c === target
        ? null
        : c === (longest ? Math.max(...counts) : Math.min(...counts))
          ? 'measure-count'
          : 'reasoning',
    );
    return {
      widget: 'choice',
      prompt: `${HAND_KIDS.map((k, i) => `${k}量了 ${counts[i]} 拃`).join('，')}，他们量的是同一张课桌。谁的一拃最${longest ? '长' : '短'}？`,
      options: HAND_KIDS,
      optionTags: tags,
      answer: choiceAt(idx),
      hint: '量同一样东西，一拃越长，量的次数越多还是越少？',
      steps: [
        step('量的是同一张课桌：一拃越长，量的次数越少；一拃越短，量的次数越多。'),
        step(
          `${HAND_KIDS[idx]}量了 ${target} 拃，次数最${longest ? '少' : '多'}，所以${HAND_KIDS[idx]}的一拃最${longest ? '长' : '短'}。`,
        ),
      ],
      targetSeconds: 45,
    };
  },
  solve({ counts, longest }) {
    // 课桌长看作 counts 的乘积个小格，一拃的长 = 总长 ÷ 次数。
    const total = counts.reduce((x, y) => x * y, 1);
    const hand = counts.map((c) => total / c);
    const best = longest ? Math.max(...hand) : Math.min(...hand);
    return choiceAt(hand.indexOf(best));
  },
};

/** 两根小棒能直接量出几种不同的长度？ */
const informalTwoSticks: ChallengeTemplate<{ a: number; b: number }> = {
  id: 'informal.two-sticks',
  family: 'informal',
  tier: 'creative',
  make(rng) {
    const a = rng.int(2, 5);
    const b = rng.chance(0.35)
      ? a * 2
      : until(
          () => rng.int(a + 1, 9),
          (x) => x !== 2 * a,
          'stick',
        );
    return { a, b };
  },
  render({ a, b }) {
    const lens = [...new Set([a, b, a + b, b - a])].sort((x, y) => x - y);
    return {
      widget: 'numeric',
      prompt: `红棒长 ${a} 个回形针，蓝棒长 ${b} 个回形针。只用这两根小棒（可以只用一根，可以首尾接起来，也可以并排放、比出多出的一段），能直接量出几种不同的长度？`,
      answer: num(lens.length),
      hint: '一种一种地想：只用红棒，只用蓝棒，两根接起来，两根并排比出相差的那一段。长度一样的只算一种。',
      steps: [
        step(
          `只用一根：${a}、${b}；接起来：${a} + ${b} = ${a + b}；并排比：${b} − ${a} = ${b - a}（单位都是回形针长）。`,
        ),
        step(b === 2 * a ? `${b} − ${a} = ${a}，和红棒一样长，只算一种。` : '这几个长度都不一样。'),
        step(`能量出 ${lens.join('、')}，一共 ${lens.length} 种。`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ a, b }) {
    const set = new Set<number>();
    for (const x of [-1, 0, 1])
      for (const y of [-1, 0, 1]) if (x * a + y * b > 0) set.add(x * a + y * b);
    return num(set.size);
  },
};

/** 小明走 30 步的路，爸爸走 20 步；小明走 60 步的路，爸爸要走几步？ */
const STEP_PAIRS: Array<[number, number]> = [
  [20, 15],
  [30, 20],
  [30, 25],
  [40, 30],
  [20, 10],
  [10, 8],
  [15, 10],
];

const informalSteps: ChallengeTemplate<{ pair: number; m: number }> = {
  id: 'informal.steps-life',
  family: 'informal',
  tier: 'creative',
  make(rng) {
    return until(
      () => ({ pair: rng.int(0, STEP_PAIRS.length - 1), m: rng.int(2, 3) }),
      (p) => STEP_PAIRS[p.pair][0] * p.m <= 90,
      'steps',
    );
  },
  render({ pair, m }) {
    const [x, y] = STEP_PAIRS[pair];
    return {
      widget: 'numeric',
      prompt: `从家到小区门口，小明走了 ${x} 步，爸爸走同一段路只走了 ${y} 步。照这样，小明走 ${x * m} 步的路，爸爸要走几步？`,
      answer: num(y * m),
      hint: `小明走 ${x} 步的路，爸爸走 ${y} 步。${x * m} 步里有几个 ${x} 步？`,
      steps: [
        step(`${x * m} = ${repeatAdd(x, m)}，是 ${m} 段“小明走 ${x} 步”的路。`),
        step(`每一段爸爸走 ${y} 步：${repeatAdd(y, m)} = ${y * m}（步）。`),
        step('爸爸的一步比小明的长，所以走同样的路，爸爸走的步数少。'),
      ],
      targetSeconds: 90,
    };
  },
  solve({ pair, m }) {
    const [x, y] = STEP_PAIRS[pair];
    let kid = 0;
    let dad = 0;
    while (kid < x * m) {
      kid += x;
      dad += y;
    }
    return num(dad);
  },
};

/** 至少要几块橡皮接起来，才比铅笔长？ */
const informalClips: ChallengeTemplate<{ a: number; b: number }> = {
  id: 'informal.at-least',
  family: 'informal',
  tier: 'creative',
  make(rng) {
    return until(
      () => ({ a: rng.int(7, 16), b: rng.int(2, 4) }),
      (p) => p.a / p.b <= 6,
      'at least',
    );
  },
  render({ a, b }) {
    const n = Math.floor(a / b) + 1;
    const sums = range(1, n).map((i) => `${i} 块长 ${b * i} 个`);
    return {
      widget: 'numeric',
      prompt: `用同样的回形针量：铅笔长 ${a} 个回形针，橡皮长 ${b} 个回形针。至少要几块同样的橡皮首尾接起来，才比铅笔长？`,
      answer: num(n),
      hint: '一块一块地接，每接一块就算一算有几个回形针长。注意是“比铅笔长”，一样长还不够。',
      steps: [
        step(`一块一块接：${sums.join('，')}（回形针）。`),
        step(
          `${n} 块长 ${b * n} 个回形针，比 ${a} 个长${a % b === 0 ? `；${n - 1} 块正好和铅笔一样长，还不够` : ''}。`,
        ),
        step(`至少要 ${n} 块。`),
      ],
      targetSeconds: 75,
    };
  },
  solve({ a, b }) {
    let blocks = 0;
    let len = 0;
    while (len <= a) {
      blocks++;
      len += b;
    }
    return num(blocks);
  },
};

// ------------------------------------------------------------------ cm

/** 几张纸条粘成一长条，每处重叠 o 厘米，粘好后长几厘米？ */
const cmOverlap: ChallengeTemplate<{ n: number; L: number; o: number }> = {
  id: 'cm.overlap',
  family: 'cm',
  tier: 'stretch',
  make(rng, d) {
    return until(
      () => ({ n: rng.int(2, d >= 4 ? 4 : 3), L: rng.int(6, 15), o: rng.int(1, 3) }),
      (p) => p.n * p.L <= 60,
      'overlap',
    );
  },
  render({ n, L, o }) {
    const whole = n * L;
    const lost = (n - 1) * o;
    return {
      widget: 'numeric',
      prompt: `${n} 张同样长的纸条，每张长 ${L} 厘米。把它们粘成一长条，每两张之间重叠 ${o} 厘米。粘好后的纸条长几厘米？`,
      answer: num(whole - lost),
      hint: '先算纸条不重叠时一共多长，再数一数有几处重叠，每处少了多少。',
      steps: [
        step(`不重叠时一共长：${repeatAdd(L, n)} = ${whole}（厘米）。`),
        step(
          n === 2
            ? `2 张纸条粘在一起，只有 1 处重叠，少了 ${o} 厘米。`
            : `${n} 张纸条粘在一起，有 ${n - 1} 处重叠，一共少了 ${repeatAdd(o, n - 1)} = ${lost}（厘米）。`,
        ),
        step(`粘好后长：${whole} − ${lost} = ${whole - lost}（厘米）。`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ n, L, o }) {
    let end = L;
    for (let i = 1; i < n; i++) end = end - o + L; // 下一张从上一张末端往回 o 厘米处开始
    return num(end);
  },
};

/** 纸条上依次有红、黄、蓝、绿四个点，求黄点到蓝点的长。 */
const cmPoints: ChallengeTemplate<{ p: number; q: number; r: number }> = {
  id: 'cm.points',
  family: 'cm',
  tier: 'stretch',
  make(rng) {
    return until(
      () => ({ p: rng.int(2, 9), q: rng.int(2, 9), r: rng.int(2, 9) }),
      (x) => x.p !== x.r,
      'points',
    );
  },
  render({ p, q, r }) {
    const RB = p + q;
    const YG = q + r;
    const RG = p + q + r;
    return {
      widget: 'numeric',
      prompt: `一张长纸条上从左到右依次画着红、黄、蓝、绿四个点。红点到蓝点长 ${RB} 厘米，黄点到绿点长 ${YG} 厘米，红点到绿点长 ${RG} 厘米。黄点到蓝点长几厘米？`,
      answer: num(q),
      hint: '画一条线段，把四个点按顺序标上。先求红点到黄点有多长。',
      steps: [
        step(`红点到黄点：红点到绿点 − 黄点到绿点 = ${RG} − ${YG} = ${p}（厘米）。`),
        step(`黄点到蓝点：红点到蓝点 − 红点到黄点 = ${RB} − ${p} = ${q}（厘米）。`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ p, q, r }) {
    const RB = p + q;
    const YG = q + r;
    const RG = p + q + r;
    // 红点在 0，绿点在 RG；枚举黄点、蓝点的位置。
    for (let y = 1; y < RG; y++)
      for (let b = y + 1; b < RG; b++) if (b === RB && RG - y === YG) return num(b - y);
    throw new Error('points: none');
  },
};

/** 三根彩带比长短：哪根最长？ */
const RIBBONS = ['红彩带', '绿彩带', '黄彩带'];

const cmRibbons: ChallengeTemplate<{ r: number; x: number; y: number }> = {
  id: 'cm.ribbons',
  family: 'cm',
  tier: 'stretch',
  make(rng) {
    return until(
      () => ({ r: rng.int(20, 60), x: rng.int(3, 15), y: rng.int(3, 15) }),
      (p) => p.x !== p.y,
      'ribbons',
    );
  },
  render({ r, x, y }) {
    const g = r - x;
    const ye = g + y;
    const idx = ye > r ? 2 : 0;
    return {
      widget: 'choice',
      prompt: `红彩带长 ${r} 厘米，绿彩带比红彩带短 ${x} 厘米，黄彩带比绿彩带长 ${y} 厘米。哪根彩带最长？`,
      options: RIBBONS,
      optionTags: RIBBONS.map((_, i) => (i === idx ? null : 'reasoning')),
      answer: choiceAt(idx),
      hint: '先求绿彩带多长，再求黄彩带多长，最后三根比一比。',
      steps: [
        step(`绿彩带：${r} − ${x} = ${g}（厘米）。`),
        step(`黄彩带：${g} + ${y} = ${ye}（厘米）。`),
        step(`${r}、${g}、${ye} 中最大的是 ${Math.max(r, ye)}，${RIBBONS[idx]}最长。`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ r, x, y }) {
    const len = [r, r - x, r - x + y];
    return choiceAt(len.indexOf(Math.max(...len)));
  },
};

/** 断尺上只剩几个刻度，一次能直接量出几种不同的长度？ */
const cmBrokenRuler: ChallengeTemplate<{ marks: number[] }> = {
  id: 'cm.broken-ruler',
  family: 'cm',
  tier: 'creative',
  make(rng, d) {
    const n = d >= 4 ? 4 : 3;
    return { marks: [0, ...pickN(rng, range(1, 12), n - 1)].sort((x, y) => x - y) };
  },
  render({ marks }) {
    const diffs: string[] = [];
    const set = new Set<number>();
    for (let i = 0; i < marks.length; i++)
      for (let j = i + 1; j < marks.length; j++) {
        diffs.push(`${marks[j]} − ${marks[i]} = ${marks[j] - marks[i]}`);
        set.add(marks[j] - marks[i]);
      }
    const lens = [...set].sort((x, y) => x - y);
    return {
      widget: 'numeric',
      prompt: `一把尺子上的数字大多看不清了，只能看清 ${marks.join('、')} 这几个刻度（单位：厘米）。用它一次能直接量出几种不同的长度？`,
      answer: num(lens.length),
      hint: '任意两个看得清的刻度之间就是一段能量的长度。按顺序两两配对，长度一样的只算一种。',
      steps: [
        step(`两两配对：${diffs.join('，')}。`),
        step(`不同的长度有 ${lens.map((l) => `${l} 厘米`).join('、')}。`),
        step(`一共 ${lens.length} 种。`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ marks }) {
    const set = new Set<number>();
    for (const a of marks) for (const b of marks) if (b > a) set.add(b - a);
    return num(set.size);
  },
};

/** 数线段：一条线段上有 n 个点，一共有几条线段 / 有几条长 k·g 厘米的线段？ */
const cmSegments: ChallengeTemplate<{ n: number; g: number; k: number }> = {
  id: 'cm.segments',
  family: 'cm',
  tier: 'creative',
  make(rng, d) {
    const n = rng.int(3, d >= 3 ? 6 : 5);
    const withLen = d >= 3 && rng.chance(0.5);
    return { n, g: rng.int(1, 3), k: withLen ? rng.int(2, n - 1) : 0 };
  },
  render({ n, g, k }) {
    if (k > 0) {
      const count = n - k;
      return {
        widget: 'numeric',
        prompt: `一条直线上从左到右依次有 ${n} 个点，相邻两个点之间都是 ${g} 厘米。以这些点为端点，长 ${k * g} 厘米的线段有几条？`,
        answer: num(count),
        hint: `长 ${k * g} 厘米，就是跨过 ${k} 个“${g} 厘米”。从最左边的点开始，一条一条往右移着数。`,
        steps: [
          step(`${k * g} 厘米里有 ${k} 个 ${g} 厘米，线段要从一个点跨到往右数第 ${k} 个点。`),
          step(`从第 1 个点开始，到第 ${n - k} 个点为止都能作左端点。`),
          step(`一共 ${count} 条。`),
        ],
        targetSeconds: 90,
      };
    }
    const parts = range(1, n - 1).reverse();
    return {
      widget: 'numeric',
      prompt: `在一条线段上（包括两个端点）一共点了 ${n} 个点。图中一共有几条线段？`,
      answer: num((n * (n - 1)) / 2),
      hint: '从最左边的点出发，数一数它能和右边的点连成几条；再从第二个点出发……不重复，不遗漏。',
      steps: [
        step(
          `从第 1 个点往右能连 ${n - 1} 条，从第 2 个点往右能连 ${n - 2} 条……最后一个点往右没有了。`,
        ),
        step(`一共 ${parts.join(' + ')} = ${(n * (n - 1)) / 2}（条）。`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ n, g, k }) {
    let c = 0;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) if (k === 0 || (j - i) * g === k * g) c++;
    return num(c);
  },
};

/** 小蜗牛每分钟爬 up 厘米又滑回 down 厘米，第几分钟第一次到 T 厘米？ */
const cmSnail: ChallengeTemplate<{ up: number; down: number; T: number }> = {
  id: 'cm.snail',
  family: 'cm',
  tier: 'creative',
  make(rng) {
    return until(
      () => {
        const up = rng.int(3, 6);
        const down = rng.int(1, up - 2);
        return { up, down, T: rng.int(up + 3, 25) };
      },
      (p) => {
        const m = snailMinutes(p);
        return m >= 3 && m <= 8;
      },
      'snail',
    );
  },
  render(p) {
    const { up, down, T } = p;
    const m = snailMinutes(p);
    const log: string[] = [];
    let pos = 0;
    for (let i = 1; i <= m; i++) {
      pos += up;
      if (i === m) log.push(`第 ${i} 分钟爬到 ${pos}`);
      else {
        log.push(`第 ${i} 分钟爬到 ${pos}，滑回到 ${pos - down}`);
        pos -= down;
      }
    }
    return {
      widget: 'numeric',
      prompt: `小蜗牛沿着一把长尺从 0 刻度往前爬。它每分钟先往前爬 ${up} 厘米，接着滑回 ${down} 厘米。它第几分钟第一次爬到 ${T} 厘米的刻度？`,
      answer: num(m),
      hint: '一分钟一分钟地画一画、记一记：每分钟先爬到哪里，再滑回到哪里。最后一次爬到了就不用再算滑回。',
      steps: [
        step(`${log.join('；')}。`),
        step(`第 ${m} 分钟第一次爬到 ${T} 厘米（到了 ${T} 或超过 ${T}）。`),
      ],
      targetSeconds: 120,
    };
  },
  solve({ up, down, T }) {
    let pos = 0;
    for (let minute = 1; minute < 100; minute++) {
      for (let cm = 0; cm < up; cm++) {
        pos++;
        if (pos >= T) return num(minute);
      }
      pos -= down;
    }
    throw new Error('snail never arrives');
  },
};

function snailMinutes({ up, down, T }: { up: number; down: number; T: number }): number {
  if (T <= up) return 1;
  return Math.ceil((T - up) / (up - down)) + 1;
}

/** 判断：一端对着刻度 s，另一端对着 e，他说长 claim 厘米，对吗？ */
type RulerOpt = { right: true } | { right: false; v: number };

const cmJudgeRuler: ChallengeTemplate<{
  s: number;
  e: number;
  claim: number;
  options: RulerOpt[];
}> = {
  id: 'cm.judge-ruler',
  family: 'cm',
  tier: 'creative',
  make(rng) {
    const s = rng.int(1, 5);
    const e = rng.int(s + 3, 14);
    const len = e - s;
    const claim = rng.pick([len, e, e, e + s]);
    const fixes = [len, e, e + s].filter((v) => v !== claim);
    const options: RulerOpt[] = [
      { right: true },
      ...fixes.map((v): RulerOpt => ({ right: false, v })),
    ];
    return { s, e, claim, options: rng.shuffle(options) };
  },
  render({ s, e, claim, options }) {
    const len = e - s;
    const idx = options.findIndex((o) => (claim === len ? o.right : !o.right && o.v === len));
    return {
      widget: 'choice',
      prompt: `小明量一支蜡笔：蜡笔的一端对着刻度 ${s}，另一端对着刻度 ${e}。他说：“蜡笔长 ${claim} 厘米。”他说得对吗？`,
      options: options.map((o) => (o.right ? '他说得对' : `不对，应该是 ${o.v} 厘米`)),
      optionTags: options.map((_, i): ErrorTag | null => (i === idx ? null : 'ruler-read')),
      answer: choiceAt(idx),
      hint: '没有从 0 开始量时，长度 = 末端的刻度 − 起点的刻度。也可以数一数中间有几个 1 厘米。',
      steps: [
        step(`从刻度 ${s} 到刻度 ${e}，中间有 ${e} − ${s} = ${len} 个 1 厘米。`),
        step(
          claim === len
            ? `蜡笔长 ${len} 厘米，小明说得对。`
            : `蜡笔长 ${len} 厘米，小明说成 ${claim} 厘米，不对。`,
        ),
      ],
      targetSeconds: 45,
    };
  },
  solve({ s, e, claim, options }) {
    let len = 0;
    for (let mark = s; mark < e; mark++) len++; // 数 1 厘米的小格
    const hits = options
      .map((o, i) => ((o.right ? claim === len : o.v === len) ? i : -1))
      .filter((i) => i >= 0);
    if (hits.length !== 1) throw new Error('judge ruler not unique');
    return choiceAt(hits[0]);
  },
};

// ------------------------------------------------------------------ meter

/** A length written with 米 and / or 厘米. */
interface Len {
  m: number;
  cm: number;
  /** write as "X 厘米" even when ≥ 100 */
  asCm?: boolean;
}

const cmOfLen = (l: Len): number => l.m * 100 + l.cm;

function lenText(l: Len): string {
  if (l.asCm) return `${cmOfLen(l)} 厘米`;
  if (l.m > 0 && l.cm > 0) return `${l.m} 米 ${l.cm} 厘米`;
  if (l.m > 0) return `${l.m} 米`;
  return `${l.cm} 厘米`;
}

/** Parse "1 米 20 厘米" / "120 厘米" / "2 米" (for solve). */
function parseLen(s: string): number {
  const m = /(\d+) 米/.exec(s);
  const c = /(\d+) 厘米/.exec(s);
  return (m ? Number(m[1]) * 100 : 0) + (c ? Number(c[1]) : 0);
}

/** 不计算…：1 米 − 35 厘米 ○ 60 厘米；1 米 5 厘米 ○ 150 厘米 */
const meterCompare: ChallengeTemplate<{ form: number; x: number; y: number }> = {
  id: 'meter.compare',
  family: 'meter',
  tier: 'stretch',
  make(rng) {
    const form = rng.int(0, 3);
    return until(
      () => ({ form, x: rng.int(1, 95), y: rng.int(1, 95) }),
      ({ x, y }) => {
        if (form === 0) return Math.abs(100 - x - y) <= 12;
        if (form === 1) return x + y <= 100 && x % 10 !== 0 && 100 - x - y <= 12;
        if (form === 2) return x <= 9 && y <= 9;
        return y >= 2 && y <= 9 && x >= 1 && x <= 9;
      },
      'meter compare',
    );
  },
  render({ form, x, y }) {
    const sides = meterSides(form, x, y);
    const [l, r] = sides.values;
    return {
      widget: 'compare',
      prompt: `比较大小：${sides.left} ○ ${sides.right}`,
      answer: cmpOf(l, r),
      hint: '先把米都换成厘米（1 米 = 100 厘米），单位相同了再比较。',
      steps: [
        step('1 米 = 100 厘米，先换成同一个单位。'),
        step(`左边是 ${l} 厘米，右边是 ${r} 厘米。`),
        step(`所以 ${sides.left} ${l < r ? '<' : l > r ? '>' : '='} ${sides.right}。`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ form, x, y }) {
    const { left, right } = meterSides(form, x, y);
    const side = (s: string) => {
      // "1 米 − 35 厘米" / "35 厘米 + 48 厘米" / single length
      const parts = s.split(/ ([+−]) /);
      let v = parseLen(parts[0]);
      for (let i = 1; i < parts.length; i += 2)
        v += (parts[i] === '+' ? 1 : -1) * parseLen(parts[i + 1]);
      return v;
    };
    return cmpOf(side(left), side(right));
  },
};

function meterSides(
  form: number,
  x: number,
  y: number,
): { left: string; right: string; values: [number, number] } {
  switch (form) {
    case 0:
      return { left: `1 米 − ${x} 厘米`, right: `${y} 厘米`, values: [100 - x, y] };
    case 1:
      return { left: `${x} 厘米 + ${y} 厘米`, right: '1 米', values: [x + y, 100] };
    case 2: {
      // 1 米 x 厘米（或 1 米 x0 厘米）○ 1y0 厘米：把 1 米当成 10 厘米就会比错
      const a: Len = { m: 1, cm: x % 2 === 0 ? x * 10 : x };
      const b: Len = { m: 1, cm: y * 10, asCm: true };
      return { left: lenText(a), right: lenText(b), values: [cmOfLen(a), cmOfLen(b)] };
    }
    default: {
      // x 米 ○ y 个十厘米
      const a: Len = { m: Math.max(1, Math.min(2, Math.round(x / 5))), cm: 0 };
      const b: Len = { m: 0, cm: y * 10 + (x % 2 === 0 ? 0 : 100), asCm: true };
      return { left: lenText(a), right: lenText(b), values: [cmOfLen(a), cmOfLen(b)] };
    }
  }
}

/** 1 米长的彩带剪两次，还剩几厘米？/ 两根接起来比 1 米短几厘米？ */
const meterCut: ChallengeTemplate<{ join: boolean; x: number; y: number; k: number }> = {
  id: 'meter.cut',
  family: 'meter',
  tier: 'stretch',
  make(rng, d) {
    const join = d >= 3 && rng.chance(0.5);
    return until(
      () => ({ join, x: rng.int(12, 48), y: rng.int(12, 48), k: join ? rng.int(2, 5) : 0 }),
      (p) => p.x + p.y <= 90 && p.x !== p.y && (p.x % 10) + (p.y % 10) >= 10,
      'meter cut',
    );
  },
  render({ join, x, y, k }) {
    if (join) {
      const L = x + y - k;
      return {
        widget: 'numeric',
        prompt: `两根绳子分别长 ${x} 厘米和 ${y} 厘米。把它们接起来，接头处用去 ${k} 厘米。接好的绳子比 1 米短几厘米？`,
        answer: num(100 - L),
        hint: '先算接好后的绳子有多长（别忘了接头用去的），再和 1 米 = 100 厘米比。',
        steps: [
          step(`接好后长：${x} + ${y} − ${k} = ${L}（厘米）。`),
          step(`1 米 = 100 厘米，100 − ${L} = ${100 - L}（厘米）。`),
        ],
        targetSeconds: 90,
      };
    }
    return {
      widget: 'numeric',
      prompt: `一根 1 米长的彩带，先剪下 ${x} 厘米做花，再剪下 ${y} 厘米做蝴蝶结。还剩几厘米？`,
      answer: num(100 - x - y),
      hint: '1 米是多少厘米？先换成厘米，再一次一次地减。',
      steps: [
        step('1 米 = 100 厘米。'),
        step(`100 − ${x} = ${100 - x}，${100 - x} − ${y} = ${100 - x - y}（厘米）。`),
      ],
      targetSeconds: 75,
    };
  },
  solve({ join, x, y, k }) {
    const meter = parseLen('1 米');
    if (join) return num(meter - (x + y - k));
    let left = meter;
    for (const cut of [x, y]) left -= cut;
    return num(left);
  },
};

/** 几个长度（米、厘米混写），哪个最长 / 最短？ */
const meterOrder: ChallengeTemplate<{ lens: Len[]; longest: boolean }> = {
  id: 'meter.order',
  family: 'meter',
  tier: 'stretch',
  make(rng) {
    const longest = rng.chance(0.5);
    return until(
      () => {
        const a = rng.int(1, 9);
        const lens: Len[] = rng.shuffle([
          { m: 1, cm: a }, // 1 米 a 厘米
          { m: 0, cm: a * 10 + 100, asCm: true }, // 1a0 厘米
          { m: 0, cm: rng.int(6, 19) * 10 + rng.int(0, 9), asCm: true }, // 60~199 厘米
          { m: rng.int(1, 2), cm: 0 },
        ]);
        return { lens, longest };
      },
      ({ lens }) => new Set(lens.map(cmOfLen)).size === 4,
      'meter order',
    );
  },
  render({ lens, longest }) {
    const cms = lens.map(cmOfLen);
    const target = longest ? Math.max(...cms) : Math.min(...cms);
    const idx = cms.indexOf(target);
    return {
      widget: 'choice',
      prompt: `下面哪个长度最${longest ? '长' : '短'}？`,
      options: lens.map(lenText),
      optionTags: lens.map((_, i): ErrorTag | null => (i === idx ? null : 'unit-rate')),
      answer: choiceAt(idx),
      hint: '1 米 = 100 厘米。把每个长度都换成厘米再比。',
      steps: [
        step(
          `都换成厘米：${lens.map((l) => (l.m > 0 && !l.asCm ? `${lenText(l)} = ${cmOfLen(l)} 厘米` : lenText(l))).join('，')}。`,
        ),
        step(`最${longest ? '长' : '短'}的是 ${lenText(lens[idx])}。`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ lens, longest }) {
    const cms = lens.map((l) => parseLen(lenText(l)));
    return choiceAt(cms.indexOf(longest ? Math.max(...cms) : Math.min(...cms)));
  },
};

/** 选两根木条接成正好 1 米，有几种选法？ */
const meterPairs: ChallengeTemplate<{ sticks: number[] }> = {
  id: 'meter.pairs',
  family: 'meter',
  tier: 'creative',
  make(rng) {
    return until(
      () => ({
        sticks: pickN(
          rng,
          range(2, 18).map((x) => x * 5),
          5,
        ).sort((x, y) => x - y),
      }),
      ({ sticks }) => {
        const n = meterPairList(sticks).length;
        return n >= 1 && n <= 3;
      },
      'meter pairs',
    );
  },
  render({ sticks }) {
    const list = meterPairList(sticks);
    return {
      widget: 'numeric',
      prompt: `有 5 根木条，分别长 ${sticks.join(' 厘米、')} 厘米。选两根首尾相接，正好接成 1 米长，有几种选法？`,
      answer: num(list.length),
      hint: '1 米 = 100 厘米。哪两根合起来正好是 100 厘米？按顺序一根一根地找它的“好朋友”。',
      steps: [
        step('1 米 = 100 厘米，要找和是 100 的两根。'),
        step(`${list.map(([a, b]) => `${a} + ${b} = 100`).join('，')}。`),
        step(`一共 ${list.length} 种选法。`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ sticks }) {
    let c = 0;
    for (let i = 0; i < sticks.length; i++)
      for (let j = i + 1; j < sticks.length; j++)
        if (sticks[i] + sticks[j] === parseLen('1 米')) c++;
    return num(c);
  },
};

function meterPairList(sticks: number[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < sticks.length; i++)
    for (let j = i + 1; j < sticks.length; j++)
      if (sticks[i] + sticks[j] === 100) out.push([sticks[i], sticks[j]]);
  return out;
}

/** 生活中的米：走几步是几米？青蛙跳几次是 1 米？ */
const meterWalk: ChallengeTemplate<{ frog: boolean; v: number }> = {
  id: 'meter.walk',
  family: 'meter',
  tier: 'creative',
  make(rng) {
    const frog = rng.chance(0.5);
    return { frog, v: frog ? rng.pick([10, 20, 25, 50]) : rng.int(2, 6) * 2 };
  },
  render({ frog, v }) {
    if (frog) {
      const n = 100 / v;
      return {
        widget: 'numeric',
        prompt: `小青蛙每次跳 ${v} 厘米。它要跳到 1 米远的荷叶上，要跳几次正好跳到？`,
        answer: num(n),
        hint: '1 米 = 100 厘米。一次一次地加上去，看几次正好是 100 厘米。',
        steps: [step('1 米 = 100 厘米。'), step(`${repeatAdd(v, n)} = 100，要跳 ${n} 次。`)],
        targetSeconds: 60,
      };
    }
    return {
      widget: 'numeric',
      prompt: `小明走一步大约是 50 厘米。他从教室门口走到窗边，走了 ${v} 步。教室门口到窗边大约是几米？`,
      answer: num(v / 2),
      hint: '两步是多少厘米？100 厘米是几米？',
      steps: [
        step('走两步：50 + 50 = 100（厘米），就是 1 米。'),
        step(`${v} 步里有 ${v / 2} 个“两步”，大约是 ${v / 2} 米。`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ frog, v }) {
    if (frog) {
      let n = 0;
      for (let d = 0; d < 100; d += v) n++;
      return num(n);
    }
    return num(Math.floor((v * 50) / parseLen('1 米')));
  },
};

/** 小明的日记：哪一句的单位用错了？ */
const DIARY: Array<{ text: string; v: number; unit: '米' | '厘米' }> = [
  { text: '我的铅笔长', v: 18, unit: '厘米' },
  { text: '数学书长', v: 26, unit: '厘米' },
  { text: '我的一拃长', v: 13, unit: '厘米' },
  { text: '我的橡皮长', v: 4, unit: '厘米' },
  { text: '我的课桌高', v: 70, unit: '厘米' },
  { text: '教室长', v: 9, unit: '米' },
  { text: '黑板长', v: 4, unit: '米' },
  { text: '学校的旗杆高', v: 12, unit: '米' },
  { text: '教室的门高', v: 2, unit: '米' },
  { text: '我家的床长', v: 2, unit: '米' },
];

const meterDiary: ChallengeTemplate<{ items: number[]; wrong: number }> = {
  id: 'meter.diary',
  family: 'meter',
  tier: 'creative',
  make(rng) {
    const cmItems = range(0, 4);
    const mItems = range(5, 9);
    const items = rng.shuffle([...pickN(rng, cmItems, 2), ...pickN(rng, mItems, 2)]);
    return { items, wrong: rng.int(0, 3) };
  },
  render({ items, wrong }) {
    const sentence = (item: number, i: number) => {
      const it = DIARY[item];
      const unit = i === wrong ? (it.unit === '米' ? '厘米' : '米') : it.unit;
      return `${it.text} ${it.v} ${unit}。`;
    };
    const bad = DIARY[items[wrong]];
    return {
      widget: 'choice',
      prompt: '小明写日记，有一句话里的长度单位用错了。是哪一句？',
      options: items.map(sentence),
      optionTags: items.map((_, i): ErrorTag | null => (i === wrong ? null : 'unit-choice')),
      answer: choiceAt(wrong),
      hint: '用身体尺比一比：手指宽约 1 厘米，张开双臂约 1 米。每句话都想一想合不合理。',
      steps: [
        step('比较短的东西（铅笔、书、橡皮）用厘米，比较长的（教室、旗杆、门）用米。'),
        step(`“${sentence(items[wrong], wrong)}”不对，应该是 ${bad.v} ${bad.unit}。`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ items, wrong }) {
    // 按实际长短判断：超过 1 米用米，不到 1 米用厘米，看显示的单位合不合理。
    const realCm: Record<string, number> = {
      我的铅笔长: 18,
      数学书长: 26,
      我的一拃长: 13,
      我的橡皮长: 4,
      我的课桌高: 70,
      教室长: 900,
      黑板长: 400,
      学校的旗杆高: 1200,
      教室的门高: 200,
      我家的床长: 200,
    };
    const shownUnit = (item: number, i: number) => {
      const u = DIARY[item].unit;
      return i === wrong ? (u === '米' ? '厘米' : '米') : u;
    };
    const bad = items
      .map((item, i) => {
        const it = DIARY[item];
        const shown = shownUnit(item, i) === '米' ? it.v * 100 : it.v;
        return shown === realCm[it.text] ? -1 : i;
      })
      .filter((i) => i >= 0);
    if (bad.length !== 1) throw new Error('diary not unique');
    return choiceAt(bad[0]);
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MEASURE_TEMPLATES: ChallengeTemplate<any>[] = [
  informalFold,
  informalConvert,
  informalWhoHand,
  informalTwoSticks,
  informalSteps,
  informalClips,
  cmOverlap,
  cmPoints,
  cmRibbons,
  cmBrokenRuler,
  cmSegments,
  cmSnail,
  cmJudgeRuler,
  meterCompare,
  meterCut,
  meterOrder,
  meterPairs,
  meterWalk,
  meterDiary,
];
