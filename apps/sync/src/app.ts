import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import type {
  AuthResponse,
  FamilyDoc,
  PullEventsResponse,
  PushEventsResponse,
} from '@xuexi/shared';
import { TokenAuth, TOKEN_TTL_MS } from './auth';
import { InvalidCursorError, type Storage } from './storage';
import { validatePushBody, validatePutFamilyBody } from './validate';

export interface RateLimitConfig {
  /** Failed auth attempts allowed per IP within the window. */
  maxFailuresPerIp: number;
  /** Failed auth attempts allowed across all IPs within the window. */
  maxFailuresGlobal: number;
  windowMs: number;
}

export interface AppConfig {
  familyCode: string;
  tokenSecret: string;
  tokenTtlMs?: number;
  /** Max events per push. Default 500. */
  maxBatch?: number;
  /** Max request body size for POST /api/events. Default 2 MiB. */
  maxEventsBodyBytes?: number;
  /** Max request body size for other endpoints. Default 256 KiB. */
  maxBodyBytes?: number;
  /** Default and max `limit` for GET /api/events. Defaults 500 / 1000. */
  defaultPullLimit?: number;
  maxPullLimit?: number;
  /**
   * In-memory rate limit for POST /api/auth. Best effort: on Node it is
   * per-process; on edge runtimes it is per isolate (instances are recycled
   * and not shared between nodes), so it only slows down naive brute force.
   * `false` disables it.
   */
  authRateLimit?: RateLimitConfig | false;
  /** Extracts the client IP for rate limiting. */
  getClientIp?: (c: Context) => string | undefined;
  /** Allowed CORS origins ('*' = any). The API uses bearer tokens, no cookies. */
  corsOrigins?: '*' | string[];
  /** Clock, injectable for tests. */
  now?: () => number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxFailuresPerIp: 10,
  maxFailuresGlobal: 100,
  windowMs: 15 * 60 * 1000,
};

type Bucket = { count: number; resetAt: number };

class FailureLimiter {
  private perIp = new Map<string, Bucket>();
  private global: Bucket = { count: 0, resetAt: 0 };

  constructor(
    private cfg: RateLimitConfig,
    private now: () => number,
  ) {}

  private bucket(ip: string): Bucket {
    const t = this.now();
    let b = this.perIp.get(ip);
    if (!b || b.resetAt <= t) {
      b = { count: 0, resetAt: t + this.cfg.windowMs };
      this.perIp.set(ip, b);
      if (this.perIp.size > 10_000) {
        for (const [k, v] of this.perIp) if (v.resetAt <= t) this.perIp.delete(k);
      }
    }
    if (this.global.resetAt <= t) this.global = { count: 0, resetAt: t + this.cfg.windowMs };
    return b;
  }

  /** Seconds until retry allowed, or 0 when not limited. */
  blockedFor(ip: string): number {
    const b = this.bucket(ip);
    const t = this.now();
    if (b.count >= this.cfg.maxFailuresPerIp) return Math.ceil((b.resetAt - t) / 1000);
    if (this.global.count >= this.cfg.maxFailuresGlobal)
      return Math.ceil((this.global.resetAt - t) / 1000);
    return 0;
  }

  fail(ip: string): void {
    this.bucket(ip).count++;
    this.global.count++;
  }
}

function defaultClientIp(c: Context): string | undefined {
  const xff = c.req.header('x-forwarded-for');
  if (xff) return xff.split(',').pop()?.trim();
  return c.req.header('x-real-ip') ?? undefined;
}

const jsonError = (
  c: Context,
  status: 400 | 401 | 404 | 413 | 429 | 500,
  error: string,
  message?: string,
) => c.json({ error, message: message ?? error }, status);

type AppEnv = { Variables: { clientIp: string } };
export type SyncApp = Hono<AppEnv>;

export function createApp(storage: Storage, config: AppConfig): SyncApp {
  const now = config.now ?? Date.now;
  const auth = new TokenAuth(
    config.familyCode,
    config.tokenSecret,
    config.tokenTtlMs ?? TOKEN_TTL_MS,
  );
  const maxBatch = config.maxBatch ?? 500;
  const maxEventsBody = config.maxEventsBodyBytes ?? 2 * 1024 * 1024;
  const maxBody = config.maxBodyBytes ?? 256 * 1024;
  const defaultPullLimit = config.defaultPullLimit ?? 500;
  const maxPullLimit = config.maxPullLimit ?? 1000;
  const limiter =
    config.authRateLimit === false
      ? null
      : new FailureLimiter(config.authRateLimit ?? DEFAULT_RATE_LIMIT, now);
  const clientIp = config.getClientIp ?? defaultClientIp;

  // strict: false -> '/api/family/' is the same route as '/api/family'
  // (EdgeOne's wrapper normalizes trailing slashes for routing, but not request.url).
  const app = new Hono<AppEnv>({ strict: false });

  // Resolve the client IP first: bodyLimit may replace c.req.raw, which drops
  // runtime-specific request properties such as EdgeOne's `request.eo`.
  app.use('*', async (c, next) => {
    c.set('clientIp', clientIp(c as unknown as Context) ?? 'unknown');
    await next();
  });

  app.use(
    '/api/*',
    cors({
      origin: config.corsOrigins ?? '*',
      allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
      allowHeaders: ['Authorization', 'Content-Type'],
      maxAge: 86400,
    }),
  );
  app.use('/api/*', async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store');
  });

  const tooLarge = (c: Context) => jsonError(c, 413, 'payload_too_large');
  const smallBody = bodyLimit({ maxSize: maxBody, onError: tooLarge });

  async function readJson(c: Context): Promise<{ ok: true; body: unknown } | { ok: false }> {
    try {
      return { ok: true, body: await c.req.json() };
    } catch {
      return { ok: false };
    }
  }

  // ---- public ----

  app.get('/api/health', (c) => c.json({ ok: true, storage: storage.kind }));

  app.post('/api/auth', smallBody, async (c) => {
    const ip = c.get('clientIp');
    if (limiter) {
      const wait = limiter.blockedFor(ip);
      if (wait > 0) {
        c.header('Retry-After', String(wait));
        return jsonError(c, 429, 'rate_limited', 'too many failed attempts, try again later');
      }
    }
    const parsed = await readJson(c);
    if (!parsed.ok) return jsonError(c, 400, 'invalid_json');
    const body = parsed.body as { code?: unknown };
    if (
      typeof body !== 'object' ||
      body === null ||
      typeof body.code !== 'string' ||
      body.code.length > 256
    )
      return jsonError(c, 400, 'invalid_request', 'body must be {code: string}');
    if (!(await auth.checkCode(body.code))) {
      limiter?.fail(ip);
      return jsonError(c, 401, 'invalid_code', 'wrong family code');
    }
    const res: AuthResponse = await auth.issue(now());
    return c.json(res);
  });

  // ---- authenticated ----

  app.use('/api/*', async (c, next) => {
    const h = c.req.header('authorization') ?? '';
    const m = /^Bearer\s+(\S+)$/i.exec(h);
    if (!m) return jsonError(c, 401, 'unauthorized', 'missing bearer token');
    const exp = await auth.verify(m[1], now());
    if (exp === null) return jsonError(c, 401, 'unauthorized', 'invalid or expired token');
    await next();
  });

  app.get('/api/family', async (c) => {
    const doc: FamilyDoc = await storage.getFamily();
    return c.json(doc);
  });

  app.put('/api/family', smallBody, async (c) => {
    const parsed = await readJson(c);
    if (!parsed.ok) return jsonError(c, 400, 'invalid_json');
    const v = validatePutFamilyBody(parsed.body);
    if (!v.ok) return jsonError(c, 400, 'invalid_request', v.message);
    const r = await storage.putFamily(v.value.doc, v.value.baseVersion);
    if (!r.ok) return c.json({ error: 'version_conflict', current: r.current }, 409);
    return c.json(r.doc);
  });

  app.post('/api/events', bodyLimit({ maxSize: maxEventsBody, onError: tooLarge }), async (c) => {
    const parsed = await readJson(c);
    if (!parsed.ok) return jsonError(c, 400, 'invalid_json');
    const v = validatePushBody(parsed.body, maxBatch);
    if (!v.ok) {
      const status = v.message.startsWith('too many') ? 413 : 400;
      return jsonError(c, status, status === 413 ? 'batch_too_large' : 'invalid_event', v.message);
    }
    const res: PushEventsResponse = { accepted: await storage.appendEvents(v.events) };
    return c.json(res);
  });

  app.get('/api/events', async (c) => {
    const after = c.req.query('after') ?? '';
    const limitRaw = c.req.query('limit');
    let limit = defaultPullLimit;
    if (limitRaw !== undefined && limitRaw !== '') {
      if (!/^\d{1,6}$/.test(limitRaw) || Number(limitRaw) < 1)
        return jsonError(c, 400, 'invalid_request', 'limit must be a positive integer');
      limit = Math.min(Number(limitRaw), maxPullLimit);
    }
    if (after.length > 256) return jsonError(c, 400, 'invalid_cursor');
    try {
      const res: PullEventsResponse = await storage.listEvents(after, limit);
      return c.json(res);
    } catch (err) {
      if (err instanceof InvalidCursorError)
        return jsonError(c, 400, 'invalid_cursor', err.message);
      throw err;
    }
  });

  app.all('/api/*', (c) => jsonError(c, 404, 'not_found'));

  app.onError((err, c) => {
    console.error('[sync] unhandled error', err);
    return jsonError(c, 500, 'internal_error');
  });

  return app;
}
