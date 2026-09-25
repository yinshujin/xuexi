import type { Unit } from '@xuexi/curriculum';
import {
  EN_G2A,
  EN_G4A,
  seedFrom,
  XZ_G2A_GAMES,
  XZ_G4A_GAMES,
  YW_G2A_WORDS,
  YW_G4A_WORDS,
  type DictWord,
  type EnglishBank,
  type Rng,
  type WritingGames,
} from '@xuexi/practice';
import { coreSpecs, makeQuestion } from '../learning';

export const EN_BANKS: Record<string, EnglishBank> = { 'en-g2a': EN_G2A, 'en-g4a': EN_G4A };
export const DICTATION: Record<string, Record<string, DictWord[]>> = { 'yw-g2a': YW_G2A_WORDS, 'yw-g4a': YW_G4A_WORDS };
/** 写作 books: 拼一拼 sentences, 连连看 pairs and 排序 passages (see WritingGames). */
export const XZ_GAMES: Record<string, WritingGames> = { 'xz-g2a': XZ_G2A_GAMES, 'xz-g4a': XZ_G4A_GAMES };

/**
 * 写作: the game material of a unit (knowledge points the papers cover), one
 * entry per paper in turn so papers A, B and C differ when the unit has several.
 */
export function writingPick<T extends { kp: string }>(
  list: T[] | undefined,
  kpOf: (variant: string) => Unit['knowledgePoints'][number] | undefined,
  paper: number,
): { item: T; kp: Unit['knowledgePoints'][number] } | null {
  const mine = (list ?? []).flatMap((item) => {
    const kp = kpOf(item.kp);
    return kp && coreSpecs(kp).length > 0 ? [{ item, kp }] : [];
  });
  return mine.length ? mine[paper % mine.length] : null;
}

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
