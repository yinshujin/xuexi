#!/usr/bin/env node
/**
 * Bundles the Node server into self-contained ESM files (no node_modules
 * needed at runtime):
 *   dist/server.mjs   HTTP server (src/node.ts)
 *   dist/backup.mjs   online SQLite backup CLI (src/backup.ts)
 *
 * Usage: node apps/sync/scripts/build-node.mjs [outDir]   (default apps/sync/dist)
 */
import { build } from 'esbuild';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const repoRoot = resolve(pkgRoot, '../..');
const outDir = resolve(process.argv[2] ?? join(pkgRoot, 'dist'));
const sharedEntry = join(repoRoot, 'packages/shared/src/index.ts');

await build({
  entryPoints: {
    server: join(pkgRoot, 'src/node.ts'),
    backup: join(pkgRoot, 'src/backup.ts'),
  },
  outdir: outDir,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  alias: existsSync(sharedEntry) ? { '@xuexi/shared': sharedEntry } : {},
  // Some CJS deps may call require() on builtins.
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
  minify: true,
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'warning',
});
console.log(`[build-node] wrote ${join(outDir, 'server.mjs')} and backup.mjs`);
