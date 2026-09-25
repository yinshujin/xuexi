import { wordKey } from '@xuexi/course-pack';
import type { WordState } from './scoring';
import { kvGet, kvSet } from './db';
import { dayKey } from './format';

/**
 * 读不准的单词: words 跟读评分 marked as misread or missed go into the 错题本
 * and come back for pronunciation practice. A word is cleared once the child
 * reads it well on two different days (in practice, or in a later 跟读 of any
 * book); reading it wrong again starts the count over. Kept on this device,
 * like the recordings.
 */
export interface PronMiss {
  /** wordKey(): lower case, no punctuation. */
  key: string;
  /** As printed in the book (without punctuation around it). */
  word: string;
  bookId: string;
  bookTitle: string;
  /** The sentence the word was read in, for context. */
  sentence: string;
  /** Last time it was read wrong. */
  at: number;
  misses: number;
  /** Days (Asia/Shanghai) it was read well since the last miss. */
  passDays: string[];
}

export const CLEAR_AFTER_DAYS = 2;

const storeKey = (childId: string) => `pronMiss:${childId}`;

export async function loadPron(childId: string): Promise<PronMiss[]> {
  return (await kvGet<PronMiss[]>(storeKey(childId))) ?? [];
}

async function savePron(childId: string, list: PronMiss[]): Promise<void> {
  await kvSet(storeKey(childId), list);
}

/** One scored word of a reading. */
export interface ReadWord {
  token: string;
  state: WordState | undefined;
  sentence: string;
}

/** Printed token without the punctuation around it ("cat!" → "cat"). */
export const bareWord = (token: string) => token.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, '');

/** Single letters ("a", "I") are too short for the engine to judge fairly. */
const worthPractising = (key: string) => key.length >= 2;

/**
 * Fold one book's 跟读 result into the list: misread / missed words are added
 * (or counted again), words read well count as a good day for words already
 * on the list. Pure.
 */
export function mergeReading(
  list: PronMiss[],
  book: { id: string; title: string },
  words: ReadWord[],
  now = Date.now(),
): PronMiss[] {
  const out = new Map(list.map((m) => [m.key, { ...m, passDays: [...m.passDays] }]));
  const wrongNow = new Set<string>();
  for (const w of words) {
    const key = wordKey(w.token);
    if (!worthPractising(key) || !w.state || w.state === 'ok') continue;
    wrongNow.add(key);
    const had = out.get(key);
    out.set(key, {
      key,
      word: bareWord(w.token),
      bookId: book.id,
      bookTitle: book.title,
      sentence: w.sentence,
      at: now,
      misses: (had?.misses ?? 0) + 1,
      passDays: [],
    });
  }
  for (const w of words) {
    const key = wordKey(w.token);
    if (w.state === 'ok' && !wrongNow.has(key) && out.has(key)) addPassDay(out, key, now);
  }
  return [...out.values()].filter((m) => m.passDays.length < CLEAR_AFTER_DAYS);
}

function addPassDay(map: Map<string, PronMiss>, key: string, now: number) {
  const m = map.get(key)!;
  const day = dayKey(now);
  if (!m.passDays.includes(day)) m.passDays.push(day);
}

/** Result of practising one word: read well → a good day; wrong → count starts over. Pure. */
export function practiseWord(list: PronMiss[], key: string, good: boolean, now = Date.now()): PronMiss[] {
  const out = new Map(list.map((m) => [m.key, { ...m, passDays: [...m.passDays] }]));
  const m = out.get(key);
  if (!m) return list;
  if (good) addPassDay(out, key, now);
  else out.set(key, { ...m, at: now, misses: m.misses + 1, passDays: [] });
  return [...out.values()].filter((x) => x.passDays.length < CLEAR_AFTER_DAYS);
}

export async function saveReading(childId: string, book: { id: string; title: string }, words: ReadWord[]): Promise<PronMiss[]> {
  const next = mergeReading(await loadPron(childId), book, words);
  await savePron(childId, next);
  return next;
}

export async function savePractice(childId: string, key: string, good: boolean): Promise<PronMiss[]> {
  const next = practiseWord(await loadPron(childId), key, good);
  await savePron(childId, next);
  return next;
}

/** Oldest misses first, the most-missed ahead of the rest. */
export function practiceOrder(list: PronMiss[]): PronMiss[] {
  return [...list].sort((a, b) => b.misses - a.misses || a.at - b.at);
}
