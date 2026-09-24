import { createApp, type SyncApp } from './app';
import { ConfigError, configFromEnv, type Env } from './config';
import { KvStorage, type KVNamespaceLike } from './storage-kv';

/**
 * EdgeOne Pages (EdgeOne Makers) Edge Function entry.
 *
 * The build script bundles this file into a single ESM file at
 * `<site>/edge-functions/api/[[default]].js`, a catch-all route for `/api/*`.
 *
 * Bindings (configured in the EdgeOne Pages console):
 * - KV namespace bound with variable name `XUEXI_KV` -> exposed as a global.
 * - Env vars FAMILY_CODE, TOKEN_SECRET (required), CORS_ORIGINS,
 *   KV_SETTLE_MS (optional) -> `context.env`.
 */

declare global {
  // eslint-disable-next-line no-var
  var XUEXI_KV: KVNamespaceLike | undefined;
}

/** Shape of the `onRequest(context)` argument (see @edgeone/types EdgeFunctionContext). */
export interface EdgeOneContext {
  request: Request;
  env?: Env;
  params?: Record<string, string | string[]>;
  waitUntil?: (p: Promise<unknown>) => void;
  eo?: { clientIp?: string; geo?: Record<string, unknown> };
}

type Cached = { key: string; kv: KVNamespaceLike; app: SyncApp };
/**
 * The EdgeOne builder inlines this bundle *inside* its per-request handler
 * (verified in the output of `edgeone makers build`, CLI 1.6.41), so
 * module-level variables are re-created for every request. The app (and with
 * it the in-memory auth rate limiter) is therefore cached on globalThis, which
 * does survive between requests served by the same isolate.
 */
const holder = globalThis as typeof globalThis & { __xuexiSyncApp?: Cached };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=UTF-8', 'cache-control': 'no-store' },
  });
}

function getApp(env: Env, kv: KVNamespaceLike): SyncApp {
  const key = [env.FAMILY_CODE, env.TOKEN_SECRET, env.CORS_ORIGINS, env.KV_SETTLE_MS].join(
    '\u0000',
  );
  const cached = holder.__xuexiSyncApp;
  if (cached && cached.key === key && cached.kv === kv) return cached.app;
  const config = configFromEnv(env);
  const settleRaw = env.KV_SETTLE_MS?.trim();
  const storage = new KvStorage(kv, {
    settleMs: settleRaw && /^\d{1,7}$/.test(settleRaw) ? Number(settleRaw) : undefined,
  });
  const app = createApp(storage, {
    ...config,
    getClientIp: (c) => {
      // The app is cached per isolate, so the per-request client IP travels in
      // the Hono env (second argument of app.fetch), not via a closure.
      const raw = c.req.raw as Request & { eo?: { clientIp?: string } };
      const fromCtx = (c.env as { __EO_CLIENT_IP?: string } | undefined)?.__EO_CLIENT_IP;
      return (
        fromCtx ??
        raw.eo?.clientIp ??
        c.req.header('eo-client-ip') ??
        c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      );
    },
  });
  holder.__xuexiSyncApp = { key, kv, app };
  return app;
}

export async function onRequest(context: EdgeOneContext): Promise<Response> {
  const kv = globalThis.XUEXI_KV;
  if (!kv) {
    console.error('[sync] KV namespace not bound: bind a namespace as XUEXI_KV');
    return jsonResponse(503, {
      ok: false,
      error: 'not_configured',
      message: 'KV namespace XUEXI_KV is not bound to this project',
    });
  }
  let app: SyncApp;
  try {
    app = getApp(context.env ?? {}, kv);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`[sync] ${err.message}`);
      return jsonResponse(503, {
        ok: false,
        error: 'not_configured',
        message: 'FAMILY_CODE / TOKEN_SECRET env vars are missing or too short',
      });
    }
    throw err;
  }
  return app.fetch(context.request, { ...context.env, __EO_CLIENT_IP: context.eo?.clientIp });
}
