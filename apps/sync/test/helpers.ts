import type { AttemptEvent, LearningEvent, LessonEvent } from '@xuexi/shared';
import type { SyncApp } from '../src/app';

export const FAMILY_CODE = 'panda-2024-happy';
export const TOKEN_SECRET = 'x'.repeat(16) + 'secret-for-tests-0123456789';

let n = 0;

export function attempt(overrides: Partial<AttemptEvent> = {}): AttemptEvent {
  n++;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    childId: 'kid-a',
    at: 1_700_000_000_000 + n,
    deviceId: 'ipad',
    type: 'attempt',
    kpId: 'g2a-add-carry',
    question: { source: 'generator', generatorId: 'add-carry' as never, difficulty: 2, seed: n },
    correct: n % 3 !== 0,
    response: { value: 42 },
    errorTags: [],
    durationMs: 3500,
    mode: 'kp',
    ...overrides,
  };
}

export function lesson(overrides: Partial<LessonEvent> = {}): LessonEvent {
  n++;
  return {
    id: `lesson-${n}`,
    childId: 'kid-b',
    at: 1_700_000_000_000 + n,
    deviceId: 'phone',
    type: 'lesson',
    lessonId: 'g4a-u1-l1',
    packVersion: 3,
    progress: 0.5,
    completed: false,
    durationMs: 60_000,
    ...overrides,
  };
}

export function events(count: number): LearningEvent[] {
  return Array.from({ length: count }, (_, i) => (i % 4 === 3 ? lesson() : attempt()));
}

export class Client {
  token = '';
  constructor(
    readonly app: SyncApp,
    readonly ip = '203.0.113.7',
  ) {}

  async req(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const h: Record<string, string> = { 'x-forwarded-for': this.ip, ...headers };
    if (this.token) h.authorization = `Bearer ${this.token}`;
    let payload: string | undefined;
    if (body !== undefined) {
      h['content-type'] = 'application/json';
      payload = typeof body === 'string' ? body : JSON.stringify(body);
    }
    const res = await this.app.request(path, { method, headers: h, body: payload });
    const text = await res.text();
    let json: any = undefined;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { status: res.status, json, headers: res.headers };
  }

  async login(code = FAMILY_CODE) {
    const r = await this.req('POST', '/api/auth', { code });
    if (r.status === 200) this.token = r.json.token;
    return r;
  }

  push(evts: unknown[]) {
    return this.req('POST', '/api/events', { events: evts });
  }

  pull(after = '', limit?: number) {
    const q = new URLSearchParams({ after });
    if (limit !== undefined) q.set('limit', String(limit));
    return this.req('GET', `/api/events?${q}`);
  }

  /** Pulls everything from `after`, following cursors. */
  async pullAll(after = '', limit = 3) {
    const out: LearningEvent[] = [];
    let cursor = after;
    for (let i = 0; i < 1000; i++) {
      const r = await this.pull(cursor, limit);
      if (r.status !== 200) throw new Error(`pull failed ${r.status} ${JSON.stringify(r.json)}`);
      out.push(...r.json.events);
      cursor = r.json.cursor;
      if (!r.json.hasMore) break;
    }
    return { events: out, cursor };
  }
}
