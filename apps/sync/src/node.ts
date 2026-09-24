import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { serve } from '@hono/node-server';
import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context } from 'hono';
import { createApp } from './app';
import { ConfigError, configFromEnv } from './config';
import { SqliteStorage } from './storage-sqlite';

/**
 * Node entry (Tencent Cloud Lighthouse / any server).
 *
 * Env:
 *   PORT          default 8787
 *   HOST          default 0.0.0.0
 *   DB_PATH       default ./data/xuexi.db
 *   FAMILY_CODE   required, >= 8 chars
 *   TOKEN_SECRET  required, >= 32 chars
 *   TRUST_PROXY   '1' to take the client IP from X-Forwarded-For (set when
 *                 running behind Caddy; default in docker-compose)
 *   CORS_ORIGINS  optional, comma-separated, default '*'
 */
function main(): void {
  let config;
  try {
    config = configFromEnv(process.env);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`[sync] refusing to start: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }

  const dbPath = process.env.DB_PATH || './data/xuexi.db';
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
  const storage = new SqliteStorage(dbPath);

  const trustProxy = process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true';
  const getClientIp = (c: Context): string | undefined => {
    if (trustProxy) {
      const xff = c.req.header('x-forwarded-for');
      if (xff) return xff.split(',').pop()?.trim();
    }
    try {
      return getConnInfo(c).remote.address;
    } catch {
      return undefined;
    }
  };

  const app = createApp(storage, { ...config, getClientIp });
  const port = Number(process.env.PORT || 8787);
  const hostname = process.env.HOST || '0.0.0.0';
  const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
    console.log(`[sync] listening on http://${hostname}:${info.port} (sqlite: ${dbPath})`);
  });

  const shutdown = () => {
    server.close(() => {
      storage.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
