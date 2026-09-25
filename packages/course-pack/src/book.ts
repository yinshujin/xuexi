import type { PackFileInfo } from './types';

/**
 * Picture books for reading along (绘本跟读). A book keeps its original page
 * images; the text of each page is split into sentences, each with narration
 * audio and word timings (for highlighting and tap-a-word).
 *
 * Books imported from the family's own subscriptions (e.g. RAZ) are `private`:
 * they are prepared on the parent's computer and moved to the tablet as a file,
 * never published to the site, the GitHub releases or the app package.
 */
export const BOOK_FORMAT = 'xuexi-book@1' as const;

export interface BookWord {
  /** The word as printed (may include punctuation that follows it). */
  w: string;
  /** Milliseconds from the start of the sentence audio. */
  start: number;
  end: number;
}

export interface BookSentence {
  text: string;
  /**
   * "caption": not the book's own text but a short description of a
   * picture-only page (e.g. from the book's image descriptions), shown and
   * read as 看图说一说.
   */
  kind?: 'caption';
  /** Book-relative path, e.g. "audio/p03-s1.mp3". */
  audio?: string;
  words?: BookWord[];
}

export interface BookPage {
  /** Book-relative path of the original page image, e.g. "pages/03.jpg". */
  image: string;
  sentences: BookSentence[];
}

export interface BookQuizQuestion {
  question: string;
  options: string[];
  /** Index of the correct option. */
  answer: number;
  analysis?: string;
  /** Narration of the question and of each option (听题选答案). */
  audio?: string;
  optionAudio?: string[];
}

export interface Book {
  format: typeof BOOK_FORMAT;
  /** Filesystem-safe id, e.g. "bookdash-come-back-cat" or "raz-c-the-big-cat". */
  id: string;
  title: string;
  /** Reading level as the series names it: "A", "B", … (RAZ) or "1", "2" … */
  level: string;
  source: { name: string; url?: string; license: string; attribution?: string };
  private: boolean;
  cover?: string;
  pages: BookPage[];
  quiz?: BookQuizQuestion[];
  /**
   * Each word said on its own (tap a word to hear it), keyed by wordKey():
   * clearer than cutting the word out of the sentence.
   */
  wordAudio?: Record<string, string>;
}

/** Lowercase letters / digits / inner apostrophes: "Cat!"" → "cat", "It's" → "it's". */
export function wordKey(token: string): string {
  return token
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9']/g, '')
    .replace(/^'+|'+$/g, '');
}

/** manifest.json of a book pack: every file with its hash. */
export interface BookManifest {
  format: 'xuexi-book-pack@1';
  id: string;
  version: number;
  builtAt: string;
  files: Record<string, PackFileInfo>;
}

/** A book in a bundle / on the device. */
export interface BookEntry {
  id: string;
  title: string;
  level: string;
  /** Bundle-relative directory ending with "/": "books/<id>/v1/". */
  path: string;
  pages: number;
  words: number;
  totalBytes: number;
  builtAt: string;
  private: boolean;
  /** Short attribution shown on the shelf, e.g. "Book Dash · CC BY 4.0". */
  source: string;
  /** Set by the app for books imported on this device. */
  origin?: 'local' | 'builtin';
}

const SAFE_PATH = /^(pages|audio)\/[A-Za-z0-9._-]+$/;

export function assertBook(value: unknown): asserts value is Book {
  const b = value as Partial<Book> | null;
  if (!b || typeof b !== 'object') throw new Error('book.json 不是对象');
  if (b.format !== BOOK_FORMAT) throw new Error(`不支持的绘本格式: ${String(b.format)}`);
  if (typeof b.id !== 'string' || !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(b.id)) throw new Error('book.id 无效');
  if (typeof b.title !== 'string' || !b.title) throw new Error('book.title 缺失');
  if (typeof b.level !== 'string' || !b.level) throw new Error('book.level 缺失');
  if (!b.source || typeof b.source.name !== 'string' || typeof b.source.license !== 'string') throw new Error('book.source 缺失');
  if (typeof b.private !== 'boolean') throw new Error('book.private 缺失');
  if (!Array.isArray(b.pages) || b.pages.length === 0) throw new Error('book.pages 为空');
  if (b.cover !== undefined && !SAFE_PATH.test(b.cover)) throw new Error(`book.cover 路径无效: ${b.cover}`);
  b.pages.forEach((p, i) => {
    if (!p || typeof p.image !== 'string' || !SAFE_PATH.test(p.image)) throw new Error(`第 ${i + 1} 页图片路径无效`);
    if (!Array.isArray(p.sentences)) throw new Error(`第 ${i + 1} 页 sentences 缺失`);
    for (const s of p.sentences) {
      if (typeof s.text !== 'string' || !s.text.trim()) throw new Error(`第 ${i + 1} 页有空句子`);
      if (s.audio !== undefined && !SAFE_PATH.test(s.audio)) throw new Error(`第 ${i + 1} 页音频路径无效: ${s.audio}`);
      for (const w of s.words ?? []) {
        if (typeof w.w !== 'string' || !(w.end >= w.start && w.start >= 0)) throw new Error(`第 ${i + 1} 页逐词时间无效`);
      }
    }
  });
  for (const q of b.quiz ?? []) {
    if (!q.question || !Array.isArray(q.options) || q.options.length < 2) throw new Error('小测题目无效');
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) throw new Error(`小测答案序号无效：${q.question}`);
    if (q.audio !== undefined && !SAFE_PATH.test(q.audio)) throw new Error(`小测音频路径无效: ${q.audio}`);
    if (q.optionAudio !== undefined) {
      if (!Array.isArray(q.optionAudio) || q.optionAudio.length !== q.options.length) throw new Error(`小测选项音频数量不对：${q.question}`);
      for (const a of q.optionAudio) if (!SAFE_PATH.test(a)) throw new Error(`小测音频路径无效: ${a}`);
    }
  }
  if (b.wordAudio !== undefined) {
    if (typeof b.wordAudio !== 'object' || b.wordAudio === null) throw new Error('wordAudio 无效');
    for (const a of Object.values(b.wordAudio)) if (typeof a !== 'string' || !SAFE_PATH.test(a)) throw new Error(`单词音频路径无效: ${a}`);
  }
}

/** Every file a book refers to (images and audio). */
export function bookFiles(b: Book): string[] {
  const out = new Set<string>();
  if (b.cover) out.add(b.cover);
  for (const p of b.pages) {
    out.add(p.image);
    for (const s of p.sentences) if (s.audio) out.add(s.audio);
  }
  for (const q of b.quiz ?? []) {
    if (q.audio) out.add(q.audio);
    for (const a of q.optionAudio ?? []) out.add(a);
  }
  for (const a of Object.values(b.wordAudio ?? {})) out.add(a);
  return [...out];
}

export function countWords(b: Book): number {
  return b.pages.reduce(
    (n, p) =>
      n + p.sentences.reduce((m, s) => m + (s.kind === 'caption' ? 0 : (s.text.match(/[A-Za-z0-9']+/g)?.length ?? 0)), 0),
    0,
  );
}
