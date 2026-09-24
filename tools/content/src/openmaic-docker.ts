import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { OpenMaicClient } from './openmaic-client';
import type { Paths } from './paths';
import { run } from './run';

/** Pinned OpenMAIC release used for generation. Bump deliberately and re-test. */
export const OPENMAIC_VERSION = 'v1.1.0';
export const OPENMAIC_REPO = 'https://github.com/THU-MAIC/OpenMAIC.git';
const PROJECT = 'xuexi-openmaic';

export interface PipelineConfig {
  openmaicUrl: string;
  accessCode?: string;
  enableTTS: boolean;
  env: Record<string, string>;
}

export function pipelineConfig(env: Record<string, string>): PipelineConfig {
  return {
    openmaicUrl: env.XUEXI_OPENMAIC_URL || 'http://localhost:3000',
    accessCode: env.ACCESS_CODE || undefined,
    enableTTS: env.XUEXI_ENABLE_TTS !== '0',
    env,
  };
}

/** Warn about missing keys before spending a 10-minute Docker build. */
export function checkOpenMaicEnv(env: Record<string, string>): string[] {
  const problems: string[] = [];
  if (!env.DEFAULT_MODEL) problems.push('DEFAULT_MODEL 未设置（例如 qwen:qwen3.7-plus 或 deepseek:deepseek-v4-flash）');
  const provider = env.DEFAULT_MODEL?.split(':')[0]?.toUpperCase();
  if (provider && !env[`${provider}_API_KEY`]) problems.push(`${provider}_API_KEY 未设置（DEFAULT_MODEL 使用 ${provider}）`);
  if (env.XUEXI_ENABLE_TTS !== '0' && !Object.keys(env).some((k) => /^TTS_[A-Z]+_API_KEY$/.test(k) && env[k])) {
    problems.push('没有配置任何 TTS_*_API_KEY，讲解将没有语音（可设置 XUEXI_ENABLE_TTS=0 明确关闭）');
  }
  return problems;
}

function compose(paths: Paths, args: string[], env: Record<string, string>) {
  return run('docker', ['compose', '-p', PROJECT, ...args], {
    cwd: paths.openmaicCheckout,
    env: { ALPINE_MIRROR: env.ALPINE_MIRROR, NPM_REGISTRY: env.NPM_REGISTRY },
  });
}

export async function openmaicUp(paths: Paths, cfg: PipelineConfig, log: (s: string) => void) {
  if (!existsSync(paths.openmaicEnv)) {
    throw new Error(`缺少 ${paths.openmaicEnv}。请先复制 content/openmaic.env.example 并填入 API Key`);
  }
  for (const p of checkOpenMaicEnv(cfg.env)) log(`⚠ ${p}`);
  if (!existsSync(join(paths.openmaicCheckout, 'docker-compose.yml'))) {
    mkdirSync(dirname(paths.openmaicCheckout), { recursive: true });
    log(`下载 OpenMAIC ${OPENMAIC_VERSION} …`);
    await run('git', ['clone', '--depth', '1', '--branch', OPENMAIC_VERSION, OPENMAIC_REPO, paths.openmaicCheckout]);
  } else {
    await run('git', ['fetch', '--depth', '1', 'origin', 'tag', OPENMAIC_VERSION], { cwd: paths.openmaicCheckout });
    await run('git', ['checkout', '-q', OPENMAIC_VERSION], { cwd: paths.openmaicCheckout });
  }
  copyFileSync(paths.openmaicEnv, join(paths.openmaicCheckout, '.env.local'));
  log('构建并启动 OpenMAIC（首次需要 5–15 分钟）…');
  await compose(paths, ['up', '-d', '--build', 'openmaic'], cfg.env);
  await waitHealthy(cfg, log);
}

export async function waitHealthy(cfg: PipelineConfig, log: (s: string) => void, timeoutMs = 10 * 60_000) {
  const client = new OpenMaicClient(cfg.openmaicUrl, cfg.accessCode);
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const h = await client.health();
      log(`OpenMAIC 已就绪：${cfg.openmaicUrl}（版本 ${h.version ?? '?'}，TTS ${h.capabilities?.tts ? '可用' : '未配置'}）`);
      if (cfg.enableTTS && h.capabilities?.tts === false) log('⚠ OpenMAIC 报告没有可用的 TTS，讲解将没有语音');
      return h;
    } catch {
      if (Date.now() > deadline) throw new Error('OpenMAIC 启动超时，用 docker compose -p xuexi-openmaic logs 查看原因');
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

export async function openmaicDown(paths: Paths, cfg: PipelineConfig) {
  if (!existsSync(paths.openmaicCheckout)) return;
  await compose(paths, ['down'], cfg.env);
}

export async function openmaicLogs(paths: Paths, cfg: PipelineConfig) {
  await compose(paths, ['logs', '--tail', '200', 'openmaic'], cfg.env);
}
