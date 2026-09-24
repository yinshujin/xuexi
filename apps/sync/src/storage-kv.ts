import type { FamilyDoc, LearningEvent, PullEventsResponse } from '@xuexi/shared';
import {
  emptyFamily,
  InvalidCursorError,
  type FamilyDocInput,
  type PutFamilyResult,
  type Storage,
} from './storage';

/**
 * The subset of the EdgeOne Pages KV namespace API we use. In an EdgeOne Edge
 * Function a namespace bound in the console is exposed as a global variable
 * (we bind it as `XUEXI_KV`).
 *
 * Verified against the EdgeOne CLI's local KV client (edgeone@1.6.41) and the
 * official `functions-kv` / `hono` templates:
 * - keys must match /^[A-Za-z0-9_]+$/ and be at most 512 bytes
 *   (so no ':' or '-' in keys!)
 * - values up to 25 MB
 * - get(key) returns text by default, null when missing
 * - list({prefix, limit, cursor}) -> {keys: [{key}], complete, cursor};
 *   the official template pages by passing the last returned key as `cursor`.
 * - eventual consistency: writes propagate to all edge nodes within ~60 s.
 */
export interface KVListResult {
  keys: { key: string }[];
  complete: boolean;
  cursor?: string;
}

export interface KVNamespaceLike {
  get(key: string, options?: { type: 'text' }): Promise<string | null | unknown>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(options: { prefix?: string; limit?: number; cursor?: string }): Promise<KVListResult>;
}

export interface KvStorageOptions {
  /** Clock, injectable for tests. */
  now?: () => number;
  /**
   * Chunks younger than this are not returned by listEvents, so a chunk that is
   * still propagating through the eventually-consistent KV cannot be skipped
   * by a cursor that already moved past it. Default 60 000 ms (the documented
   * KV propagation bound). Trade-off: other devices see new events ~1 min late.
   */
  settleMs?: number;
  /** Max serialized bytes per chunk value. Default 256 KiB. */
  maxChunkBytes?: number;
  /** How many recent event ids are kept for de-duplication. Default 20 000. */
  recentIdLimit?: number;
  /** Max chunk reads per listEvents call (bounds KV subrequests). Default 50. */
  maxChunkReads?: number;
  /** KV list page size. Default 100. */
  listPageSize?: number;
}

export const KV_KEYS = {
  family: 'family',
  recentIds: 'ids_recent',
  eventPrefix: 'ev_',
} as const;

const CHUNK_KEY_RE = /^ev_\d{13}_[a-z0-9]{1,16}_\d{2,6}$/;
const CURSOR_RE = /^(ev_\d{13}_[a-z0-9]{1,16}_\d{2,6})(?:~(\d{1,9}))?$/;

interface Chunk {
  v: 1;
  events: LearningEvent[];
}

/**
 * KV storage layout (EdgeOne Pages KV):
 *
 * - `family`       FamilyDoc JSON.
 * - `ev_<13-digit ms>_<rand>_<nn>`  an immutable chunk of events from one push
 *                  (a large push is split into parts nn = 00, 01, ...).
 *                  Key order == arrival order (lexicographic, zero-padded).
 * - `ids_recent`   JSON array of the most recent N event ids, used for
 *                  idempotent pushes.
 *
 * Why a bounded recent-id index instead of one `id_<eventId>` marker key per
 * event: markers cost one KV read + one KV write per event (a 500-event push
 * would be ~1000 subrequests and burn write quota), while the index costs one
 * read + one write per push. The trade-offs: (1) ids older than the window are
 * not de-duplicated, (2) two concurrent pushes can race on the index (KV has no
 * compare-and-swap), so a duplicate can occasionally be stored. Clients store
 * events keyed by `id` (IndexedDB put), so duplicates on pull are harmless.
 *
 * API cursor: `<chunkKey>` (chunk fully consumed) or `<chunkKey>~<n>` (first n
 * events of that chunk consumed), so `limit` is honoured exactly.
 */
export class KvStorage implements Storage {
  readonly kind = 'kv' as const;
  private readonly now: () => number;
  private readonly settleMs: number;
  private readonly maxChunkBytes: number;
  private readonly recentIdLimit: number;
  private readonly maxChunkReads: number;
  private readonly listPageSize: number;
  /** Last chunk timestamp written by this instance (keeps keys monotonic per isolate). */
  private lastTs = 0;

  constructor(
    private readonly kv: KVNamespaceLike,
    opts: KvStorageOptions = {},
  ) {
    this.now = opts.now ?? Date.now;
    this.settleMs = opts.settleMs ?? 60_000;
    this.maxChunkBytes = opts.maxChunkBytes ?? 256 * 1024;
    this.recentIdLimit = opts.recentIdLimit ?? 20_000;
    this.maxChunkReads = opts.maxChunkReads ?? 50;
    this.listPageSize = opts.listPageSize ?? 100;
  }

  private async getText(key: string): Promise<string | null> {
    const v = await this.kv.get(key, { type: 'text' });
    if (v === null || v === undefined) return null;
    if (typeof v === 'string') return v;
    // Defensive: some runtimes may hand back parsed JSON.
    return JSON.stringify(v);
  }

  async getFamily(): Promise<FamilyDoc> {
    const raw = await this.getText(KV_KEYS.family);
    return raw ? (JSON.parse(raw) as FamilyDoc) : emptyFamily();
  }

  /**
   * Optimistic concurrency is best effort on KV: read-compare-write is not
   * atomic, and reads may be up to ~60 s stale on other edge nodes. For one
   * family editing settings occasionally this is acceptable.
   */
  async putFamily(doc: FamilyDocInput, baseVersion: number): Promise<PutFamilyResult> {
    const current = await this.getFamily();
    if (current.version !== baseVersion) return { ok: false, current };
    const next: FamilyDoc = {
      children: doc.children,
      settings: doc.settings,
      version: baseVersion + 1,
      updatedAt: this.now(),
    };
    await this.kv.put(KV_KEYS.family, JSON.stringify(next));
    return { ok: true, doc: next };
  }

  private async readRecentIds(): Promise<string[]> {
    const raw = await this.getText(KV_KEYS.recentIds);
    if (!raw) return [];
    try {
      const v = JSON.parse(raw) as unknown;
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }

  async appendEvents(events: LearningEvent[]): Promise<number> {
    if (events.length === 0) return 0;
    const recent = await this.readRecentIds();
    const seen = new Set(recent);
    const fresh: LearningEvent[] = [];
    for (const e of events) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      fresh.push(e);
    }
    if (fresh.length === 0) return 0;

    // Same-millisecond pushes from one isolate still get increasing keys;
    // across isolates/nodes the settle window covers clock ordering.
    this.lastTs = Math.max(Math.trunc(this.now()), this.lastTs + 1);
    const ts = String(this.lastTs).padStart(13, '0');
    const rand = randomToken();
    const parts = splitBySize(fresh, this.maxChunkBytes);
    // Write chunks first, then the index: a failure in between means a retry
    // may store duplicates (harmless) rather than lose events.
    for (let i = 0; i < parts.length; i++) {
      const key = `${KV_KEYS.eventPrefix}${ts}_${rand}_${String(i).padStart(2, '0')}`;
      const chunk: Chunk = { v: 1, events: parts[i] };
      await this.kv.put(key, JSON.stringify(chunk));
    }
    const nextRecent = recent.concat(fresh.map((e) => e.id));
    const trimmed =
      nextRecent.length > this.recentIdLimit
        ? nextRecent.slice(nextRecent.length - this.recentIdLimit)
        : nextRecent;
    await this.kv.put(KV_KEYS.recentIds, JSON.stringify(trimmed));
    return fresh.length;
  }

  private async readChunk(key: string): Promise<LearningEvent[]> {
    const raw = await this.getText(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Chunk;
    return Array.isArray(parsed.events) ? parsed.events : [];
  }

  async listEvents(after: string, limit: number): Promise<PullEventsResponse> {
    let afterKey = '';
    let afterOffset: number | undefined;
    if (after !== '') {
      const m = CURSOR_RE.exec(after);
      if (!m) throw new InvalidCursorError(after);
      afterKey = m[1];
      afterOffset = m[2] === undefined ? undefined : Number(m[2]);
    }

    const cutoff = this.now() - this.settleMs;
    const out: LearningEvent[] = [];
    let cursor = after;
    let reads = 0;

    // 1. Finish a partially consumed chunk.
    if (afterKey && afterOffset !== undefined) {
      const rest = (await this.readChunk(afterKey)).slice(afterOffset);
      reads++;
      const take = rest.slice(0, limit);
      out.push(...take);
      if (take.length < rest.length) {
        return { events: out, cursor: `${afterKey}~${afterOffset + take.length}`, hasMore: true };
      }
      cursor = afterKey;
    }

    // 2. Walk chunk keys in order.
    let lastSeen = afterKey;
    let listCursor: string | undefined = afterKey || undefined;
    for (;;) {
      const page = await this.kv.list({
        prefix: KV_KEYS.eventPrefix,
        limit: this.listPageSize,
        cursor: listCursor,
      });
      const keys = page.keys
        .map((k) => k.key)
        .filter((k) => CHUNK_KEY_RE.test(k) && k > lastSeen)
        .sort();
      for (const key of keys) {
        if (chunkTs(key) > cutoff) {
          // Not settled yet; keys are ordered, so everything after is newer.
          return { events: out, cursor, hasMore: false };
        }
        if (out.length >= limit || reads >= this.maxChunkReads) {
          return { events: out, cursor, hasMore: true };
        }
        const events = await this.readChunk(key);
        reads++;
        lastSeen = key;
        const need = limit - out.length;
        if (events.length > need) {
          out.push(...events.slice(0, need));
          return { events: out, cursor: `${key}~${need}`, hasMore: true };
        }
        out.push(...events);
        cursor = key;
      }
      if (page.complete || page.keys.length === 0) break;
      const next = page.cursor || page.keys[page.keys.length - 1]?.key;
      if (!next || next === listCursor) break;
      listCursor = next;
    }
    return { events: out, cursor, hasMore: false };
  }
}

function chunkTs(key: string): number {
  return Number(key.slice(3, 16));
}

function randomToken(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const encoder = new TextEncoder();

/** Splits events into groups whose `{"v":1,"events":[...]}` JSON stays under maxBytes. */
export function splitBySize(events: LearningEvent[], maxBytes: number): LearningEvent[][] {
  const overhead = 32;
  const parts: LearningEvent[][] = [];
  let cur: LearningEvent[] = [];
  let size = overhead;
  for (const e of events) {
    const n = encoder.encode(JSON.stringify(e)).length + 1;
    if (cur.length > 0 && size + n > maxBytes) {
      parts.push(cur);
      cur = [];
      size = overhead;
    }
    cur.push(e);
    size += n;
  }
  if (cur.length > 0) parts.push(cur);
  return parts;
}
