import type { ErrorTag } from '@xuexi/shared';
import { step } from './base';
import type { ChallengeTemplate } from './challenge';
import {
  choiceAt,
  cmpOf,
  evalExpr,
  num,
  pickN,
  range,
  relText,
  repeatAdd,
  until,
} from './challenge-g2-util';

/**
 * 乘法的拔高 / 创新题。
 *  mul      第三单元 认识乘法（几个几，还没学口诀，用连加算，数都很小）
 *  times    倍（第三单元认识倍；第五单元 倍与乘除法也用）
 * 乘法口诀（table25 / table69）在 challenge-g2-table.ts。
 */

// ------------------------------------------------------------------ mul

/** 3 + 3 + 3 + 3 + 2 和哪个算式得数相等？ */
const mulAddExtra: ChallengeTemplate<{ m: number; n: number; e: number; options: string[] }> = {
  id: 'mul.add-extra',
  family: 'mul',
  tier: 'stretch',
  make(rng) {
    const m = rng.int(3, 5);
    const n = rng.int(3, 5);
    const e = rng.int(1, m - 1);
    const sum = n * m + e;
    const correct = rng.chance(0.5) ? `${n} × ${m} + ${e}` : `${n + 1} × ${m} − ${m - e}`;
    const wrong = [
      `${n + 1} × ${m}`,
      `${n} × ${m}`,
      `${n} × ${m} + ${m}`,
      `${n} + ${m} + ${e}`,
      `${n - 1} × ${m} + ${e}`,
    ].filter((w) => evalExpr(w) !== sum);
    return { m, n, e, options: rng.shuffle([correct, ...pickN(rng, wrong, 3)]) };
  },
  render({ m, n, e, options }) {
    const expr = `${repeatAdd(m, n)} + ${e}`;
    const sum = n * m + e;
    const idx = options.findIndex(
      (o) => o === `${n} × ${m} + ${e}` || o === `${n + 1} × ${m} − ${m - e}`,
    );
    const tags = options.map((o): ErrorTag | null =>
      o === options[idx] ? null : o.includes('×') ? 'mul-meaning' : 'table-add-confused',
    );
    const how =
      options[idx] === `${n} × ${m} + ${e}`
        ? `前面是 ${n} 个 ${m}，写成 ${n} × ${m}，再加上 ${e}：${n} × ${m} + ${e}。`
        : `如果最后一个也是 ${m}，就是 ${n + 1} 个 ${m}；现在少了 ${m - e}：${n + 1} × ${m} − ${m - e}。`;
    return {
      widget: 'choice',
      prompt: `和 ${expr} 得数相等的算式是哪一个？`,
      options,
      optionTags: tags,
      answer: choiceAt(idx),
      hint: `数一数有几个 ${m}，最后那个 ${e} 和 ${m} 差多少？`,
      steps: [
        step(`${expr} 里有 ${n} 个 ${m}，最后还有一个 ${e}。`),
        step(how),
        step(`得数都是 ${sum}。`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ m, n, e, options }) {
    const sum = evalExpr(`${repeatAdd(m, n)} + ${e}`);
    const hits = options.map((o, i) => (evalExpr(o) === sum ? i : -1)).filter((i) => i >= 0);
    if (hits.length !== 1) throw new Error('add extra not unique');
    return choiceAt(hits[0]);
  },
};

/** 不计算，比较：5 × 3 ○ 3 + 3 + 3 + 3 */
const mulCompare: ChallengeTemplate<{
  form: number;
  n: number;
  m: number;
  k: number;
  swap: boolean;
}> = {
  id: 'mul.compare',
  family: 'mul',
  tier: 'stretch',
  make(rng, d) {
    const form = rng.int(0, d >= 3 ? 3 : 2);
    return until(
      () => ({ form, n: rng.int(2, 5), m: rng.int(2, 6), k: rng.int(2, 6), swap: rng.chance(0.4) }),
      (p) =>
        (p.form !== 0 || Math.abs(p.k - p.n) <= 1) &&
        p.n * p.m <= 30 &&
        !(p.form === 2 && p.n === 2 && p.m === 2),
      'mul compare',
    );
  },
  render(p) {
    const { left, right, why } = mulCompareSides(p);
    const [L, R] = p.swap ? [right, left] : [left, right];
    const l = evalExpr(L);
    const r = evalExpr(R);
    return {
      widget: 'compare',
      prompt: `比较大小：${L} ○ ${R}`,
      answer: cmpOf(l, r),
      hint: '想一想乘法的意思：几乘几表示几个几相加。先比“有几个几”，不一定要算出来。',
      steps: [step(why), step(`所以 ${L} ${relText(l, r)} ${R}。`)],
      targetSeconds: 45,
    };
  },
  solve(p) {
    const { left, right } = mulCompareSides(p);
    const [L, R] = p.swap ? [right, left] : [left, right];
    // 连加一项一项地加，乘法按“几个几”展开。
    const value = (s: string) => {
      const parts = s.split(' + ').map((t) => {
        const [x, y] = t.split(' × ').map(Number);
        return y === undefined ? x : x * y;
      });
      return parts.reduce((a, b) => a + b, 0);
    };
    return cmpOf(value(L), value(R));
  },
};

function mulCompareSides({ form, n, m, k }: { form: number; n: number; m: number; k: number }): {
  left: string;
  right: string;
  why: string;
} {
  switch (form) {
    case 0:
      return {
        left: `${n} × ${m}`,
        right: repeatAdd(m, k),
        why: `${n} × ${m} 表示 ${n} 个 ${m} 相加；右边是 ${k} 个 ${m} 相加。`,
      };
    case 1:
      return {
        left: `${n} × ${m}`,
        right: `${m} × ${n}`,
        why: `${n} × ${m} 和 ${m} × ${n} 都表示 ${n} 个 ${m}（或 ${m} 个 ${n}）相加，得数一样。`,
      };
    case 2:
      return {
        left: `${n} × ${m}`,
        right: `${n} + ${m}`,
        why: `${n} × ${m} 是 ${n} 个 ${m} 相加（${repeatAdd(m, n)} = ${n * m}），${n} + ${m} 只是两个数相加（= ${n + m}）。`,
      };
    default:
      return {
        left: `${n} × ${m}`,
        right: `${n - 1} × ${m} + ${m}`,
        why: `${n - 1} × ${m} 是 ${n - 1} 个 ${m}，再加一个 ${m}，就是 ${n} 个 ${m}。`,
      };
  }
}

/** □ 个 5 相加是 20 / 4 个 □ 相加是 20 */
const mulReverse: ChallengeTemplate<{ n: number; m: number; hideGroups: boolean }> = {
  id: 'mul.reverse',
  family: 'mul',
  tier: 'stretch',
  make(rng) {
    return until(
      () => ({ n: rng.int(2, 6), m: rng.int(2, 6), hideGroups: rng.chance(0.5) }),
      (p) => p.n * p.m <= 30 && p.n !== p.m,
      'mul reverse',
    );
  },
  render({ n, m, hideGroups }) {
    const s = n * m;
    return {
      widget: 'numeric',
      prompt: hideGroups
        ? `□ 个 ${m} 相加的和是 ${s}，□ 里填几？`
        : `${n} 个 □ 相加的和是 ${s}，□ 里填几？`,
      answer: num(hideGroups ? n : m),
      hint: hideGroups
        ? `${m} 个 ${m} 个地加，加到 ${s} 一共加了几次？`
        : `试一试：${n} 个几相加是 ${s}？`,
      steps: hideGroups
        ? [
            step(
              `${m} 个 ${m} 个地数：${range(1, n)
                .map((i) => i * m)
                .join('、')}。`,
            ),
            step(`数了 ${n} 次，□ 里填 ${n}。`),
          ]
        : [step(`试一试：${repeatAdd(m, n)} = ${s}。`), step(`□ 里填 ${m}。`)],
      targetSeconds: 60,
    };
  },
  solve({ n, m, hideGroups }) {
    const s = n * m;
    const fits = range(1, 30).filter((x) => (hideGroups ? x * m === s : n * x === s));
    if (fits.length !== 1) throw new Error('mul reverse');
    return num(fits[0]);
  },
};

/** 点子排成几行、每行同样多，有几种排法？ */
const mulArrayWays: ChallengeTemplate<{ total: number; lo: number; hi: number; item: string }> = {
  id: 'mul.array-ways',
  family: 'mul',
  tier: 'creative',
  make(rng, d) {
    const totals = d <= 2 ? [4, 6, 8, 9, 10, 12] : [6, 8, 10, 12, 15, 16, 18, 20];
    return { total: rng.pick(totals), lo: 2, hi: 10, item: rng.pick(['点子', '盆花', '椅子']) };
  },
  render({ total, lo, item }) {
    const ways = arrayWays(total, lo, 99);
    const unit = item === '点子' ? '个' : item === '盆花' ? '盆' : '把';
    return {
      widget: 'numeric',
      prompt: `把 ${total} ${unit}${item.replace('盆', '')}摆成几行，每行摆得同样多（至少摆 2 行，每行至少 2 ${unit}）。有几种不同的摆法？（2 行每行 3 ${unit}和 3 行每行 2 ${unit}算两种）`,
      answer: num(ways.length),
      hint: `从每行 2 ${unit}开始试：${total} 里有几个 2？再试每行 3 ${unit}……`,
      steps: [
        step(
          `按每行的个数从小到大试：${ways.map(([r, c]) => `${r} 行，每行 ${c} ${unit}`).join('；')}。`,
        ),
        step(`一共 ${ways.length} 种摆法。`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ total, lo, hi }) {
    let c = 0;
    for (let per = lo; per <= total; per++) {
      let rows = 0;
      let left = total;
      while (left >= per) {
        left -= per;
        rows++;
      }
      if (left === 0 && rows >= lo && rows <= Math.max(hi, total)) c++;
    }
    return num(c);
  },
};

function arrayWays(total: number, lo: number, hi: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let c = lo; c <= hi; c++)
    if (total % c === 0 && total / c >= lo && total / c <= hi) out.push([total / c, c]);
  return out;
}

/** 糖果每袋 2 颗或 3 颗，要正好 12 颗，有几种买法？ */
const mulPackWays: ChallengeTemplate<{ a: number; b: number; total: number }> = {
  id: 'mul.pack-ways',
  family: 'mul',
  tier: 'creative',
  make(rng, d) {
    const [a, b] = rng.pick([
      [2, 3],
      [2, 5],
      [3, 5],
      [3, 4],
    ] as const);
    return until(
      () => ({ a, b, total: rng.int(8, d >= 3 ? 20 : 15) }),
      (p) => {
        const n = packWays(p).length;
        return n >= 1 && n <= 4;
      },
      'pack ways',
    );
  },
  render(p) {
    const ways = packWays(p);
    const say = ([x, y]: [number, number]) =>
      [x > 0 ? `${x} 袋 ${p.a} 颗的` : '', y > 0 ? `${y} 袋 ${p.b} 颗的` : '']
        .filter(Boolean)
        .join('和');
    return {
      widget: 'numeric',
      prompt: `商店里的糖果有每袋 ${p.a} 颗的，也有每袋 ${p.b} 颗的（袋子不拆开）。妈妈想正好买 ${p.total} 颗糖，有几种不同的买法？`,
      answer: num(ways.length),
      hint: `按顺序试：${p.b} 颗的买 0 袋、1 袋、2 袋……剩下的颗数能不能正好用 ${p.a} 颗的袋子装完？`,
      steps: [
        step(`按 ${p.b} 颗一袋的买几袋来试，剩下的看是不是几个 ${p.a}。`),
        step(`可以：${ways.map(say).join('；')}。`),
        step(`一共 ${ways.length} 种买法。`),
      ],
      targetSeconds: 120,
    };
  },
  solve({ a, b, total }) {
    let c = 0;
    for (let x = 0; x * a <= total; x++)
      for (let y = 0; x * a + y * b <= total; y++) if (x * a + y * b === total) c++;
    return num(c);
  },
};

function packWays({
  a,
  b,
  total,
}: {
  a: number;
  b: number;
  total: number;
}): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let y = 0; y * b <= total; y++)
    if ((total - y * b) % a === 0) out.push([(total - y * b) / a, y]);
  return out;
}

/** n 个 m 相加，三个小朋友列式，谁列错了？ */
const KIDS3 = ['小明', '小红', '小刚'];

const mulJudgeKids: ChallengeTemplate<{ n: number; m: number; exprs: string[] }> = {
  id: 'mul.judge-kids',
  family: 'mul',
  tier: 'creative',
  make(rng) {
    const { n, m } = until(
      () => ({ n: rng.int(2, 5), m: rng.int(2, 6) }),
      (p) => p.n !== p.m && p.n * p.m !== p.n + p.m,
      'judge kids',
    );
    const right = [`${n} × ${m}`, `${m} × ${n}`, repeatAdd(m, n)];
    const wrong = rng.pick([`${n} + ${m}`, repeatAdd(m, n + 1), repeatAdd(n, n)]);
    const exprs = [...pickN(rng, right, 2), wrong];
    return { n, m, exprs: rng.shuffle(exprs) };
  },
  render({ n, m, exprs }) {
    const wrongIdx = exprs.findIndex(
      (e) => e !== `${n} × ${m}` && e !== `${m} × ${n}` && e !== repeatAdd(m, n),
    );
    const w = exprs[wrongIdx];
    return {
      widget: 'choice',
      prompt: `${n} 个 ${m} 相加，三位小朋友这样列式：\n${KIDS3.map((k, i) => `${k}：${exprs[i]}`).join('\n')}\n谁列错了？`,
      options: KIDS3,
      optionTags: KIDS3.map((_, i): ErrorTag | null => (i === wrongIdx ? null : 'mul-meaning')),
      answer: choiceAt(wrongIdx),
      hint: `${n} 个 ${m} 相加，可以写成 ${repeatAdd(m, n)}，也可以写成乘法。每个算式都想一想是几个几。`,
      steps: [
        step(
          `${n} 个 ${m} 相加：${repeatAdd(m, n)} = ${n * m}，乘法可以写成 ${n} × ${m} 或 ${m} × ${n}。`,
        ),
        step(
          w === `${n} + ${m}`
            ? `${KIDS3[wrongIdx]}写的 ${w} 是把两个数相加，不是 ${n} 个 ${m}。`
            : `${KIDS3[wrongIdx]}写的 ${w} 不是 ${n} 个 ${m}，得数是 ${evalExpr(w)}。`,
        ),
      ],
      targetSeconds: 60,
    };
  },
  solve({ n, m, exprs }) {
    let total = 0;
    for (let i = 0; i < n; i++) total += m;
    const bad = exprs.map((e, i) => (evalExpr(e) !== total ? i : -1)).filter((i) => i >= 0);
    if (bad.length !== 1) throw new Error('judge kids not unique');
    return choiceAt(bad[0]);
  },
};

// ------------------------------------------------------------------ times

const TIMES_CTX = [
  { small: '小鸡', big: '小鸭', unit: '只' },
  { small: '白兔', big: '灰兔', unit: '只' },
  { small: '蓝花', big: '红花', unit: '朵' },
  { small: '蜻蜓', big: '蝴蝶', unit: '只' },
];

/** a 的 k 倍比 a 多几？ */
const timesMore: ChallengeTemplate<{ a: number; k: number; ctx: number }> = {
  id: 'times.more-than',
  family: 'times',
  tier: 'stretch',
  make(rng, d) {
    return until(
      () => ({ a: rng.int(2, 5), k: rng.int(2, 5), ctx: rng.int(0, TIMES_CTX.length - 1) }),
      (p) => p.a * p.k <= (d <= 2 ? 16 : 25),
      'times more',
    );
  },
  render({ a, k, ctx }) {
    const c = TIMES_CTX[ctx];
    const b = a * k;
    return {
      widget: 'numeric',
      prompt: `${c.small}有 ${a} ${c.unit}，${c.big}的${c.unit === '朵' ? '朵数' : '只数'}是${c.small}的 ${k} 倍。${c.big}比${c.small}多几${c.unit}？`,
      answer: num(b - a),
      hint: `先求${c.big}有多少：${k} 倍就是 ${k} 个 ${a}。再比多少。`,
      steps: [
        step(`${c.big}：${k} 个 ${a}，${repeatAdd(a, k)} = ${b}（${c.unit}）。`),
        step(`多：${b} − ${a} = ${b - a}（${c.unit}）。也可以想：多了 ${k - 1} 个 ${a}。`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ a, k }) {
    let big = 0;
    for (let i = 0; i < k; i++) big += a;
    return num(big - a);
  },
};

/** 连续两次“几倍” */
const timesChain: ChallengeTemplate<{ a: number; k1: number; k2: number }> = {
  id: 'times.chain',
  family: 'times',
  tier: 'stretch',
  make(rng, d) {
    return until(
      () => ({ a: rng.int(1, 4), k1: rng.int(2, 4), k2: rng.int(2, 3) }),
      (p) => p.a * p.k1 * p.k2 <= (d <= 2 ? 16 : 24) && p.a * p.k1 * p.k2 >= 8,
      'times chain',
    );
  },
  render({ a, k1, k2 }) {
    const g = a * k1;
    const b = g * k2;
    return {
      widget: 'numeric',
      prompt: `白兔有 ${a} 只，灰兔的只数是白兔的 ${k1} 倍，黑兔的只数是灰兔的 ${k2} 倍。黑兔有几只？`,
      answer: num(b),
      hint: '一步一步来：先求灰兔，再求黑兔。黑兔是和谁比的？',
      steps: [
        step(`灰兔：${k1} 个 ${a}，${repeatAdd(a, k1)} = ${g}（只）。`),
        step(`黑兔：${k2} 个 ${g}，${repeatAdd(g, k2)} = ${b}（只）。`),
      ],
      targetSeconds: 75,
    };
  },
  solve({ a, k1, k2 }) {
    const grey = evalExpr(`${a} × ${k1}`);
    return num(evalExpr(`${grey} × ${k2}`));
  },
};

/** a 和它的 k 倍一共多少？ */
const timesTotal: ChallengeTemplate<{ a: number; k: number; ctx: number }> = {
  id: 'times.total',
  family: 'times',
  tier: 'stretch',
  make(rng, d) {
    return until(
      () => ({ a: rng.int(2, 5), k: rng.int(2, 5), ctx: rng.int(0, TIMES_CTX.length - 1) }),
      (p) => p.a * p.k + p.a <= (d <= 2 ? 20 : 30),
      'times total',
    );
  },
  render({ a, k, ctx }) {
    const c = TIMES_CTX[ctx];
    const b = a * k;
    return {
      widget: 'numeric',
      prompt: `${c.small}有 ${a} ${c.unit}，${c.big}的${c.unit === '朵' ? '朵数' : '只数'}是${c.small}的 ${k} 倍。${c.small}和${c.big}一共有几${c.unit}？`,
      answer: num(a + b),
      hint: `先求${c.big}有多少，再把两种合起来。`,
      steps: [
        step(`${c.big}：${k} 个 ${a}，是 ${b} ${c.unit}。`),
        step(`一共：${a} + ${b} = ${a + b}（${c.unit}）。也可以想：一共是 ${k + 1} 个 ${a}。`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ a, k }) {
    let groups = 1 + k; // 自己 1 份，另一种 k 份
    let total = 0;
    while (groups-- > 0) total += a;
    return num(total);
  },
};

/** 哪句话对 / 不对（倍和多几） */
type Stmt = { kind: 'times'; big: 0 | 1; k: number } | { kind: 'more'; who: 0 | 1; n: number };

const timesJudge: ChallengeTemplate<{ a: number; k: number; right: boolean; stmts: Stmt[] }> = {
  id: 'times.judge',
  family: 'times',
  tier: 'creative',
  make(rng) {
    const { a, k } = until(
      () => ({ a: rng.int(2, 5), k: rng.int(2, 5) }),
      (p) => p.a * p.k <= 25 && (p.k - 1) * p.a !== p.k,
      'times judge',
    );
    const b = a * k;
    const right = rng.chance(0.5);
    // 0 = 小鸡 (a), 1 = 小鸭 (b)
    const trueOnes: Stmt[] = [
      { kind: 'times', big: 1, k },
      { kind: 'more', who: 1, n: b - a },
    ];
    const falseOnes: Stmt[] = [
      { kind: 'more', who: 1, n: k },
      { kind: 'times', big: 0, k },
      { kind: 'times', big: 1, k: k + 1 },
    ];
    const stmts = right
      ? [rng.pick(trueOnes), ...falseOnes]
      : [rng.pick(falseOnes), ...trueOnes, { kind: 'more', who: 0, n: a - b } as Stmt];
    return { a, k, right, stmts: rng.shuffle(stmts) };
  },
  render({ a, k, right, stmts }) {
    const b = a * k;
    const names = ['小鸡', '小鸭'];
    const text = (s: Stmt) =>
      s.kind === 'times'
        ? `${names[s.big]}的只数是${names[1 - s.big]}的 ${s.k} 倍`
        : `${names[s.who]}比${names[1 - s.who]}${s.n > 0 ? '多' : '少'} ${Math.abs(s.n)} 只`;
    const truth = (s: Stmt) =>
      s.kind === 'times'
        ? s.big === 1
          ? b === s.k * a
          : a === s.k * b
        : (s.who === 1 ? b - a : a - b) === s.n;
    const idx = stmts.findIndex((s) => truth(s) === right);
    return {
      widget: 'choice',
      prompt: `小鸡有 ${a} 只，小鸭有 ${b} 只。下面哪句话${right ? '是对的' : '是错的'}？`,
      options: stmts.map(text),
      optionTags: stmts.map((_, i): ErrorTag | null => (i === idx ? null : 'reasoning')),
      answer: choiceAt(idx),
      hint: `把 ${a} 只小鸡看作 1 份，${b} 里有几个 ${a}？“几倍”和“多几”是不一样的。`,
      steps: [
        step(`${b} 里有 ${k} 个 ${a}，所以小鸭的只数是小鸡的 ${k} 倍。`),
        step(`小鸭比小鸡多 ${b} − ${a} = ${b - a}（只），小鸡比小鸭少 ${b - a} 只。`),
        step(`所以${right ? '对' : '错'}的是：${text(stmts[idx])}。`),
      ],
      targetSeconds: 75,
    };
  },
  solve({ a, k, right, stmts }) {
    const count = [a, 0];
    for (let i = 0; i < k; i++) count[1] += a;
    const holds = (s: Stmt) => {
      if (s.kind === 'more') return count[s.who] - count[1 - s.who] === s.n;
      let sum = 0;
      for (let i = 0; i < s.k; i++) sum += count[1 - s.big];
      return sum === count[s.big];
    };
    const hits = stmts.map((s, i) => (holds(s) === right ? i : -1)).filter((i) => i >= 0);
    if (hits.length !== 1) throw new Error('times judge not unique');
    return choiceAt(hits[0]);
  },
};

/** 红珠和蓝珠一共 T 颗，红珠是蓝珠的 k 倍，红珠几颗？ */
const timesSum: ChallengeTemplate<{ b: number; k: number }> = {
  id: 'times.sum-times',
  family: 'times',
  tier: 'creative',
  make(rng, d) {
    return until(
      () => ({ b: rng.int(2, 5), k: rng.int(2, 4) }),
      (p) => (p.k + 1) * p.b <= (d <= 2 ? 16 : 24),
      'sum times',
    );
  },
  render({ b, k }) {
    const T = (k + 1) * b;
    return {
      widget: 'numeric',
      prompt: `红珠和蓝珠一共有 ${T} 颗，红珠的颗数是蓝珠的 ${k} 倍。红珠有几颗？`,
      answer: num(k * b),
      hint: `把蓝珠看作 1 份，红珠就是 ${k} 份。画一画，或者从蓝珠 1 颗开始试一试。`,
      steps: [
        step(`蓝珠 1 份，红珠 ${k} 份，一共 ${k + 1} 份。`),
        step(
          `试一试：蓝珠 ${b} 颗，红珠是 ${k} 个 ${b}，${k * b} 颗，${b} + ${k * b} = ${T}，正好。`,
        ),
        step(`红珠有 ${k * b} 颗。`),
      ],
      targetSeconds: 120,
    };
  },
  solve({ b, k }) {
    const T = (k + 1) * b;
    for (let blue = 1; blue <= T; blue++) if (blue + blue * k === T) return num(blue * k);
    throw new Error('sum times');
  },
};

/** 我想的数的 k 倍再加（减）e 是 T，我想的数是几？ */
const timesGuess: ChallengeTemplate<{ x: number; k: number; e: number; plus: boolean }> = {
  id: 'times.guess',
  family: 'times',
  tier: 'creative',
  make(rng, d) {
    return until(
      () => ({ x: rng.int(2, 5), k: rng.int(2, 5), e: rng.int(1, 6), plus: rng.chance(0.6) }),
      (p) => p.x * p.k <= (d <= 2 ? 16 : 25) && (p.plus || p.x * p.k > p.e),
      'guess',
    );
  },
  render({ x, k, e, plus }) {
    const T = plus ? x * k + e : x * k - e;
    return {
      widget: 'numeric',
      prompt: `猜数游戏：小明心里想了一个数，这个数的 ${k} 倍${plus ? '再加上' : '再减去'} ${e}，得 ${T}。小明想的数是几？`,
      answer: num(x),
      hint: `倒着想：${plus ? `加上 ${e} 以前` : `减去 ${e} 以前`}是多少？这个数是谁的 ${k} 倍？`,
      steps: [
        step(
          `${plus ? `加上 ${e} 以前是 ${T} − ${e}` : `减去 ${e} 以前是 ${T} + ${e}`} = ${x * k}。`,
        ),
        step(`${x * k} 是几的 ${k} 倍？${k} 个 ${x} 是 ${x * k}，所以小明想的数是 ${x}。`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ x, k, e, plus }) {
    const T = plus ? x * k + e : x * k - e;
    const fits = range(0, 30).filter((y) => evalExpr(`${y} × ${k} ${plus ? '+' : '−'} ${e}`) === T);
    if (fits.length !== 1) throw new Error('guess not unique');
    return num(fits[0]);
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MUL_TEMPLATES: ChallengeTemplate<any>[] = [
  mulAddExtra,
  mulCompare,
  mulReverse,
  mulArrayWays,
  mulPackWays,
  mulJudgeKids,
  timesMore,
  timesChain,
  timesTotal,
  timesJudge,
  timesSum,
  timesGuess,
];
