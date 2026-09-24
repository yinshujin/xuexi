import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@xuexi/shared';
import { configFromEnv } from '../src/config';
import { onRequest } from '../src/edgeone';
import { KvStorage, KV_KEYS, splitBySize } from '../src/storage-kv';
import { SqliteStorage } from '../src/storage-sqlite';
import { FakeKV } from './fake-kv';
import { attempt, events, FAMILY_CODE, TOKEN_SECRET } from './helpers';

describe('SqliteStorage', () => {
  it('persists to a file across reopen and backs up online', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'xuexi-sync-'));
    try {
      const path = join(dir, 'db', 'x.db');
      const { mkdirSync } = await import('node:fs');
      mkdirSync(join(dir, 'db'));
      const s1 = new SqliteStorage(path);
      const evts = events(3);
      expect(await s1.appendEvents(evts)).toBe(3);
      const put = await s1.putFamily({ children: [], settings: DEFAULT_SETTINGS }, 0);
      expect(put.ok).toBe(true);
      const mode = s1.db.prepare('PRAGMA journal_mode').get() as { journal_mode: string };
      expect(mode.journal_mode).toBe('wal');
      const backupPath = join(dir, 'backup.db');
      await s1.backupTo(backupPath);
      s1.close();

      const s2 = new SqliteStorage(path);
      expect((await s2.getFamily()).version).toBe(1);
      const page = await s2.listEvents('', 10);
      expect(page.events.map((e) => e.id)).toEqual(evts.map((e) => e.id));
      expect(await s2.appendEvents(evts)).toBe(0);
      s2.close();

      expect(existsSync(backupPath)).toBe(true);
      const b = new DatabaseSync(backupPath);
      expect((b.prepare('SELECT count(*) AS n FROM events').get() as { n: number }).n).toBe(3);
      b.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('KvStorage', () => {
  it('uses only keys that EdgeOne KV accepts', async () => {
    const kv = new FakeKV();
    const s = new KvStorage(kv, { settleMs: 0 });
    await s.appendEvents(events(3));
    await s.putFamily({ children: [], settings: DEFAULT_SETTINGS }, 0);
    for (const k of kv.data.keys()) expect(k).toMatch(/^[A-Za-z0-9_]{1,512}$/);
    expect([...kv.data.keys()].sort()).toEqual(
      expect.arrayContaining([KV_KEYS.family, KV_KEYS.recentIds]),
    );
  });

  it('writes one chunk per push and splits large pushes by size', async () => {
    const kv = new FakeKV();
    let t = 1_760_000_000_000;
    const s = new KvStorage(kv, { now: () => t++, settleMs: 0, maxChunkBytes: 4096 });
    await s.appendEvents(events(2));
    const big = events(60);
    expect(await s.appendEvents(big)).toBe(60);
    const chunkKeys = [...kv.data.keys()].filter((k) => k.startsWith('ev_')).sort();
    expect(chunkKeys.length).toBeGreaterThan(2);
    for (const k of chunkKeys) expect(kv.data.get(k)!.length).toBeLessThanOrEqual(4096);
    // parts of one push share the timestamp/random prefix
    const prefixes = new Set(chunkKeys.map((k) => k.replace(/_\d+$/, '')));
    expect(prefixes.size).toBe(2);

    const page = await s.listEvents('', 1000);
    expect(page.events).toHaveLength(62);
    expect(page.events.slice(2).map((e) => e.id)).toEqual(big.map((e) => e.id));
  });

  it('splitBySize keeps order and never produces empty parts', () => {
    const evts = events(10);
    const parts = splitBySize(evts, 1);
    expect(parts).toHaveLength(10);
    expect(parts.flat()).toEqual(evts);
    expect(splitBySize(evts, 1e9)).toEqual([evts]);
  });

  it('hides chunks younger than the settle window', async () => {
    let t = 1_760_000_000_000;
    const s = new KvStorage(new FakeKV(), { now: () => t, settleMs: 60_000 });
    await s.appendEvents(events(2));
    t += 1_000;
    expect(await s.listEvents('', 10)).toEqual({ events: [], cursor: '', hasMore: false });
    t += 30_000;
    await s.appendEvents(events(1));
    t += 30_000; // first push is 61 s old, second 30 s
    const p1 = await s.listEvents('', 10);
    expect(p1.events).toHaveLength(2);
    expect(p1.hasMore).toBe(false);
    t += 31_000;
    const p2 = await s.listEvents(p1.cursor, 10);
    expect(p2.events).toHaveLength(1);
  });

  it('bounds chunk reads per request and reports hasMore', async () => {
    let t = 1_760_000_000_000;
    const kv = new FakeKV();
    const s = new KvStorage(kv, { now: () => t++, settleMs: 0, maxChunkReads: 3 });
    for (let i = 0; i < 7; i++) await s.appendEvents([attempt()]);
    const p1 = await s.listEvents('', 100);
    expect(p1.events).toHaveLength(3);
    expect(p1.hasMore).toBe(true);
    const p2 = await s.listEvents(p1.cursor, 100);
    const p3 = await s.listEvents(p2.cursor, 100);
    expect(p2.events).toHaveLength(3);
    expect(p3.events).toHaveLength(1);
    expect(p3.hasMore).toBe(false);
  });

  it('forgets ids beyond the recent-id window (documented trade-off)', async () => {
    const s = new KvStorage(new FakeKV(), { settleMs: 0, recentIdLimit: 3 });
    const [a, b, c, d] = events(4);
    expect(await s.appendEvents([a, b, c, d])).toBe(4);
    expect(await s.appendEvents([b, c, d])).toBe(0);
    expect(await s.appendEvents([a])).toBe(1); // a fell out of the window
  });
});

describe('EdgeOne entry', () => {
  const env = { FAMILY_CODE, TOKEN_SECRET, KV_SETTLE_MS: '0' };

  it('reports missing KV binding and missing env', async () => {
    delete globalThis.XUEXI_KV;
    let r = await onRequest({ request: new Request('https://x.test/api/health'), env });
    expect(r.status).toBe(503);
    globalThis.XUEXI_KV = new FakeKV();
    r = await onRequest({ request: new Request('https://x.test/api/health'), env: {} });
    expect(r.status).toBe(503);
    expect(await r.json()).toMatchObject({ error: 'not_configured' });
  });

  it('serves the API from the bound XUEXI_KV global', async () => {
    const kv = new FakeKV();
    globalThis.XUEXI_KV = kv;
    const call = (path: string, init: RequestInit = {}) =>
      onRequest({
        request: new Request(`https://family.example.com${path}`, init),
        env,
        eo: { clientIp: '203.0.113.1' },
      });
    const health = await call('/api/health');
    expect(await health.json()).toEqual({ ok: true, storage: 'kv' });

    const auth = await call('/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: FAMILY_CODE }),
    });
    const { token } = (await auth.json()) as { token: string };
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    const push = await call('/api/events', {
      method: 'POST',
      headers,
      body: JSON.stringify({ events: events(2) }),
    });
    expect(await push.json()).toEqual({ accepted: 2 });
    const pull = await call('/api/events?after=', { headers });
    expect(((await pull.json()) as { events: unknown[] }).events).toHaveLength(2);
    expect([...kv.data.keys()].some((k) => k.startsWith('ev_'))).toBe(true);
    const slash = await call('/api/family/', { headers });
    expect(slash.status).toBe(200);
    delete globalThis.XUEXI_KV;
  });

  it('rate-limits by request.eo.clientIp (as the EdgeOne wrapper passes it)', async () => {
    globalThis.XUEXI_KV = new FakeKV();
    // The EdgeOne wrapper calls onRequest({request, params, env}); the client IP
    // lives on request.eo. Bodies without content-length make bodyLimit rebuild
    // the Request, which must not lose the IP.
    const attemptAuth = (ip: string) => {
      const stream = new ReadableStream({
        start(ctrl) {
          ctrl.enqueue(new TextEncoder().encode(JSON.stringify({ code: 'wrong-wrong' })));
          ctrl.close();
        },
      });
      const request = new Request('https://family.example.com/api/auth', {
        method: 'POST',
        body: stream,
        duplex: 'half',
      } as RequestInit);
      (request as Request & { eo?: unknown }).eo = { clientIp: ip };
      return onRequest({ request, params: {}, env: { ...env, TOKEN_SECRET: TOKEN_SECRET + 'rl' } });
    };
    for (let i = 0; i < 10; i++) expect((await attemptAuth('192.0.2.1')).status).toBe(401);
    expect((await attemptAuth('192.0.2.1')).status).toBe(429);
    expect((await attemptAuth('192.0.2.2')).status).toBe(401);
    delete globalThis.XUEXI_KV;
  });
});

describe('configFromEnv', () => {
  it('enforces minimum secret lengths', () => {
    expect(() => configFromEnv({})).toThrow(/FAMILY_CODE/);
    expect(() => configFromEnv({ FAMILY_CODE: 'short', TOKEN_SECRET: 'x'.repeat(40) })).toThrow(
      /FAMILY_CODE/,
    );
    expect(() =>
      configFromEnv({ FAMILY_CODE: 'long-enough', TOKEN_SECRET: 'x'.repeat(31) }),
    ).toThrow(/TOKEN_SECRET/);
    const c = configFromEnv({
      FAMILY_CODE: 'long-enough',
      TOKEN_SECRET: 'x'.repeat(32),
      CORS_ORIGINS: 'https://a.example, https://b.example',
    });
    expect(c.corsOrigins).toEqual(['https://a.example', 'https://b.example']);
  });
});
