import type { FamilyDoc, LearningEvent, PullEventsResponse, PutFamilyRequest } from '@xuexi/shared';
import { DEFAULT_SETTINGS } from '@xuexi/shared';

/** The part of the family doc a client may write. */
export type FamilyDocInput = PutFamilyRequest['doc'];

export type PutFamilyResult = { ok: true; doc: FamilyDoc } | { ok: false; current: FamilyDoc };

/**
 * Persistence for the sync API. Two implementations share the same contract
 * tests: SQLite (Node / Tencent Cloud server) and KV (EdgeOne Pages).
 */
export interface Storage {
  readonly kind: 'sqlite' | 'kv';
  /** Returns the family doc, or an empty version-0 doc if none was ever written. */
  getFamily(): Promise<FamilyDoc>;
  /**
   * Replaces the family doc if `baseVersion` equals the stored version.
   * On success the stored doc gets `version = baseVersion + 1`.
   */
  putFamily(doc: FamilyDocInput, baseVersion: number): Promise<PutFamilyResult>;
  /**
   * Appends events in the given order. Events whose id was already stored are
   * ignored (idempotent push). Returns how many events were newly stored.
   */
  appendEvents(events: LearningEvent[]): Promise<number>;
  /**
   * Lists events in server arrival order, strictly after the opaque `after`
   * cursor ('' = from the beginning). Throws InvalidCursorError for a cursor
   * this storage did not produce.
   */
  listEvents(after: string, limit: number): Promise<PullEventsResponse>;
}

export class InvalidCursorError extends Error {
  constructor(cursor: string) {
    super(`invalid cursor: ${cursor.slice(0, 64)}`);
    this.name = 'InvalidCursorError';
  }
}

export function emptyFamily(): FamilyDoc {
  return { children: [], settings: { ...DEFAULT_SETTINGS }, version: 0, updatedAt: 0 };
}
