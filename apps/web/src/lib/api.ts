import type {
  AuthResponse,
  FamilyDoc,
  LearningEvent,
  PullEventsResponse,
  PushEventsResponse,
} from '@xuexi/shared';
import { KV, kvGet, kvSet } from './db';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
  }
}

/**
 * Base URL of the site (catalog, packs, API). Same origin for the PWA; for the
 * native (APK / desktop) shell it is configured at login or baked in at build
 * time via VITE_SITE_URL.
 */
export async function siteBase(): Promise<string> {
  const configured = await kvGet<string>(KV.serverUrl);
  if (configured) return configured.endsWith('/') ? configured : `${configured}/`;
  const baked = import.meta.env.VITE_SITE_URL as string | undefined;
  if (baked) return baked.endsWith('/') ? baked : `${baked}/`;
  return new URL('./', location.href).toString().replace(/#.*$/, '');
}

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const base = await siteBase();
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body) headers['content-type'] = 'application/json';
  if (auth) {
    const token = await kvGet<string>(KV.token);
    if (!token) throw new ApiError(401, '未登录');
    headers.authorization = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(new URL(path, base), { ...init, headers });
  } catch {
    throw new ApiError(0, '网络连接失败');
  }
  const text = await res.text();
  const body = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`, body);
  return body as T;
}

export const api = {
  async health(): Promise<boolean> {
    try {
      await request('api/health', {}, false);
      return true;
    } catch {
      return false;
    }
  },
  async login(code: string): Promise<void> {
    const r = await request<AuthResponse>('api/auth', { method: 'POST', body: JSON.stringify({ code }) }, false);
    await kvSet(KV.token, r.token);
    await kvSet(KV.tokenExpiresAt, r.expiresAt);
  },
  async logout(): Promise<void> {
    await kvSet(KV.token, null);
  },
  getFamily: () => request<FamilyDoc>('api/family'),
  putFamily: (doc: Omit<FamilyDoc, 'version' | 'updatedAt'>, baseVersion: number) =>
    request<FamilyDoc>('api/family', { method: 'PUT', body: JSON.stringify({ doc, baseVersion }) }),
  pushEvents: (events: LearningEvent[]) =>
    request<PushEventsResponse>('api/events', { method: 'POST', body: JSON.stringify({ events }) }),
  pullEvents: (after: string, limit = 500) =>
    request<PullEventsResponse>(`api/events?after=${encodeURIComponent(after)}&limit=${limit}`),
};
