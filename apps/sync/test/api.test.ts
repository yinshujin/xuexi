import { DEFAULT_SETTINGS } from '@xuexi/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp, type AppConfig } from '../src/app';
import type { Storage } from '../src/storage';
import { KvStorage } from '../src/storage-kv';
import { SqliteStorage } from '../src/storage-sqlite';
import { FakeKV } from './fake-kv';
import { attempt, Client, events, FAMILY_CODE, lesson, TOKEN_SECRET } from './helpers';

/** A clock that advances 1 ms on every read, starting at a fixed instant. */
function tickingClock(start = 1_750_000_000_000) {
  let t = start;
  const now = () => t++;
  return { now, advance: (ms: number) => (t += ms), peek: () => t };
}

interface Backend {
  name: string;
  make(clock: () => number): Storage;
}

const backends: Backend[] = [
  { name: 'sqlite (memory)', make: () => new SqliteStorage(':memory:') },
  {
    name: 'kv (fake EdgeOne KV)',
    make: (now) => new KvStorage(new FakeKV(), { now, settleMs: 0 }),
  },
  {
    name: 'kv (small chunks, inclusive list cursor, page size 2)',
    make: (now) =>
      new KvStorage(new FakeKV({ inclusiveCursor: true }), {
        now,
        settleMs: 0,
        maxChunkBytes: 700,
        listPageSize: 2,
      }),
  },
];

describe.each(backends)('sync API on $name', ({ make }) => {
  let clock: ReturnType<typeof tickingClock>;
  let storage: Storage;
  let config: AppConfig;
  let client: Client;

  beforeEach(() => {
    clock = tickingClock();
    storage = make(clock.now);
    config = { familyCode: FAMILY_CODE, tokenSecret: TOKEN_SECRET, now: clock.now };
    client = new Client(createApp(storage, config));
  });

  afterEach(() => {
    if (storage instanceof SqliteStorage) storage.close();
  });

  describe('health', () => {
    it('reports storage kind without auth', async () => {
      const r = await client.req('GET', '/api/health');
      expect(r.status).toBe(200);
      expect(r.json).toEqual({ ok: true, storage: storage.kind });
    });
  });

  describe('auth', () => {
    it('issues a 90-day token for the right code', async () => {
      const before = clock.peek();
      const r = await client.login();
      expect(r.status).toBe(200);
      expect(typeof r.json.token).toBe('string');
      const ninety = 90 * 24 * 3600 * 1000;
      expect(r.json.expiresAt).toBeGreaterThanOrEqual(before + ninety);
      expect(r.json.expiresAt).toBeLessThan(before + ninety + 1000);
      expect((await client.req('GET', '/api/family')).status).toBe(200);
    });

    it('rejects a wrong code with 401', async () => {
      const r = await client.login('wrong-code-123');
      expect(r.status).toBe(401);
      expect(r.json.error).toBe('invalid_code');
      expect(client.token).toBe('');
    });

    it('rejects malformed auth bodies with 400', async () => {
      expect((await client.req('POST', '/api/auth', '{not json')).status).toBe(400);
      expect((await client.req('POST', '/api/auth', { code: 12345678 })).status).toBe(400);
      expect((await client.req('POST', '/api/auth', [])).status).toBe(400);
    });

    it('requires a bearer token on protected endpoints', async () => {
      for (const [m, p] of [
        ['GET', '/api/family'],
        ['PUT', '/api/family'],
        ['POST', '/api/events'],
        ['GET', '/api/events'],
      ] as const) {
        const r = await client.req(m, p, m === 'GET' ? undefined : {});
        expect(r.status, `${m} ${p}`).toBe(401);
      }
    });

    it('rejects tampered tokens and tokens signed with another secret or code', async () => {
      await client.login();
      const good = client.token;
      const [v, exp, sig] = good.split('.');
      const tampered = [
        `${v}.${(parseInt(exp, 36) + 1000).toString(36)}.${sig}`,
        `${v}.${exp}.${sig[0] === 'A' ? 'B' : 'A'}${sig.slice(1)}`,
        `v2.${exp}.${sig}`,
        'garbage',
        '',
      ];
      for (const t of tampered) {
        client.token = t;
        expect((await client.req('GET', '/api/family')).status, t).toBe(401);
      }

      const otherSecret = new Client(
        createApp(storage, { ...config, tokenSecret: 'y'.repeat(40) }),
      );
      otherSecret.token = good;
      expect((await otherSecret.req('GET', '/api/family')).status).toBe(401);

      const rotatedCode = new Client(
        createApp(storage, { ...config, familyCode: 'new-code-5678' }),
      );
      rotatedCode.token = good;
      expect((await rotatedCode.req('GET', '/api/family')).status).toBe(401);
    });

    it('rejects expired tokens', async () => {
      await client.login();
      clock.advance(89 * 24 * 3600 * 1000);
      expect((await client.req('GET', '/api/family')).status).toBe(200);
      clock.advance(2 * 24 * 3600 * 1000);
      const r = await client.req('GET', '/api/family');
      expect(r.status).toBe(401);
      expect(r.json.message).toMatch(/expired/);
    });

    it('rate-limits repeated failures per IP', async () => {
      for (let i = 0; i < 10; i++) expect((await client.login('bad-code-000')).status).toBe(401);
      const blocked = await client.login();
      expect(blocked.status).toBe(429);
      expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);

      const other = new Client(client.app, '198.51.100.9');
      expect((await other.login()).status).toBe(200);

      clock.advance(16 * 60 * 1000);
      expect((await client.login()).status).toBe(200);
    });
  });

  describe('family doc', () => {
    beforeEach(async () => {
      await client.login();
    });

    const doc = {
      children: [
        { id: 'kid-a', name: '小明', grade: 2, avatar: '🐼', bookIds: ['bsd-g2a'] },
        { id: 'kid-b', name: '小红', grade: 4, avatar: '🦊', bookIds: ['bsd-g4a'] },
      ],
      settings: { ...DEFAULT_SETTINGS, dailyMinutes: 25 },
    };

    it('starts empty at version 0', async () => {
      const r = await client.req('GET', '/api/family');
      expect(r.status).toBe(200);
      expect(r.json).toEqual({
        children: [],
        settings: DEFAULT_SETTINGS,
        version: 0,
        updatedAt: 0,
      });
      expect(r.headers.get('cache-control')).toBe('no-store');
    });

    it('applies optimistic concurrency', async () => {
      const r1 = await client.req('PUT', '/api/family', { doc, baseVersion: 0 });
      expect(r1.status).toBe(200);
      expect(r1.json).toMatchObject({ ...doc, version: 1 });
      expect(r1.json.updatedAt).toBeGreaterThan(0);

      const stale = await client.req('PUT', '/api/family', {
        doc: { ...doc, children: [] },
        baseVersion: 0,
      });
      expect(stale.status).toBe(409);
      expect(stale.json.current).toEqual(r1.json);

      const r2 = await client.req('PUT', '/api/family', {
        doc: { ...doc, settings: { ...doc.settings, eyeBreakMinutes: 15 } },
        baseVersion: 1,
      });
      expect(r2.status).toBe(200);
      expect(r2.json.version).toBe(2);

      const got = await client.req('GET', '/api/family');
      expect(got.json).toEqual(r2.json);

      const future = await client.req('PUT', '/api/family', { doc, baseVersion: 7 });
      expect(future.status).toBe(409);
      expect(future.json.current.version).toBe(2);
    });

    it('validates the doc', async () => {
      const bad: unknown[] = [
        { doc },
        { doc, baseVersion: -1 },
        { doc, baseVersion: 1.5 },
        { doc: { children: [] }, baseVersion: 0 },
        { doc: { ...doc, children: 'x' }, baseVersion: 0 },
        { doc: { ...doc, children: [{ ...doc.children[0], grade: 9 }] }, baseVersion: 0 },
        { doc: { ...doc, children: [doc.children[0], doc.children[0]] }, baseVersion: 0 },
        { doc: { ...doc, settings: { ...doc.settings, masteryAccuracy: 2 } }, baseVersion: 0 },
      ];
      for (const b of bad) {
        const r = await client.req('PUT', '/api/family', b);
        expect(r.status, JSON.stringify(b).slice(0, 120)).toBe(400);
        expect(r.json.error).toBe('invalid_request');
      }
      expect((await client.req('PUT', '/api/family', 'nope{')).status).toBe(400);
      expect((await client.req('GET', '/api/family')).json.version).toBe(0);
    });
  });

  describe('events', () => {
    beforeEach(async () => {
      await client.login();
    });

    it('returns an empty log from the beginning', async () => {
      const r = await client.pull('');
      expect(r.status).toBe(200);
      expect(r.json).toEqual({ events: [], cursor: '', hasMore: false });
    });

    it('is idempotent by event id', async () => {
      const batch = events(5);
      expect((await client.push(batch)).json).toEqual({ accepted: 5 });
      expect((await client.push(batch)).json).toEqual({ accepted: 0 });

      const extra = attempt();
      const r = await client.push([batch[0], extra, extra, batch[4]]);
      expect(r.json).toEqual({ accepted: 1 });

      const all = await client.pullAll('', 100);
      expect(all.events.map((e) => e.id)).toEqual([...batch, extra].map((e) => e.id));
      expect(all.events[0]).toEqual(batch[0]);
    });

    it('accepts an empty batch', async () => {
      expect((await client.push([])).json).toEqual({ accepted: 0 });
    });

    it('pages with cursors across multiple pushes in arrival order', async () => {
      const a = events(4);
      const b = events(3);
      const c = events(5);
      await client.push(a);
      await client.push(b);

      const p1 = await client.pull('', 3);
      expect(p1.json.events.map((e: any) => e.id)).toEqual(a.slice(0, 3).map((e) => e.id));
      expect(p1.json.hasMore).toBe(true);
      expect(typeof p1.json.cursor).toBe('string');

      const p2 = await client.pull(p1.json.cursor, 3);
      expect(p2.json.events.map((e: any) => e.id)).toEqual([a[3], b[0], b[1]].map((e) => e.id));
      expect(p2.json.hasMore).toBe(true);

      const p3 = await client.pull(p2.json.cursor, 3);
      expect(p3.json.events.map((e: any) => e.id)).toEqual([b[2].id]);
      expect(p3.json.hasMore).toBe(false);

      // Nothing new: cursor stays usable and returns nothing.
      const p4 = await client.pull(p3.json.cursor, 3);
      expect(p4.json).toEqual({ events: [], cursor: p3.json.cursor, hasMore: false });

      // New events after the cursor are picked up.
      await client.push(c);
      const rest = await client.pullAll(p3.json.cursor, 2);
      expect(rest.events.map((e) => e.id)).toEqual(c.map((e) => e.id));

      // Full replay from the beginning with an odd page size.
      const all = await client.pullAll('', 4);
      expect(all.events.map((e) => e.id)).toEqual([...a, ...b, ...c].map((e) => e.id));
      expect(all.cursor).toBe(rest.cursor);
    });

    it('clamps limit and uses defaults', async () => {
      await client.push(events(12));
      const r = await client.pull('');
      expect(r.json.events).toHaveLength(12);
      const big = await client.pull('', 999_999);
      expect(big.status).toBe(200);
      expect(big.json.events).toHaveLength(12);
    });

    it('rejects malformed events with 400 and stores nothing', async () => {
      const good = attempt();
      const cases: Array<[string, unknown]> = [
        ['not an object', 5],
        ['missing id', { ...attempt(), id: undefined }],
        ['bad id chars', { ...attempt(), id: 'has space' }],
        ['unknown type', { ...attempt(), type: 'hack' }],
        ['bad question', { ...attempt(), question: { source: 'x' } }],
        ['bad mode', { ...attempt(), mode: 'party' }],
        ['bad correct', { ...attempt(), correct: 'yes' }],
        ['bad errorTags', { ...attempt(), errorTags: [1] }],
        ['bad at', { ...attempt(), at: 'now' }],
        ['bad lesson progress', { ...lesson(), progress: 2 }],
        ['bad exam score', { ...lesson(), examScore: 120 }],
        ['huge event', { ...attempt(), response: 'x'.repeat(20_000) }],
      ];
      for (const [name, bad] of cases) {
        const r = await client.push([good, bad]);
        expect(r.status, name).toBe(400);
        expect(r.json.error, name).toBe('invalid_event');
        expect(r.json.message, name).toMatch(/^events\[1\]/);
      }
      expect((await client.req('POST', '/api/events', { nope: [] })).status).toBe(400);
      expect((await client.req('POST', '/api/events', '[[[')).status).toBe(400);
      expect((await client.pull('')).json.events).toEqual([]);
    });

    it('caps batch size and body size', async () => {
      const tooMany = await client.push(events(501));
      expect(tooMany.status).toBe(413);
      expect(tooMany.json.error).toBe('batch_too_large');

      const huge = JSON.stringify({ events: [], pad: 'x'.repeat(2 * 1024 * 1024 + 10) });
      const r = await client.req('POST', '/api/events', huge);
      expect(r.status).toBe(413);

      expect((await client.push(events(500))).json).toEqual({ accepted: 500 });
      const all = await client.pullAll('', 1000);
      expect(all.events).toHaveLength(500);
    });

    it('rejects bad cursors and limits', async () => {
      expect((await client.pull('garbage')).status).toBe(400);
      expect((await client.pull('s-1')).status).toBe(400);
      expect((await client.pull('', 0)).status).toBe(400);
      expect((await client.req('GET', '/api/events?limit=abc')).status).toBe(400);
    });

    it('returns JSON 404 for unknown API routes', async () => {
      const r = await client.req('GET', '/api/nope');
      expect(r.status).toBe(404);
      expect(r.json.error).toBe('not_found');
    });

    it('answers CORS preflight without auth', async () => {
      const res = await client.app.request('/api/events', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://example.com',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'authorization,content-type',
        },
      });
      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
      expect(res.headers.get('access-control-max-age')).toBe('86400');
      const allowHeaders = (res.headers.get('access-control-allow-headers') ?? '').toLowerCase();
      expect(allowHeaders).toContain('authorization');
      expect(allowHeaders).toContain('content-type');
      const allowMethods = res.headers.get('access-control-allow-methods') ?? '';
      for (const m of ['GET', 'POST', 'PUT', 'OPTIONS']) expect(allowMethods).toContain(m);
      expect(res.headers.get('access-control-allow-credentials')).toBeNull();
    });

    it('sends CORS headers on normal and error responses (Tauri/APK origins)', async () => {
      for (const origin of [
        'http://tauri.localhost',
        'https://tauri.localhost',
        'tauri://localhost',
      ]) {
        const ok = await client.req('GET', '/api/events', undefined, { origin });
        expect(ok.status).toBe(200);
        expect(ok.headers.get('access-control-allow-origin')).toBe('*');
      }
      const anon = new Client(client.app);
      const denied = await anon.req('GET', '/api/family', undefined, {
        origin: 'tauri://localhost',
      });
      expect(denied.status).toBe(401);
      expect(denied.headers.get('access-control-allow-origin')).toBe('*');
      const bad = await client.push([{ nope: 1 }]);
      expect(bad.status).toBe(400);
    });
  });
});
