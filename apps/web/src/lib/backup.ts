import type { ChildProfile, FamilyDoc, LearningEvent } from '@xuexi/shared';
import { db } from './db';

export const BACKUP_FORMAT = 'xuexi-backup@1';

export interface Backup {
  format: typeof BACKUP_FORMAT;
  exportedAt: string;
  family: Pick<FamilyDoc, 'children' | 'settings'>;
  events: LearningEvent[];
}

export async function buildBackup(family: FamilyDoc): Promise<Uint8Array> {
  const events = (await db.events.orderBy('at').toArray()).map((r) => r.event);
  const backup: Backup = {
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    family: { children: family.children, settings: family.settings },
    events,
  };
  return new TextEncoder().encode(JSON.stringify(backup));
}

export function parseBackup(bytes: Uint8Array): Backup {
  let data: Backup;
  try {
    data = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('这不是学习记录备份文件');
  }
  if (data?.format !== BACKUP_FORMAT || !Array.isArray(data.events) || !data.family) {
    throw new Error('这不是学习记录备份文件');
  }
  return data;
}

/** Children missing from `into` are appended (matched by id). */
export function mergeChildren(into: ChildProfile[], from: ChildProfile[]): ChildProfile[] {
  const ids = new Set(into.map((c) => c.id));
  return [...into, ...from.filter((c) => !ids.has(c.id))];
}

/** Add backup events that are not on this device yet. Returns how many were added. */
export async function restoreEvents(events: LearningEvent[]): Promise<number> {
  const existing = new Set((await db.events.bulkGet(events.map((e) => e.id))).filter(Boolean).map((r) => r!.id));
  const fresh = events.filter((e) => e && typeof e.id === 'string' && !existing.has(e.id));
  // synced: 0 → pushed to the family account if/when this device logs in.
  await db.events.bulkPut(fresh.map((e) => ({ id: e.id, childId: e.childId, at: e.at, synced: 0 as const, event: e })));
  return fresh.length;
}
