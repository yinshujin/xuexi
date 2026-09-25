/**
 * 写作任务: the writing tasks of a child's books, the pieces handed in (kept in
 * IndexedDB on this device, like the reading recordings), the parent's review,
 * and a LessonEvent "writing:<task id>" per piece so progress syncs.
 */
import { BOOKS, type Book, type KnowledgePoint, type Unit, type WritingTask } from '@xuexi/curriculum';
import { WRITING_EVENT_PREFIX, type ChildProfile, type LearningEvent, type LessonEvent } from '@xuexi/shared';
import { db, kvGet, kvSet, type WritingRow } from './db';

export type { WritingRow } from './db';

export interface WritingRef {
  book: Book;
  unit: Unit;
  kp: KnowledgePoint;
  task: WritingTask;
}

// ---------------------------------------------------------------- pure

/** Every writing task of the given books, in book order. */
export function writingTasks(bookIds: readonly string[]): WritingRef[] {
  return BOOKS.filter((b) => bookIds.includes(b.id)).flatMap((book) =>
    book.units.flatMap((unit) =>
      unit.knowledgePoints.flatMap((kp) => (kp.writing ? [{ book, unit, kp, task: kp.writing }] : [])),
    ),
  );
}

export function childWritingTasks(child: ChildProfile): WritingRef[] {
  return writingTasks(child.bookIds);
}

export function findWritingByKp(kpId: string): WritingRef | undefined {
  return writingTasks(BOOKS.map((b) => b.id)).find((r) => r.kp.id === kpId);
}

export function findWritingTask(taskId: string): WritingRef | undefined {
  return writingTasks(BOOKS.map((b) => b.id)).find((r) => r.task.id === taskId);
}

/** 字数 as a child counts squares: every character except spaces and line breaks (punctuation counts). */
export function countChars(text: string): number {
  return [...text].filter((ch) => !/\s/u.test(ch)).length;
}

/** How the typed text compares with the task's length: short (还差 n 字), ok, or long. */
export function lengthStatus(text: string, task: Pick<WritingTask, 'minChars' | 'maxChars'>): { count: number; missing: number; over: boolean } {
  const count = countChars(text);
  return { count, missing: Math.max(0, task.minChars - count), over: task.maxChars !== undefined && count > task.maxChars };
}

/** Size to draw a photo at so its long side is at most `max` px (never enlarged). */
export function scaledSize(width: number, height: number, max = 1600): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= max || long === 0) return { width, height };
  const k = max / long;
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) };
}

export const writingLessonId = (taskId: string) => WRITING_EVENT_PREFIX + taskId;

/** The LessonEvent recorded when a piece is handed in (synced, so other devices see the task as done). */
export function writingEvent(p: {
  id: string;
  childId: string;
  deviceId: string;
  taskId: string;
  at: number;
  durationMs: number;
}): LessonEvent {
  return {
    type: 'lesson',
    id: p.id,
    childId: p.childId,
    at: p.at,
    deviceId: p.deviceId,
    lessonId: writingLessonId(p.taskId),
    packVersion: 1,
    progress: 1,
    completed: true,
    durationMs: p.durationMs,
  };
}

/** Task ids handed in, from the (synced) event log. */
export function handedInTasks(events: LearningEvent[]): Map<string, { times: number; lastAt: number }> {
  const out = new Map<string, { times: number; lastAt: number }>();
  for (const e of events) {
    if (e.type !== 'lesson' || !e.completed || !e.lessonId.startsWith(WRITING_EVENT_PREFIX)) continue;
    const id = e.lessonId.slice(WRITING_EVENT_PREFIX.length);
    const h = out.get(id);
    out.set(id, { times: (h?.times ?? 0) + 1, lastAt: Math.max(h?.lastAt ?? 0, e.at) });
  }
  return out;
}

export type WritingStatus = 'new' | 'draft' | 'handed-in' | 'reviewed';

export const STATUS_LABEL: Record<WritingStatus, string> = {
  new: '还没写',
  draft: '写了一半',
  'handed-in': '已交，等点评',
  reviewed: '已点评',
};

/**
 * Status of a task: reviewed when the latest piece on this device has stars,
 * handed in when a piece or a synced event exists, draft when a draft is saved.
 */
export function taskStatus(
  taskId: string,
  pieces: Pick<WritingRow, 'taskId' | 'at' | 'stars'>[],
  handedIn: Map<string, unknown>,
  drafts: ReadonlySet<string> = new Set(),
): WritingStatus {
  const mine = pieces.filter((p) => p.taskId === taskId).sort((a, b) => b.at - a.at);
  if (mine[0]?.stars) return 'reviewed';
  if (mine.length > 0 || handedIn.has(taskId)) return 'handed-in';
  return drafts.has(taskId) ? 'draft' : 'new';
}

/** Pieces with a review the child has not opened yet. */
export const unseenReviews = (pieces: Pick<WritingRow, 'stars' | 'seenAt' | 'reviewedAt'>[]) =>
  pieces.filter((p) => p.stars && p.reviewedAt && (!p.seenAt || p.seenAt < p.reviewedAt)).length;

// ---------------------------------------------------------------- storage

export async function saveWriting(row: WritingRow): Promise<void> {
  await db.writings.put(row);
}

/** A child's pieces, newest first. */
export async function writingsOf(childId: string): Promise<WritingRow[]> {
  const rows = await db.writings.where('childId').equals(childId).toArray();
  return rows.sort((a, b) => b.at - a.at);
}

export async function reviewWriting(id: string, stars: 1 | 2 | 3, comment: string): Promise<void> {
  await db.writings.update(id, { stars, comment: comment.trim(), reviewedAt: Date.now() });
}

export async function markReviewsSeen(ids: string[]): Promise<void> {
  const now = Date.now();
  await Promise.all(ids.map((id) => db.writings.update(id, { seenAt: now })));
}

export async function deleteWriting(id: string): Promise<void> {
  await db.writings.delete(id);
}

/** Work in progress on a task (step, outline, text or photo), so the child can come back to it. */
export interface WritingDraft {
  step: number;
  outline: string[];
  mode?: 'photo' | 'type';
  text: string;
  photo?: Blob;
  checked: boolean[];
  startedAt: number;
}

const draftKey = (childId: string, taskId: string) => `writingDraft:${childId}:${taskId}`;

export const loadDraft = (childId: string, taskId: string) => kvGet<WritingDraft>(draftKey(childId, taskId));
export const saveDraft = (childId: string, taskId: string, d: WritingDraft) => kvSet(draftKey(childId, taskId), d);
export const clearDraft = (childId: string, taskId: string) => db.kv.delete(draftKey(childId, taskId));

/** Task ids with a saved draft. */
export async function draftTasks(childId: string): Promise<Set<string>> {
  const prefix = `writingDraft:${childId}:`;
  const keys = await db.kv.where('key').startsWith(prefix).primaryKeys();
  return new Set(keys.map((k) => String(k).slice(prefix.length)));
}

// ---------------------------------------------------------------- photos

/** Decode a photo (EXIF orientation applied) and re-encode it as a JPEG of at most `max` px. */
export async function downscalePhoto(file: Blob, max = 1600, quality = 0.85): Promise<Blob> {
  let source: ImageBitmap | HTMLImageElement;
  let width: number;
  let height: number;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    source = bmp;
    width = bmp.width;
    height = bmp.height;
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      source = img;
      width = img.naturalWidth;
      height = img.naturalHeight;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const size = scaledSize(width, height, max);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.drawImage(source, 0, 0, size.width, size.height);
  if ('close' in source) source.close();
  const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  return out ?? file;
}
