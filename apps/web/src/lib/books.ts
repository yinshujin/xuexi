import { assertBook, bookFiles, type Book, type BookEntry, type BundleBook } from '@xuexi/course-pack';
import { db, kvGet, kvSet, type RecordingRow } from './db';

/**
 * Picture books (绘本跟读) imported from bundle files. Like imported lessons,
 * their files live in Cache Storage under a synthetic origin and are listed in
 * a local catalog; nothing is fetched from the network.
 */
const BOOK_CACHE = 'xuexi-books-v1';
const BOOK_BASE = 'https://xuexi.local/';
const LOCAL_BOOKS_KEY = 'localBooks';

type BookCatalog = Record<string, BookEntry>;

async function cacheOpen(): Promise<Cache | null> {
  try {
    return 'caches' in globalThis ? await caches.open(BOOK_CACHE) : null;
  } catch {
    return null;
  }
}

const MIME: Record<string, string> = {
  json: 'application/json',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aiff: 'audio/aiff',
  wav: 'audio/wav',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Books shipped inside the installed app (dist/builtin/books.json, written by `pnpm content builtin`). */
const builtinBase = () => new URL('builtin/', document.baseURI).toString();
let builtinList: Promise<BookEntry[]> | null = null;

function loadBuiltin(): Promise<BookEntry[]> {
  builtinList ??= (async () => {
    try {
      const res = await fetch(builtinBase() + 'books.json', { cache: 'no-store' });
      if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return [];
      const list = (await res.json()) as BookEntry[];
      return Array.isArray(list) ? list.map((e) => ({ ...e, origin: 'builtin' as const })) : [];
    } catch {
      return [];
    }
  })();
  return builtinList;
}

const urlOf = (entry: BookEntry, rel: string) =>
  new URL(entry.path + rel, entry.origin === 'builtin' ? builtinBase() : BOOK_BASE).toString();

/** Imported books and the ones built into the app; an imported copy wins. */
export async function listBooks(): Promise<BookEntry[]> {
  const [builtin, local] = await Promise.all([loadBuiltin(), kvGet<BookCatalog>(LOCAL_BOOKS_KEY)]);
  const all = new Map<string, BookEntry>(builtin.map((b) => [b.id, b]));
  for (const b of Object.values(local ?? {})) all.set(b.id, b);
  return [...all.values()].sort((a, b) => a.level.localeCompare(b.level, 'en', { numeric: true }) || a.title.localeCompare(b.title));
}

/** Fetch one of a book's files: Cache Storage for imported books, the app bundle for built-in ones. */
async function fetchFile(entry: BookEntry, rel: string): Promise<Response | undefined> {
  if (entry.origin === 'builtin') {
    try {
      const res = await fetch(urlOf(entry, rel));
      return res.ok ? res : undefined;
    } catch {
      return undefined;
    }
  }
  return (await cacheOpen())?.match(urlOf(entry, rel));
}

/** Store the verified books of a bundle. Returns the entries now on the device. */
export async function storeBooks(books: BundleBook[]): Promise<BookEntry[]> {
  if (books.length === 0) return [];
  const cache = await cacheOpen();
  if (!cache) throw new Error('此设备不支持离线缓存');
  const local = (await kvGet<BookCatalog>(LOCAL_BOOKS_KEY)) ?? {};
  const out: BookEntry[] = [];
  for (const b of books) {
    const entry: BookEntry = { ...b.entry, origin: 'local' };
    const prev = local[entry.id];
    if (prev) await removeFiles(prev);
    for (const [rel, data] of Object.entries(b.files)) {
      const ext = rel.split('.').pop()?.toLowerCase() ?? '';
      await cache.put(
        urlOf(entry, rel),
        new Response(data as Uint8Array<ArrayBuffer>, { headers: { 'content-type': MIME[ext] ?? 'application/octet-stream' } }),
      );
    }
    local[entry.id] = entry;
    out.push(entry);
  }
  await kvSet(LOCAL_BOOKS_KEY, local);
  return out;
}

async function removeFiles(entry: BookEntry): Promise<void> {
  const cache = await cacheOpen();
  if (!cache) return;
  const prefix = urlOf(entry, '');
  for (const req of await cache.keys()) if (req.url.startsWith(prefix)) await cache.delete(req);
}

export async function removeBook(entry: BookEntry): Promise<void> {
  if (entry.origin === 'builtin') throw new Error('App 自带的绘本不能删除');
  await removeFiles(entry);
  const local = (await kvGet<BookCatalog>(LOCAL_BOOKS_KEY)) ?? {};
  delete local[entry.id];
  await kvSet(LOCAL_BOOKS_KEY, local);
  await db.recordings.where('bookId').equals(entry.id).delete();
}

export interface OpenedBook {
  entry: BookEntry;
  book: Book;
  /** Book-relative path → blob: URL. */
  url: (rel: string | undefined) => string | undefined;
  release: () => void;
}

export async function openBook(id: string): Promise<OpenedBook> {
  const entry = (await listBooks()).find((b) => b.id === id);
  if (!entry) throw new Error('这本绘本不在这台设备上，请在家长模式里导入');
  const res = await fetchFile(entry, 'book.json');
  if (!res) throw new Error('绘本文件丢失，请重新导入');
  const book = await res.json();
  assertBook(book);
  const urls = new Map<string, string>();
  if (entry.origin === 'builtin') {
    // Served from the app itself: no copies needed.
    for (const rel of bookFiles(book)) urls.set(rel, urlOf(entry, rel));
    return { entry, book, url: (rel) => (rel ? urls.get(rel) : undefined), release: () => {} };
  }
  const cache = await cacheOpen();
  for (const rel of bookFiles(book)) {
    const hit = await cache?.match(urlOf(entry, rel));
    if (hit) urls.set(rel, URL.createObjectURL(await hit.blob()));
  }
  return {
    entry,
    book,
    url: (rel) => (rel ? urls.get(rel) : undefined),
    release: () => urls.forEach((u) => URL.revokeObjectURL(u)),
  };
}

/** Cover images for the shelf (blob: URLs; revoke with the returned function). */
export async function coverUrls(entries: BookEntry[]): Promise<{ urls: Record<string, string>; release: () => void }> {
  const urls: Record<string, string> = {};
  const blobs: string[] = [];
  for (const e of entries) {
    const res = await fetchFile(e, 'book.json');
    if (!res) continue;
    try {
      const book = (await res.json()) as Book;
      const rel = book.cover ?? book.pages[0]?.image;
      if (!rel) continue;
      if (e.origin === 'builtin') {
        urls[e.id] = urlOf(e, rel);
        continue;
      }
      const img = await fetchFile(e, rel);
      if (img) blobs.push((urls[e.id] = URL.createObjectURL(await img.blob())));
    } catch {
      /* a broken book shows without a cover */
    }
  }
  return { urls, release: () => blobs.forEach((u) => URL.revokeObjectURL(u)) };
}

// ---- The child's own reading (跟读录音), kept on this device only ----

/** Id `${childId}:${bookId}:${page}:${sentence}`: a new take replaces the old one. */
export type Recording = RecordingRow;

export const recordingId = (childId: string, bookId: string, page: number, sentence: number) =>
  `${childId}:${bookId}:${page}:${sentence}`;

export async function saveRecording(r: Recording): Promise<void> {
  await db.recordings.put(r);
}

export async function recordingsOf(childId: string, bookId?: string): Promise<Recording[]> {
  const rows = await db.recordings.where('childId').equals(childId).toArray();
  return rows.filter((r) => !bookId || r.bookId === bookId).sort((a, b) => a.page - b.page || a.sentence - b.sentence);
}

export async function deleteRecordings(childId: string, bookId: string): Promise<void> {
  await db.recordings.where('[childId+bookId]').equals([childId, bookId]).delete();
}
