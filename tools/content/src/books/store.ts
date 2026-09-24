import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertBook, type Book } from '@xuexi/course-pack';
import type { Paths } from '../paths';

/**
 * Picture books being prepared live in content/books/<id>/ (book.json,
 * pages/, audio/). The folder is git-ignored: books from the family's own
 * subscriptions must never be committed or published.
 */
export function booksDir(paths: Paths): string {
  return join(paths.content, 'books');
}

export function bookDir(paths: Paths, id: string): string {
  return join(booksDir(paths), id);
}

export function loadBook(paths: Paths, id: string): Book {
  const file = join(bookDir(paths, id), 'book.json');
  if (!existsSync(file)) throw new Error(`找不到绘本 ${id}（${file}）`);
  const book = JSON.parse(readFileSync(file, 'utf8'));
  assertBook(book);
  return book;
}

export function saveBook(paths: Paths, book: Book): void {
  assertBook(book);
  const dir = bookDir(paths, book.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'book.json'), JSON.stringify(book, null, 2) + '\n');
}

export function listBooks(paths: Paths): Book[] {
  const dir = booksDir(paths);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((id) => existsSync(join(dir, id, 'book.json')))
    .sort()
    .map((id) => loadBook(paths, id));
}

/** "The Big Cat" → "the-big-cat" */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
