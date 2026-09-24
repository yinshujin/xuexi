#!/usr/bin/env node
// Copy the course packs that are already published on the live site into a
// freshly built site folder, so deploying the app from CI (where content/out is
// not available) never removes courses that were published from the parent's
// computer.
//
//   node deploy/edgeone/fetch-live-packs.mjs <siteUrl> <siteDir>
//
// Keeps <siteDir>/catalog.json entries that are newer locally; missing or
// unreachable live sites are not an error (first deploy).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';

const [siteUrl, siteDir] = process.argv.slice(2);
if (!siteUrl || !siteDir) {
  console.error('usage: fetch-live-packs.mjs <siteUrl> <siteDir>');
  process.exit(2);
}
const base = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;

async function getJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

let live;
try {
  live = await getJson(`${base}catalog.json`);
} catch (e) {
  console.log(`(no live catalog at ${base}: ${e.message}; nothing to keep)`);
  process.exit(0);
}
if (live?.format !== 'xuexi-catalog@1') {
  console.log('(live catalog.json has an unknown format; nothing to keep)');
  process.exit(0);
}

const catalogPath = join(siteDir, 'catalog.json');
const local = JSON.parse(await readFile(catalogPath, 'utf8'));
let kept = 0;
for (const [id, entry] of Object.entries(live.lessons ?? {})) {
  const mine = local.lessons[id];
  if (mine && mine.version >= entry.version) continue;
  const manifest = await getJson(`${base}${entry.path}manifest.json`);
  const files = { ...manifest.files };
  for (const [rel, info] of Object.entries(files)) {
    const res = await fetch(`${base}${entry.path}${rel}`);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${entry.path}${rel}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    const sha = createHash('sha256').update(bytes).digest('hex');
    if (sha !== info.sha256) throw new Error(`checksum mismatch ${entry.path}${rel}`);
    const dest = join(siteDir, entry.path, rel);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, bytes);
  }
  await writeFile(join(siteDir, entry.path, 'manifest.json'), JSON.stringify(manifest, null, 2));
  local.lessons[id] = entry;
  kept++;
}
await writeFile(catalogPath, JSON.stringify(local, null, 2));
console.log(`kept ${kept} published lesson(s) from ${base}`);
