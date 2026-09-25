import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { unzipSync } from 'fflate';
import {
  isNewerEntry,
  isWordAudioZip,
  readBundle,
  readWordAudioPack,
  WORD_AUDIO_MANIFEST,
  type BookEntry,
  type Catalog,
  type CatalogEntry,
} from '@xuexi/course-pack';

export interface BuiltinResult {
  lessons: CatalogEntry[];
  books: BookEntry[];
  bytes: number;
  skipped: string[];
  /** Words in the built-in word audio pack (0 without one). */
  wordAudio: number;
}

/**
 * Unpack course-bundle zips into a directory the app ships with
 * (apps/web/public/builtin → dist/builtin): packs/… plus catalog.json, and
 * picture books under books/… plus books.json, and the word audio pack
 * (xuexi-word-audio.zip) under word-audio/. Every file is verified against
 * its manifest; the directory is replaced. Private books (the family's own
 * subscriptions) are never built into the app.
 */
export async function writeBuiltin(zips: string[], outDir: string): Promise<BuiltinResult> {
  const lessons: Record<string, { entry: CatalogEntry; files: Record<string, Uint8Array>; manifest: Uint8Array }> = {};
  const skipped: string[] = [];
  const books: Record<string, { entry: BookEntry; files: Record<string, Uint8Array>; manifest: Uint8Array }> = {};
  let wordAudio: Awaited<ReturnType<typeof readWordAudioPack>> | null = null;
  for (const zip of zips) {
    const unzipped = unzipSync(new Uint8Array(readFileSync(zip)));
    if (isWordAudioZip(unzipped)) {
      const pack = await readWordAudioPack(unzipped);
      skipped.push(...pack.skipped);
      if (!wordAudio || pack.manifest.builtAt > wordAudio.manifest.builtAt) wordAudio = pack;
      continue;
    }
    const bundle = await readBundle(unzipped);
    skipped.push(...bundle.skipped);
    for (const b of bundle.books) {
      if (b.entry.private || b.book.private) {
        skipped.push(`绘本 ${b.entry.title}：私有绘本不能内置到 App`);
        continue;
      }
      const prev = books[b.entry.id];
      if (!prev || b.entry.builtAt > prev.entry.builtAt) books[b.entry.id] = { entry: { ...b.entry, origin: undefined }, files: b.files, manifest: b.manifestBytes };
    }
    for (const p of bundle.packs) {
      const prev = lessons[p.entry.lessonId];
      if (!prev || isNewerEntry(p.entry, prev.entry)) {
        lessons[p.entry.lessonId] = { entry: { ...p.entry, origin: undefined }, files: p.files, manifest: p.manifestBytes };
      }
    }
  }

  rmSync(outDir, { recursive: true, force: true });
  let bytes = 0;
  const catalog: Catalog = { format: 'xuexi-catalog@1', generatedAt: new Date().toISOString(), lessons: {} };
  for (const { entry, files, manifest } of Object.values(lessons)) {
    const write = (rel: string, data: Uint8Array) => {
      const f = join(outDir, entry.path, rel);
      mkdirSync(dirname(f), { recursive: true });
      writeFileSync(f, data);
      bytes += data.byteLength;
    };
    write('manifest.json', manifest);
    for (const [rel, data] of Object.entries(files)) write(rel, data);
    catalog.lessons[entry.lessonId] = entry;
  }
  for (const { entry, files, manifest } of Object.values(books)) {
    const write = (rel: string, data: Uint8Array) => {
      const f = join(outDir, entry.path, rel);
      mkdirSync(dirname(f), { recursive: true });
      writeFileSync(f, data);
      bytes += data.byteLength;
    };
    write('manifest.json', manifest);
    for (const [rel, data] of Object.entries(files)) write(rel, data);
  }
  if (wordAudio) {
    const write = (rel: string, data: Uint8Array) => {
      const f = join(outDir, 'word-audio', rel);
      mkdirSync(dirname(f), { recursive: true });
      writeFileSync(f, data);
      bytes += data.byteLength;
    };
    for (const [rel, data] of Object.entries(wordAudio.files)) write(rel, data);
    write(WORD_AUDIO_MANIFEST, new TextEncoder().encode(JSON.stringify(wordAudio.manifest)));
  }
  const bookList = Object.values(books).map((b) => b.entry);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'catalog.json'), JSON.stringify(catalog));
  writeFileSync(join(outDir, 'books.json'), JSON.stringify(bookList));
  return {
    lessons: Object.values(catalog.lessons),
    books: bookList,
    bytes,
    skipped,
    wordAudio: wordAudio ? Object.keys(wordAudio.manifest.words).length : 0,
  };
}
