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
import { loadState, updateLesson } from './state';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { authorBrief, authoredFile, importAuthored, listAuthored } from './authoring/import';
import { edgeEngine, sayEngine, ttsDraft } from './tts';
import { exportBundle, exportEachUnit } from './export';
import { bytes as fmtBytes } from './format-bytes';

const HELP = `用法：pnpm content <命令> [选项]

  openmaic up|down|status|logs   在本机用 Docker 启停 OpenMAIC（${OPENMAIC_VERSION}）
  mock [--port 3000]              启动模拟 OpenMAIC（不需要 Docker 和 API Key，用于试流程）
  list [--book bsd-g4a]           列出所有课（讲解课 / 技巧课）和它们的 id
  gen [选项]                      批量生成课程（断点续跑）
      --book bsd-g2a|bsd-g4a  --unit <单元序号或id>  --kp <知识点id>  --lesson <课id>
      --kind lecture|technique  --limit N  --concurrency N
      --force 重新生成已完成的课   --stale 重新生成旧模板生成的课
  status [--book X]               查看每节课的状态

  —— 用 WorkBuddy 等 AI 助手自己的模型写课（不需要 OpenMAIC 和模型 Key）——
  author-brief --lesson <课id> [--out 文件]
  author-brief --next [--book X] [--unit N] [--kind lecture|technique]
                                  输出写一节课所需的全部要求和"课件脚本"格式；
                                  --next 自动挑下一节还没有草稿的课
  import --lesson <课id> | --all  把 content/authored/<课id>.json 编译成草稿（自动验算算式）
  tts [--lesson <课id>] [--engine say|edge] [--voice 名称] [--force] [--concurrency N] [--tts-cache 目录]
                                  给没有语音的草稿配音：say = Mac 自带中文语音（免费、离线），
                                  edge = edge-tts（pip install edge-tts，免费、需联网）

  review [--port 5180]            打开本地审核页：逐课试播，通过 / 打回（写修改意见）
  approve --all | --book X [--unit N] | --lesson <课id> [--note 备注]
                                  不试播直接批准待审核的课（只在家长决定跳过逐课审核时用）
  build                           把审核通过的课打包成课程包，生成 catalog.json
  export [--book X] [--unit N] [--lesson 课id] [--out 文件.zip]
  export --each-unit [--book X] [--out 目录]   每个单元导出一个课程包文件，并生成清单 index.md
                                  把已打包的课导出成"课程包文件"（zip），用微信 / 网盘 / USB 传到
                                  平板或手机，在 App 家长模式 → 离线课程 → 从文件导入（不需要服务器）
  publish --target dir|edgeone|tencent [--no-web-build] [--init] [--allow-empty]
                                  组装站点并发布（dir 只生成 content/site；
                                  腾讯云第一次部署加 --init）

配置文件：content/openmaic.env（模型和语音 Key），content/publish.env（部署参数，参考 deploy/publish.env.example）`;

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
      init: { type: 'boolean' },
      'allow-empty': { type: 'boolean' },
      next: { type: 'boolean' },
      all: { type: 'boolean' },
      out: { type: 'string' },
      engine: { type: 'string' },
      voice: { type: 'string' },
      title: { type: 'string' },
      note: { type: 'string' },
      'tts-cache': { type: 'string' },
      'each-unit': { type: 'boolean' },
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
    case 'author-brief': {
      const state = loadState(paths.state);
      let ctx: LessonContext | undefined;
      if (values.lesson) {
        ctx = contexts().find((c) => c.lesson.id === values.lesson);
        if (!ctx) throw new Error(`没有这节课：${values.lesson}（用 pnpm content list 查看）`);
      } else if (values.next) {
        ctx = selectLessons(
          contexts(),
          state,
          { book: values.book, unit: values.unit, kind: values.kind as 'lecture' | 'technique' | undefined },
          lessonTemplateVersion,
        ).find((c) => {
          const st = state.lessons[c.lesson.id];
          return !st || st.status === 'rejected' || st.status === 'failed';
        });
        if (!ctx) {
          log('这个范围内的课都已经有草稿了。');
          return;
        }
      } else {
        throw new Error('用法：author-brief --lesson <课id> 或 author-brief --next [--book X] [--unit N]');
      }
      const brief = authorBrief(paths, state, ctx);
      if (values.out) {
        mkdirSync(dirname(values.out), { recursive: true });
        writeFileSync(values.out, brief);
        log(`已写入 ${values.out}（课 ${ctx.lesson.id}）`);
      } else {
        log(brief);
      }
      return;
    }
    case 'import': {
      const state = loadState(paths.state);
      const ids = values.all ? listAuthored(paths) : values.lesson ? [values.lesson] : [];
      if (ids.length === 0) throw new Error(`用法：import --lesson <课id> 或 import --all（读取 ${authoredFile(paths, '<课id>')}）`);
      const known = new Set(contexts().map((c) => c.lesson.id));
      let failed = 0;
      for (const id of ids) {
        if (!known.has(id)) {
          log(`✗ ${id}：课程目录里没有这节课`);
          failed++;
          continue;
        }
        const r = await importAuthored(paths, state, id);
        if (r.ok) {
          log(`✓ ${id} 已导入，等待配音和审核`);
          for (const w of r.warnings) log(`  ⚠ ${w}`);
        } else {
          failed++;
          log(`✗ ${id} 有 ${r.errors.length} 处错误，请修改 ${authoredFile(paths, id)} 后重新导入：`);
          for (const e of r.errors) log(`  - ${e}`);
        }
      }
      if (failed) process.exitCode = 1;
      return;
    }
    case 'tts': {
      const state = loadState(paths.state);
      const engine =
        values.engine === 'edge'
          ? edgeEngine(values.voice)
          : values.engine === 'say' || process.platform === 'darwin'
            ? sayEngine(values.voice)
            : null;
      if (!engine) throw new Error('这台电脑不是 Mac，请加 --engine edge（先 pip install edge-tts）');
      const ids = values.lesson
        ? [values.lesson]
        : Object.entries(state.lessons)
            .filter(([, st]) => st.status === 'generated' || st.status === 'rejected')
            .map(([id]) => id);
      for (const id of ids) {
        const n = await ttsDraft(paths, state, id, {
          engine,
          force: values.force,
          log,
          cacheDir: values['tts-cache'],
          concurrency: values.concurrency ? Number(values.concurrency) : 1,
        });
        log(`${n > 0 ? '✓' : '·'} ${id}：新配音 ${n} 句（${engine.name}）`);
      }
      return;
    }
    case 'export': {
      if (values['each-unit']) {
        const outDir = values.out ?? join(paths.content, 'exports');
        const all = exportEachUnit(paths, { book: values.book, outDir });
        for (const r of all) log(`✓ ${r.file}（${r.lessons.length} 节课，${fmtBytes(r.bytes)}）`);
        log(`共 ${all.length} 个课程包文件，清单见 ${join(outDir, 'index.md')}`);
        return;
      }
      const r = exportBundle(paths, {
        book: values.book,
        unit: values.unit,
        lesson: values.lesson,
        out: values.out,
        title: values.title,
      });
      log(`已导出 ${r.lessons.length} 节课（${fmtBytes(r.bytes)}）：${r.file}`);
      log('把这个文件发到平板或手机上，在 App 的 家长模式 → 离线课程 → 选择课程包文件。');
      if (r.bytes > 150 * 1024 * 1024) log('⚠ 文件较大，建议按单元分开导出（--unit N），导入更快、更省内存。');
      return;
    }
    case 'approve': {
      // Batch approval, for when the parent chooses to skip previewing each lesson.
      if (!values.all && !values.book && !values.lesson) {
        throw new Error('用法：approve --all | --book X [--unit N] | --lesson <课id> [--note 备注]（只批准待审核的课）');
      }
      const state = loadState(paths.state);
      const note = values.note ?? '批量通过（家长未逐节试播）';
      let n = 0;
      for (const c of contexts()) {
        if (values.book && c.book.id !== values.book) continue;
        if (values.unit && c.unit.id !== (/^\d+$/.test(values.unit) ? `${c.book.id}.u${values.unit}` : values.unit)) continue;
        if (values.lesson && c.lesson.id !== values.lesson) continue;
        const s = state.lessons[c.lesson.id];
        if (s?.status !== 'generated') continue;
        const missingAudio = s.warnings?.some((w) => w.includes('没有语音'));
        updateLesson(paths.state, state, c.lesson.id, { status: 'approved', reviewedAt: new Date().toISOString(), reviewNote: note });
        log(`✓ ${c.lesson.id}${missingAudio ? '  ⚠ 还没有配音' : ''}`);
        n++;
      }
      log(`已批准 ${n} 节课。运行 pnpm content build 打包。`);
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
      await assembleSite(paths, { buildWeb: !values['no-web-build'], log, allowEmpty: values['allow-empty'] });
      await publish(paths, target, readEnvFile(paths.publishEnv), log, { init: values.init });
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
