import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { zipSync, type Zippable } from 'fflate';
import { assertCatalog, BUNDLE_FORMAT, type BundleIndex, type Catalog, type CatalogEntry } from '@xuexi/course-pack';
import { BOOKS } from '@xuexi/curriculum';
import type { Paths } from './paths';

export interface ExportOptions {
  book?: string;
  unit?: string;
  lesson?: string;
  out?: string;
  title?: string;
}

export interface ExportResult {
  file: string;
  lessons: CatalogEntry[];
  bytes: number;
}

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(p);
    }
  };
  walk(dir);
  return out;
}

function matches(e: CatalogEntry, o: ExportOptions): boolean {
  if (o.lesson && e.lessonId !== o.lesson) return false;
  if (o.book && e.bookId !== o.book) return false;
  if (o.unit) {
    const unitId = /^\d+$/.test(o.unit) ? `${e.bookId}.u${o.unit}` : o.unit;
    if (!e.kpId.startsWith(`${unitId}.`)) return false;
  }
  return true;
}

function defaultTitle(o: ExportOptions, lessons: CatalogEntry[]): string {
  if (o.lesson) return lessons[0].title;
  const book = BOOKS.find((b) => b.id === o.book);
  if (!book) return '全部课程';
  const unit = o.unit ? book.units.find((u) => u.id === (/^\d+$/.test(o.unit!) ? `${book.id}.u${o.unit}` : o.unit)) : undefined;
  const name = `${'一二三四五六'[book.grade - 1]}年级${book.term}册`;
  return unit ? `${name} 第${unit.index}单元 ${unit.title}` : name;
}

/**
 * Write a course-bundle zip with the built packs that match the filter.
 * Audio is already compressed, so files are stored (level 0) for speed.
 */
export function exportBundle(paths: Paths, o: ExportOptions): ExportResult {
  if (!existsSync(paths.catalog)) throw new Error('还没有打包好的课程：先审核通过，再运行 pnpm content build');
  const catalog = JSON.parse(readFileSync(paths.catalog, 'utf8')) as Catalog;
  assertCatalog(catalog);
  const lessons = Object.values(catalog.lessons).filter((e) => matches(e, o));
  if (lessons.length === 0) throw new Error('没有符合条件的已打包课程（先 pnpm content build，再检查 --book / --unit）');

  const title = o.title ?? defaultTitle(o, lessons);
  const index: BundleIndex = { format: BUNDLE_FORMAT, createdAt: new Date().toISOString(), title, lessons };
  const zip: Zippable = { 'bundle.json': [new TextEncoder().encode(JSON.stringify(index, null, 2)), { level: 6 }] };
  let bytes = 0;
  for (const e of lessons) {
    const dir = join(paths.out, e.path);
    for (const f of filesUnder(dir)) {
      const data = new Uint8Array(readFileSync(f));
      bytes += data.byteLength;
      const rel = relative(paths.out, f).split('\\').join('/');
      zip[rel] = [data, { level: /\.(json|html)$/.test(f) ? 6 : 0 }];
    }
  }
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `xuexi-${[o.book, o.unit ? `u${o.unit}` : '', o.lesson].filter(Boolean).join('-') || 'all'}-${stamp}.zip`;
  const file = o.out ?? join(paths.content, 'exports', name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, zipSync(zip));
  return { file, lessons, bytes };
}
