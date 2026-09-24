import { assertBook, type Book, type BookEntry, type BundleBook } from '@xuexi/course-pack';
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

const urlOf = (entry: BookEntry, rel: string) => new URL(entry.path + rel, BOOK_BASE).toString();

export async function listBooks(): Promise<BookEntry[]> {
  const all = Object.values((await kvGet<BookCatalog>(LOCAL_BOOKS_KEY)) ?? {});
  return all.sort((a, b) => a.level.localeCompare(b.level, 'en', { numeric: true }) || a.title.localeCompare(b.title));
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
  const local = (await kvGet<BookCatalog>(LOCAL_BOOKS_KEY)) ?? {};
  const entry = local[id];
  if (!entry) throw new Error('这本绘本不在这台设备上，请在家长模式里导入');
  const cache = await cacheOpen();
  const res = await cache?.match(urlOf(entry, 'book.json'));
  if (!res) throw new Error('绘本文件丢失，请重新导入');
  const book = await res.json();
  assertBook(book);
  const urls = new Map<string, string>();
  const rels = new Set<string>([...(book.cover ? [book.cover] : []), ...book.pages.flatMap((p) => [p.image, ...p.sentences.flatMap((s) => (s.audio ? [s.audio] : []))])]);
  for (const rel of rels) {
    const hit = await cache!.match(urlOf(entry, rel));
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
  const cache = await cacheOpen();
  const urls: Record<string, string> = {};
  for (const e of entries) {
    const res = await cache?.match(urlOf(e, 'book.json'));
    if (!res) continue;
    try {
      const book = (await res.json()) as Book;
      const rel = book.cover ?? book.pages[0]?.image;
      const img = rel ? await cache!.match(urlOf(e, rel)) : undefined;
      if (img) urls[e.id] = URL.createObjectURL(await img.blob());
    } catch {
      /* a broken book shows without a cover */
    }
  }
  return { urls, release: () => Object.values(urls).forEach((u) => URL.revokeObjectURL(u)) };
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
