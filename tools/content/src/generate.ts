import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { convertClassroom, sha256Hex } from '@xuexi/course-pack';
import type { Book, KnowledgePoint, LessonSpec, Unit } from '@xuexi/curriculum';
import type { OpenMaicClient } from './openmaic-client';
import { draftDir, type Paths } from './paths';
import { type ContentState, type LessonState, updateLesson } from './state';

export interface LessonContext {
  book: Book;
  unit: Unit;
  kp: KnowledgePoint;
  lesson: LessonSpec;
}

export interface SelectOptions {
  book?: string;
  unit?: string;
  kp?: string;
  lesson?: string;
  kind?: 'lecture' | 'technique';
  /** Regenerate even if already generated / approved. */
  force?: boolean;
  /** Regenerate lessons generated with an older prompt template. */
  stale?: boolean;
  limit?: number;
}

/** Pick the lessons a `gen` run should work on. */
export function selectLessons(
  all: LessonContext[],
  state: ContentState,
  opts: SelectOptions,
  templateVersion: string,
): LessonContext[] {
  const unitMatch = (c: LessonContext) =>
    !opts.unit || c.unit.id === opts.unit || `${c.book.id}.u${c.unit.index}` === opts.unit || String(c.unit.index) === opts.unit;
  const picked = all.filter((c) => {
    if (opts.book && c.book.id !== opts.book) return false;
    if (!unitMatch(c)) return false;
    if (opts.kp && c.kp.id !== opts.kp) return false;
    if (opts.lesson && c.lesson.id !== opts.lesson) return false;
    if (opts.kind && c.lesson.kind !== opts.kind) return false;
    const s = state.lessons[c.lesson.id];
    if (opts.force || opts.lesson) return true;
    if (!s) return true;
    if (s.status === 'failed' || s.status === 'rejected' || s.status === 'generating') return true;
    if (opts.stale && s.templateVersion !== templateVersion) return true;
    return false;
  });
  return opts.limit ? picked.slice(0, opts.limit) : picked;
}

export interface GenerateDeps {
  client: OpenMaicClient;
  paths: Paths;
  state: ContentState;
  buildRequirement: (ctx: LessonContext) => string;
  templateVersion: string;
  enableTTS: boolean;
  log: (line: string) => void;
  /** Max time to wait for one lesson, ms (default 40 min). */
  timeoutMs?: number;
  /** Poll interval override (tests). */
  pollMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function requirementFor(deps: GenerateDeps, ctx: LessonContext): string {
  let req = deps.buildRequirement(ctx);
  const prev = deps.state.lessons[ctx.lesson.id];
  if (prev?.status === 'rejected' && prev.reviewNote) {
    req += `\n\n家长对上一版的修改意见（务必遵守）：${prev.reviewNote}`;
  }
  return req;
}

/** Generate one lesson end-to-end into content/work/<lessonId>/draft. */
export async function generateLesson(deps: GenerateDeps, ctx: LessonContext): Promise<LessonState> {
  const { client, paths, state, log } = deps;
  const id = ctx.lesson.id;
  const sleep = deps.sleep ?? defaultSleep;
  const started = Date.now();
  const prev = state.lessons[id];
  const requirement = requirementFor(deps, ctx);
  const requirementHash = (await sha256Hex(new TextEncoder().encode(requirement))).slice(0, 16);

  let jobId = prev?.status === 'generating' && prev.requirementHash === requirementHash ? prev.jobId : undefined;
  let pollMs = deps.pollMs ?? 5000;
  if (jobId) {
    log(`  继续等待上次未完成的任务 ${jobId}`);
  } else {
    const submitted = await client.submit({ requirement, language: 'zh-CN', enableTTS: deps.enableTTS });
    jobId = submitted.jobId;
    pollMs = deps.pollMs ?? submitted.pollIntervalMs;
    updateLesson(paths.state, state, id, {
      status: 'generating',
      jobId,
      attempts: (prev?.attempts ?? 0) + 1,
      templateVersion: deps.templateVersion,
      requirementHash,
      error: undefined,
    });
  }

  const deadline = Date.now() + (deps.timeoutMs ?? 40 * 60_000);
  let lastMsg = '';
  let result: { id: string; warning?: string } | undefined;
  for (;;) {
    const job = await client.job(jobId);
    const msg = `${job.step ?? job.status} ${job.progress ?? 0}%${job.totalScenes ? ` (${job.scenesGenerated ?? 0}/${job.totalScenes} 页)` : ''}`;
    if (msg !== lastMsg) {
      log(`  ${msg}`);
      lastMsg = msg;
    }
    if (job.status === 'failed') throw new Error(`OpenMAIC 生成失败：${job.error ?? job.message ?? '未知错误'}`);
    if (job.done && job.result) {
      result = job.result;
      break;
    }
    if (Date.now() > deadline) throw new Error('等待超时，稍后重新运行 gen 会继续等待该任务');
    await sleep(pollMs);
  }

  const classroom = await client.classroom(result.id);
  const { lesson, assets, warnings } = convertClassroom(classroom, client.baseUrl);
  if (result.warning) warnings.unshift(`OpenMAIC：${result.warning}`);

  const dir = draftDir(paths, id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(paths.work, id, 'classroom.json'), JSON.stringify(classroom, null, 2));
  for (const asset of assets) {
    const bytes = await client.download(asset.url);
    const dest = join(dir, asset.path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, bytes);
  }
  const lessonJson = JSON.stringify(lesson);
  writeFileSync(join(dir, 'lesson.json'), lessonJson);
  const draftHash = await sha256Hex(new TextEncoder().encode(lessonJson));

  for (const w of warnings) log(`  ⚠ ${w}`);
  return updateLesson(paths.state, state, id, {
    status: 'generated',
    jobId: undefined,
    classroomId: result.id,
    generatedAt: new Date().toISOString(),
    generationSeconds: Math.round((Date.now() - started) / 1000),
    warnings,
    draftHash,
    error: undefined,
    reviewedAt: undefined,
  });
}

export interface GenerateSummary {
  ok: string[];
  failed: Array<{ id: string; error: string }>;
  /** True when the run stopped early (quota exhausted / access denied). */
  stopped?: boolean;
}

export async function generateMany(deps: GenerateDeps, lessons: LessonContext[], concurrency = 1): Promise<GenerateSummary> {
  const summary: GenerateSummary = { ok: [], failed: [] };
  let next = 0;
  let stopped = false;
  const worker = async () => {
    while (next < lessons.length && !stopped) {
      const i = next++;
      const ctx = lessons[i];
      deps.log(`[${i + 1}/${lessons.length}] ${ctx.lesson.id}  ${ctx.book.title} · ${ctx.kp.title} · ${ctx.lesson.title}`);
      try {
        await generateLesson(deps, ctx);
        summary.ok.push(ctx.lesson.id);
        deps.log(`  ✓ 已生成，等待审核`);
      } catch (e) {
        const error = (e as Error).message;
        summary.failed.push({ id: ctx.lesson.id, error });
        const s = deps.state.lessons[ctx.lesson.id];
        // Keep the job id when we timed out so the next run can resume polling.
        if (!(s?.status === 'generating' && error.includes('等待超时'))) {
          updateLesson(deps.paths.state, deps.state, ctx.lesson.id, {
            status: 'failed',
            jobId: undefined,
            error,
            attempts: s?.attempts ?? 1,
          });
        }
        deps.log(`  ✗ ${error}`);
        // Quota exhausted / access denied (e.g. hosted open.maic.chat: 10 generations a day):
        // every following lesson would fail the same way, so stop the run.
        if (/HTTP (401|403)\b/.test(error)) {
          stopped = true;
          summary.stopped = true;
          deps.log('  已停止：额度用完或访问码无效（HTTP 401/403），剩下的课下次再生成。');
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  return summary;
}
