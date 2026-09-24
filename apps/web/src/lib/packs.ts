import {
  assertCatalog,
  assertLesson,
  assertManifest,
  sha256Hex,
  type Catalog,
  type CatalogEntry,
  type PackLesson,
  type PackManifest,
} from '@xuexi/course-pack';
import { siteBase } from './api';
import { kvGet, kvSet } from './db';

/**
 * Course packs are cached with the Cache Storage API directly (not by the
 * service worker), so offline lessons work the same in the PWA and inside the
 * native shells (Android APK / desktop), where service workers may not run.
 */
const PACK_CACHE = 'xuexi-packs-v1';
const CATALOG_CACHE = 'xuexi-catalog-v1';

async function cacheOpen(name: string): Promise<Cache | null> {
  try {
    return 'caches' in globalThis ? await caches.open(name) : null;
  } catch {
    return null;
  }
}

export async function loadCatalog(): Promise<Catalog | null> {
  const url = new URL('catalog.json', await siteBase()).toString();
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
  return new URL(entry.path + path, await siteBase()).toString();
}

const downloadedKey = (e: CatalogEntry) => `pack:${e.lessonId}:v${e.version}`;

export async function isDownloaded(entry: CatalogEntry): Promise<boolean> {
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

export async function removePack(entry: CatalogEntry): Promise<void> {
  const cache = await cacheOpen(PACK_CACHE);
  if (cache) {
    const prefix = await fileUrl(entry, '');
    for (const req of await cache.keys()) if (req.url.startsWith(prefix)) await cache.delete(req);
  }
  await kvSet(downloadedKey(entry), false);
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
