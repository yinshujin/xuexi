/**
 * Independent answer checkers used by the property tests. They recompute the
 * answer from what the child sees (prompt / options / widget spec) with code
 * that shares nothing with the generators.
 */
import type { Answer, Question } from '../src/types';

const MINUS = '−';

/** Signed integers in a string (U+2212 or '-' as minus). */
export function numbersIn(s: string): number[] {
  return [...s.matchAll(/[−-]?\d+/g)].map((m) => Number(m[0].replace(MINUS, '-')));
}

/** Evaluate a small arithmetic expression written with + − × ÷ ( ). */
export function evalExpr(expr: string): number {
  const js = expr.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
  if (!/^[\d\s+\-*/()]+$/.test(js)) throw new Error(`not an expression: ${expr}`);
  return Function(`"use strict"; return (${js});`)() as number;
}

const CN = '零一二三四五六七八九';

/** Parse a Chinese number reading (up to 千亿). */
export function parseChinese(s: string): number {
  const section = (t: string): number => {
    let total = 0;
    let cur = 0;
    let sawDigit = false;
    for (const ch of t) {
      const d = CN.indexOf(ch);
      if (d >= 0) {
        cur = d;
        sawDigit = d > 0 || sawDigit;
        continue;
      }
      const unit = ch === '十' ? 10 : ch === '百' ? 100 : ch === '千' ? 1000 : 0;
      if (!unit) throw new Error(`bad char ${ch} in ${s}`);
      total += (cur === 0 && ch === '十' ? 1 : cur) * unit;
      cur = 0;
    }
    return total + cur;
  };
  let rest = s;
  let value = 0;
  if (rest.includes('亿')) {
    const [hi, lo] = rest.split('亿');
    value += section(hi) * 1e8;
    rest = lo;
  }
  if (rest.includes('万')) {
    const [hi, lo] = rest.split('万');
    value += section(hi) * 1e4;
    rest = lo;
  }
  return value + section(rest);
}

/**
 * A second, independent Chinese reader: write every digit with its unit and
 * zeros as 零, then apply the textbook rules as string rewrites.
 */
export function readChineseAlt(n: number): string {
  const s = String(n).padStart(12, '0');
  const units = ['亿', '万', ''];
  let out = '';
  for (let i = 0; i < 3; i++) {
    const sec = s.slice(i * 4, i * 4 + 4);
    let t = '';
    for (let j = 0; j < 4; j++)
      t += sec[j] === '0' ? '零' : CN[Number(sec[j])] + ['千', '百', '十', ''][j];
    t = t.replace(/零+/g, '零').replace(/零$/, '');
    out += t === '' ? '零' : t + units[i];
  }
  out = out.replace(/零+/g, '零').replace(/^零/, '').replace(/零$/, '');
  return out.startsWith('一十') ? out.slice(1) : out;
}

const UNIT_SIZE: Record<string, number> = { 元: 100, 角: 10, 分: 1, 米: 100, 厘米: 1 };

function qtyValue(s: string): number {
  let v = 0;
  for (const m of s.matchAll(/(\d+)(厘米|元|角|分|米)/g)) v += Number(m[1]) * UNIT_SIZE[m[2]];
  return v;
}

function cmp(a: number, b: number): '<' | '>' | '=' {
  return a < b ? '<' : a > b ? '>' : '=';
}

function onlyMatching(q: Question, pred: (opt: string) => boolean): Answer {
  const hits = (q.options ?? []).map((o, i) => (pred(o) ? i : -1)).filter((i) => i >= 0);
  if (hits.length !== 1)
    throw new Error(
      `${q.key}: expected exactly one matching option, got ${hits.length}: ${q.options}`,
    );
  return { type: 'choice', index: hits[0] };
}

/** Recompute the expected answer of a question independently. */
export function expectedAnswer(q: Question): Answer {
  const p = q.prompt;
  const lhs = (s: string) => s.slice(s.indexOf('：') + 1).split(' = ')[0];
  switch (q.generatorId) {
    case 'g2.addsub.2d': {
      if (q.vertical) {
        const [a, b] = q.vertical.operands;
        return { type: 'number', value: q.vertical.op === '+' ? a + b : a - b };
      }
      return { type: 'number', value: evalExpr(p.split(' = ')[0]) };
    }
    case 'g2.addsub.word': {
      const story = p.split('\n')[0];
      const value = wordAnswer(story);
      if (q.widget === 'choice') return onlyMatching(q, (o) => evalExpr(o) === value);
      return { type: 'number', value };
    }
    case 'g2.measure':
      return measureAnswer(q);
    case 'g4.lines':
      return linesAnswer(q);
    case 'g2.addsub.chain':
    case 'g4.oral.muldiv':
      return { type: 'number', value: evalExpr(p.split(' = ')[0]) };
    case 'g4.law.simplify':
      return { type: 'number', value: evalExpr(lhs(p)) };
    case 'g2.mul.meaning': {
      if (q.widget === 'choice') {
        const [x, y] = numbersIn(p);
        return onlyMatching(q, (o) => o.includes('×') && evalExpr(o) === x * y);
      }
      if (p.includes('比')) {
        const [left, right] = p.split('比');
        return { type: 'number', value: evalExpr(left) - evalExpr(right.split(' 多')[0]) };
      }
      if (p.includes('个')) {
        const [n, m] = numbersIn(p);
        return { type: 'number', value: n * m };
      }
      const terms = p.split(' = ')[0].split(' + ');
      return { type: 'number', value: terms.length };
    }
    case 'g2.mul.table': {
      if (q.widget === 'choice') {
        const [prod] = numbersIn(p);
        return onlyMatching(q, (o) => o.includes('×') && evalExpr(o) === prod);
      }
      if (p.startsWith('填口诀')) {
        const [a, b] = [...p.replace('填口诀：', '').slice(0, 2)].map((c) => CN.indexOf(c));
        return { type: 'number', value: a * b };
      }
      const nums = numbersIn(p);
      if (p.startsWith('（')) return { type: 'number', value: nums[1] / nums[0] };
      if (p.includes('× （')) return { type: 'number', value: nums[1] / nums[0] };
      return { type: 'number', value: nums[0] * nums[1] };
    }
    case 'g2.div.table': {
      const nums = numbersIn(p);
      if (p.includes('÷ （')) return { type: 'number', value: nums[0] / nums[1] };
      return { type: 'number', value: nums[0] / nums[1] };
    }
    case 'g2.unit.money':
    case 'g2.unit.length': {
      if (q.widget === 'choice') {
        // 选择合适的单位: rooms, poles, buses, trees, beds, doors, ropes, blackboards are measured in 米.
        const unit = /(教室|旗杆|汽车|大树|床|门|跳绳|黑板)/.test(p) ? '米' : '厘米';
        return { type: 'choice', index: (q.options ?? []).indexOf(unit) };
      }
      const [left, right] = p.split(' = ');
      const [prefix, target] = right.split('（　）');
      let total: number;
      if (left.includes(' + '))
        total = left
          .split(' + ')
          .map(qtyValue)
          .reduce((a, b) => a + b);
      else if (left.includes(` ${MINUS} `)) {
        const [a, b] = left.split(` ${MINUS} `);
        total = qtyValue(a) - qtyValue(b);
      } else total = qtyValue(left);
      return { type: 'number', value: (total - qtyValue(prefix)) / UNIT_SIZE[target] };
    }
    case 'g4.bignum.read': {
      if (p.includes('读作')) {
        const n = numbersIn(p)[0];
        return onlyMatching(q, (o) => o === readChineseAlt(n));
      }
      const reading = p.split(' 写作')[0];
      return onlyMatching(
        q,
        (o) => readChineseAlt(Number(o)) === reading && parseChinese(reading) === Number(o),
      );
    }
    case 'g4.bignum.rewrite': {
      const n = numbersIn(p).find((x) => x >= 10000) as number;
      if (p.includes('改写') && p.includes('「万」')) return { type: 'number', value: n / 1e4 };
      if (p.includes('改写') && p.includes('「亿」')) return { type: 'number', value: n / 1e8 };
      if (p.includes('省略万位')) return { type: 'number', value: Math.round(n / 1e4) };
      if (p.includes('省略亿位')) return { type: 'number', value: Math.round(n / 1e8) };
      if (p.includes('十万位')) return { type: 'number', value: Math.round(n / 1e5) * 10 };
      throw new Error(`unknown rewrite prompt ${p}`);
    }
    case 'g4.bignum.compare': {
      const [l, r] = p.replace('比较大小：', '').split(' ○ ');
      const val = (s: string) =>
        s.endsWith('亿') ? parseInt(s) * 1e8 : s.endsWith('万') ? parseInt(s) * 1e4 : Number(s);
      return { type: 'compare', value: cmp(val(l), val(r)) };
    }
    case 'g4.mul.3x2': {
      const [a, b] = q.vertical!.operands;
      return { type: 'number', value: a * b };
    }
    case 'g4.mul.estimate': {
      const [a, b] = numbersIn(p);
      const est = (n: number) =>
        n >= 100 ? Math.round(n / 100) * 100 : n >= 10 ? Math.round(n / 10) * 10 : n;
      return { type: 'number', value: est(a) * est(b) };
    }
    case 'g4.div.2d': {
      const [N, D] = numbersIn(p);
      return { type: 'division', quotient: Math.floor(N / D), remainder: N % D };
    }
    case 'g4.angle.measure':
      return { type: 'number', value: q.angle!.degrees };
    case 'g4.angle.classify': {
      if (q.widget === 'choice') {
        const x = numbersIn(p)[0];
        const name =
          x < 90 ? '锐角' : x === 90 ? '直角' : x < 180 ? '钝角' : x === 180 ? '平角' : '周角';
        return { type: 'choice', index: q.options!.indexOf(name) };
      }
      if (p.includes('钟面')) {
        const h = numbersIn(p)[0];
        return { type: 'number', value: Math.min(h, 12 - h) * 30 };
      }
      const given = [...p.matchAll(/∠\d = (\d+)°/g)].map((m) => Number(m[1]));
      const total = p.includes('平角') ? 180 : p.includes('周角') ? 360 : 90;
      return { type: 'number', value: total - given.reduce((a, b) => a + b, 0) };
    }
    case 'g4.negative': {
      if (q.widget === 'compare') {
        const parse = (t: string) => Number(t.replace(MINUS, '-'));
        const [x, y] = p
          .split(/比较(?:大小)?：/)[1]
          .split(' ○ ')
          .map(parse);
        return { type: 'compare', value: cmp(x, y) };
      }
      const nums = numbersIn(p);
      if (p.includes('记作'))
        return { type: 'number', value: p.startsWith('零下') ? -nums[0] : nums[0] };
      if (p.includes('移动'))
        return {
          type: 'number',
          value: p.includes('向右') ? nums[0] + nums[1] : nums[0] - nums[1],
        };
      if (p.includes('下降')) return { type: 'number', value: nums[0] - nums[1] };
      return { type: 'number', value: nums[0] - nums[1] };
    }
  }
}

// ------------------------------------------------------------ word problems

/** Read a 二上 word problem like a child would: find the relation from the wording. */
function wordAnswer(story: string): number {
  const nums = numbersIn(story);
  const clauses = story.split(/[，。？]/).filter((c) => c.length > 0);
  if (story.includes('还差')) return nums[2] - nums[0] - nums[1];
  if (nums.length === 3) {
    if (/又还回|又上来/.test(story)) return nums[0] - nums[1] + nums[2];
    if (story.includes('借走')) return nums[0] + nums[1] - nums[2];
    throw new Error(`unknown two-step story: ${story}`);
  }
  const [a, b] = nums;
  const last = clauses[clauses.length - 1];
  if (last.includes('比')) return Math.abs(a - b); // 谁比谁多（少）多少
  if (clauses[1].startsWith('比')) return clauses[1].includes('多') ? a - b : a + b; // 逆叙
  if (clauses[1].includes('比')) return clauses[1].includes('多') ? a + b : a - b;
  if (clauses[0].includes('一共')) return a - b; // 已知总数求部分
  if (/一共|又上来/.test(story)) return a + b;
  if (/还剩|下去/.test(story)) return a - b;
  throw new Error(`unknown story: ${story}`);
}

// -------------------------------------------------------------- measuring

function measureAnswer(q: Question): Answer {
  const p = q.prompt;
  if (q.ruler) return { type: 'number', value: q.ruler.to - q.ruler.from };
  const nums = numbersIn(p);
  if (p.includes('画一条')) return { type: 'number', value: nums[0] + nums[1] };
  if (p.includes('另一端')) return { type: 'number', value: nums[1] - nums[0] };
  if (p.includes('哪根彩带')) {
    const red = nums[1] - nums[0];
    const blue = nums[3] - nums[2];
    return onlyMatching(q, (o) =>
      red > blue ? o.startsWith('红') : red < blue ? o.startsWith('蓝') : o === '一样长',
    );
  }
  if (p.includes('同样的')) {
    // 同一把“尺子”：次数多的长。
    const [m, n] = nums;
    return onlyMatching(q, (o) => o.startsWith(m > n ? '红' : '蓝'));
  }
  if (p.includes('谁的一拃')) {
    const names = [...p.matchAll(/(淘气|笑笑|奇思|妙想)量了/g)].map((x) => x[1]);
    const [m, n] = nums;
    return onlyMatching(q, (o) => o.startsWith(m < n ? names[0] : names[1]));
  }
  if (p.includes('哪种小棒')) {
    const [m, n] = nums;
    return onlyMatching(q, (o) => o.startsWith(m < n ? '红' : '蓝'));
  }
  if (p.includes('为什么')) return onlyMatching(q, (o) => o.includes('长短不一样'));
  if (p.includes('哪种做法')) return onlyMatching(q, (o) => o.includes('接着'));
  throw new Error(`unknown measure prompt ${p}`);
}

// ------------------------------------------------------------------- lines

/** Answer key for true/false statements about lines (a teacher's key, written separately). */
const LINES_TRUE = new Set([
  '线段有两个端点。',
  '射线只有一个端点。',
  '直线没有端点。',
  '线段可以量出长度。',
  '把线段的两端无限延长，就得到一条直线。',
  '线段 AB 和线段 BA 是同一条线段。',
  '过一点可以画无数条直线。',
  '两点之间所有的连线中，线段最短。',
  '两条直线相交成直角时，这两条直线互相垂直。',
  '两条互相垂直的直线的交点叫做垂足。',
  '长方形相邻的两条边互相垂直。',
  '正方形相邻的两条边互相垂直。',
  '从直线外一点到这条直线所画的线段中，垂线段最短。',
  '点到直线的距离，就是从这点到直线的垂线段的长度。',
  '两条直线相交成的四个角中，有一个是直角，这两条直线就互相垂直。',
  '在同一平面内，不相交的两条直线叫做平行线。',
  '长方形的两组对边分别互相平行。',
  '铁轨的两条钢轨可以近似地看成互相平行。',
  '在同一平面内，过直线外一点只能画一条已知直线的平行线。',
]);

const LINES_FALSE = new Set([
  '一条直线长 10 厘米。',
  '一条射线长 5 米。',
  '射线比直线短。',
  '射线 AB 和射线 BA 是同一条射线。',
  '过两点可以画无数条直线。',
  '手电筒射出的光线可以近似地看成线段。',
  '把线段的一端无限延长，就得到一条直线。',
  '两条直线相交，就一定互相垂直。',
  '在同一平面内，过直线外一点可以画无数条已知直线的垂线。',
  '只有一条横着、一条竖着的两条直线才互相垂直。',
  '正方形相邻的两条边互相平行。',
  '不相交的两条直线叫做平行线。',
  '两条线段不相交，它们就一定互相平行。',
  '在同一平面内，过直线外一点可以画无数条已知直线的平行线。',
  '在同一平面内，两条直线的位置关系不是平行就是垂直。',
]);

/** Fill-in-the-blank key: a distinctive phrase of the prompt → the word that goes in the blank. */
const LINES_BLANK: Array<[string, string]> = [
  ['有两个端点、可以量出长度', '线段'],
  ['只有一个端点、向一端无限延伸', '射线'],
  ['没有端点、向两端无限延伸', '直线'],
  ['手电筒射出的光线', '射线'],
  ['拉紧的绳子', '线段'],
  ['把线段的一端无限延长', '射线'],
  ['把线段的两端无限延长', '直线'],
  ['两条直线相交成直角时', '互相垂直'],
  ['交点叫做', '垂足'],
  ['所画的线段中', '垂线段'],
  ['垂线段的长度，叫做', '点到直线的距离'],
  ['用三角板画垂线', '直角边'],
  ['不相交的两条直线叫做', '平行线'],
  ['推拉窗', '平移'],
  ['位置关系有相交和', '平行'],
  ['画平行线时', '沿着直尺平移'],
  ['直线 b ⊥ 直线 c', '互相平行'],
  ['直线 c ⊥ 直线 a', '互相垂直'],
];

function linesAnswer(q: Question): Answer {
  const p = q.prompt;
  if (p.startsWith('判断：')) {
    const st = p.slice(3);
    if (LINES_TRUE.has(st)) return { type: 'choice', index: q.options!.indexOf('对') };
    if (LINES_FALSE.has(st)) return { type: 'choice', index: q.options!.indexOf('错') };
    throw new Error(`no key for statement ${st}`);
  }
  if (q.widget === 'choice') {
    const hit = LINES_BLANK.find(([k]) => p.includes(k));
    if (!hit) throw new Error(`no key for ${p}`);
    return { type: 'choice', index: q.options!.indexOf(hit[1]) };
  }
  const nums = numbersIn(p);
  if (p.includes('个端点'))
    return { type: 'number', value: p.startsWith('线段') ? 2 : p.startsWith('射线') ? 1 : 0 };
  if (p.includes('一条直线上依次有')) {
    // 数一数：每两个点确定一条线段。
    const k = (p.match(/[A-F]/g) ?? []).length;
    let count = 0;
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) count++;
    return { type: 'number', value: count };
  }
  if (p.includes('经过每两个点')) {
    const k = nums[0];
    return { type: 'number', value: (k * (k - 1)) / 2 };
  }
  if (p.includes('四个角')) return { type: 'number', value: 90 };
  if (p.includes('距离')) return { type: 'number', value: Math.min(...nums) };
  if (p.includes('互相垂直的边')) return { type: 'number', value: 4 };
  if (p.includes('互相平行的边')) return { type: 'number', value: 2 };
  throw new Error(`unknown lines prompt ${p}`);
}
