import type { ErrorTag, GeneratorId } from './catalog';

/**
 * Learning records are an append-only event log. Every device writes events
 * locally (IndexedDB) and syncs them through the sync API. Mastery, review
 * schedules and the mistake book are all derived from this log, so every
 * device computes the same state and sync never conflicts.
 */

export type PracticeMode =
  | 'kp' // 知识点专项
  | 'speed' // 口算速练
  | 'mistakes' // 错题重练
  | 'review' // 到期复习
  | 'unit-test' // 单元小测
  | 'daily'; // 今日任务

/** How to reproduce a question. */
export type QuestionRef =
  | { source: 'generator'; generatorId: GeneratorId; difficulty: number; seed: number; variant?: string }
  | { source: 'bank'; bankId: string; questionId: string };

interface EventBase {
  /** UUID, generated on the device; idempotency key for sync. */
  id: string;
  childId: string;
  /** Epoch milliseconds on the device. */
  at: number;
  deviceId: string;
}

export interface AttemptEvent extends EventBase {
  type: 'attempt';
  kpId: string;
  question: QuestionRef;
  correct: boolean;
  /** The child's answer, as produced by the answer widget (JSON). */
  response: unknown;
  errorTags: ErrorTag[];
  durationMs: number;
  mode: PracticeMode;
  /** True when the child used a hint before answering. */
  hinted?: boolean;
}

export interface LessonEvent extends EventBase {
  type: 'lesson';
  lessonId: string;
  packVersion: number;
  /** 0..1 fraction of actions played. */
  progress: number;
  completed: boolean;
  durationMs: number;
}

export type LearningEvent = AttemptEvent | LessonEvent;

export interface ChildProfile {
  id: string;
  name: string;
  grade: 2 | 4;
  avatar: string;
  /** Curriculum book ids, e.g. ["bsd-g4a"]. */
  bookIds: string[];
}

export interface FamilySettings {
  dailyMinutes: number;
  eyeBreakMinutes: number;
  /** Accuracy over the recent window required for mastery (0..1). */
  masteryAccuracy: number;
  /** SHA-256 hex of the parent PIN (salted with the family id). */
  parentPinHash?: string;
}

export interface FamilyDoc {
  children: ChildProfile[];
  settings: FamilySettings;
  /** Monotonic version for optimistic concurrency. */
  version: number;
  updatedAt: number;
}

export const DEFAULT_SETTINGS: FamilySettings = {
  dailyMinutes: 30,
  eyeBreakMinutes: 20,
  masteryAccuracy: 0.9,
};

// ---------------- Sync API contract ----------------

export interface AuthRequest {
  code: string;
}
export interface AuthResponse {
  token: string;
  expiresAt: number;
}

export interface PushEventsRequest {
  events: LearningEvent[];
}
export interface PushEventsResponse {
  accepted: number;
}

export interface PullEventsResponse {
  events: LearningEvent[];
  /** Opaque cursor; pass back as `after` to continue. */
  cursor: string;
  hasMore: boolean;
}

export interface PutFamilyRequest {
  doc: Omit<FamilyDoc, 'version' | 'updatedAt'>;
  baseVersion: number;
}
