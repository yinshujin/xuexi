import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sha256Hex } from '@xuexi/course-pack';
import { buildGenerationRequirement } from '@xuexi/curriculum';
import type { LessonContext } from '../generate';
import { draftDir, type Paths } from '../paths';
import { type ContentState, updateLesson } from '../state';
import { compileAuthored } from './compile';
import { EXAMPLE_LESSON, FORMAT_SPEC } from './format';

export const AUTHORED_TEMPLATE = 'authored-1';

export function authoredDir(paths: Paths): string {
  return join(paths.content, 'authored');
}

export function authoredFile(paths: Paths, lessonId: string): string {
  return join(authoredDir(paths), `${lessonId}.json`);
}

/** Everything an agent needs to write one lesson in the authored format. */
export function authorBrief(paths: Paths, state: ContentState, ctx: LessonContext): string {
  const s = state.lessons[ctx.lesson.id];
  const note = s?.status === 'rejected' && s.reviewNote ? `\n\n## 家长对上一版的修改意见（务必遵守）\n${s.reviewNote}\n` : '';
  return [
    `# 写一节课：${ctx.lesson.title}`,
    '',
    `课 id：${ctx.lesson.id}`,
    `保存到：${authoredFile(paths, ctx.lesson.id)}`,
    `写好后运行：pnpm content import --lesson ${ctx.lesson.id}（有错误会列出来，改好再导入）`,
    '',
    '## 这节课的要求',
    buildGenerationRequirement(ctx),
    note,
    FORMAT_SPEC,
    '## 示例（只示意格式，内容要按本课要求重写）',
    '```json',
    JSON.stringify({ ...EXAMPLE_LESSON, lessonId: ctx.lesson.id }, null, 2),
    '```',
  ].join('\n');
}

export interface ImportResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/** Compile content/authored/<id>.json into content/work/<id>/draft. */
export async function importAuthored(paths: Paths, state: ContentState, lessonId: string): Promise<ImportResult> {
  const file = authoredFile(paths, lessonId);
  if (!existsSync(file)) return { ok: false, errors: [`找不到 ${file}`], warnings: [] };
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    return { ok: false, errors: [`JSON 格式错误：${(e as Error).message}`], warnings: [] };
  }
  const { lesson, errors, warnings } = compileAuthored(json, lessonId);
  if (!lesson) return { ok: false, errors, warnings };

  const dir = draftDir(paths, lessonId);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const text = JSON.stringify(lesson);
  writeFileSync(join(dir, 'lesson.json'), text);
  const prev = state.lessons[lessonId];
  updateLesson(paths.state, state, lessonId, {
    status: 'generated',
    attempts: (prev?.attempts ?? 0) + 1,
    templateVersion: AUTHORED_TEMPLATE,
    generatedAt: new Date().toISOString(),
    draftHash: await sha256Hex(new TextEncoder().encode(text)),
    warnings: ['AI 助手编写的课件脚本，还没有语音（运行 pnpm content tts 配音）', ...warnings],
    classroomId: undefined,
    jobId: undefined,
    error: undefined,
    reviewedAt: undefined,
  });
  return { ok: true, errors, warnings };
}

export function listAuthored(paths: Paths): string[] {
  const dir = authoredDir(paths);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5))
    .sort();
}
