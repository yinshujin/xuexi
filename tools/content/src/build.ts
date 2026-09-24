import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  assertLesson,
  estimateDurationSec,
  PACK_FORMAT,
  referencedFiles,
  sha256Hex,
  type Catalog,
  type CatalogEntry,
  type PackLesson,
  type PackManifest,
} from '@xuexi/course-pack';
import type { LessonContext } from './generate';
import { draftDir, type Paths } from './paths';
import { type ContentState, updateLesson } from './state';

function listFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(dir, p).split('\\').join('/'));
    }
  };
  walk(dir);
  return out.sort();
}

export interface BuildResult {
  built: string[];
  unchanged: string[];
  skipped: Array<{ id: string; reason: string }>;
  catalog: Catalog;
}

/**
 * Turn every approved draft into a versioned pack under content/out/packs and
 * write content/out/catalog.json. A new version is created only when the
 * approved draft changed since the last build.
 */
export async function buildPacks(
  paths: Paths,
  state: ContentState,
  lessons: LessonContext[],
  openmaicVersion: string,
  log: (s: string) => void = () => {},
): Promise<BuildResult> {
  const byId = new Map(lessons.map((c) => [c.lesson.id, c]));
  const result: BuildResult = {
    built: [],
    unchanged: [],
    skipped: [],
    catalog: { format: 'xuexi-catalog@1', generatedAt: new Date().toISOString(), lessons: {} },
  };

  const addEntry = (id: string, version: number) => {
    const dest = join(paths.packs, id, `v${version}`);
    const manifest = JSON.parse(readFileSync(join(dest, 'manifest.json'), 'utf8')) as PackManifest;
    const entry: CatalogEntry = {
      lessonId: id,
      kpId: manifest.kpId,
      bookId: manifest.bookId,
      kind: manifest.kind,
      title: manifest.title,
      version,
      path: `packs/${id}/v${version}/`,
      durationSec: manifest.durationSec,
      totalBytes: Object.values(manifest.files).reduce((n, f) => n + f.bytes, 0),
    };
    result.catalog.lessons[id] = entry;
  };
  const published = (id: string, version: number | undefined) =>
    version !== undefined && version > 0 && existsSync(join(paths.packs, id, `v${version}`, 'manifest.json'));

  for (const [id, s] of Object.entries(state.lessons)) {
    const ctx = byId.get(id);
    if (s.status !== 'approved') {
      // A lesson being regenerated / re-reviewed keeps its last approved pack online.
      if (ctx && published(id, s.packVersion)) {
        addEntry(id, s.packVersion!);
        result.unchanged.push(id);
      }
      continue;
    }
    if (!ctx) {
      result.skipped.push({ id, reason: '课程目录中已不存在该课' });
      continue;
    }
    const src = draftDir(paths, id);
    if (!existsSync(join(src, 'lesson.json'))) {
      result.skipped.push({ id, reason: '找不到草稿文件（content/work 被删除？）' });
      if (published(id, s.packVersion)) addEntry(id, s.packVersion!);
      continue;
    }
    const lessonText = readFileSync(join(src, 'lesson.json'), 'utf8');
    const lesson = JSON.parse(lessonText) as PackLesson;
    assertLesson(lesson);
    const missing = referencedFiles(lesson).filter((f) => !existsSync(join(src, f)));
    if (missing.length) {
      result.skipped.push({ id, reason: `缺少文件：${missing.slice(0, 3).join(', ')}` });
      if (published(id, s.packVersion)) addEntry(id, s.packVersion!);
      continue;
    }
    const hash = await sha256Hex(new TextEncoder().encode(lessonText));

    if (s.packHash === hash && published(id, s.packVersion)) {
      addEntry(id, s.packVersion!);
      result.unchanged.push(id);
      continue;
    }
    const version = (s.packVersion ?? 0) + 1;
    const dest = join(paths.packs, id, `v${version}`);
    rmSync(join(paths.packs, id), { recursive: true, force: true });
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });

    const files: PackManifest['files'] = {};
    for (const f of listFiles(dest)) {
      if (f === 'manifest.json') continue;
      const bytes = readFileSync(join(dest, f));
      files[f] = { bytes: bytes.byteLength, sha256: await sha256Hex(bytes) };
    }
    const manifest: PackManifest = {
      format: PACK_FORMAT,
      lessonId: id,
      kpId: ctx.kp.id,
      bookId: ctx.book.id,
      kind: ctx.lesson.kind,
      title: ctx.lesson.title,
      version,
      createdAt: new Date().toISOString(),
      source: {
        generator: 'openmaic',
        openmaicVersion,
        classroomId: s.classroomId ?? '',
        templateVersion: s.templateVersion ?? '',
      },
      review: { status: 'approved', reviewedAt: s.reviewedAt ?? new Date().toISOString(), note: s.reviewNote },
      aiGenerated: true,
      durationSec: estimateDurationSec(lesson),
      sceneCount: lesson.scenes.length,
      files,
    };
    writeFileSync(join(dest, 'manifest.json'), JSON.stringify(manifest, null, 2));
    updateLesson(paths.state, state, id, { packVersion: version, packHash: hash });
    result.built.push(id);
    log(`  ✓ ${id} → v${version}`);
    addEntry(id, version);
  }

  // Remove packs that are no longer in the catalog.
  if (existsSync(paths.packs)) {
    for (const dir of readdirSync(paths.packs)) {
      if (!result.catalog.lessons[dir]) rmSync(join(paths.packs, dir), { recursive: true, force: true });
    }
  }

  mkdirSync(paths.out, { recursive: true });
  writeFileSync(paths.catalog, JSON.stringify(result.catalog, null, 2));
  return result;
}
