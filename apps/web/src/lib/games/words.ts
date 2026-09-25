/**
 * 语文 / 英语 words of a unit for 看图题 / 排序 / 分类 / 判断 / 限时挑战, and
 * their 对 / 错 statements (「宽广」读作 kuān guǎng, cat — 猫).
 */
import type { KnowledgePoint } from '@xuexi/curriculum';
import { displayPinyin, type Rng } from '@xuexi/practice';
import { coreSpecs } from '../learning';
import type { GameContext, JudgeStatement } from './types';
import { DICTATION, EN_BANKS, unitWords } from './util';

export interface YwWord {
  w: string;
  py: string;
  kp: KnowledgePoint;
}

/** The unit's 词语听写表 words, each once, of knowledge points the papers cover. */
export function ywWords({ book, unit }: Pick<GameContext, 'book' | 'unit'>): YwWord[] {
  const seen = new Set<string>();
  return unitWords(book.id, unit).filter((x) => coreSpecs(x.kp).length > 0 && !seen.has(x.w) && !!seen.add(x.w));
}

export interface EnWordOf {
  en: string;
  zh: string;
  kp: KnowledgePoint;
}

/** The unit's English words, each once. */
export function enWords({ book, kpOf }: Pick<GameContext, 'book' | 'kpOf'>): EnWordOf[] {
  const seen = new Set<string>();
  const out: EnWordOf[] = [];
  for (const w of EN_BANKS[book.id]?.words ?? []) {
    const kp = kpOf(w.kp);
    if (!kp || coreSpecs(kp).length === 0 || seen.has(w.en)) continue;
    seen.add(w.en);
    out.push({ en: w.en, zh: w.zh, kp });
  }
  return out;
}

// ---------------------------------------------------------------- pinyin

/** 'guǎng' → 'guang', 'lǜ' → 'lv'. */
export const toneless = (syllable: string) =>
  syllable.normalize('NFD').replace(/[̀́̄̌]/g, '').normalize('NFC').replace('ü', 'v');

/** The 音序 of a word: the first letter of its first syllable, 'K' for 宽广. */
export const yinxu = (py: string) => toneless(py.split(' ')[0])[0].toUpperCase();

/** 平舌音 z c s / 翘舌音 zh ch sh r in any syllable. */
export function tongue(py: string): { flat: boolean; curled: boolean } {
  const syl = py.split(' ').map(toneless);
  return { curled: syl.some((s) => /^(zh|ch|sh|r)/.test(s)), flat: syl.some((s) => /^[zcs](?!h)/.test(s)) };
}

/** 前鼻音 -n / 后鼻音 -ng of every syllable. */
export function nasal(py: string): { front: boolean; back: boolean } {
  const syl = py.split(' ').map(toneless);
  return { back: syl.some((s) => s.endsWith('ng')), front: syl.some((s) => s.endsWith('n')) };
}

/** Word structure: AABB 隐隐约约, ABB 笑呵呵, ABAC 若隐若现, AA 星星. */
export function structure(w: string): 'AABB' | 'ABB' | 'ABAC' | 'AA' | null {
  const c = [...w];
  if (c.length === 4 && c[0] === c[1] && c[2] === c[3] && c[0] !== c[2]) return 'AABB';
  if (c.length === 4 && c[0] === c[2] && c[1] !== c[3] && c[0] !== c[1]) return 'ABAC';
  if (c.length === 3 && c[1] === c[2] && c[0] !== c[1]) return 'ABB';
  if (c.length === 2 && c[0] === c[1]) return 'AA';
  return null;
}

// ---------------------------------------------------------------- statements

/** Every syllable (without tone) in the 词语听写表 of both books: the syllables a misreading may use. */
const SYLLABLES = new Set(
  Object.values(DICTATION)
    .flatMap((lists) => Object.values(lists).flat())
    .flatMap((d) => d.py.split(' ').map(toneless)),
);

const TONE_MARKS = ['', '̄', '́', '̌', '̀'];

/** 1–4, or 0 for 轻声. */
export function toneOf(syllable: string): number {
  const nfd = syllable.normalize('NFD');
  const i = TONE_MARKS.findIndex((m, k) => k > 0 && nfd.includes(m));
  return i > 0 ? i : 0;
}

/** 'guang' + 3 → 'guǎng' (the mark on a / e, on o of ou, else on the last vowel). */
export function withTone(base: string, tone: number): string {
  const b = base.replace('v', 'ü');
  if (!tone) return b;
  const at = /a|e/.test(b) ? b.search(/a|e/) : b.includes('ou') ? b.indexOf('o') : Math.max(...['i', 'o', 'u', 'ü'].map((v) => b.lastIndexOf(v)));
  return (b.slice(0, at + 1) + TONE_MARKS[tone] + b.slice(at + 1)).normalize('NFC');
}

const SWAP_INITIAL: Array<[RegExp, (m: string) => string]> = [
  [/^(zh|ch|sh)/, (m) => m[0]],
  [/^[zcs](?!h)/, (m) => `${m}h`],
];

/**
 * Misreadings of a word the way children misread: 平翘舌 (zh ↔ z), 前后鼻音
 * (an ↔ ang) into a syllable that exists, or another tone (not on 一 / 不,
 * whose tone the book changes, and not on 轻声).
 */
export function misreadings(w: string, py: string): string[] {
  const chars = [...w];
  const syl = py.split(' ');
  const out = new Set<string>();
  syl.forEach((s, i) => {
    const base = toneless(s);
    const tone = toneOf(s);
    const swaps = [
      ...SWAP_INITIAL.filter(([re]) => re.test(base)).map(([re, f]) => base.replace(re, f)),
      base.endsWith('ng') ? base.slice(0, -1) : base.endsWith('n') ? `${base}g` : '',
    ].filter((b) => b && SYLLABLES.has(b));
    const readings = swaps.map((b) => withTone(b, tone));
    if (tone && !'一不'.includes(chars[i])) for (let t = 1; t <= 4; t++) if (t !== tone) readings.push(withTone(base, t));
    for (const r of readings) if (r !== s) out.add(syl.map((x, k) => (k === i ? r : x)).join(' '));
  });
  out.delete(py);
  return [...out];
}

const readText = (w: string, py: string) => `「${w}」读作 ${py}`;

/**
 * 「宽广」读作 kuān guǎng: one statement for each entry of `plan` (true: the
 * right pinyin; false: a misreading, 平翘舌 / 前后鼻音 more often than tones).
 */
export function chineseStatements(words: YwWord[], rng: Rng, plan: boolean[]): JudgeStatement[] {
  // 儿化 words are left out (their pinyin is written another way).
  const pool = words.filter((x) => !x.w.includes('儿'));
  if (pool.length < 4) return [];
  const out: JudgeStatement[] = [];
  const order = rng.shuffle(pool);
  for (let t = 0; out.length < plan.length && t < plan.length * 10; t++) {
    const x = order[t % order.length];
    const right = displayPinyin(x);
    let s: JudgeStatement;
    if (plan[out.length]) s = { text: readText(x.w, right), truth: true, word: x.w };
    else {
      const wrong = misreadings(x.w, x.py);
      if (!wrong.length) continue;
      // The first ones are the 平翘舌 / 前后鼻音 ones.
      const classic = wrong.filter((r) => r.split(' ').some((sy, i) => toneless(sy) !== toneless(x.py.split(' ')[i])));
      s = { text: readText(x.w, rng.pick(classic.length && rng.chance(0.6) ? classic : wrong)), truth: false, fix: readText(x.w, right), word: x.w };
    }
    if (out.length && out[out.length - 1].text === s.text) continue;
    out.push(s);
  }
  return out;
}

const meaningText = (en: string, zh: string) => `${en} — ${zh}`;

/** cat — 猫: one for each entry of `plan` (true: the right meaning; false: another word's). */
export function englishStatements(words: EnWordOf[], rng: Rng, plan: boolean[]): JudgeStatement[] {
  if (words.length < 4) return [];
  const out: JudgeStatement[] = [];
  const order = rng.shuffle(words);
  for (let t = 0; out.length < plan.length && t < plan.length * 10; t++) {
    const x = order[t % order.length];
    const other = rng.pick(words.filter((o) => o.zh !== x.zh));
    const s: JudgeStatement = plan[out.length]
      ? { text: meaningText(x.en, x.zh), truth: true }
      : { text: meaningText(x.en, other.zh), truth: false, fix: meaningText(x.en, x.zh) };
    if (out.length && out[out.length - 1].text === s.text) continue;
    out.push(s);
  }
  return out;
}
