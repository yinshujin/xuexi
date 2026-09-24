import type { Rng } from '../rng';
import { fmtSigned } from '../arith';
import type { SolutionStep } from '../types';
import { BLANK, defineGenerator, numOf, step, type Diagnosis } from './base';

/**
 * g4.negative — 生活中的负数（温度、数轴）。
 *
 * This is the ONLY generator whose numeric answers can be negative: the UI
 * shows the “−” key on the keypad for g4.negative.
 *
 * Forms:
 *  cmp        −3 ○ −5                         (compare)
 *  cmp-temp   深圳 8℃，哈尔滨 −18℃           (compare)
 *  write      零下 5 摄氏度记作 ( )℃          (numeric, may be negative)
 *  move       数轴上从 −2 向右移动 5 个单位   (numeric)
 *  lower      气温 3℃，下降 5℃ 后是 ( )℃     (numeric)
 *  diff       深圳比哈尔滨高 ( )℃             (numeric)
 *
 * Difficulty:
 *  1 正数和负数比较 / 零下几度记作
 *  2 两个一位负数比较 / 城市气温比较 / 从 0 出发在数轴上移动
 *  3 城市气温比较 / 温差（跨过 0）/ 从负数出发移动
 *  4 两位负数比较 / 气温下降跨过 0 / 两位数温差
 *  5 −35 ○ −53 / 从负数继续下降 / 从负数向左移动
 */

type Form = 'cmp' | 'cmp-temp' | 'write' | 'move' | 'lower' | 'diff';

export interface NegativeParams {
  form: Form;
  /** cmp/cmp-temp: [x, y, cityX, cityY]; write: [k, above?1:0]; move: [start, steps, dir(+1 right / −1 left)];
   *  lower: [start, drop]; diff: [warm, cold, cityWarm, cityCold] */
  n: number[];
}

const CITIES = [
  { name: '深圳', lo: 6, hi: 18 },
  { name: '广州', lo: 4, hi: 15 },
  { name: '北京', lo: -12, hi: 3 },
  { name: '哈尔滨', lo: -30, hi: -10 },
  { name: '沈阳', lo: -22, hi: -5 },
];

type Cmp = '<' | '>' | '=';
const cmp = (a: number, b: number): Cmp => (a < b ? '<' : a > b ? '>' : '=');

function formsFor(variant: string, d: number, target?: string): Form[] {
  if (target === 'negative-compare') return variant === 'numeric' ? ['move', 'lower'] : ['cmp'];
  const mixed: Form[][] = [
    ['cmp', 'write'],
    ['cmp', 'cmp-temp', 'move'],
    ['cmp-temp', 'diff', 'move'],
    ['cmp', 'lower', 'diff'],
    ['cmp', 'lower', 'move'],
  ];
  const f = mixed[d - 1];
  if (variant === 'compare')
    return f.filter((x) => x.startsWith('cmp')).length
      ? f.filter((x) => x.startsWith('cmp'))
      : ['cmp'];
  if (variant === 'numeric')
    return f.filter((x) => !x.startsWith('cmp')).length
      ? f.filter((x) => !x.startsWith('cmp'))
      : ['move'];
  return f;
}

function pickCompare(rng: Rng, d: number): [number, number] {
  switch (d) {
    case 1: {
      const pos = rng.int(0, 9);
      const neg = -rng.int(1, 9);
      return rng.chance(0.5) ? [pos, neg] : [neg, pos];
    }
    case 2:
    case 3: {
      const a = rng.int(1, 9);
      let b = rng.int(1, 9);
      if (b === a) b = a === 9 ? 1 : a + 1;
      return rng.chance(0.2) ? [-a, 0] : [-a, -b];
    }
    case 4: {
      const a = rng.int(11, 39);
      const b = rng.chance(0.5) ? Number(String(a).split('').reverse().join('')) : rng.int(11, 39);
      return [-a, -(b === a || b % 10 === 0 ? a + 2 : b)];
    }
    default: {
      const a = rng.int(10, 99);
      let b = a % 10 === 0 ? a + 1 : Number(String(a).split('').reverse().join(''));
      if (b === a) b = a + 10 <= 99 ? a + 10 : a - 10;
      return rng.chance(0.3) ? [-a, a > 50 ? 3 : -3] : [-a, -b];
    }
  }
}

function compareSteps(x: number, y: number): SolutionStep[] {
  const out: SolutionStep[] = [
    step('在数轴上，右边的数总比左边的数大；负数都比 0 小，正数都比 0 大。'),
  ];
  if (x < 0 && y < 0) {
    out.push(step(`${fmtSigned(x)} 和 ${fmtSigned(y)} 都是负数，负号后面的数越大，这个数越小。`));
  } else {
    out.push(step(`${fmtSigned(Math.min(x, y))} 在 ${fmtSigned(Math.max(x, y))} 的左边。`));
  }
  out.push(step('所以', `${fmtSigned(x)} ${cmp(x, y)} ${fmtSigned(y)}`));
  return out;
}

export const g4Negative = defineGenerator<NegativeParams>({
  id: 'g4.negative',
  variants: ['mixed', 'compare', 'numeric'],
  targets: ['negative-compare'],
  build({ difficulty: d, variant, target, rng }) {
    const form = rng.pick(formsFor(variant, d, target));
    const level = target ? Math.max(d, 2) : d;
    switch (form) {
      case 'cmp':
      case 'cmp-temp': {
        let x: number;
        let y: number;
        let prompt: string;
        let n: number[];
        if (form === 'cmp') {
          [x, y] = pickCompare(rng, level);
          prompt = `比较大小：${fmtSigned(x)} ○ ${fmtSigned(y)}`;
          n = [x, y, -1, -1];
        } else {
          const [ci, cj] = rng.shuffle([0, 1, 2, 3, 4]).slice(0, 2);
          const A = CITIES[ci];
          const B = CITIES[cj];
          x = rng.int(A.lo, A.hi);
          y = rng.int(B.lo, B.hi);
          if (x === y) y -= 1;
          prompt = `冬天的一天，${A.name}的最低气温是 ${fmtSigned(x)}℃，${B.name}的最低气温是 ${fmtSigned(y)}℃。比较：${fmtSigned(x)} ○ ${fmtSigned(y)}`;
          n = [x, y, ci, cj];
        }
        return {
          widget: 'compare',
          prompt,
          answer: { type: 'compare', value: cmp(x, y) },
          hint: '想一想数轴：越往左的数越小。',
          steps: compareSteps(x, y),
          targetSeconds: 8,
          params: { form, n },
        };
      }
      case 'write': {
        const k = rng.int(1, 20);
        const above = rng.chance(0.3);
        return {
          widget: 'numeric',
          prompt: `${above ? '零上' : '零下'} ${k} 摄氏度记作${BLANK}℃。`,
          answer: { type: 'number', value: above ? k : -k },
          hint: '零上用正数表示，零下用负数表示。',
          steps: [
            step('以 0℃ 为界，零上记作正数，零下记作负数（前面加「−」号）。'),
            step(
              '所以',
              `${above ? '零上' : '零下'} ${k} 摄氏度记作 ${fmtSigned(above ? k : -k)}℃`,
            ),
          ],
          targetSeconds: 8,
          params: { form, n: [k, above ? 1 : 0] },
        };
      }
      case 'move': {
        const start = level <= 2 ? 0 : level === 3 ? -rng.int(1, 5) : -rng.int(2, 9);
        const steps = rng.int(2, 9);
        const dir = level >= 5 || (level === 2 && rng.chance(0.5)) ? -1 : 1;
        const ans = start + dir * steps;
        return {
          widget: 'numeric',
          prompt: `在一条数轴上，从表示 ${fmtSigned(start)} 的点出发，向${dir > 0 ? '右' : '左'}移动 ${steps} 个单位长度，到达的点表示的数是${BLANK}。`,
          answer: { type: 'number', value: ans },
          hint: '数轴上向右数越来越大，向左数越来越小。',
          steps: [
            step(`向${dir > 0 ? '右' : '左'}移动，数会变${dir > 0 ? '大' : '小'}。`),
            step(
              `从 ${fmtSigned(start)} 开始一格一格地数 ${steps} 格。`,
              `${fmtSigned(start)} ${dir > 0 ? '+' : '−'} ${steps} = ${fmtSigned(ans)}`,
            ),
          ],
          targetSeconds: 15,
          params: { form, n: [start, steps, dir] },
        };
      }
      case 'lower': {
        const start = level >= 5 ? -rng.int(1, 6) : rng.int(1, 8);
        const drop = level >= 5 ? rng.int(2, 9) : rng.int(start + 1, start + 9);
        const ans = start - drop;
        return {
          widget: 'numeric',
          prompt: `早上的气温是 ${fmtSigned(start)}℃，到了晚上下降了 ${drop}℃，晚上的气温是${BLANK}℃。`,
          answer: { type: 'number', value: ans },
          hint: '气温下降，就是在温度计上往下数。',
          steps: [
            step(`下降 ${drop}℃，就是在温度计上从 ${fmtSigned(start)} 往下数 ${drop} 格。`),
            step('列式计算：', `${fmtSigned(start)} − ${drop} = ${fmtSigned(ans)}`),
          ],
          targetSeconds: 15,
          params: { form, n: [start, drop] },
        };
      }
      default: {
        // diff
        const warmCity = rng.int(0, 1);
        const coldCity = rng.int(2, 4);
        const W = CITIES[warmCity];
        const C = CITIES[coldCity];
        const small = level <= 3;
        const warm = small ? rng.int(1, 9) : rng.int(W.lo, W.hi);
        const cold = small ? -rng.int(1, 9) : Math.min(-1, rng.int(C.lo, C.hi));
        const ans = warm - cold;
        return {
          widget: 'numeric',
          prompt: `同一天，${W.name}的最低气温是 ${fmtSigned(warm)}℃，${C.name}的最低气温是 ${fmtSigned(cold)}℃。${W.name}比${C.name}高${BLANK}℃。`,
          answer: { type: 'number', value: ans },
          hint: '在温度计上，从低的温度往上数到高的温度，要经过 0℃。',
          steps: [
            step(`从 ${fmtSigned(cold)}℃ 升到 0℃，升高了 ${-cold}℃。`),
            step(`从 0℃ 升到 ${warm}℃，又升高了 ${warm}℃。`),
            step('合起来：', `${-cold} + ${warm} = ${ans}（℃）`),
          ],
          targetSeconds: 20,
          params: { form, n: [warm, cold, warmCity, coldCity] },
        };
      }
    }
  },
  diagnose(p, r) {
    const tags: Diagnosis['tags'] = [];
    if (p.form === 'cmp' || p.form === 'cmp-temp') {
      if (r.type !== 'compare' || r.value === null) return { tags: [] };
      const [x, y] = p.n;
      // Compared the numbers after the minus sign (absolute values) — the classic flip.
      if (r.value === cmp(Math.abs(x), Math.abs(y)) || r.value === cmp(-x, -y))
        tags.push('negative-compare');
      return { tags };
    }
    const v = numOf(r);
    if (v === null) return { tags: [] };
    switch (p.form) {
      case 'write':
        if (v === -(p.n[1] ? p.n[0] : -p.n[0])) tags.push('negative-compare');
        break;
      case 'move': {
        const [s, k, dir] = p.n;
        if (v === s - dir * k || v === Math.abs(s + dir * k) || v === -(s + dir * k))
          tags.push('negative-compare');
        break;
      }
      case 'lower': {
        const [s, k] = p.n;
        if (v === s + k || v === Math.abs(s - k) || v === k - s) tags.push('negative-compare');
        break;
      }
      case 'diff': {
        const [w, c] = p.n;
        if (v === w + c || v === Math.abs(w + c)) tags.push('negative-compare');
        break;
      }
    }
    return { tags: tags.filter((t, i) => tags.indexOf(t) === i) };
  },
});
