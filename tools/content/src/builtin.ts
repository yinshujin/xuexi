import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { unzipSync } from 'fflate';
import { isNewerEntry, readBundle, type Catalog, type CatalogEntry } from '@xuexi/course-pack';

export interface BuiltinResult {
  lessons: CatalogEntry[];
  bytes: number;
  skipped: string[];
}

/**
 * Unpack course-bundle zips into a directory the app ships with
 * (apps/web/public/builtin → dist/builtin): packs/… plus catalog.json.
 * Every file is verified against its manifest; the directory is replaced.
 */
export async function writeBuiltin(zips: string[], outDir: string): Promise<BuiltinResult> {
  const lessons: Record<string, { entry: CatalogEntry; files: Record<string, Uint8Array>; manifest: Uint8Array }> = {};
  const skipped: string[] = [];
  for (const zip of zips) {
    const bundle = await readBundle(unzipSync(new Uint8Array(readFileSync(zip))));
    skipped.push(...bundle.skipped);
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
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'catalog.json'), JSON.stringify(catalog));
  return { lessons: Object.values(catalog.lessons), bytes, skipped };
}
