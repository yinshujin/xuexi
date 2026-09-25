import type { ErrorTag } from '@xuexi/shared';
import { step } from './base';
import type { ChallengeTemplate } from './challenge';
import { choiceAt, cmpOf, evalExpr, num, pickN, range, until } from './challenge-g2-util';

/**
 * 第一单元 100 以内数加与减（二）的拔高 / 创新题（续）。
 *  compare  比多比少、100 减两位数（跳绳）
 *  addsub   综合运用、两步计算（套圈游戏）
 */

// ------------------------------------------------------------------ compare

const KIDS = ['小明', '小红', '小刚'];

/** 小红比小明多 x 下，小刚比小红少 y 下：小刚跳几下 / 比小明多几下？ */
interface ChainP {
  base: number;
  x: number;
  y: number;
  r1: 1 | -1;
  r2: 1 | -1;
  ask: 'value' | 'diff';
}

const compareChain: ChallengeTemplate<ChainP> = {
  id: 'compare.chain',
  family: 'compare',
  tier: 'stretch',
  make(rng) {
    return until(
      () => ({
        base: rng.int(25, 75),
        x: rng.int(8, 29),
        y: rng.int(5, 25),
        r1: rng.pick([1, -1] as const),
        r2: rng.pick([1, -1] as const),
        ask: rng.chance(0.5) ? ('value' as const) : ('diff' as const),
      }),
      (p) => {
        const h = p.base + p.r1 * p.x;
        const g = h + p.r2 * p.y;
        return h >= 10 && h <= 99 && g >= 10 && g <= 99 && g !== p.base && p.x !== p.y;
      },
      'compare chain',
    );
  },
  render(p) {
    const h = p.base + p.r1 * p.x;
    const g = h + p.r2 * p.y;
    const more = g > p.base;
    const word = (r: number) => (r > 0 ? '多' : '少');
    const q = p.ask === 'value' ? '小刚跳了多少下？' : `小刚比小明${more ? '多' : '少'}跳多少下？`;
    const ans = p.ask === 'value' ? g : Math.abs(g - p.base);
    return {
      widget: 'numeric',
      prompt: `跳绳比赛：小明跳了 ${p.base} 下，小红比小明${word(p.r1)}跳 ${p.x} 下，小刚比小红${word(p.r2)}跳 ${p.y} 下。${q}`,
      answer: num(ans),
      hint: '一步一步来：先求小红跳了多少下，再求小刚。“比谁多”要看清是谁多。',
      steps: [
        step(`小红：${p.base} ${p.r1 > 0 ? '+' : '−'} ${p.x} = ${h}（下）。`),
        step(`小刚：${h} ${p.r2 > 0 ? '+' : '−'} ${p.y} = ${g}（下）。`),
        step(
          p.ask === 'value'
            ? `小刚跳了 ${g} 下。`
            : `小刚和小明比：${Math.max(g, p.base)} − ${Math.min(g, p.base)} = ${ans}（下），小刚${more ? '多' : '少'}跳 ${ans} 下。`,
        ),
      ],
      targetSeconds: 75,
    };
  },
  solve(p) {
    const jumps: Record<string, number> = { 小明: p.base };
    jumps['小红'] = jumps['小明'] + (p.r1 > 0 ? p.x : -p.x);
    jumps['小刚'] = jumps['小红'] + (p.r2 > 0 ? p.y : -p.y);
    return num(p.ask === 'value' ? jumps['小刚'] : Math.abs(jumps['小刚'] - jumps['小明']));
  },
};

/** 移多补少：哥哥给弟弟几张后两人同样多？ */
const EQUALIZE = [
  { big: '哥哥', small: '弟弟', item: '卡片', unit: '张' },
  { big: '姐姐', small: '妹妹', item: '贴画', unit: '张' },
  { big: '一号书架', small: '二号书架', item: '书', unit: '本' },
];

const compareEqualize: ChallengeTemplate<{ a: number; b: number; ctx: number }> = {
  id: 'compare.equalize',
  family: 'compare',
  tier: 'stretch',
  make(rng) {
    return until(
      () => ({ a: rng.int(20, 90), b: rng.int(10, 80), ctx: rng.int(0, EQUALIZE.length - 1) }),
      (p) => p.a > p.b && (p.a - p.b) % 2 === 0 && p.a - p.b >= 4 && p.a - p.b <= 18,
      'equalize',
    );
  },
  render({ a, b, ctx }) {
    const c = EQUALIZE[ctx];
    const diff = a - b;
    const half = diff / 2;
    const give =
      ctx === 2 ? `从${c.big}拿几${c.unit}放到${c.small}` : `${c.big}给${c.small}几${c.unit}`;
    return {
      widget: 'numeric',
      prompt: `${c.big}有 ${a} ${c.unit}${c.item}，${c.small}有 ${b} ${c.unit}。${give}后，两边的${c.item}就同样多？`,
      answer: num(half),
      hint: `先算${c.big}比${c.small}多几${c.unit}。拿走的这些，一边少了、一边多了，要拿多出部分的多少？`,
      steps: [
        step(`${c.big}比${c.small}多：${a} − ${b} = ${diff}（${c.unit}）。`),
        step(
          `多出的 ${diff} ${c.unit}平均分成两份，一份留下，一份拿过去：${half} + ${half} = ${diff}。`,
        ),
        step(
          `所以拿 ${half} ${c.unit}。检验：${a} − ${half} = ${a - half}，${b} + ${half} = ${b + half}，同样多。`,
        ),
      ],
      targetSeconds: 75,
    };
  },
  solve({ a, b }) {
    for (let k = 0; k <= a; k++) if (a - k === b + k) return num(k);
    throw new Error('equalize: no answer');
  },
};

/** 小红跳的比 100 少 x 下，比小明多 / 少 y 下，小明跳了多少下？ */
const compareHundred: ChallengeTemplate<{ x: number; y: number; more: boolean }> = {
  id: 'compare.hundred',
  family: 'compare',
  tier: 'stretch',
  make(rng) {
    return until(
      () => ({ x: rng.int(12, 58), y: rng.int(6, 29), more: rng.chance(0.6) }),
      (p) => {
        const h = 100 - p.x;
        const m = p.more ? h - p.y : h + p.y;
        return m >= 10 && m <= 99 && p.x % 10 !== 0;
      },
      'hundred',
    );
  },
  render({ x, y, more }) {
    const h = 100 - x;
    const m = more ? h - y : h + y;
    return {
      widget: 'numeric',
      prompt: `小红跳绳跳的下数比 100 少 ${x} 下，比小明${more ? '多' : '少'} ${y} 下。小明跳了多少下？`,
      answer: num(m),
      hint: '先求小红跳了多少下。小红比小明多，小明就比小红少；小红比小明少，小明就比小红多。',
      steps: [
        step(`小红：100 − ${x} = ${h}（下）。`),
        step(
          more
            ? `小红比小明多 ${y} 下，就是小明比小红少 ${y} 下：${h} − ${y} = ${m}（下）。`
            : `小红比小明少 ${y} 下，就是小明比小红多 ${y} 下：${h} + ${y} = ${m}（下）。`,
        ),
      ],
      targetSeconds: 75,
    };
  },
  solve({ x, y, more }) {
    const h = evalExpr(`100 − ${x}`);
    for (let m = 0; m <= 100; m++) if ((more ? h - m : m - h) === y) return num(m);
    throw new Error('hundred: no answer');
  },
};

/** 用算式 45 − 12 可以解决下面哪个问题？（开放条件选问题） */
type QKind = 'hong' | 'gang' | 'li' | 'total' | 'known';
interface PickQP {
  a: number;
  k: number;
  more: boolean;
  op: '+' | '−';
  options: QKind[];
}

const comparePickQuestion: ChallengeTemplate<PickQP> = {
  id: 'compare.pick-question',
  family: 'compare',
  tier: 'creative',
  make(rng) {
    const { a, k } = until(
      () => ({ a: rng.int(30, 80), k: rng.int(6, 25) }),
      (p) => p.a !== 2 * p.k && p.a - p.k >= 10 && p.a + p.k <= 99,
      'pick question',
    );
    const more = rng.chance(0.5);
    const op = rng.chance(0.5) ? ('+' as const) : ('−' as const);
    // 小红的算式和 gang / li 中的一个相同，只放另一个。
    const hongOp = more ? '−' : '+';
    const other: QKind = hongOp === '−' ? 'gang' : 'li';
    return { a, k, more, op, options: rng.shuffle<QKind>(['hong', other, 'total', 'known']) };
  },
  render({ a, k, more, op, options }) {
    const text: Record<QKind, string> = {
      hong: '小红跳了多少下？',
      gang: `小刚比小明多跳 ${k} 下，小刚跳了多少下？`,
      li: `小丽比小明少跳 ${k} 下，小丽跳了多少下？`,
      total: '小明和小红一共跳了多少下？',
      known: '小明和小红相差多少下？',
    };
    const hongOp = more ? '−' : '+';
    const want: QKind = op === hongOp ? 'hong' : op === '+' ? 'gang' : 'li';
    const idx = options.indexOf(want);
    const tags = options.map((o): ErrorTag | null =>
      o === want ? null : o === 'hong' ? 'op-confused' : 'reasoning',
    );
    return {
      widget: 'choice',
      prompt: `小明跳绳跳了 ${a} 下，比小红${more ? '多' : '少'} ${k} 下。用算式 ${a} ${op} ${k} 可以解决下面哪个问题？`,
      options: options.map((o) => text[o]),
      optionTags: tags,
      answer: choiceAt(idx),
      hint: '小明比小红多，小红就比小明少。把每个问题要怎么列式想一想，再和算式对一对。',
      steps: [
        step(
          `小明比小红${more ? '多' : '少'} ${k} 下，小红就比小明${more ? '少' : '多'} ${k} 下，求小红要用 ${a} ${hongOp} ${k}。`,
        ),
        step('“一共跳了多少下”要先求小红，再相加，要两步；“相差多少下”题目里已经告诉我们了。'),
        step(`所以 ${a} ${op} ${k} 解决的是：${text[want]}`),
      ],
      targetSeconds: 75,
    };
  },
  solve({ a, k, more, op, options }) {
    const hong = more ? a - k : a + k;
    const value: Record<QKind, number> = {
      hong,
      gang: a + k,
      li: a - k,
      total: a + hong,
      known: k,
    };
    const target = evalExpr(`${a} ${op} ${k}`);
    const hits = options.map((o, i) => (value[o] === target ? i : -1)).filter((i) => i >= 0);
    if (hits.length !== 1) throw new Error('pick question: not unique');
    return choiceAt(hits[0]);
  },
};

/** 三人比多少：跳得最多的比最少的多几下？ */
interface RelP {
  /** [who, than, more?, n] */
  rels: Array<[number, number, boolean, number]>;
}

const compareThree: ChallengeTemplate<RelP> = {
  id: 'compare.three-kids',
  family: 'compare',
  tier: 'creative',
  make(rng) {
    return until(
      () => {
        const x = rng.int(3, 19);
        const y = rng.int(3, 19);
        const form = rng.int(0, 2);
        const rels: RelP['rels'] =
          form === 0
            ? [
                [0, 1, true, x],
                [2, 1, false, y],
              ]
            : form === 1
              ? [
                  [0, 1, true, x],
                  [2, 0, false, y],
                ]
              : [
                  [0, 1, false, x],
                  [2, 1, false, y],
                ];
        const order = rng.shuffle([0, 1, 2]);
        return {
          rels: rels.map(
            ([w, t, m, n]) => [order[w], order[t], m, n] as [number, number, boolean, number],
          ),
          x,
          y,
        };
      },
      (p) => p.x !== p.y && new Set(threeValues(p.rels, 50)).size === 3,
      'three kids',
    );
  },
  render({ rels }) {
    const v = threeValues(rels, 50);
    const hi = v.indexOf(Math.max(...v));
    const lo = v.indexOf(Math.min(...v));
    const said = rels
      .map(([w, t, m, n]) => `${KIDS[w]}比${KIDS[t]}${m ? '多' : '少'}跳 ${n} 下`)
      .join('，');
    const anchor = rels[0][1];
    const others = [0, 1, 2].filter((i) => i !== anchor);
    return {
      widget: 'numeric',
      prompt: `${said}。三人中跳得最多的比跳得最少的多跳多少下？`,
      answer: num(v[hi] - v[lo]),
      hint: `不知道${KIDS[anchor]}跳了多少下也没关系：可以假设${KIDS[anchor]}跳了一个数，或者画线段图比一比。`,
      steps: [
        step(`假设${KIDS[anchor]}跳了 ${v[anchor]} 下（换成别的数，相差的下数也一样）。`),
        step(
          `那么${KIDS[others[0]]}跳了 ${v[others[0]]} 下，${KIDS[others[1]]}跳了 ${v[others[1]]} 下。`,
        ),
        step(
          `最多的是${KIDS[hi]}，最少的是${KIDS[lo]}，相差 ${v[hi]} − ${v[lo]} = ${v[hi] - v[lo]}（下）。`,
        ),
      ],
      targetSeconds: 90,
    };
  },
  solve({ rels }) {
    const v = threeValues(rels, 30);
    return num(Math.max(...v) - Math.min(...v));
  },
};

/** Values of the three kids when the anchor (the `than` of the first relation) has `base`. */
function threeValues(rels: RelP['rels'], base: number): number[] {
  const v: Array<number | undefined> = [undefined, undefined, undefined];
  v[rels[0][1]] = base;
  for (let pass = 0; pass < 3; pass++)
    for (const [w, t, m, n] of rels) {
      if (v[t] !== undefined && v[w] === undefined) v[w] = v[t]! + (m ? n : -n);
      if (v[w] !== undefined && v[t] === undefined) v[t] = v[w]! - (m ? n : -n);
    }
  return v.map((x) => x!);
}

/** 小明跳了 □6 下，比小红的 38 下多，但多出的不到 30 下：□ 里可以填几种数字？ */
const compareFillCount: ChallengeTemplate<{ u: number; v: number; lim: number }> = {
  id: 'compare.fill-count',
  family: 'compare',
  tier: 'creative',
  make(rng) {
    return until(
      () => ({ u: rng.int(0, 9), v: rng.int(21, 69), lim: rng.pick([20, 25, 30, 35, 40]) }),
      (p) => {
        const n = fillList(p).length;
        return n >= 1 && n <= 4 && p.v % 10 !== p.u;
      },
      'fill count',
    );
  },
  render(p) {
    const list = fillList(p);
    return {
      widget: 'numeric',
      prompt: `小明跳绳跳了 □${p.u} 下，比小红的 ${p.v} 下多，但多出的不到 ${p.lim} 下。□ 里可以填几种不同的数字？`,
      answer: num(list.length),
      hint: `小明跳的下数要比 ${p.v} 大，又要比 ${p.v} + ${p.lim} 小。把 □ 从 1 开始一个一个试。`,
      steps: [
        step(`小明跳的下数比 ${p.v} 大，比 ${p.v} + ${p.lim} = ${p.v + p.lim} 小。`),
        step(`符合的有：${list.join('、')}。`),
        step(`□ 里可以填 ${list.length} 种数字。`),
      ],
      targetSeconds: 90,
    };
  },
  solve({ u, v, lim }) {
    let c = 0;
    for (let t = 1; t <= 9; t++) {
      const n = t * 10 + u;
      if (n > v && n - v < lim) c++;
    }
    return num(c);
  },
};

function fillList(p: { u: number; v: number; lim: number }): number[] {
  return range(1, 9)
    .map((t) => t * 10 + p.u)
    .filter((n) => n > p.v && n < p.v + p.lim);
}

// ------------------------------------------------------------------ addsub

/** 有无括号：不计算，比较 56 − 18 + 25 ○ 56 − (18 + 25) */
const PAREN_FORMS: Array<[string, string]> = [
  ['a − b + c', 'a − (b + c)'],
  ['a − b − c', 'a − (b + c)'],
  ['a − (b − c)', 'a − b + c'],
  ['a − (b − c)', 'a − b − c'],
  ['a + b − c', 'a + (b − c)'],
];

function fillForm(f: string, a: number, b: number, c: number): string {
  return f.replace('a', String(a)).replace('b', String(b)).replace('c', String(c));
}

const addsubParen: ChallengeTemplate<{
  form: number;
  swap: boolean;
  a: number;
  b: number;
  c: number;
}> = {
  id: 'addsub.paren-compare',
  family: 'addsub',
  tier: 'stretch',
  make(rng) {
    return until(
      () => ({
        form: rng.int(0, PAREN_FORMS.length - 1),
        swap: rng.chance(0.4),
        a: rng.int(50, 99),
        b: rng.int(12, 45),
        c: rng.int(6, 35),
      }),
      (p) => p.b > p.c && p.a >= p.b + p.c + 5 && p.a + p.b <= 100 && p.c % 10 !== 0,
      'paren',
    );
  },
  render({ form, swap, a, b, c }) {
    const [f1, f2] = PAREN_FORMS[form];
    const vals: Record<string, number> = {
      'a − b + c': a - b + c,
      'a − (b + c)': a - (b + c),
      'a − b − c': a - b - c,
      'a − (b − c)': a - (b - c),
      'a + b − c': a + b - c,
      'a + (b − c)': a + (b - c),
    };
    const meaning: Record<string, string> = {
      'a − b + c': `从 ${a} 里减去 ${b}，再加上 ${c}`,
      'a − (b + c)': `从 ${a} 里减去 ${b} 和 ${c} 的和`,
      'a − b − c': `从 ${a} 里减去 ${b}，再减去 ${c}`,
      'a − (b − c)': `从 ${a} 里减去 ${b}，但少减了 ${c}（相当于再加回 ${c}）`,
      'a + b − c': `${a} 加上 ${b}，再减去 ${c}`,
      'a + (b − c)': `${a} 加上 ${b} 与 ${c} 的差（也就是加 ${b} 再减 ${c}）`,
    };
    const [L, R] = swap ? [f2, f1] : [f1, f2];
    const l = vals[L];
    const r = vals[R];
    return {
      widget: 'compare',
      prompt: `不计算，比较大小：${fillForm(L, a, b, c)} ○ ${fillForm(R, a, b, c)}`,
      answer: cmpOf(l, r),
      hint: '先想一想两边各是什么意思：括号改变了先算哪一步，是多减了、少减了，还是一样？',
      steps: [
        step(`左边：${meaning[L]}。`),
        step(`右边：${meaning[R]}。`),
        step(
          `所以左边 ${l < r ? '<' : l > r ? '>' : '='} 右边。（算一算：左边 = ${l}，右边 = ${r}）`,
        ),
      ],
      targetSeconds: 60,
    };
  },
  solve({ form, swap, a, b, c }) {
    const [f1, f2] = PAREN_FORMS[form];
    const [L, R] = swap ? [f2, f1] : [f1, f2];
    return cmpOf(evalExpr(fillForm(L, a, b, c)), evalExpr(fillForm(R, a, b, c)));
  },
};

/** □ − 18 + 25 = 63，□ 里填几？（倒着推） */
const addsubReverse: ChallengeTemplate<{
  x: number;
  op1: '+' | '−';
  b: number;
  op2: '+' | '−';
  c: number;
}> = {
  id: 'addsub.reverse-chain',
  family: 'addsub',
  tier: 'stretch',
  make(rng) {
    return until(
      () => ({
        x: rng.int(15, 90),
        op1: rng.pick(['+', '−'] as const),
        b: rng.int(12, 45),
        op2: rng.pick(['+', '−'] as const),
        c: rng.int(8, 45),
      }),
      (p) => {
        if (p.op1 === p.op2) return false;
        const m = p.op1 === '+' ? p.x + p.b : p.x - p.b;
        const r = p.op2 === '+' ? m + p.c : m - p.c;
        return m >= 5 && m <= 100 && r >= 5 && r <= 100 && p.b !== p.c;
      },
      'reverse chain',
    );
  },
  render({ x, op1, b, op2, c }) {
    const m = op1 === '+' ? x + b : x - b;
    const r = op2 === '+' ? m + c : m - c;
    const inv = (op: '+' | '−') => (op === '+' ? '−' : '+');
    return {
      widget: 'numeric',
      prompt: `□ ${op1} ${b} ${op2} ${c} = ${r}，□ 里填几？`,
      answer: num(x),
      hint: '倒着想：最后一步加了（减了）多少？先退回去，再退一步。',
      steps: [
        step(
          `倒着推：最后${op2 === '+' ? '加' : '减'}了 ${c}，所以前一步的结果是 ${r} ${inv(op2)} ${c} = ${m}。`,
        ),
        step(`□ ${op1} ${b} = ${m}，所以 □ = ${m} ${inv(op1)} ${b} = ${x}。`),
        step(`验算：${x} ${op1} ${b} ${op2} ${c} = ${r}。`),
      ],
      targetSeconds: 75,
    };
  },
  solve({ op1, b, op2, c, x }) {
    const r = evalExpr(`${x} ${op1} ${b} ${op2} ${c}`);
    const fits = range(0, 100).filter((y) => evalExpr(`${y} ${op1} ${b} ${op2} ${c}`) === r);
    if (fits.length !== 1) throw new Error('reverse chain not unique');
    return num(fits[0]);
  },
};

/** 38 + □ = 50 + 27，□ 里填几？ */
const addsubBalance: ChallengeTemplate<{ plus: boolean; a: number; b: number; c: number }> = {
  id: 'addsub.balance',
  family: 'addsub',
  tier: 'stretch',
  make(rng) {
    return until(
      () => ({ plus: rng.chance(0.5), a: rng.int(20, 70), b: rng.int(15, 70), c: rng.int(8, 40) }),
      (p) => {
        // 不能一眼看出答案（如 26 − □ = 26 − 10）
        if (p.a === p.b || p.a === p.c) return false;
        if (p.plus) {
          const x = p.b + p.c - p.a;
          return p.b + p.c <= 100 && x >= 5 && x !== p.b && x !== p.c;
        }
        const x = p.a - (p.b - p.c);
        return p.b > p.c + 5 && x >= 5 && x !== p.c;
      },
      'balance',
    );
  },
  render({ plus, a, b, c }) {
    const right = plus ? b + c : b - c;
    const x = plus ? right - a : a - right;
    return {
      widget: 'numeric',
      prompt: plus ? `${a} + □ = ${b} + ${c}，□ 里填几？` : `${a} − □ = ${b} − ${c}，□ 里填几？`,
      answer: num(x),
      hint: '等号两边要同样大。先算出右边是多少，再想 □ 是几。',
      steps: [
        step(`先算右边：${b} ${plus ? '+' : '−'} ${c} = ${right}。`),
        step(
          plus
            ? `${a} + □ = ${right}，□ = ${right} − ${a} = ${x}。`
            : `${a} − □ = ${right}，□ = ${a} − ${right} = ${x}。`,
        ),
      ],
      targetSeconds: 60,
    };
  },
  solve({ plus, a, b, c }) {
    const right = evalExpr(`${b} ${plus ? '+' : '−'} ${c}`);
    for (let x = 0; x <= 100; x++) if ((plus ? a + x : a - x) === right) return num(x);
    throw new Error('balance: none');
  },
};

/** 套圈：套中两个玩具一共 T 分，是哪两个？ */
const TOYS = ['小猫', '小狗', '小兔', '小熊', '小鸭'];

const addsubRingPick: ChallengeTemplate<{
  scores: number[];
  t: number;
  options: Array<[number, number]>;
}> = {
  id: 'addsub.ring-pick',
  family: 'addsub',
  tier: 'creative',
  make(rng) {
    const { scores, pair } = until(
      () => {
        const scores = pickN(rng, range(12, 49), 4);
        const pair = pickN(rng, [0, 1, 2, 3], 2).sort() as [number, number];
        return { scores, pair };
      },
      ({ scores, pair }) => {
        const t = scores[pair[0]] + scores[pair[1]];
        let hits = 0;
        for (let i = 0; i < 4; i++)
          for (let j = i + 1; j < 4; j++) if (scores[i] + scores[j] === t) hits++;
        return hits === 1 && t <= 99 && scores.every((s) => s % 10 !== 0);
      },
      'ring pick',
    );
    const all: Array<[number, number]> = [];
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) all.push([i, j]);
    const others = pickN(
      rng,
      all.filter(([i, j]) => !(i === pair[0] && j === pair[1])),
      3,
    );
    return {
      scores,
      t: scores[pair[0]] + scores[pair[1]],
      options: rng.shuffle([pair, ...others]),
    };
  },
  render({ scores, t, options }) {
    const list = scores.map((s, i) => `${TOYS[i]} ${s} 分`).join('，');
    const idx = options.findIndex(([i, j]) => scores[i] + scores[j] === t);
    return {
      widget: 'choice',
      prompt: `套圈游戏：套中${list}。小明套中了两个不同的玩具，一共得了 ${t} 分。他套中的是哪两个？`,
      options: options.map(([i, j]) => `${TOYS[i]}和${TOYS[j]}`),
      optionTags: options.map((_, k) => (k === idx ? null : 'reasoning')),
      answer: choiceAt(idx),
      hint: '可以先看个位：哪两个分数的个位相加，个位正好是总分的个位？再算一算。',
      steps: [
        step(`总分 ${t} 的个位是 ${t % 10}，先找个位合起来是 ${t % 10} 的两个分数。`),
        step(
          `${TOYS[options[idx][0]]} ${scores[options[idx][0]]} 分 + ${TOYS[options[idx][1]]} ${scores[options[idx][1]]} 分 = ${t} 分。`,
        ),
      ],
      targetSeconds: 75,
    };
  },
  solve({ scores, t, options }) {
    const hits = options
      .map(([i, j], k) => (evalExpr(`${scores[i]} + ${scores[j]}`) === t ? k : -1))
      .filter((k) => k >= 0);
    if (hits.length !== 1) throw new Error('ring pick not unique');
    return choiceAt(hits[0]);
  },
};

/** 套圈：两个圈都套中（可以是同一种），可能得到几种不同的总分？ */
const addsubRingTotals: ChallengeTemplate<{ scores: number[] }> = {
  id: 'addsub.ring-totals',
  family: 'addsub',
  tier: 'creative',
  make(rng, d) {
    const n = d >= 4 ? 4 : 3;
    const ap = rng.chance(0.4);
    return until(
      () => {
        if (ap) {
          const a = rng.int(1, 4) * 5;
          const k = rng.int(1, 3) * 5;
          return { scores: range(0, n - 1).map((i) => a + i * k) };
        }
        return {
          scores: pickN(
            rng,
            range(3, 9).map((x) => x * 5),
            n,
          ).sort((x, y) => x - y),
        };
      },
      ({ scores }) => scores[scores.length - 1] * 2 <= 100,
      'ring totals',
    );
  },
  render({ scores }) {
    const n = scores.length;
    const sums: string[] = [];
    const set = new Set<number>();
    for (let i = 0; i < n; i++)
      for (let j = i; j < n; j++) {
        sums.push(`${scores[i]} + ${scores[j]} = ${scores[i] + scores[j]}`);
        set.add(scores[i] + scores[j]);
      }
    const list = scores.map((s, i) => `${TOYS[i]} ${s} 分`).join('，');
    const distinct = [...set].sort((x, y) => x - y);
    return {
      widget: 'numeric',
      prompt: `套圈游戏：套中${list}。小明套了两个圈，两个圈都套中了（两个圈也可以套中同一种玩具）。他一共可能得到几种不同的分数？`,
      answer: num(set.size),
      hint: '有序地列出所有的套法（包括两个圈套中同一种），算出总分，相同的分数只算一种。',
      steps: [
        step(`按顺序列出来：${sums.join('，')}。`),
        step(`不同的总分有：${distinct.join('、')}。`),
        step(`一共 ${set.size} 种不同的分数。`),
      ],
      targetSeconds: 120,
    };
  },
  solve({ scores }) {
    const set = new Set<number>();
    for (const x of scores) for (const y of scores) set.add(x + y);
    return num(set.size);
  },
};

/** □ + 25 = ○ + 38：□ 比 ○ 大几？ */
const addsubBalanceDiff: ChallengeTemplate<{ plus: boolean; a: number; b: number }> = {
  id: 'addsub.balance-diff',
  family: 'addsub',
  tier: 'creative',
  make(rng) {
    return until(
      () => ({ plus: rng.chance(0.5), a: rng.int(12, 49), b: rng.int(12, 49) }),
      (p) => (p.plus ? p.b > p.a : p.a > p.b) && Math.abs(p.a - p.b) >= 3,
      'balance diff',
    );
  },
  render({ plus, a, b }) {
    const d = Math.abs(a - b);
    const ex = 40;
    return {
      widget: 'numeric',
      prompt: plus ? `□ + ${a} = ○ + ${b}，□ 比 ○ 大几？` : `□ − ${a} = ○ − ${b}，□ 比 ○ 大几？`,
      answer: num(d),
      hint: plus
        ? '两边加完一样多。谁加得少，谁原来就要大一些。'
        : '两边减完一样多。谁减得多，谁原来就要大一些。',
      steps: [
        step(
          plus
            ? `□ 只加了 ${a}，○ 加了 ${b}，○ 多加了 ${b} − ${a} = ${d}，结果还一样多，说明 □ 比 ○ 大 ${d}。`
            : `□ 减去了 ${a}，○ 只减去 ${b}，□ 多减了 ${a} − ${b} = ${d}，结果还一样多，说明 □ 比 ○ 大 ${d}。`,
        ),
        step(
          plus
            ? `举例验证：○ 是 ${ex}，右边是 ${ex + b}，□ 就是 ${ex + b - a}，${ex + b - a} − ${ex} = ${d}。`
            : `举例验证：○ 是 ${ex}，右边是 ${ex - b}，□ 就是 ${ex - b + a}，${ex - b + a} − ${ex} = ${d}。`,
        ),
      ],
      targetSeconds: 75,
    };
  },
  solve({ plus, a, b }) {
    const diffs = new Set<number>();
    for (let o = 50; o <= 60; o++)
      for (let s = 0; s <= 120; s++) if (plus ? s + a === o + b : s - a === o - b) diffs.add(s - o);
    if (diffs.size !== 1) throw new Error('balance diff');
    return num([...diffs][0]);
  },
};

/** 两个小朋友用不同顺序算 72 − 25 + 18，谁算得对？ */
interface OrderP {
  a: number;
  b: number;
  op2: '+' | '−';
  c: number;
  /** which kid (0 小明 / 1 小红) went left to right */
  ltrKid: 0 | 1;
  /** the left-to-right kid slipped by 10 */
  slip: boolean;
}

const ORDER_OPTIONS = ['小明', '小红', '两人都对', '两人都不对'];

const addsubOrderJudge: ChallengeTemplate<OrderP> = {
  id: 'addsub.order-judge',
  family: 'addsub',
  tier: 'creative',
  make(rng) {
    return until(
      () => ({
        a: rng.int(50, 98),
        b: rng.int(12, 39),
        op2: rng.pick(['+', '−'] as const),
        c: rng.int(6, 29),
        ltrKid: rng.pick([0, 1] as const),
        slip: rng.chance(0.25),
      }),
      (p) => {
        const inner = p.op2 === '+' ? p.b + p.c : p.b - p.c;
        const ltr = p.op2 === '+' ? p.a - p.b + p.c : p.a - p.b - p.c;
        const rtl = p.a - inner;
        return inner >= 1 && p.a > inner && ltr >= 5 && ltr <= 90 && rtl !== ltr && p.b !== p.c;
      },
      'order judge',
    );
  },
  render(p) {
    const { a, b, op2, c, ltrKid, slip } = p;
    const first = a - b;
    const ltr = op2 === '+' ? first + c : first - c;
    const shownLtr = slip ? ltr + 10 : ltr;
    const inner = op2 === '+' ? b + c : b - c;
    const rtl = a - inner;
    const kidText = [
      `先算 ${a} − ${b} = ${first}，再算 ${first} ${op2} ${c} = ${shownLtr}`,
      `先算 ${b} ${op2} ${c} = ${inner}，再算 ${a} − ${inner} = ${rtl}`,
    ];
    const says = ltrKid === 0 ? [kidText[0], kidText[1]] : [kidText[1], kidText[0]];
    const answer = slip ? 3 : ltrKid;
    const tags = ORDER_OPTIONS.map((_, i): ErrorTag | null =>
      i === answer ? null : i === 1 - ltrKid ? 'order-of-ops' : 'reasoning',
    );
    return {
      widget: 'choice',
      prompt: `计算 ${a} − ${b} ${op2} ${c}：\n小明：${says[0]}。\n小红：${says[1]}。\n谁算得对？`,
      options: ORDER_OPTIONS,
      optionTags: tags,
      answer: choiceAt(answer),
      hint: '没有括号的加减混合，要从左往右一步一步算。再检查每一步的得数。',
      steps: [
        step(`没有括号，要从左往右算：${a} − ${b} = ${first}，${first} ${op2} ${c} = ${ltr}。`),
        step(`先算 ${b} ${op2} ${c} 是改变了运算顺序，得数 ${rtl} 不对。`),
        step(
          slip
            ? `从左往右算的同学第二步算错了（应该是 ${ltr}），所以两人都不对。`
            : `所以${ORDER_OPTIONS[ltrKid]}算得对。`,
        ),
      ],
      targetSeconds: 75,
    };
  },
  solve(p) {
    const truth = evalExpr(`${p.a} − ${p.b} ${p.op2} ${p.c}`);
    const inner = evalExpr(`${p.b} ${p.op2} ${p.c}`);
    const first = p.a - p.b;
    const ltrShown = (p.op2 === '+' ? first + p.c : first - p.c) + (p.slip ? 10 : 0);
    const results = p.ltrKid === 0 ? [ltrShown, p.a - inner] : [p.a - inner, ltrShown];
    const right = results.map((r) => r === truth);
    if (right[0] && right[1]) return choiceAt(2);
    if (right[0]) return choiceAt(0);
    if (right[1]) return choiceAt(1);
    return choiceAt(3);
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const COMPARE_TEMPLATES: ChallengeTemplate<any>[] = [
  compareChain,
  compareEqualize,
  compareHundred,
  comparePickQuestion,
  compareThree,
  compareFillCount,
  addsubParen,
  addsubReverse,
  addsubBalance,
  addsubRingPick,
  addsubRingTotals,
  addsubBalanceDiff,
  addsubOrderJudge,
];
