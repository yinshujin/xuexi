/**
 * 数学 material for 看图题 / 排序 / 分类 / 判断 / 限时挑战, from a unit's own
 * content: its sums (unitSums), 米和厘米 (测量), 几个几 (认识乘法), 大数
 * (认识更大的数) and 运算律. Every statement is checked by evalMath, which
 * reads the statement text on its own.
 */
import type { KnowledgePoint, Unit } from '@xuexi/curriculum';
import type { Rng } from '@xuexi/practice';
import { coreSpecs } from '../learning';
import type { JudgeStatement } from './types';
import { unitSums } from './util';

// ---------------------------------------------------------------- evalMath

const UNITS: Record<string, number> = { 亿: 100_000_000, 万: 10_000, 厘米: 1, 米: 100 };

/**
 * The value of an expression such as 「25 × (40 + 4)」, 「350万」 or
 * 「1 米 20 厘米」, or the truth of a statement 「7 × 8 = 54」, 「120 厘米 > 1 米」.
 * Throws on anything else.
 */
export function evalMath(text: string): number | boolean {
  const toks = text.match(/\d+|亿|万|厘米|米|[-+−×÷()=<>]/g) ?? [];
  if (toks.join('') !== text.replace(/\s+/g, '')) throw new Error(`evalMath: cannot read ${text}`);
  let i = 0;
  const peek = () => toks[i];
  const quantity = (): number => {
    let total = 0;
    // 「1 米 20 厘米」: quantities side by side add up.
    while (/^\d+$/.test(peek() ?? '')) {
      let n = Number(toks[i++]);
      if (peek() && peek() in UNITS) n *= UNITS[toks[i++]];
      total += n;
    }
    return total;
  };
  const factor = (): number => {
    if (peek() === '(') {
      i++;
      const v = expr();
      if (toks[i++] !== ')') throw new Error(`evalMath: ) missing in ${text}`);
      return v;
    }
    if (!/^\d+$/.test(peek() ?? '')) throw new Error(`evalMath: number expected in ${text}`);
    return quantity();
  };
  const term = (): number => {
    let v = factor();
    while (peek() === '×' || peek() === '÷') v = toks[i++] === '×' ? v * factor() : v / factor();
    return v;
  };
  const expr = (): number => {
    let v = term();
    while (peek() === '+' || peek() === '-' || peek() === '−') v = toks[i++] === '+' ? v + term() : v - term();
    return v;
  };
  const left = expr();
  if (i === toks.length) return left;
  const op = toks[i++];
  const right = expr();
  if (i !== toks.length) throw new Error(`evalMath: trailing input in ${text}`);
  const eq = Math.abs(left - right) < 1e-9;
  if (op === '=') return eq;
  if (op === '<') return left < right && !eq;
  if (op === '>') return left > right && !eq;
  throw new Error(`evalMath: bad operator in ${text}`);
}

export const valueOf = (text: string) => evalMath(text) as number;

// ---------------------------------------------------------------- the unit's math

const hasGen = (kp: KnowledgePoint, id: string) => coreSpecs(kp).some((s) => s.generatorId === id);

/** The first knowledge point of the unit that practises with this generator. */
export function kpWith(unit: Unit, ...ids: string[]): KnowledgePoint | undefined {
  for (const id of ids) {
    const kp = unit.knowledgePoints.find((k) => hasGen(k, id));
    if (kp) return kp;
  }
  return undefined;
}

export interface Sum {
  text: string;
  value: number;
  kp: KnowledgePoint;
}

const sumsMemo = new Map<string, Sum[]>();

/** The unit's sums, one per text (fixed, the same on every paper). */
export function unitSumPool(unit: Unit): Sum[] {
  let hit = sumsMemo.get(unit.id);
  if (!hit) {
    const seen = new Set<string>();
    hit = unitSums(unit, `games-pool|${unit.id}`, 16).filter((s) => !seen.has(s.text) && !!seen.add(s.text));
    sumsMemo.set(unit.id, hit);
  }
  return hit;
}

/** What math the unit is about, for the games (null: nothing the games can use). */
export type MathTopic = 'sums' | 'length' | 'mul-meaning' | 'bignum' | 'laws';

export function mathTopic(unit: Unit): MathTopic | null {
  if (unitSumPool(unit).length >= 6) return 'sums';
  if (kpWith(unit, 'g2.unit.length')) return 'length';
  if (kpWith(unit, 'g2.mul.meaning')) return 'mul-meaning';
  if (kpWith(unit, 'g4.bignum.compare')) return 'bignum';
  if (kpWith(unit, 'g4.law.simplify')) return 'laws';
  return null;
}

/** The knowledge point a topic's games are about. */
export function topicKp(unit: Unit, topic: MathTopic): KnowledgePoint | undefined {
  switch (topic) {
    case 'sums':
      return unitSumPool(unit)[0]?.kp;
    case 'length':
      return kpWith(unit, 'g2.unit.length');
    case 'mul-meaning':
      return kpWith(unit, 'g2.mul.meaning');
    case 'bignum':
      return kpWith(unit, 'g4.bignum.compare');
    case 'laws':
      return kpWith(unit, 'g4.law.simplify');
  }
}

// ---------------------------------------------------------------- numbers to compare

/** A number with `len` digits, some of them 0. */
function digits(rng: Rng, len: number): string {
  let s = String(rng.int(1, 9));
  for (let i = 1; i < len; i++) s += rng.chance(0.3) ? '0' : String(rng.int(0, 9));
  return s;
}

/** `n` different big numbers that are close: same length, most share the first digits. */
export function bigNumbers(rng: Rng, n: number): number[] {
  const len = rng.int(6, 8);
  const base = digits(rng, len);
  const out = new Set<number>();
  for (let t = 0; out.size < n && t < 200; t++) {
    const d = [...base];
    // Change one or two digits, not always the first one.
    const at = rng.int(t % 3 === 0 ? 0 : 1, len - 1);
    d[at] = String(at === 0 ? rng.int(1, 9) : rng.int(0, 9));
    if (rng.chance(0.4)) d[len - 1 - rng.int(0, 2)] = String(rng.int(0, 9));
    out.add(Number(d.join('')));
  }
  return rng.shuffle([...out]);
}

/** A length as the book writes it: 「98 厘米」, 「2 米」, 「1 米 20 厘米」. */
export function lengthText(cm: number, style: 'cm' | 'mixed'): string {
  const m = Math.floor(cm / 100);
  const c = cm % 100;
  if (style === 'cm' || m === 0) return `${cm} 厘米`;
  return c ? `${m} 米 ${c} 厘米` : `${m} 米`;
}

/** `n` different lengths around 1 or 2 米, written in both ways. */
export function lengths(rng: Rng, n: number): string[] {
  const values = new Set<number>();
  for (let t = 0; values.size < n && t < 200; t++) {
    const v = rng.pick([rng.int(80, 99), rng.int(101, 130), rng.int(1, 2) * 100, rng.int(150, 220), rng.int(1, 2) * 100 + rng.int(1, 9)]);
    values.add(v);
  }
  return [...values].map((v) => lengthText(v, rng.chance(0.5) ? 'cm' : 'mixed'));
}

// ---------------------------------------------------------------- 对 / 错 statements

type Draft = { text: string; fix?: string };

/** Another value for a sum, from the mistakes children make (进位 / 口诀 / 数零). */
function wrongValue(rng: Rng, s: Sum): number | null {
  const v = s.value;
  const nums = (s.text.match(/\d+/g) ?? []).map(Number);
  let c: number[];
  if (s.text.includes('×') && v >= 100 && v % 10 === 0) c = [v * 10, v / 10];
  else if (s.text.includes('×')) c = [v + nums[0], v - nums[0], v + nums[1], v - nums[1], v + 1, v - 1];
  else if (s.text.includes('÷')) c = [v + 1, v - 1, v + 2];
  else c = [v + 10, v - 10, v + 1, v - 1];
  const ok = c.filter((w) => Number.isInteger(w) && w >= 0 && w !== v);
  return ok.length ? rng.pick(ok) : null;
}

function sumStatement(rng: Rng, s: Sum, truth: boolean): Draft {
  const w = truth ? null : wrongValue(rng, s);
  return w === null ? { text: `${s.text} = ${s.value}` } : { text: `${s.text} = ${w}`, fix: `${s.text} = ${s.value}` };
}

function lengthStatement(rng: Rng, truth: boolean): Draft {
  const form = rng.int(0, 2);
  if (form === 0) {
    const m = rng.int(1, 9);
    return truth ? { text: `${m} 米 = ${m * 100} 厘米` } : { text: `${m} 米 = ${m * 10} 厘米`, fix: `${m} 米 = ${m * 100} 厘米` };
  }
  if (form === 1) {
    const m = rng.int(1, 3);
    const c = rng.int(1, 9);
    const right = `${m} 米 ${c} 厘米 = ${m * 100 + c} 厘米`;
    // 「1 米 5 厘米 = 15 厘米」: the numbers just written side by side.
    return truth ? { text: right } : { text: `${m} 米 ${c} 厘米 = ${m * 10 + c} 厘米`, fix: right };
  }
  const cm = rng.pick([rng.int(80, 99), rng.int(101, 130)]);
  const right = `${cm} 厘米 ${cm > 100 ? '>' : '<'} 1 米`;
  return truth ? { text: right } : { text: `${cm} 厘米 ${cm > 100 ? '<' : '>'} 1 米`, fix: right };
}

function meaningStatement(rng: Rng, truth: boolean): Draft {
  const a = rng.int(2, 5);
  const b = rng.int(2, 5);
  const adds = Array.from({ length: a }, () => String(b)).join(' + ');
  const right = `${adds} = ${a} × ${b}`;
  if (truth) return rng.chance(0.5) ? { text: right } : { text: `${adds} = ${b} × ${a}` };
  // 「3 + 3 + 3 + 3 = 3 × 3」 or 「= 4 + 3」: 几个几 counted wrong.
  const wrong = [`${adds} = ${a + 1} × ${b}`, `${adds} = ${a - 1} × ${b}`, `${adds} = ${a} + ${b}`].filter((t) => evalMath(t) === false);
  return { text: rng.pick(wrong), fix: right };
}

function bignumStatement(rng: Rng, truth: boolean): Draft {
  if (rng.chance(0.35)) {
    const k = rng.int(2, 99) * 10 + rng.int(0, 9);
    const right = `${k}万 = ${k * 10_000}`;
    return truth ? { text: right } : { text: `${k}万 = ${k * 1000}`, fix: right };
  }
  const [x, y] = bigNumbers(rng, 2);
  const right = `${x} ${x > y ? '>' : '<'} ${y}`;
  return truth ? { text: right } : { text: `${x} ${x > y ? '<' : '>'} ${y}`, fix: right };
}

function lawStatement(rng: Rng, truth: boolean): Draft {
  const form = rng.int(0, 3);
  if (form === 0) {
    const a = rng.pick([25, 12, 15, 35, 45]);
    const b = rng.pick([40, 20, 30, 10]);
    const c = rng.int(2, 9);
    const right = `${a} × (${b} + ${c}) = ${a} × ${b} + ${a} × ${c}`;
    // The classic slip: 「25 × (40 + 4) = 25 × 40 + 4」.
    return truth ? { text: right } : { text: `${a} × (${b} + ${c}) = ${a} × ${b} + ${c}`, fix: right };
  }
  if (form === 1) {
    const a = rng.int(3, 9) * 100 + rng.int(10, 99);
    const b = rng.int(20, 99);
    const c = rng.int(2, 19);
    const right = `${a} − ${b} − ${c} = ${a} − (${b} + ${c})`;
    return truth ? { text: right } : { text: `${a} − ${b} − ${c} = ${a} − (${b} − ${c})`, fix: right };
  }
  if (form === 2) {
    const [p, q] = rng.pick([
      [25, 4],
      [125, 8],
    ]);
    const n = rng.int(2, 9);
    const right = `${p} × ${n} × ${q} = ${p * q * n}`;
    return truth ? { text: right } : { text: `${p} × ${n} × ${q} = ${(p * q * n) / 10}`, fix: right };
  }
  const a = rng.int(12, 99);
  let b = rng.int(12, 99);
  if (b === a) b++;
  return truth
    ? { text: rng.chance(0.5) ? `${a} × ${b} = ${b} × ${a}` : `${a} + ${b} = ${b} + ${a}` }
    : { text: `${Math.max(a, b)} − ${Math.min(a, b)} = ${Math.min(a, b)} − ${Math.max(a, b)}`, fix: `${Math.max(a, b)} − ${Math.min(a, b)} = ${Math.max(a, b) - Math.min(a, b)}` };
}

/**
 * 对 / 错 statements about the unit's math, one for each entry of `plan`
 * (true: a right one), never the same one twice in a row. Empty when the unit
 * has no such math.
 */
export function mathStatements(unit: Unit, rng: Rng, plan: boolean[]): JudgeStatement[] {
  const topic = mathTopic(unit);
  if (!topic) return [];
  const pool = topic === 'sums' ? rng.shuffle(unitSumPool(unit)) : [];
  const out: JudgeStatement[] = [];
  for (let t = 0; out.length < plan.length && t < plan.length * 20; t++) {
    const want = plan[out.length];
    const d =
      topic === 'sums'
        ? sumStatement(rng, pool[t % pool.length], want)
        : topic === 'length'
          ? lengthStatement(rng, want)
          : topic === 'mul-meaning'
            ? meaningStatement(rng, want)
            : topic === 'bignum'
              ? bignumStatement(rng, want)
              : lawStatement(rng, want);
    const truth = evalMath(d.text) as boolean;
    if (truth !== want || (out.length && out[out.length - 1].text === d.text)) continue;
    if (!truth && (!d.fix || evalMath(d.fix) !== true)) continue;
    out.push({ text: d.text, truth, ...(truth ? {} : { fix: d.fix }) });
  }
  return out;
}
