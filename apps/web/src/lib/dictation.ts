import { displayPinyin, YW_G2A_WORDS, YW_G4A_WORDS, type DictWord, type DictationList } from '@xuexi/practice';

export { displayPinyin };
import { kvGet, kvSet } from './db';

/**
 * ✍️ 看拼音写词语 from the class's 词语听写表: the app shows the pinyin, the
 * child writes the word on paper, then checks it. Words written wrong come
 * back first next time until they are written right (kept on this device).
 */
const LISTS: Record<string, DictationList> = { 'yw-g2a': YW_G2A_WORDS, 'yw-g4a': YW_G4A_WORDS };

/** The required words of a knowledge point ("yw-g2a.u3.rainbow"). */
export function wordsOf(kpId: string): DictWord[] {
  const [book, ...rest] = kpId.split('.');
  return LISTS[book]?.[rest.join('.')] ?? [];
}

const missKey = (childId: string) => `dictMiss:${childId}`;

/** Words the child wrote wrong last time, by knowledge point. */
export async function missedWords(childId: string): Promise<Record<string, string[]>> {
  return (await kvGet<Record<string, string[]>>(missKey(childId))) ?? {};
}

export async function saveResults(childId: string, kpId: string, right: string[], wrong: string[]): Promise<void> {
  const all = await missedWords(childId);
  const keep = (all[kpId] ?? []).filter((w) => !right.includes(w));
  const next = [...new Set([...keep, ...wrong])];
  if (next.length) all[kpId] = next;
  else delete all[kpId];
  await kvSet(missKey(childId), all);
}

/** This round's order: last time's wrong words first, then the rest shuffled. */
export function roundOrder(words: DictWord[], missed: string[], rng: () => number = Math.random): DictWord[] {
  const shuffled = (xs: DictWord[]) => {
    const a = [...xs];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const first = words.filter((w) => missed.includes(w.w));
  return [...shuffled(first), ...shuffled(words.filter((w) => !missed.includes(w.w)))];
}
