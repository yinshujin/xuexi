import type { GeneratorId } from '@xuexi/shared';
import type { Rng } from '../rng';
import type { DictationList, DictWord } from '../banks/types';
import { BLANK, buildChoice, choiceDiagnosis, defineGenerator, step, type PracticeGenerator } from './base';

/**
 * 看拼音选词语 from the class's 词语听写表: the pinyin of a required word, the
 * right characters, and 2–3 versions with one character swapped for a
 * homophone taken from the same book's words (the typical 同音字 mistake).
 *
 * Prompt format (the verifier re-derives the answer from it):
 *   【看拼音写词语】sì hǎi wéi jiā（　）
 */
export interface DictationParams {
  word: string;
  optionTags: Array<'similar-char' | null>;
}

/**
 * Pinyin as the textbook prints it: the data keeps one syllable per character,
 * so 儿化 is stored as a separate "er" (哪儿 "nǎ er") and shown merged ("nǎr").
 */
export function displayPinyin(d: DictWord): string {
  const chars = [...d.w];
  const out: string[] = [];
  d.py.split(' ').forEach((sy, i) => {
    if (i > 0 && chars[i] === '儿' && sy === 'er' && out.length) out[out.length - 1] += 'r';
    else out.push(sy);
  });
  return out.join(' ');
}

const toneless = (syllable: string) => syllable.normalize('NFD').replace(/[̀-ͯ]/g, '').replace('ü', 'v');

/** Every (character, syllable) of the book, to find homophones. */
function charPool(list: DictationList): Map<string, string[]> {
  const bySound = new Map<string, Set<string>>();
  for (const words of Object.values(list)) {
    for (const d of words) {
      const sy = d.py.split(' ');
      [...d.w].forEach((ch, i) => {
        const k = toneless(sy[i] ?? '');
        if (!k) return;
        if (!bySound.has(k)) bySound.set(k, new Set());
        bySound.get(k)!.add(ch);
      });
    }
  }
  return new Map([...bySound].map(([k, v]) => [k, [...v]]));
}

/** Wrong versions of `d`: one character replaced by a homophone that makes no real word of the list. */
export function misspellings(d: DictWord, pool: Map<string, string[]>, real: Set<string>): string[] {
  const out = new Set<string>();
  const chars = [...d.w];
  const sy = d.py.split(' ');
  chars.forEach((ch, i) => {
    for (const alt of pool.get(toneless(sy[i] ?? '')) ?? []) {
      if (alt === ch) continue;
      const w = chars.map((c, j) => (j === i ? alt : c)).join('');
      if (!real.has(w)) out.add(w);
    }
  });
  return [...out];
}

/**
 * The wrong versions of a list's words, as the 看拼音选词语 questions offer
 * them (one character swapped for a homophone of the same book, never a real
 * word of the list or of `alsoReal`); for the 单元闯关 听音选择.
 */
export function soundAlikeWrongs(list: DictationList, alsoReal: readonly string[] = []): (d: DictWord) => string[] {
  const pool = charPool(list);
  const real = new Set([...Object.values(list).flatMap((ws) => ws.map((d) => d.w)), ...alsoReal]);
  return (d) => misspellings(d, pool, real);
}

/**
 * `alsoReal`: correct words outside the list that a homophone swap would produce
 * with the same pinyin (是的 for 似的, 当做 for 当作); they are never offered as wrong options.
 */
export function dictationGenerator(
  id: GeneratorId,
  list: DictationList,
  alsoReal: readonly string[] = [],
): PracticeGenerator<DictationParams> {
  const kps = Object.keys(list).filter((k) => list[k].length > 0);
  if (kps.length === 0) throw new Error(`${id}: empty word list`);
  const pool = charPool(list);
  const real = new Set([...Object.values(list).flatMap((ws) => ws.map((d) => d.w)), ...alsoReal]);
  // Only words that have at least two homophone misspellings become questions.
  const usable = (kp: string) =>
    list[kp].map((d) => ({ d, wrong: misspellings(d, pool, real) })).filter((x) => x.wrong.length >= 2);
  const byKp = new Map(kps.map((k) => [k, usable(k)]));
  return defineGenerator<DictationParams>({
    id,
    variants: ['mixed', ...kps],
    targets: ['similar-char'],
    build({ variant, rng }: { variant: string; rng: Rng }) {
      const pool = variant === 'mixed' ? [...byKp.values()].flat() : (byKp.get(variant) ?? []);
      const { d, wrong } = rng.pick(pool.length ? pool : [...byKp.values()].flat());
      const c = buildChoice(
        rng,
        d.w,
        rng.shuffle(wrong).slice(0, 3).map((text) => ({ text, tag: 'similar-char' as const })),
      );
      return {
        widget: 'choice',
        prompt: `【看拼音写词语】${displayPinyin(d)}${BLANK}`,
        options: c.options,
        answer: { type: 'choice', index: c.index },
        hint: '先拼一拼，再想想每个字的意思，同音字别选错。',
        steps: [step(`${displayPinyin(d)} 写作「${d.w}」。`), step('其他选项里有同音字写错了。')],
        targetSeconds: 15,
        params: { word: d.w, optionTags: c.optionTags as Array<'similar-char' | null> },
      };
    },
    diagnose(p, r) {
      return choiceDiagnosis(p.optionTags, r);
    },
  });
}

/** Words of a list with their homophone misspellings (for the 看拼音写词语 page and tests). */
export function dictationWords(list: DictationList, kp: string): DictWord[] {
  return list[kp] ?? [];
}
