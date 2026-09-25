import type { Unit } from '@xuexi/curriculum';
import { EN_G2A, EN_G4A, seedFrom, YW_G2A_WORDS, YW_G4A_WORDS, type DictWord, type EnglishBank, type Rng } from '@xuexi/practice';
import { coreSpecs, makeQuestion } from '../learning';

export const EN_BANKS: Record<string, EnglishBank> = { 'en-g2a': EN_G2A, 'en-g4a': EN_G4A };
export const DICTATION: Record<string, Record<string, DictWord[]>> = { 'yw-g2a': YW_G2A_WORDS, 'yw-g4a': YW_G4A_WORDS };

/** "yw-g2a.u1.tadpole" → "u1.tadpole" (the variant / bank key). */
export const variantOf = (kpId: string) => kpId.split('.').slice(1).join('.');

/** Shuffle until the order differs from the original (when it can). */
export function mixed<T>(rng: Rng, xs: T[], same: (a: T[]) => boolean): T[] {
  let out = rng.shuffle(xs);
  for (let i = 0; i < 6 && xs.length > 1 && same(out); i++) out = rng.shuffle(xs);
  return out;
}

/** Pick `n` items whose keys are all different on both sides. */
export function distinctPairs<T>(rng: Rng, items: T[], left: (t: T) => string, right: (t: T) => string, n: number): T[] {
  const out: T[] = [];
  const ls = new Set<string>();
  const rs = new Set<string>();
  for (const it of rng.shuffle(items)) {
    if (ls.has(left(it)) || rs.has(right(it))) continue;
    ls.add(left(it));
    rs.add(right(it));
    out.push(it);
    if (out.length === n) break;
  }
  return out;
}

/** 语文 unit: its 词语听写表 words, with the knowledge point each belongs to. */
export function unitWords(bookId: string, unit: Unit) {
  const lists = DICTATION[bookId];
  if (!lists) return [];
  return unit.knowledgePoints.flatMap((k) => (lists[variantOf(k.id)] ?? []).map((w) => ({ ...w, kp: k })));
}

/**
 * 数学 unit: short sums with number answers from its own question types
 * ("36 + 25" → 61), for games built on calculations.
 */
export function unitSums(unit: Unit, seed: string, perSpec = 12) {
  const found: Array<{ text: string; value: number; kp: Unit['knowledgePoints'][number] }> = [];
  for (const kp of unit.knowledgePoints) {
    for (const spec of coreSpecs(kp)) {
      for (let t = 0; t < perSpec; t++) {
        const q = makeQuestion({
          source: 'generator',
          generatorId: spec.generatorId,
          ...(spec.variant ? { variant: spec.variant } : {}),
          difficulty: spec.minDifficulty,
          seed: seedFrom(seed, kp.id, spec.generatorId, t),
        });
        const text = q.prompt.replace(/\s*=\s*[（(]\s*[)）]\s*$/, '').replace(/\s*=\s*\?$/, '').trim();
        if (q.answer.type !== 'number' || q.widget !== 'numeric' || text.length > 14 || /\n|（|\(/.test(text)) continue;
        if (!/[+\-×÷]/.test(text)) continue;
        found.push({ text, value: q.answer.value, kp });
      }
    }
  }
  return found;
}
