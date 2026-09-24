import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { zipSync, type Zippable } from 'fflate';
import { bookFiles, BUNDLE_FORMAT, countWords, sha256Hex, type Book, type BookEntry, type BookManifest, type BundleIndex } from '@xuexi/course-pack';
import type { Paths } from '../paths';
import { bookDir, listBooks } from './store';

export interface BookExportOptions {
  ids?: string[];
  level?: string;
  out?: string;
  title?: string;
  /** Export books whose sentences have no narration yet (only 自己读 works then). */
  allowSilent?: boolean;
}

export interface BookExportResult {
  file: string;
  books: BookEntry[];
  bytes: number;
}

/**
 * A 绘本包 (.zip) for 家长模式 → 离线课程 → 选择课程包文件. Same bundle format as
 * course bundles, with the books under books/<id>/v1/.
 */
export async function exportBooks(paths: Paths, o: BookExportOptions): Promise<BookExportResult> {
  let books = listBooks(paths);
  if (o.ids?.length) books = books.filter((b) => o.ids!.includes(b.id));
  if (o.level) books = books.filter((b) => b.level === o.level);
  if (books.length === 0) throw new Error('没有符合条件的绘本（先 book import-…）');
  // Private books (the family's own subscriptions) never go through CI, whose
  // outputs end up in GitHub releases.
  const priv = books.filter((b) => b.private);
  if (priv.length && process.env.GITHUB_ACTIONS) {
    throw new Error(`拒绝在 GitHub Actions 里导出私有绘本：${priv.map((b) => b.id).join('、')}`);
  }
  const silent = books.filter((b) => b.pages.some((p) => p.sentences.some((s) => !s.audio)));
  if (silent.length && !o.allowSilent) {
    throw new Error(`这些绘本还没有配音：${silent.map((b) => b.id).join('、')}。先运行 book tts，或加 --allow-silent`);
  }

  const zip: Zippable = {};
  const entries: BookEntry[] = [];
  let bytes = 0;
  const builtAt = new Date().toISOString();
  for (const book of books) {
    const dir = bookDir(paths, book.id);
    const path = `books/${book.id}/v1/`;
    const files: BookManifest['files'] = {};
    const add = async (rel: string, data: Uint8Array) => {
      files[rel] = { bytes: data.byteLength, sha256: await sha256Hex(data) };
      zip[path + rel] = [data, { level: /\.json$/.test(rel) ? 6 : 0 }];
      bytes += data.byteLength;
    };
    await add('book.json', new TextEncoder().encode(JSON.stringify(book)));
    for (const rel of bookFiles(book)) await add(rel, new Uint8Array(readFileSync(join(dir, rel))));
    const manifest: BookManifest = { format: 'xuexi-book-pack@1', id: book.id, version: 1, builtAt, files };
    zip[path + 'manifest.json'] = [new TextEncoder().encode(JSON.stringify(manifest)), { level: 6 }];
    entries.push(entryOf(book, path, files, builtAt));
  }
  const index: BundleIndex = {
    format: BUNDLE_FORMAT,
    createdAt: builtAt,
    title: o.title ?? (o.level ? `绘本 ${o.level} 级` : '绘本'),
    lessons: [],
    books: entries,
  };
  zip['bundle.json'] = [new TextEncoder().encode(JSON.stringify(index, null, 2)), { level: 6 }];
  const file = o.out ?? join(paths.content, 'exports', `xuexi-books${o.level ? `-${o.level}` : ''}-${builtAt.slice(0, 10)}.zip`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, zipSync(zip));
  return { file, books: entries, bytes: statSync(file).size };
}

function entryOf(book: Book, path: string, files: BookManifest['files'], builtAt: string): BookEntry {
  return {
    id: book.id,
    title: book.title,
    level: book.level,
    path,
    pages: book.pages.length,
    words: countWords(book),
    totalBytes: Object.values(files).reduce((n, f) => n + f.bytes, 0),
    builtAt,
    private: book.private,
    source: `${book.source.name} · ${book.source.license}`,
  };
}
