import { kvGet, kvSet } from '../db';
import type { ScoringConfig } from './types';

/**
 * 跟读评分 credentials live only on this device (IndexedDB): not in the app
 * package, not in the family settings that sync, not in backups.
 */
const KEY = 'scoringConfig';

export async function loadScoringConfig(): Promise<ScoringConfig | null> {
  const c = await kvGet<ScoringConfig>(KEY);
  return c && c.xfyun?.appId && c.xfyun.apiKey && c.xfyun.apiSecret ? c : null;
}

export async function saveScoringConfig(c: ScoringConfig | null): Promise<void> {
  await kvSet(KEY, c);
}

/**
 * Read a config pasted as JSON or as the 讯飞 console's three lines. Accepts
 * {"xfyun":{"appId","apiKey","apiSecret"}}, the XFYUN_APPID / XFYUN_API_KEY /
 * XFYUN_API_SECRET names, or "APPID: … APISecret: … APIKey: …" text.
 */
export function parseScoringText(text: string): ScoringConfig | null {
  const pick = (...names: string[]) => {
    for (const n of names) {
      const m = new RegExp(`["']?${n}["']?\\s*[:=：]\\s*["']?([A-Za-z0-9+/=_-]{6,})`, 'i').exec(text);
      if (m) return m[1];
    }
    return '';
  };
  const appId = pick('XFYUN_APPID', 'appId', 'app_id', 'APPID');
  const apiKey = pick('XFYUN_API_KEY', 'apiKey', 'api_key', 'APIKey');
  const apiSecret = pick('XFYUN_API_SECRET', 'apiSecret', 'api_secret', 'APISecret');
  return appId && apiKey && apiSecret ? { vendor: 'xfyun', xfyun: { appId, apiKey, apiSecret } } : null;
}
