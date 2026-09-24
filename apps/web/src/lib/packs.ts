import { unzip } from 'fflate';
import {
  assertCatalog,
  assertLesson,
  assertManifest,
  isNewerEntry,
  readBundle,
  sha256Hex,
  type BookEntry,
  type Catalog,
  type CatalogEntry,
  type PackLesson,
  type PackManifest,
} from '@xuexi/course-pack';
import { siteBase } from './api';
import { storeBooks } from './books';
import { kvGet, kvSet } from './db';

/**
 * Course packs are cached with the Cache Storage API directly (not by the
 * service worker), so offline lessons work the same in the PWA and inside the
 * native shells (Android APK / desktop), where service workers may not run.
 */
const PACK_CACHE = 'xuexi-packs-v1';
const CATALOG_CACHE = 'xuexi-catalog-v1';
/**
 * Packs imported from a bundle file live under this synthetic origin in Cache
 * Storage (never fetched from the network).
 */
const LOCAL_BASE = 'https://xuexi.local/';
const LOCAL_CATALOG_KEY = 'localCatalog';

async function cacheOpen(name: string): Promise<Cache | null> {
  try {
    return 'caches' in globalThis ? await caches.open(name) : null;
  } catch {
    return null;
  }
}

/**
 * Courses shipped inside the installed app (APK / desktop builds put them in
 * dist/builtin/ with `pnpm content builtin`). Absent in the website build.
 */
const BUILTIN_DIR = 'builtin/';
let builtinCatalog: Promise<Catalog | null> | null = null;

function builtinBase(): string {
  return new URL(BUILTIN_DIR, document.baseURI).toString();
}

function loadBuiltinCatalog(): Promise<Catalog | null> {
  builtinCatalog ??= (async () => {
    try {
      const res = await fetch(builtinBase() + 'catalog.json', { cache: 'no-store' });
      if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return null;
      const data = await res.json();
      assertCatalog(data);
      for (const e of Object.values(data.lessons)) e.origin = 'builtin';
      return data;
    } catch {
      return null;
    }
  })();
  return builtinCatalog;
}

/**
 * Site catalog, courses built into the app and packs imported on this device,
 * merged per lesson: a strictly newer build wins, ties go to the copy that
 * needs no network (built-in over site, imported over both).
 */
export async function loadCatalog(): Promise<Catalog | null> {
  const [site, builtin, local] = await Promise.all([
    loadSiteCatalog().catch(() => null),
    loadBuiltinCatalog(),
    kvGet<Catalog>(LOCAL_CATALOG_KEY),
  ]);
  const layers = [site, builtin, local].filter((c): c is Catalog => !!c && Object.keys(c.lessons).length > 0);
  if (layers.length === 0) return site;
  if (layers.length === 1) return layers[0];
  const merged: Catalog = { format: 'xuexi-catalog@1', generatedAt: layers[0].generatedAt, lessons: {} };
  for (const layer of layers) {
    for (const [id, e] of Object.entries(layer.lessons)) {
      const cur = merged.lessons[id];
      if (!cur || !isNewerEntry(cur, e)) merged.lessons[id] = e;
    }
  }
  return merged;
}

async function loadSiteCatalog(): Promise<Catalog | null> {
  const base = await siteBase();
  if (!/^https?:/.test(base)) return null;
  const url = new URL('catalog.json', base).toString();
  const cache = await cacheOpen(CATALOG_CACHE);
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.clone().json();
      assertCatalog(data);
      await cache?.put(url, res);
      return data;
    }
  } catch {
    /* offline → fall back to cache */
  }
  const cached = await cache?.match(url);
  if (!cached) return null;
  const data = await cached.json();
  assertCatalog(data);
  return data;
}

async function fileUrl(entry: CatalogEntry, path: string): Promise<string> {
  const base = entry.origin === 'local' ? LOCAL_BASE : entry.origin === 'builtin' ? builtinBase() : await siteBase();
  return new URL(entry.path + path, base).toString();
}

const downloadedKey = (e: CatalogEntry) => `pack:${e.lessonId}:v${e.version}${e.origin === 'local' ? ':local' : ''}`;

export async function isDownloaded(entry: CatalogEntry): Promise<boolean> {
  if (entry.origin === 'builtin') return true;
  return Boolean(await kvGet<boolean>(downloadedKey(entry)));
}

async function fetchCached(url: string, cache: Cache | null): Promise<Response> {
  const hit = await cache?.match(url);
  if (hit) return hit;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}：${url}`);
  return res;
}

async function getManifest(entry: CatalogEntry, cache: Cache | null): Promise<PackManifest> {
  const url = await fileUrl(entry, 'manifest.json');
  const res = await fetchCached(url, cache);
  const m = await res.clone().json();
  assertManifest(m);
  return m;
}

/** Download every file of a pack into Cache Storage, verifying hashes. */
export async function downloadPack(entry: CatalogEntry, onProgress?: (ratio: number) => void): Promise<void> {
  const cache = await cacheOpen(PACK_CACHE);
  if (!cache) throw new Error('此设备不支持离线缓存');
  const manifestUrl = await fileUrl(entry, 'manifest.json');
  const manifestRes = await fetch(manifestUrl);
  if (!manifestRes.ok) throw new Error(`下载失败 HTTP ${manifestRes.status}`);
  const manifest = await manifestRes.clone().json();
  assertManifest(manifest);
  const files = Object.entries(manifest.files);
  const total = files.reduce((n, [, f]) => n + f.bytes, 0) || 1;
  let done = 0;
  for (const [path, info] of files) {
    const url = await fileUrl(entry, path);
    if (!(await cache.match(url))) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}：${path}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if ((await sha256Hex(bytes)) !== info.sha256) throw new Error(`文件校验失败：${path}`);
      await cache.put(url, new Response(bytes, { headers: { 'content-type': res.headers.get('content-type') ?? '' } }));
    }
    done += info.bytes;
    onProgress?.(done / total);
  }
  await cache.put(manifestUrl, manifestRes);
  await kvSet(downloadedKey(entry), true);
}

async function removeCached(entry: CatalogEntry): Promise<void> {
  const cache = await cacheOpen(PACK_CACHE);
  if (cache) {
    const prefix = await fileUrl(entry, '');
    for (const req of await cache.keys()) if (req.url.startsWith(prefix)) await cache.delete(req);
  }
  await kvSet(downloadedKey(entry), false);
}

export async function removePack(entry: CatalogEntry): Promise<void> {
  if (entry.origin === 'builtin') throw new Error('App 自带的课程不能删除');
  await removeCached(entry);
  if (entry.origin === 'local') {
    const local = await kvGet<Catalog>(LOCAL_CATALOG_KEY);
    if (local?.lessons[entry.lessonId]?.version === entry.version) {
      delete local.lessons[entry.lessonId];
      await kvSet(LOCAL_CATALOG_KEY, local);
    }
  }
}

const MIME: Record<string, string> = {
  json: 'application/json',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
};

function unzipAsync(bytes: Uint8Array): Promise<Record<string, Uint8Array>> {
  return new Promise((resolve, reject) => unzip(bytes, (err, files) => (err ? reject(err) : resolve(files))));
}

export interface ImportResult {
  title: string;
  imported: CatalogEntry[];
  books: BookEntry[];
  skipped: string[];
}

/**
 * Import a course-bundle zip (made with `pnpm content export`) into this
 * device: every file is checked against its manifest hash, stored in Cache
 * Storage under LOCAL_BASE, and the lessons are added to the local catalog.
 */
export async function importBundle(bytes: Uint8Array, onProgress?: (ratio: number) => void): Promise<ImportResult> {
  const cache = await cacheOpen(PACK_CACHE);
  if (!cache) throw new Error('此设备不支持离线缓存');
  let files: Record<string, Uint8Array>;
  try {
    files = await unzipAsync(bytes);
  } catch {
    throw new Error('这不是有效的课程包文件（zip 解压失败）');
  }
  const bundle = await readBundle(files);

  const local = (await kvGet<Catalog>(LOCAL_CATALOG_KEY)) ?? {
    format: 'xuexi-catalog@1' as const,
    generatedAt: new Date().toISOString(),
    lessons: {},
  };
  const result: ImportResult = { title: bundle.title, imported: [], books: [], skipped: bundle.skipped };
  let done = 0;
  for (const pack of bundle.packs) {
    const entry: CatalogEntry = { ...pack.entry, origin: 'local' };
    for (const [rel, data] of Object.entries(pack.files)) {
      const ext = rel.split('.').pop()?.toLowerCase() ?? '';
      await cache.put(
        await fileUrl(entry, rel),
        new Response(data as Uint8Array<ArrayBuffer>, { headers: { 'content-type': MIME[ext] ?? 'application/octet-stream' } }),
      );
    }
    await cache.put(
      await fileUrl(entry, 'manifest.json'),
      new Response(pack.manifestBytes as Uint8Array<ArrayBuffer>, { headers: { 'content-type': 'application/json' } }),
    );
    await kvSet(downloadedKey(entry), true);
    const prev = local.lessons[entry.lessonId];
    if (!prev || !isNewerEntry(prev, entry)) {
      // Drop the older imported version's files.
      if (prev && prev.path !== entry.path) await removeCached(prev);
      local.lessons[entry.lessonId] = entry;
    }
    result.imported.push(entry);
    onProgress?.(++done / (bundle.packs.length + bundle.books.length));
  }
  local.generatedAt = new Date().toISOString();
  await kvSet(LOCAL_CATALOG_KEY, local);
  result.books = await storeBooks(bundle.books);
  return result;
}

export interface OpenedLesson {
  lesson: PackLesson;
  /** pack-relative path → URL usable by <audio>/<img>. */
  assets: Map<string, string>;
  /** Revoke blob URLs when the player closes. */
  release: () => void;
  offline: boolean;
}

/** Open a published pack: cached files become blob: URLs, others stream from the network. */
export async function openPack(entry: CatalogEntry): Promise<OpenedLesson> {
  const cache = await cacheOpen(PACK_CACHE);
  const manifest = await getManifest(entry, cache);
  const lessonRes = await fetchCached(await fileUrl(entry, 'lesson.json'), cache);
  const lesson = await lessonRes.json();
  assertLesson(lesson);
  const assets = new Map<string, string>();
  const blobs: string[] = [];
  let offline = true;
  for (const path of Object.keys(manifest.files)) {
    if (path === 'lesson.json') continue;
    const url = await fileUrl(entry, path);
    if (entry.origin === 'builtin') {
      assets.set(path, url);
      continue;
    }
    const hit = await cache?.match(url);
    if (hit) {
      const blobUrl = URL.createObjectURL(await hit.blob());
      blobs.push(blobUrl);
      assets.set(path, blobUrl);
    } else {
      offline = false;
      assets.set(path, url);
    }
  }
  return { lesson, assets, offline, release: () => blobs.forEach((u) => URL.revokeObjectURL(u)) };
}

/** Review mode: open an unpublished draft served by `pnpm content review`. */
export async function openDraft(lessonId: string): Promise<OpenedLesson> {
  const base = new URL(`/api/review/draft/${lessonId}/`, location.origin).toString();
  const res = await fetch(base + 'lesson.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`无法打开草稿 HTTP ${res.status}`);
  const lesson = await res.json();
  assertLesson(lesson);
  const assets = new Map<string, string>();
  const walk = (node: unknown, key?: string) => {
    if (typeof node === 'string') {
      if ((key === 'src' || key === 'poster' || key === 'audioId') && /^(audio|media)\//.test(node)) {
        assets.set(node, base + node);
      }
    } else if (Array.isArray(node)) node.forEach((n) => walk(n));
    else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, k);
  };
  walk(lesson.scenes);
  return { lesson, assets, offline: false, release: () => {} };
}
