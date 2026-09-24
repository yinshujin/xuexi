import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { Paths } from './paths';
import { run } from './run';

export type PublishTarget = 'dir' | 'edgeone' | 'tencent';

/** Assemble content/site = built web app + packs + catalog.json. */
export async function assembleSite(paths: Paths, opts: { buildWeb: boolean; log: (s: string) => void }) {
  if (!existsSync(paths.catalog)) throw new Error('还没有 catalog.json，先运行 pnpm content build');
  if (opts.buildWeb || !existsSync(join(paths.webDist, 'index.html'))) {
    opts.log('构建 Web 应用 …');
    await run('pnpm', ['--filter', '@xuexi/web', 'build'], { cwd: paths.root });
  }
  rmSync(paths.site, { recursive: true, force: true });
  mkdirSync(paths.site, { recursive: true });
  cpSync(paths.webDist, paths.site, { recursive: true });
  if (existsSync(paths.packs)) cpSync(paths.packs, join(paths.site, 'packs'), { recursive: true });
  cpSync(paths.catalog, join(paths.site, 'catalog.json'));
  opts.log(`站点已生成：${paths.site}`);
}

export async function publish(
  paths: Paths,
  target: PublishTarget,
  env: Record<string, string>,
  log: (s: string) => void,
) {
  if (target === 'dir') return;
  const script = join(paths.root, 'deploy', target, 'deploy.sh');
  if (!existsSync(script)) throw new Error(`找不到部署脚本 ${script}`);
  log(`部署到 ${target} …`);
  await run('bash', [script, paths.site], { cwd: paths.root, env });
}
