/**
 * 写汉字 stroke data: copies hanzi-writer-data's file of every character in
 * the 语文 词语听写表 (both books) into public/hanzi/ (gitignored), with the
 * Arphic Public License and a notice, so the app ships only the ~1000
 * characters it asks for and loads them without the network.
 *
 * Runs as a Vite plugin at the start of every build and dev server (so CI and
 * `tauri build` get it), or by hand: `pnpm exec tsx scripts/hanzi-data.ts`.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
// The word lists by path: the Vite config loads @xuexi/practice as a plain
// Node module, which cannot run its TypeScript; relative files are bundled.
import type { DictationList } from '../../../packages/practice/src/banks/types';
import { YW_G2A_WORDS } from '../../../packages/practice/src/banks/yw-g2a-words';
import { YW_G4A_WORDS } from '../../../packages/practice/src/banks/yw-g4a-words';
import { HANZI_DIR, hanziFile, type HanziIndex } from '../src/lib/hanzi';

const WEB_DIR = fileURLToPath(new URL('..', import.meta.url));
const LISTS: DictationList[] = [YW_G2A_WORDS, YW_G4A_WORDS];

/** Every Chinese character of the dictation words, once, in code point order. */
export function hanziChars(lists: DictationList[] = LISTS): string[] {
  const out = new Set<string>();
  for (const list of lists)
    for (const words of Object.values(list)) for (const d of words) for (const ch of d.w) if (/\p{Script=Han}/u.test(ch)) out.add(ch);
  return [...out].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!);
}

/** Where hanzi-writer-data is installed. */
export function hanziDataDir(): string {
  return dirname(createRequire(join(WEB_DIR, 'package.json')).resolve('hanzi-writer-data/package.json'));
}

const NOTICE = (version: string) => `Stroke data for 写汉字 (hanzi-writer)
=====================================

The *.json files in this folder are copied unmodified from hanzi-writer-data
${version} (https://github.com/chanind/hanzi-writer-data), one file per character
of the 语文 词语听写表; only those characters are included, and each file is
renamed to its Unicode code point (e.g. 5e7f.json for 广). The folder is
generated when the app is built (apps/web/scripts/hanzi-data.ts).

The data comes from the Make Me a Hanzi project
(https://github.com/skishore/makemeahanzi), which derived it from fonts by
Arphic Technology Co., Ltd. It is distributed under the Arphic Public License,
included here unaltered as ARPHICPL.TXT. The complete data set is available from
the addresses above and from npm (hanzi-writer-data).
`;

/** Writes the stroke data into `outDir` (default public/hanzi). Returns what it wrote. */
export function writeHanziData(outDir = join(WEB_DIR, 'public', HANZI_DIR), dataDir = hanziDataDir()): { chars: number; bytes: number } {
  const chars = hanziChars();
  const missing = chars.filter((ch) => !existsSync(join(dataDir, `${ch}.json`)));
  if (missing.length) throw new Error(`hanzi-writer-data has no stroke data for: ${missing.join(' ')}`);
  const version = (JSON.parse(readFileSync(join(dataDir, 'package.json'), 'utf8')) as { version: string }).version;
  if (existsSync(outDir)) rmSync(outDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  for (const ch of chars) copyFileSync(join(dataDir, `${ch}.json`), join(outDir, hanziFile(ch)));
  copyFileSync(join(dataDir, 'ARPHICPL.TXT'), join(outDir, 'ARPHICPL.TXT'));
  writeFileSync(join(outDir, 'NOTICE.txt'), NOTICE(version));
  const index: HanziIndex = { source: `hanzi-writer-data@${version}`, chars: chars.join('') };
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(index));
  const bytes = readdirSync(outDir).reduce((t, f) => t + statSync(join(outDir, f)).size, 0);
  return { chars: chars.length, bytes };
}

/** Vite plugin: writes public/hanzi before the dev server or a build starts. */
export function hanziData(): Plugin {
  let done = false;
  return {
    name: 'xuexi-hanzi-data',
    buildStart() {
      if (done) return;
      done = true;
      const r = writeHanziData();
      this.info?.(`hanzi: ${r.chars} characters, ${(r.bytes / 1024 / 1024).toFixed(1)} MB`);
    },
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = writeHanziData();
  console.log(`public/${HANZI_DIR}: ${r.chars} characters, ${(r.bytes / 1024 / 1024).toFixed(2)} MB`);
}
