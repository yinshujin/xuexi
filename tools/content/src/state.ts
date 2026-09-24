import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export type LessonStatus = 'generating' | 'generated' | 'approved' | 'rejected' | 'failed';

export interface LessonState {
  status: LessonStatus;
  attempts: number;
  /** OpenMAIC job id while generating (lets an interrupted run resume polling). */
  jobId?: string;
  classroomId?: string;
  templateVersion?: string;
  requirementHash?: string;
  generatedAt?: string;
  generationSeconds?: number;
  warnings?: string[];
  error?: string;
  /** Parent's review note; for rejected lessons it is sent with the next generation. */
  reviewNote?: string;
  reviewedAt?: string;
  /** sha256 of draft lesson.json at generation time. */
  draftHash?: string;
  /** Last built pack version and the draft hash it was built from. */
  packVersion?: number;
  packHash?: string;
}

export interface ContentState {
  version: 1;
  lessons: Record<string, LessonState>;
}

export function loadState(path: string): ContentState {
  if (!existsSync(path)) return { version: 1, lessons: {} };
  const data = JSON.parse(readFileSync(path, 'utf8')) as ContentState;
  if (data.version !== 1 || typeof data.lessons !== 'object') throw new Error(`无法识别的 ${path}`);
  return data;
}

/** Atomic write (temp file + rename) so an interrupted run never corrupts state. */
export function saveState(path: string, state: ContentState): void {
  mkdirSync(dirname(path), { recursive: true });
  const sorted: ContentState = {
    version: 1,
    lessons: Object.fromEntries(Object.entries(state.lessons).sort(([a], [b]) => a.localeCompare(b))),
  };
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(sorted, null, 2) + '\n');
  renameSync(tmp, path);
}

export function updateLesson(
  path: string,
  state: ContentState,
  lessonId: string,
  patch: Partial<LessonState>,
): LessonState {
  const prev = state.lessons[lessonId] ?? { status: 'failed', attempts: 0 };
  const next = { ...prev, ...patch } as LessonState;
  for (const [k, v] of Object.entries(next)) if (v === undefined) delete (next as unknown as Record<string, unknown>)[k];
  state.lessons[lessonId] = next;
  saveState(path, state);
  return next;
}
