import { assertBook, bookFiles, type Book, type BookEntry, type BookManifest } from './book';
import { sha256Hex } from './hash';
import { BUNDLE_FORMAT, type BundleIndex, type CatalogEntry, type PackManifest } from './types';
import { assertManifest } from './validate';

export interface BundlePack {
  entry: CatalogEntry;
  manifestBytes: Uint8Array;
  /** Pack-relative path → bytes, for every file listed in the manifest. */
  files: Record<string, Uint8Array>;
}

export interface BundleBook {
  entry: BookEntry;
  book: Book;
  manifestBytes: Uint8Array;
  /** Book-relative path → bytes (book.json, pages, audio). */
  files: Record<string, Uint8Array>;
}

export interface VerifiedBundle {
  title: string;
  packs: BundlePack[];
  books: BundleBook[];
  /** Human-readable reasons for lessons that were left out. */
  skipped: string[];
}

/**
 * Validate an unzipped course bundle (`pnpm content export`): every pack's
 * manifest must be valid and every file must match its sha256. Broken packs
 * are skipped, not fatal, so one bad lesson does not block the rest.
 */
export async function readBundle(zipFiles: Record<string, Uint8Array>): Promise<VerifiedBundle> {
  const indexBytes = zipFiles['bundle.json'];
  if (!indexBytes) throw new Error('这不是课程包文件（缺少 bundle.json）');
  let index: BundleIndex;
  try {
    index = JSON.parse(new TextDecoder().decode(indexBytes)) as BundleIndex;
  } catch {
    throw new Error('课程包文件已损坏（bundle.json）');
  }
  if (index?.format !== BUNDLE_FORMAT || !Array.isArray(index.lessons)) throw new Error('课程包格式不支持，请更新 App');

  const out: VerifiedBundle = { title: String(index.title ?? ''), packs: [], books: [], skipped: [] };
  for (const entry of index.lessons) {
    const label = entry?.title ?? entry?.lessonId ?? '?';
    if (!entry || typeof entry.path !== 'string' || !/^packs\/[^/]+\/v\d+\/$/.test(entry.path)) {
      out.skipped.push(`${label}：路径无效`);
      continue;
    }
    const manifestBytes = zipFiles[`${entry.path}manifest.json`];
    if (!manifestBytes) {
      out.skipped.push(`${label}：缺少 manifest.json`);
      continue;
    }
    let manifest: PackManifest;
    try {
      manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
      assertManifest(manifest);
      if (manifest.lessonId !== entry.lessonId) throw new Error('manifest 与目录不一致');
    } catch (e) {
      out.skipped.push(`${label}：${(e as Error).message}`);
      continue;
    }
    const files: Record<string, Uint8Array> = {};
    let broken = '';
    for (const [rel, info] of Object.entries(manifest.files)) {
      const data = zipFiles[`${entry.path}${rel}`];
      if (!data || data.byteLength !== info.bytes || (await sha256Hex(data)) !== info.sha256) {
        broken = rel;
        break;
      }
      files[rel] = data;
    }
    if (broken) {
      out.skipped.push(`${label}：文件缺失或损坏 ${broken}`);
      continue;
    }
    out.packs.push({ entry, manifestBytes, files });
  }

  for (const entry of Array.isArray(index.books) ? index.books : []) {
    const label = entry?.title ?? entry?.id ?? '?';
    if (!entry || typeof entry.path !== 'string' || !/^books\/[a-z0-9.-]+\/v\d+\/$/.test(entry.path)) {
      out.skipped.push(`绘本 ${label}：路径无效`);
      continue;
    }
    const manifestBytes = zipFiles[`${entry.path}manifest.json`];
    const bookBytes = zipFiles[`${entry.path}book.json`];
    if (!manifestBytes || !bookBytes) {
      out.skipped.push(`绘本 ${label}：缺少 manifest.json 或 book.json`);
      continue;
    }
    let book: Book;
    try {
      const manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as BookManifest;
      if (manifest.format !== 'xuexi-book-pack@1' || manifest.id !== entry.id) throw new Error('manifest 与目录不一致');
      book = JSON.parse(new TextDecoder().decode(bookBytes));
      assertBook(book);
      if (book.id !== entry.id) throw new Error('book.json 与目录不一致');
      const files: Record<string, Uint8Array> = {};
      for (const rel of ['book.json', ...bookFiles(book)]) {
        const info = manifest.files[rel];
        const data = zipFiles[`${entry.path}${rel}`];
        if (!info || !data || data.byteLength !== info.bytes || (await sha256Hex(data)) !== info.sha256) {
          throw new Error(`文件缺失或损坏 ${rel}`);
        }
        files[rel] = data;
      }
      out.books.push({ entry, book, manifestBytes, files });
    } catch (e) {
      out.skipped.push(`绘本 ${label}：${(e as Error).message}`);
    }
  }
  return out;
}
