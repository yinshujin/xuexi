#!/usr/bin/env node
/**
 * Bundles the sync API (src/edgeone.ts) into a single dependency-free ESM file
 * for EdgeOne Pages (EdgeOne Makers) Edge Functions and writes it into the
 * static site folder that will be uploaded with `edgeone makers deploy <siteDir>`.
 *
 * Usage:
 *   node apps/sync/scripts/build-edgeone.mjs <siteDir> [--functions-dir edge-functions|functions]
 *                                                      [--no-edgeone-json]
 *
 * Output (inside <siteDir>):
 *   edge-functions/api/[[default]].js   catch-all route: handles /api/*
 *   package.json                        minimal, only if missing (the CLI docs say a manual
 *                                       build must put the functions folder *and* package.json
 *                                       into the uploaded output directory)
 *   edgeone.json                        cache/headers rules for the static site, only if missing
 *
 * Verified from edgeone@1.6.41 (CLI source + README) and the official templates:
 *   - edge function directory is `edge-functions/` (legacy name `functions/` still accepted)
 *   - `[[name]]` as the last path segment is a multi-level catch-all
 *   - handler: `export function onRequest(context)`; context.request / context.env
 *   - KV namespaces are injected as globals named after the binding
 */
import { build } from 'esbuild';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const repoRoot = resolve(pkgRoot, '../..');

function usage(msg) {
  if (msg) console.error(`error: ${msg}`);
  console.error(
    'usage: build-edgeone.mjs <siteDir> [--functions-dir edge-functions|functions] [--no-edgeone-json]',
  );
  process.exit(2);
}

const args = process.argv.slice(2);
let siteDir;
let functionsDir = 'edge-functions';
let writeEdgeoneJson = true;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--functions-dir') functionsDir = args[++i];
  else if (a === '--no-edgeone-json') writeEdgeoneJson = false;
  else if (a === '-h' || a === '--help') usage();
  else if (a.startsWith('-')) usage(`unknown option ${a}`);
  else if (!siteDir) siteDir = a;
  else usage(`unexpected argument ${a}`);
}
if (!siteDir) usage('siteDir is required');
if (!['edge-functions', 'functions'].includes(functionsDir)) usage('bad --functions-dir');
siteDir = resolve(siteDir);
if (!existsSync(siteDir) || !statSync(siteDir).isDirectory())
  usage(`${siteDir} is not a directory`);
if (!existsSync(join(siteDir, 'index.html'))) {
  console.warn(`warning: ${siteDir}/index.html not found - is this the built site folder?`);
}

const outfile = join(siteDir, functionsDir, 'api', '[[default]].js');
mkdirSync(dirname(outfile), { recursive: true });

const sharedEntry = join(repoRoot, 'packages/shared/src/index.ts');
const result = await build({
  entryPoints: [join(pkgRoot, 'src/edgeone.ts')],
  outfile,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  mainFields: ['module', 'main'],
  conditions: ['worker', 'browser', 'import', 'default'],
  alias: existsSync(sharedEntry) ? { '@xuexi/shared': sharedEntry } : {},
  // Keep identifiers: the EdgeOne builder re-bundles each function file as an
  // IIFE and then references the top-level `onRequest` function *by name*
  // (verified in edgeone@1.6.41 `bundleAndGetString`/`arrangeText`), so the
  // identifier must survive. Whitespace/syntax minification is fine.
  minifyWhitespace: true,
  minifySyntax: true,
  minifyIdentifiers: false,
  keepNames: false,
  legalComments: 'none',
  metafile: true,
  banner: { js: '// xuexi sync API for EdgeOne Pages Edge Functions (generated, do not edit)' },
  logLevel: 'warning',
});

const bytes = statSync(outfile).size;
const code = readFileSync(outfile, 'utf8');
if (!/(?:^|[^\w$])function onRequest\(/.test(code) || /\bonRequest\d/.test(code)) {
  console.error(
    'error: bundle must contain a top-level `function onRequest(` (EdgeOne requirement)',
  );
  process.exit(1);
}
const imports = Object.values(result.metafile.outputs).flatMap((o) => o.imports ?? []);
if (imports.some((i) => i.external)) {
  console.error('error: bundle still has external imports:', imports);
  process.exit(1);
}
console.log(`[build-edgeone] wrote ${outfile} (${(bytes / 1024).toFixed(1)} KiB)`);

const pkgJson = join(siteDir, 'package.json');
if (!existsSync(pkgJson)) {
  writeFileSync(
    pkgJson,
    JSON.stringify(
      { name: 'xuexi-site', private: true, version: '0.0.0', type: 'module' },
      null,
      2,
    ) + '\n',
  );
  console.log(`[build-edgeone] wrote ${pkgJson}`);
}

const edgeoneJson = join(siteDir, 'edgeone.json');
if (writeEdgeoneJson && !existsSync(edgeoneJson)) {
  const template = JSON.parse(readFileSync(join(repoRoot, 'deploy/edgeone/edgeone.json'), 'utf8'));
  writeFileSync(edgeoneJson, JSON.stringify(template, null, 2) + '\n');
  console.log(`[build-edgeone] wrote ${edgeoneJson}`);
}
