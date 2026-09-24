#!/usr/bin/env tsx
/**
 * 内容生成脚本：pnpm content <命令>
 * 所有 AI 内容都在这里提前生成，App 运行时不调用任何模型。
 */
import { parseArgs } from 'node:util';
import { allLessons, buildGenerationRequirement, lessonTemplateVersion } from '@xuexi/curriculum';
import { buildPacks } from './build';
import { readEnvFile } from './env';
import { generateMany, selectLessons, type LessonContext } from './generate';
import { startMockOpenMaic } from './mock/server';
import { OpenMaicClient } from './openmaic-client';
import { OPENMAIC_VERSION, openmaicDown, openmaicLogs, openmaicUp, pipelineConfig, waitHealthy } from './openmaic-docker';
import { getPaths } from './paths';
import { assembleSite, publish, type PublishTarget } from './publish';
import { startReviewServer } from './review-server';
import { run } from './run';
import { loadState } from './state';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const HELP = `用法：pnpm content <命令> [选项]

  openmaic up|down|status|logs   在本机用 Docker 启停 OpenMAIC（${OPENMAIC_VERSION}）
  mock [--port 3000]              启动模拟 OpenMAIC（不需要 Docker 和 API Key，用于试流程）
  list [--book bsd-g4a]           列出所有课（讲解课 / 技巧课）和它们的 id
  gen [选项]                      批量生成课程（断点续跑）
      --book bsd-g2a|bsd-g4a  --unit <单元序号或id>  --kp <知识点id>  --lesson <课id>
      --kind lecture|technique  --limit N  --concurrency N
      --force 重新生成已完成的课   --stale 重新生成旧模板生成的课
  status [--book X]               查看每节课的状态
  review [--port 5180]            打开本地审核页：逐课试播，通过 / 打回（写修改意见）
  build                           把审核通过的课打包成课程包，生成 catalog.json
  publish --target dir|edgeone|tencent [--no-web-build]
                                  组装站点并发布（dir 只生成 content/site）

配置文件：content/openmaic.env（模型和语音 Key），content/publish.env（部署参数）`;

function contexts(): LessonContext[] {
  return allLessons() as LessonContext[];
}

const STATUS_LABEL: Record<string, string> = {
  pending: '未生成',
  generating: '生成中',
  generated: '待审核',
  approved: '已通过',
  rejected: '已打回',
  failed: '失败',
};

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      book: { type: 'string' },
      unit: { type: 'string' },
      kp: { type: 'string' },
      lesson: { type: 'string' },
      kind: { type: 'string' },
      limit: { type: 'string' },
      concurrency: { type: 'string' },
      force: { type: 'boolean' },
      stale: { type: 'boolean' },
      port: { type: 'string' },
      target: { type: 'string' },
      'no-web-build': { type: 'boolean' },
      'no-build': { type: 'boolean' },
    },
  });
  const paths = getPaths();
  const log = (s: string) => console.log(s);
  const env = readEnvFile(paths.openmaicEnv);
  const cfg = pipelineConfig(env);

  switch (command) {
    case 'openmaic': {
      const sub = positionals[0];
      if (sub === 'up') await openmaicUp(paths, cfg, log);
      else if (sub === 'down') await openmaicDown(paths, cfg);
      else if (sub === 'status') await waitHealthy(cfg, log, 1);
      else if (sub === 'logs') await openmaicLogs(paths, cfg);
      else throw new Error('用法：pnpm content openmaic up|down|status|logs');
      return;
    }
    case 'mock': {
      const port = Number(values.port ?? 3000);
      await startMockOpenMaic({ port });
      log(`模拟 OpenMAIC 已启动：http://localhost:${port}（Ctrl+C 退出）`);
      log('另开一个终端运行：pnpm content gen --book bsd-g4a --limit 2');
      return new Promise(() => {});
    }
    case 'list': {
      for (const c of contexts()) {
        if (values.book && c.book.id !== values.book) continue;
        log(`${c.lesson.id.padEnd(52)} ${c.lesson.kind === 'lecture' ? '讲解' : '技巧'}  ${c.unit.index}. ${c.unit.title} · ${c.kp.title} · ${c.lesson.title}`);
      }
      return;
    }
    case 'gen': {
      const state = loadState(paths.state);
      const lessons = selectLessons(
        contexts(),
        state,
        {
          book: values.book,
          unit: values.unit,
          kp: values.kp,
          lesson: values.lesson,
          kind: values.kind as 'lecture' | 'technique' | undefined,
          force: values.force,
          stale: values.stale,
          limit: values.limit ? Number(values.limit) : undefined,
        },
        lessonTemplateVersion,
      );
      if (lessons.length === 0) {
        log('没有需要生成的课。用 status 查看进度，或加 --force / --stale。');
        return;
      }
      const client = new OpenMaicClient(cfg.openmaicUrl, cfg.accessCode);
      await client.health();
      log(`将生成 ${lessons.length} 节课（OpenMAIC：${cfg.openmaicUrl}，语音：${cfg.enableTTS ? '开' : '关'}）`);
      const summary = await generateMany(
        {
          client,
          paths,
          state,
          buildRequirement: (ctx) => buildGenerationRequirement(ctx),
          templateVersion: lessonTemplateVersion,
          enableTTS: cfg.enableTTS,
          log,
        },
        lessons,
        Number(values.concurrency ?? 1),
      );
      log(`\n完成：成功 ${summary.ok.length}，失败 ${summary.failed.length}。下一步：pnpm content review`);
      if (summary.failed.length) process.exitCode = 1;
      return;
    }
    case 'status': {
      const state = loadState(paths.state);
      const counts: Record<string, number> = {};
      for (const c of contexts()) {
        if (values.book && c.book.id !== values.book) continue;
        const s = state.lessons[c.lesson.id];
        const status = s?.status ?? 'pending';
        counts[status] = (counts[status] ?? 0) + 1;
        const extra = s?.error ? `  ${s.error.slice(0, 60)}` : s?.packVersion ? `  v${s.packVersion}` : '';
        log(`${(STATUS_LABEL[status] ?? status).padEnd(4)}  ${c.lesson.id}${extra}`);
      }
      log('\n' + Object.entries(counts).map(([k, v]) => `${STATUS_LABEL[k] ?? k} ${v}`).join('，'));
      return;
    }
    case 'review': {
      const state = loadState(paths.state);
      if (!values['no-build'] || !existsSync(join(paths.webDist, 'index.html'))) {
        log('构建 Web 应用（审核页）…');
        await run('pnpm', ['--filter', '@xuexi/web', 'build'], { cwd: paths.root });
      }
      const port = Number(values.port ?? 5180);
      await startReviewServer({ paths, state, lessons: contexts(), webDir: paths.webDist, port });
      log(`审核页：http://localhost:${port}/#/review （Ctrl+C 退出）`);
      return new Promise(() => {});
    }
    case 'build': {
      const state = loadState(paths.state);
      const r = await buildPacks(paths, state, contexts(), OPENMAIC_VERSION, log);
      log(`新打包 ${r.built.length}，未变化 ${r.unchanged.length}，跳过 ${r.skipped.length}`);
      for (const s of r.skipped) log(`  跳过 ${s.id}：${s.reason}`);
      log(`课程目录：${paths.catalog}（共 ${Object.keys(r.catalog.lessons).length} 节课）`);
      return;
    }
    case 'publish': {
      const target = (values.target ?? 'dir') as PublishTarget;
      if (!['dir', 'edgeone', 'tencent'].includes(target)) throw new Error('--target 必须是 dir、edgeone 或 tencent');
      await assembleSite(paths, { buildWeb: !values['no-web-build'], log });
      await publish(paths, target, readEnvFile(paths.publishEnv), log);
      log('发布完成');
      return;
    }
    default:
      log(HELP);
  }
}

main().catch((e) => {
  console.error(`✗ ${(e as Error).message}`);
  process.exit(1);
});
