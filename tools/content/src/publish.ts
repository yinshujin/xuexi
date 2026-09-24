import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Paths } from './paths';
import { run } from './run';

export type PublishTarget = 'dir' | 'edgeone' | 'tencent';

/** Assemble content/site = built web app + packs + catalog.json. */
export async function assembleSite(
  paths: Paths,
  opts: { buildWeb: boolean; log: (s: string) => void; allowEmpty?: boolean },
) {
  if (!existsSync(paths.catalog)) {
    if (!opts.allowEmpty) throw new Error('还没有 catalog.json，先运行 pnpm content build（或加 --allow-empty 只发布 App）');
    mkdirSync(paths.out, { recursive: true });
    writeFileSync(paths.catalog, JSON.stringify({ format: 'xuexi-catalog@1', generatedAt: new Date().toISOString(), lessons: {} }, null, 2));
    opts.log('还没有课程，发布一个空的课程目录（只有 App 和练习）');
  }
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
  opts: { init?: boolean } = {},
) {
  if (target === 'dir') return;
  const script = join(paths.root, 'deploy', target, 'deploy.sh');
  if (!existsSync(script)) throw new Error(`找不到部署脚本 ${script}`);
  log(`部署到 ${target} …`);
  const args = target === 'tencent' && opts.init ? [script, '--init', paths.site] : [script, paths.site];
  await run('bash', args, { cwd: paths.root, env });
}
