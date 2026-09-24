import type { FamilyDoc, LearningEvent } from '@xuexi/shared';
import { api, ApiError } from './api';
import { db, KV, kvGet, kvSet } from './db';

export type SyncStatus =
  | { state: 'idle'; lastSyncAt?: number }
  | { state: 'syncing' }
  | { state: 'offline' }
  | { state: 'unauthorized' }
  | { state: 'error'; message: string };

let running: Promise<SyncStatus> | null = null;

/** Push local events, pull remote ones, refresh the family doc. Safe to call often. */
export function syncNow(onFamily?: (doc: FamilyDoc) => void): Promise<SyncStatus> {
  if (running) return running;
  running = (async (): Promise<SyncStatus> => {
    const token = await kvGet<string>(KV.token);
    if (!token) return { state: 'unauthorized' };
    try {
      // push
      for (;;) {
        const batch = await db.events.where('synced').equals(0).limit(200).toArray();
        if (batch.length === 0) break;
        await api.pushEvents(batch.map((b) => b.event));
        await db.events.bulkPut(batch.map((b) => ({ ...b, synced: 1 as const })));
      }
      // pull
      let cursor = (await kvGet<string>(KV.cursor)) ?? '';
      for (;;) {
        const page = await api.pullEvents(cursor);
        if (page.events.length) {
          const existing = new Set((await db.events.bulkGet(page.events.map((e) => e.id))).filter(Boolean).map((e) => e!.id));
          const fresh = page.events.filter((e) => !existing.has(e.id));
          await db.events.bulkPut(fresh.map((e) => ({ id: e.id, childId: e.childId, at: e.at, synced: 1 as const, event: e })));
        }
        cursor = page.cursor;
        await kvSet(KV.cursor, cursor);
        if (!page.hasMore) break;
      }
      const family = await api.getFamily();
      await kvSet(KV.family, family);
      onFamily?.(family);
      return { state: 'idle', lastSyncAt: Date.now() };
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return { state: 'unauthorized' };
      if (e instanceof ApiError && e.status === 0) return { state: 'offline' };
      return { state: 'error', message: (e as Error).message };
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

export async function recordEvent(event: LearningEvent): Promise<void> {
  await db.events.put({ id: event.id, childId: event.childId, at: event.at, synced: 0, event });
}

export async function loadEvents(childId: string): Promise<LearningEvent[]> {
  const rows = await db.events.where('childId').equals(childId).sortBy('at');
  return rows.map((r) => r.event);
}

export async function pendingCount(): Promise<number> {
  return db.events.where('synced').equals(0).count();
}
