import { DatabaseSync } from 'node:sqlite';
import type { FamilyDoc, LearningEvent, PullEventsResponse } from '@xuexi/shared';
import {
  emptyFamily,
  InvalidCursorError,
  type FamilyDocInput,
  type PutFamilyResult,
  type Storage,
} from './storage';

/**
 * SQLite storage using Node's built-in `node:sqlite` (Node >= 22.13, no native
 * deps). Single file, WAL mode. Suitable for one family on a small server.
 *
 * Cursor format: `s<seq>` where seq is the events.seq autoincrement value.
 */
export class SqliteStorage implements Storage {
  readonly kind = 'sqlite' as const;
  readonly db: DatabaseSync;

  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA busy_timeout = 5000;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS family (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        json TEXT NOT NULL,
        version INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS events (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT NOT NULL UNIQUE,
        child_id TEXT NOT NULL,
        at INTEGER NOT NULL,
        json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS events_child_at ON events (child_id, at);
    `);
  }

  close(): void {
    this.db.close();
  }

  async getFamily(): Promise<FamilyDoc> {
    return this.readFamily();
  }

  private readFamily(): FamilyDoc {
    const row = this.db.prepare('SELECT json FROM family WHERE id = 1').get() as
      { json: string } | undefined;
    return row ? (JSON.parse(row.json) as FamilyDoc) : emptyFamily();
  }

  async putFamily(doc: FamilyDocInput, baseVersion: number): Promise<PutFamilyResult> {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const current = this.readFamily();
      if (current.version !== baseVersion) {
        this.db.exec('ROLLBACK');
        return { ok: false, current };
      }
      const next: FamilyDoc = {
        children: doc.children,
        settings: doc.settings,
        version: baseVersion + 1,
        updatedAt: Date.now(),
      };
      this.db
        .prepare(
          `INSERT INTO family (id, json, version, updated_at) VALUES (1, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET json = excluded.json, version = excluded.version,
             updated_at = excluded.updated_at`,
        )
        .run(JSON.stringify(next), next.version, next.updatedAt);
      this.db.exec('COMMIT');
      return { ok: true, doc: next };
    } catch (err) {
      if (this.db.isTransaction) this.db.exec('ROLLBACK');
      throw err;
    }
  }

  async appendEvents(events: LearningEvent[]): Promise<number> {
    if (events.length === 0) return 0;
    const insert = this.db.prepare(
      'INSERT OR IGNORE INTO events (id, child_id, at, json) VALUES (?, ?, ?, ?)',
    );
    let accepted = 0;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const e of events) {
        const r = insert.run(e.id, e.childId, Math.trunc(e.at), JSON.stringify(e));
        accepted += Number(r.changes);
      }
      this.db.exec('COMMIT');
    } catch (err) {
      if (this.db.isTransaction) this.db.exec('ROLLBACK');
      throw err;
    }
    return accepted;
  }

  async listEvents(after: string, limit: number): Promise<PullEventsResponse> {
    let afterSeq = 0;
    if (after !== '') {
      const m = /^s(\d{1,15})$/.exec(after);
      if (!m) throw new InvalidCursorError(after);
      afterSeq = Number(m[1]);
    }
    const rows = this.db
      .prepare('SELECT seq, json FROM events WHERE seq > ? ORDER BY seq LIMIT ?')
      .all(afterSeq, limit + 1) as { seq: number; json: string }[];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    return {
      events: page.map((r) => JSON.parse(r.json) as LearningEvent),
      cursor: last ? `s${last.seq}` : after,
      hasMore,
    };
  }

  /** Online backup to `destPath` (same as sqlite3's `.backup`). */
  async backupTo(destPath: string): Promise<void> {
    const { backup } = await import('node:sqlite');
    await backup(this.db, destPath);
  }
}
