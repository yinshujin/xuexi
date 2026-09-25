/**
 * Stroke data for 写汉字 (hanzi-writer): one JSON file per character in the
 * app's own `hanzi/` folder, copied at build time from hanzi-writer-data for
 * the characters of the 语文 词语听写表 (scripts/hanzi-data.ts). Files are named
 * by code point ("5e7f.json" for 广) so every server and file system serves them.
 */
import type { CharacterJson } from 'hanzi-writer';

export const HANZI_DIR = 'hanzi';

/** "广" → "5e7f.json". */
export const hanziFile = (ch: string) => `${ch.codePointAt(0)!.toString(16)}.json`;

/** A character counts as written right with at most this many wrong strokes. */
export const WRITE_SLIPS = 2;

/** Contents of hanzi/index.json. */
export interface HanziIndex {
  source: string;
  /** Every character with a file, as one string. */
  chars: string;
}

let index: Promise<Set<string> | null> | null = null;

/** The characters this build has stroke data for (null when the folder is missing). */
export function hanziChars(): Promise<Set<string> | null> {
  index ??= fetch(`./${HANZI_DIR}/index.json`)
    .then((r) => (r.ok ? (r.json() as Promise<HanziIndex>) : null))
    .then((j) => (j && typeof j.chars === 'string' && j.chars.length ? new Set([...j.chars]) : null))
    .catch(() => null)
    .then((s) => {
      if (!s) index = null; // try again next time (e.g. offline on the web)
      return s;
    });
  return index;
}

export async function hanziAvailable(): Promise<boolean> {
  return !!(await hanziChars());
}

const loaded = new Map<string, Promise<CharacterJson>>();

/** One character's stroke data (for hanzi-writer's charDataLoader). */
export function loadHanzi(ch: string): Promise<CharacterJson> {
  let p = loaded.get(ch);
  if (!p) {
    p = fetch(`./${HANZI_DIR}/${hanziFile(ch)}`).then((r) => {
      if (!r.ok) throw new Error(`没有「${ch}」的笔顺数据`);
      return r.json() as Promise<CharacterJson>;
    });
    p.catch(() => loaded.delete(ch));
    loaded.set(ch, p);
  }
  return p;
}
