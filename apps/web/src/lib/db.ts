import Dexie, { type Table } from 'dexie';
import type { FamilyDoc, LearningEvent } from '@xuexi/shared';

export interface StoredEvent {
  id: string;
  childId: string;
  at: number;
  /** 0 = not yet pushed to the sync server, 1 = pushed or pulled. */
  synced: 0 | 1;
  event: LearningEvent;
}

export interface KvRow {
  key: string;
  value: unknown;
}

class XuexiDb extends Dexie {
  events!: Table<StoredEvent, string>;
  kv!: Table<KvRow, string>;

  constructor() {
    super('xuexi');
    this.version(1).stores({
      events: 'id, childId, at, synced',
      kv: 'key',
    });
  }
}

export const db = new XuexiDb();

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await db.kv.get(key))?.value as T | undefined;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await db.kv.put({ key, value });
}

export const KV = {
  deviceId: 'deviceId',
  token: 'token',
  tokenExpiresAt: 'tokenExpiresAt',
  serverUrl: 'serverUrl',
  cursor: 'syncCursor',
  family: 'family',
  lastChild: 'lastChild',
} as const;

export async function getDeviceId(): Promise<string> {
  let id = await kvGet<string>(KV.deviceId);
  if (!id) {
    id = crypto.randomUUID();
    await kvSet(KV.deviceId, id);
  }
  return id;
}

export async function getCachedFamily(): Promise<FamilyDoc | undefined> {
  return kvGet<FamilyDoc>(KV.family);
}
