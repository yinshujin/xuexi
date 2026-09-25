import type { ErrorTag } from '@xuexi/shared';
import type { Rng } from '../rng';
import { step } from './base';
import type { ChallengeTemplate } from './challenge';
import {
  choiceAt,
  cmpOf,
  evalExpr,
  koujue,
  num,
  pickN,
  range,
  relText,
  scope25,
  scope69,
  until,
  type TableScope,
} from './challenge-g2-util';

/**
 * 乘法口诀的拔高 / 创新题。
 *  table25  第四单元 2~5 的乘法口诀（难度决定能用哪几句口诀，见 scope25）
 *  table69  第七单元 6~9 的乘法口诀（见 scope69）
 */

// ------------------------------------------------------------------ 口诀 (table25 / table69)

/** Pick a row r and other factor m from the scope. */
function pickFact(rng: Rng, s: TableScope, mMin = 1, mMax = s.maxM): [number, number] {
  return [rng.pick(s.rows), rng.int(mMin, mMax)];
}

/** r × □ < c 最大填几 / □ × r > c 最小填几 */
function maxFillTemplate(
  family: string,
  scope: (d: number) => TableScope,
): ChallengeTemplate<{
  r: number;
  x: number;
  c: number;
  max: boolean;
  front: boolean;
}> {
  return {
    id: `${family}.max-fill`,
    family,
    tier: 'stretch',
    make(rng, d) {
      const s = scope(d);
      const r = rng.pick(s.rows);
      const max = rng.chance(0.5);
      const x = max ? rng.int(1, s.maxM - 1) : rng.int(2, s.maxM);
      const c = max ? rng.int(r * x + 1, r * (x + 1)) : rng.int(r * (x - 1), r * x - 1);
      return { r, x, c, max, front: rng.chance(0.5) };
    },
    render({ r, x, c, max, front }) {
      const expr = front ? `□ × ${r}` : `${r} × □`;
      const n = max ? x + 1 : x - 1;
      return {
        widget: 'numeric',
        prompt: `${expr} ${max ? '<' : '>'} ${c}，□ 里最${max ? '大' : '小'}能填几？`,
        answer: num(x),
        hint: `想 ${r} 的口诀，找一找得数和 ${c} 最接近的两句。`,
        steps: [
          step(
            `${koujue(r, x)}：${r} × ${x} = ${r * x}；${koujue(r, n)}：${r} × ${n} = ${r * n}。`,
          ),
          step(
            max
              ? `${r * x} < ${c}，而 ${r * n} 不小于 ${c}，所以 □ 里最大填 ${x}。`
              : `${r * x} > ${c}，而 ${r * n} 不大于 ${c}，所以 □ 里最小填 ${x}。`,
          ),
        ],
        targetSeconds: 60,
      };
    },
    solve({ r, c, max }) {
      const ok = range(0, 9).filter((y) => (max ? r * y < c : r * y > c));
      return num(max ? Math.max(...ok) : Math.min(...ok));
    },
  };
}

/** 不计算，比较：r × m ○ r × (m−1) + r 等（口诀的变形：几个几再添 / 去一个） */
function compareTemplate(
  family: string,
  scope: (d: number) => TableScope,
): ChallengeTemplate<{
  r: number;
  m: number;
  form: number;
  swap: boolean;
}> {
  return {
    id: `${family}.compare`,
    family,
    tier: 'stretch',
    make(rng, d) {
      const s = scope(d);
      return until(
        () => {
          const [r, m] = pickFact(rng, s, 3);
          return { r, m, form: rng.int(0, 3), swap: rng.chance(0.4), maxM: s.maxM };
        },
        (p) => (p.form !== 2 || p.m + 1 <= p.maxM) && !(p.form === 1 && p.r === p.m),
        'table compare',
      );
    },
    render(p) {
      const { left, right, why } = tableCompareSides(p);
      const [L, R] = p.swap ? [right, left] : [left, right];
      const l = evalExpr(L);
      const r = evalExpr(R);
      return {
        widget: 'compare',
        prompt: `不计算，比较大小：${L} ○ ${R}`,
        answer: cmpOf(l, r),
        hint: `${p.r} × ${p.m} 表示 ${p.m} 个 ${p.r}。另一边是几个 ${p.r}，还多（少）了什么？`,
        steps: [step(why), step(`所以 ${L} ${relText(l, r)} ${R}。`)],
        targetSeconds: 45,
      };
    },
    solve(p) {
      const { left, right } = tableCompareSides(p);
      const [L, R] = p.swap ? [right, left] : [left, right];
      return cmpOf(evalExpr(L), evalExpr(R));
    },
  };
}

function tableCompareSides({ r, m, form }: { r: number; m: number; form: number }): {
  left: string;
  right: string;
  why: string;
} {
  const left = `${r} × ${m}`;
  switch (form) {
    case 0:
      return {
        left,
        right: `${r} × ${m - 1} + ${r}`,
        why: `${m - 1} 个 ${r} 再添 1 个 ${r}，就是 ${m} 个 ${r}，两边一样大。`,
      };
    case 1:
      return {
        left,
        right: `${r} × ${m - 1} + ${m}`,
        why: `右边是 ${m - 1} 个 ${r} 再加 ${m}；${m} 个 ${r} 要再加的是 ${r}，${m} ${m < r ? '<' : '>'} ${r}。`,
      };
    case 2:
      return {
        left,
        right: `${r} × ${m + 1} − ${r}`,
        why: `${m + 1} 个 ${r} 去掉 1 个 ${r}，就是 ${m} 个 ${r}，两边一样大。`,
      };
    default:
      return {
        left,
        right: `${r} + ${m}`,
        why: `${r} × ${m} 是 ${m} 个 ${r} 相加（= ${r * m}），${r} + ${m} 只是两个数相加（= ${r + m}）。`,
      };
  }
}

/** r × □ + k = N，□ 里填几？ */
function reverseTemplate(
  family: string,
  scope: (d: number) => TableScope,
): ChallengeTemplate<{
  r: number;
  x: number;
  k: number;
  plus: boolean;
  front: boolean;
}> {
  return {
    id: `${family}.mul-add-reverse`,
    family,
    tier: 'stretch',
    make(rng, d) {
      const s = scope(d);
      return until(
        () => {
          const [r, x] = pickFact(rng, s, 2);
          return { r, x, k: rng.int(1, 9), plus: rng.chance(0.6), front: rng.chance(0.5) };
        },
        (p) => p.plus || p.r * p.x - p.k >= 1,
        'mul add reverse',
      );
    },
    render({ r, x, k, plus, front }) {
      const N = plus ? r * x + k : r * x - k;
      const expr = front ? `□ × ${r}` : `${r} × □`;
      return {
        widget: 'numeric',
        prompt: `${expr} ${plus ? '+' : '−'} ${k} = ${N}，□ 里填几？`,
        answer: num(x),
        hint: `倒着想：${plus ? `加 ${k} 以前` : `减 ${k} 以前`}的积是多少？再想 ${r} 的口诀。`,
        steps: [
          step(`${expr} = ${N} ${plus ? '−' : '+'} ${k} = ${r * x}。`),
          step(`${koujue(r, x)}，所以 □ 里填 ${x}。`),
        ],
        targetSeconds: 60,
      };
    },
    solve({ r, x, k, plus, front }) {
      const op = plus ? '+' : '−';
      const shape = (y: number) => (front ? `${y} × ${r} ${op} ${k}` : `${r} × ${y} ${op} ${k}`);
      const N = evalExpr(shape(x));
      const fits = range(0, 12).filter((y) => evalExpr(shape(y)) === N);
      if (fits.length !== 1) throw new Error('reverse not unique');
      return num(fits[0]);
    },
  };
}

/** 下面四句口诀，哪一句是错的？ */
type Fact = [a: number, b: number, said: number];

function judgeKoujueTemplate(
  family: string,
  scope: (d: number) => TableScope,
): ChallengeTemplate<{ facts: Fact[]; wrong: number }> {
  return {
    id: `${family}.judge-koujue`,
    family,
    tier: 'creative',
    make(rng, d) {
      const s = scope(d);
      const pool: Array<[number, number]> = [];
      for (const r of s.rows)
        for (let m = 1; m <= s.maxM; m++) {
          const [a, b] = m <= r ? [m, r] : [r, m];
          if (!pool.some(([x, y]) => x === a && y === b)) pool.push([a, b]);
        }
      const chosen = pickN(
        rng,
        pool.filter(([a]) => a >= 2 || pool.length < 8),
        4,
      );
      const wrong = rng.int(0, 3);
      const facts = chosen.map(([a, b], i): Fact => {
        if (i !== wrong) return [a, b, a * b];
        // 和相邻口诀记混：多（少）了一个 a 或一个 b
        const said = until(
          () => a * b + rng.pick([a, -a, b, -b]),
          (v) => v > 0 && v !== a * b,
          'wrong koujue',
        );
        return [a, b, said];
      });
      return { facts, wrong };
    },
    render({ facts, wrong }) {
      const [a, b, said] = facts[wrong];
      return {
        widget: 'choice',
        prompt: '下面四句乘法口诀，哪一句是错的？',
        options: facts.map(([x, y, v]) => koujue(x, y, v)),
        optionTags: facts.map((_, i): ErrorTag | null => (i === wrong ? null : 'table-neighbor')),
        answer: choiceAt(wrong),
        hint: '一句一句地检查：可以从相邻的口诀推一推（多一个几、少一个几）。',
        steps: [
          step(
            `“${koujue(a, b, said)}”错了：${a} × ${b} = ${a * b}，正确的口诀是“${koujue(a, b)}”。`,
          ),
          step(`${said} 是和相邻的口诀记混了。`),
        ],
        targetSeconds: 60,
      };
    },
    solve({ facts }) {
      const bad = facts
        .map(([a, b, v], i) => {
          let s = 0;
          for (let j = 0; j < a; j++) s += b;
          return s === v ? -1 : i;
        })
        .filter((i) => i >= 0);
      if (bad.length !== 1) throw new Error('judge koujue not unique');
      return choiceAt(bad[0]);
    },
  };
}

/** 乘加乘减情境：选出正确的算式。 */
const MUL_ADD_CTX = [
  {
    text: (m: number, n: number, e: number) =>
      `每排坐 ${m} 人，坐了 ${n} 排，还有 ${e} 人站着。一共有多少人？`,
    plus: true,
  },
  {
    text: (m: number, n: number, e: number) =>
      `每盒装 ${m} 个月饼，买了 ${n} 盒，又买了 ${e} 个散装的。一共有多少个月饼？`,
    plus: true,
  },
  {
    text: (m: number, n: number, e: number) =>
      `每盒有 ${m} 块饼干，买了 ${n} 盒，吃了 ${e} 块。还剩多少块？`,
    plus: false,
  },
  {
    text: (m: number, n: number, e: number) =>
      `每束花有 ${m} 朵，买了 ${n} 束，送给老师 ${e} 朵。还剩多少朵？`,
    plus: false,
  },
];

function mulAddLifeTemplate(
  family: string,
  scope: (d: number) => TableScope,
): ChallengeTemplate<{
  m: number;
  n: number;
  e: number;
  ctx: number;
  options: string[];
}> {
  return {
    id: `${family}.mul-add-life`,
    family,
    tier: 'creative',
    make(rng, d) {
      const s = scope(d);
      const ctx = rng.int(0, MUL_ADD_CTX.length - 1);
      const plus = MUL_ADD_CTX[ctx].plus;
      const { m, n, e } = until(
        () => {
          const [m, n] = pickFact(rng, s, 2);
          return { m, n, e: rng.int(1, 9) };
        },
        (p) => p.m !== p.n && p.e !== p.m && p.e !== p.n && (plus || p.m * p.n > p.e),
        'mul add life',
      );
      const op = plus ? '+' : '−';
      const other = plus ? '−' : '+';
      const correct = rng.chance(0.5) ? `${n} × ${m} ${op} ${e}` : `${m} × ${n} ${op} ${e}`;
      const value = evalExpr(correct);
      const wrong = [
        `${n} × ${m} ${other} ${e}`,
        `${m} + ${n} ${op} ${e}`,
        `${m} × ${e} ${op} ${n}`,
        `${n} × ${e} ${op} ${m}`,
      ].filter((w) => {
        try {
          return evalExpr(w) !== value && evalExpr(w) >= 0;
        } catch {
          return false;
        }
      });
      return { m, n, e, ctx, options: rng.shuffle([correct, ...pickN(rng, wrong, 3)]) };
    },
    render({ m, n, e, ctx, options }) {
      const c = MUL_ADD_CTX[ctx];
      const op = c.plus ? '+' : '−';
      const idx = options.findIndex(
        (o) => o === `${n} × ${m} ${op} ${e}` || o === `${m} × ${n} ${op} ${e}`,
      );
      const tags = options.map((o): ErrorTag | null =>
        o === options[idx]
          ? null
          : o.startsWith(`${m} + `)
            ? 'table-add-confused'
            : o.includes(`× ${e}`)
              ? 'mul-meaning'
              : 'op-confused',
      );
      return {
        widget: 'choice',
        prompt: `${c.text(m, n, e)}列式正确的是哪一个？`,
        options,
        optionTags: tags,
        answer: choiceAt(idx),
        hint: `先找“几个几”：每份 ${m}，有 ${n} 份，用乘法；再想一想后来是多了还是少了。`,
        steps: [
          step(`${n} 个 ${m}，用乘法：${n} × ${m} = ${n * m}。`),
          step(
            c.plus
              ? `还要加上 ${e}：${n * m} + ${e} = ${n * m + e}。`
              : `再减去 ${e}：${n * m} − ${e} = ${n * m - e}。`,
          ),
          step(`所以列式是 ${options[idx]}，先算乘法，再算${c.plus ? '加' : '减'}法。`),
        ],
        targetSeconds: 60,
      };
    },
    solve({ m, n, e, ctx, options }) {
      let total = 0;
      for (let i = 0; i < n; i++) total += m;
      total += MUL_ADD_CTX[ctx].plus ? e : -e;
      const hits = options.map((o, i) => (evalExpr(o) === total ? i : -1)).filter((i) => i >= 0);
      if (hits.length !== 1) throw new Error('mul add life not unique');
      return choiceAt(hits[0]);
    },
  };
}

/** 三轮车和小汽车一共 n 辆，W 个轮子，小汽车几辆？ */
const table25Wheels: ChallengeTemplate<{ n: number; cars: number }> = {
  id: 'table25.wheels',
  family: 'table25',
  tier: 'creative',
  minDifficulty: 3,
  make(rng) {
    const n = rng.int(2, 5);
    return { n, cars: rng.int(1, n - 1) };
  },
  render({ n, cars }) {
    const W = 3 * (n - cars) + 4 * cars;
    return {
      widget: 'numeric',
      prompt: `停车场里有三轮车和小汽车一共 ${n} 辆，一共有 ${W} 个轮子。三轮车每辆 3 个轮子，小汽车每辆 4 个轮子。小汽车有几辆？`,
      answer: num(cars),
      hint: `假设 ${n} 辆都是三轮车，有几个轮子？比实际少了几个？把 1 辆三轮车换成小汽车，轮子多几个？`,
      steps: [
        step(`假设 ${n} 辆都是三轮车：${n} × 3 = ${3 * n}（个）轮子。`),
        step(
          `实际多了 ${W} − ${3 * n} = ${W - 3 * n}（个）。每把 1 辆三轮车换成小汽车，就多 1 个轮子。`,
        ),
        step(`所以小汽车有 ${cars} 辆。验算：${n - cars} × 3 + ${cars} × 4 = ${W}。`),
      ],
      targetSeconds: 120,
    };
  },
  solve({ n, cars }) {
    const W = 3 * (n - cars) + 4 * cars;
    const fits = range(0, n).filter((c) => evalExpr(`${n - c} × 3 + ${c} × 4`) === W);
    if (fits.length !== 1) throw new Error('wheels not unique');
    return num(fits[0]);
  },
};

// ------------------------------------------------------------------ table69 only

/** 图案 r 行 m 架，中间空了 a 行 b 架，一共几架？ */
const table69Drones: ChallengeTemplate<{ r: number; m: number; a: number; b: number }> = {
  id: 'table69.drones',
  family: 'table69',
  tier: 'stretch',
  minDifficulty: 3,
  make(rng) {
    return until(
      () => ({ r: rng.int(6, 9), m: rng.int(6, 9), a: rng.int(2, 3), b: rng.int(2, 4) }),
      (p) => p.a * p.b < p.r * p.m,
      'drones',
    );
  },
  render({ r, m, a, b }) {
    return {
      widget: 'numeric',
      prompt: `无人机表演：无人机排成 ${r} 行，每行 ${m} 架，但是正中间空出了一块 ${a} 行、每行 ${b} 架的位置（这些位置上没有无人机）。一共有多少架无人机？`,
      answer: num(r * m - a * b),
      hint: '先把空出的位置也补上，算一共有多少个位置；再减去空出的位置。',
      steps: [
        step(`如果排满：${r} × ${m} = ${r * m}（个位置）。`),
        step(`空出：${a} × ${b} = ${a * b}（个位置）。`),
        step(`无人机：${r * m} − ${a * b} = ${r * m - a * b}（架）。`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ r, m, a, b }) {
    const top = Math.floor((r - a) / 2);
    const left = Math.floor((m - b) / 2);
    let c = 0;
    for (let i = 0; i < r; i++)
      for (let j = 0; j < m; j++) if (!(i >= top && i < top + a && j >= left && j < left + b)) c++;
    return num(c);
  },
};

/** 得数是 N 的口诀有几句？ */
const table69SameProduct: ChallengeTemplate<{ N: number; lim: number }> = {
  id: 'table69.same-product',
  family: 'table69',
  tier: 'creative',
  make(rng, d) {
    const lim = scope69(d).maxM;
    const products = [...new Set(range(1, lim).flatMap((a) => range(a, lim).map((b) => a * b)))];
    const multi = products.filter((p) => factsOf(p, lim).length >= 2 && p >= 6);
    const withBig = products.filter((p) => factsOf(p, lim).some(([, b]) => b >= 6) && p >= 6);
    const N = rng.chance(0.7) && multi.length > 0 ? rng.pick(multi) : rng.pick(withBig);
    return { N, lim };
  },
  render({ N, lim }) {
    const facts = factsOf(N, lim);
    return {
      widget: 'numeric',
      prompt:
        lim === 9
          ? `九九乘法口诀里，得数是 ${N} 的口诀有几句？`
          : `在 1~${lim} 的乘法口诀里（就是学过的口诀），得数是 ${N} 的口诀有几句？`,
      answer: num(facts.length),
      hint: '从“一”开头的口诀开始，按顺序一句一句地找，别忘了“一几得几”这样的口诀。',
      steps: [
        step(`按顺序找：${facts.map(([a, b]) => `${koujue(a, b)}（${a} × ${b}）`).join('，')}。`),
        step(`一共 ${facts.length} 句。`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ N, lim }) {
    let c = 0;
    for (let a = 1; a <= lim; a++) for (let b = a; b <= lim; b++) if (a * b === N) c++;
    return num(c);
  },
};

function factsOf(N: number, lim: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let a = 1; a <= lim; a++)
    if (N % a === 0 && N / a >= a && N / a <= lim) out.push([a, N / a]);
  return out;
}

/** 小明用相邻口诀推 a × b，想得对吗？ */
type DeriveOpt = { kind: 'right' } | { kind: 'add' | 'sub'; v: number };

const table69Derive: ChallengeTemplate<{
  a: number;
  b: number;
  add: number;
  options: DeriveOpt[];
}> = {
  id: 'table69.judge-derive',
  family: 'table69',
  tier: 'creative',
  make(rng, d) {
    const lim = scope69(d).maxM;
    const { a, b } = until(
      () => ({ a: rng.int(3, lim), b: rng.int(3, lim) }),
      (p) => p.a !== p.b && Math.max(p.a, p.b) >= 6,
      'derive',
    );
    const add = rng.chance(0.5) ? a : b;
    const options: DeriveOpt[] =
      add === a
        ? [{ kind: 'right' }, { kind: 'add', v: b }, { kind: 'sub', v: a }]
        : [{ kind: 'right' }, { kind: 'add', v: a }, { kind: 'sub', v: a }];
    return { a, b, add, options: rng.shuffle(options) };
  },
  render({ a, b, add, options }) {
    const base = a * (b - 1);
    const text = (o: DeriveOpt) =>
      o.kind === 'right'
        ? '他想得对'
        : o.kind === 'add'
          ? `不对，${base} 应该再加 ${o.v}，得 ${base + o.v}`
          : `不对，${base} 应该减去 ${o.v}，得 ${base - o.v}`;
    const good = add === a;
    const idx = options.findIndex((o) =>
      good ? o.kind === 'right' : o.kind === 'add' && o.v === a,
    );
    return {
      widget: 'choice',
      prompt: `小明忘了 ${a} × ${b} 等于几。他这样想：${a} × ${b - 1} = ${base}，再加上 ${add}，得 ${base + add}。他想得对吗？`,
      options: options.map(text),
      optionTags: options.map((_, i): ErrorTag | null => (i === idx ? null : 'table-neighbor')),
      answer: choiceAt(idx),
      hint: `${a} × ${b} 是 ${b} 个 ${a}，${a} × ${b - 1} 是 ${b - 1} 个 ${a}。还差 1 个几？`,
      steps: [
        step(
          `${a} × ${b - 1} 是 ${b - 1} 个 ${a}，${a} × ${b} 是 ${b} 个 ${a}，要再加 1 个 ${a}。`,
        ),
        step(`${base} + ${a} = ${a * b}（${koujue(a, b)}）。`),
        step(good ? '小明想得对。' : `小明加的是 ${b}，加错了。`),
      ],
      targetSeconds: 75,
    };
  },
  solve({ a, b, add, options }) {
    const truth = evalExpr(`${a} × ${b}`);
    const base = evalExpr(`${a} × ${b - 1}`);
    const hits = options
      .map((o, i) => {
        const ok =
          o.kind === 'right'
            ? base + add === truth
            : (o.kind === 'add' ? base + o.v : base - o.v) === truth;
        return ok ? i : -1;
      })
      .filter((i) => i >= 0);
    if (hits.length !== 1) throw new Error('derive not unique');
    return choiceAt(hits[0]);
  },
};

/** 9 的口诀：得数十位是 t（或个位是 u），得数是几？ */
const table69Nine: ChallengeTemplate<{ k: number; byTens: boolean }> = {
  id: 'table69.nine-digit',
  family: 'table69',
  tier: 'creative',
  minDifficulty: 3,
  make(rng) {
    return { k: rng.int(2, 9), byTens: rng.chance(0.5) };
  },
  render({ k, byTens }) {
    const v = 9 * k;
    const t = Math.floor(v / 10);
    const u = v % 10;
    return {
      widget: 'numeric',
      prompt: byTens
        ? `9 的乘法口诀里，有一句的得数十位上是 ${t}。这句口诀的得数是几？`
        : `9 的乘法口诀里，有一句的得数个位上是 ${u}。这句口诀的得数是几？`,
      answer: num(v),
      hint: '9 的口诀有规律：得数十位和个位上的数加起来是 9。',
      steps: [
        step('9 的口诀得数：9、18、27、36、45、54、63、72、81，十位和个位加起来都是 9。'),
        step(
          byTens
            ? `十位是 ${t}，个位是 9 − ${t} = ${u}，得数是 ${v}。`
            : `个位是 ${u}，十位是 9 − ${u} = ${t}，得数是 ${v}。`,
        ),
        step(`这句口诀是“${koujue(k, 9)}”。`),
      ],
      targetSeconds: 45,
    };
  },
  solve({ k, byTens }) {
    const v = 9 * k;
    const hits = range(1, 9)
      .map((i) => 9 * i)
      .filter((p) => (byTens ? Math.floor(p / 10) === Math.floor(v / 10) : p % 10 === v % 10));
    if (hits.length !== 1) throw new Error('nine not unique');
    return num(hits[0]);
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TABLE_TEMPLATES: ChallengeTemplate<any>[] = [
  maxFillTemplate('table25', scope25),
  compareTemplate('table25', scope25),
  reverseTemplate('table25', scope25),
  judgeKoujueTemplate('table25', scope25),
  mulAddLifeTemplate('table25', scope25),
  table25Wheels,
  maxFillTemplate('table69', scope69),
  compareTemplate('table69', scope69),
  reverseTemplate('table69', scope69),
  table69Drones,
  judgeKoujueTemplate('table69', scope69),
  mulAddLifeTemplate('table69', scope69),
  table69SameProduct,
  table69Derive,
  table69Nine,
];
