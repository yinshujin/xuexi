import { toBase64Frames } from './audio';
import type { ReadingScore, WordState, XfyunCredentials } from './types';

/**
 * 讯飞开放平台 语音评测（ISE，WebSocket v2），straight from the device: the
 * request is signed with HMAC-SHA256 through Web Crypto, so no server is needed.
 * The credentials are the parent's own and stay on the device (家长设置).
 */
const HOST = 'ise-api.xfyun.cn';
const PATH = '/v2/open-ise';

function base64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** The signed wss:// URL (讯飞 checks that `date` is within 5 minutes of its clock). */
export async function signedUrl(cred: XfyunCredentials, date = new Date().toUTCString()): Promise<string> {
  const origin = `host: ${HOST}\ndate: ${date}\nGET ${PATH} HTTP/1.1`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(cred.apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = base64(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(origin))));
  const auth = `api_key="${cred.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = base64(new TextEncoder().encode(auth));
  return `wss://${HOST}${PATH}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${HOST}`;
}

// ---------------------------------------------------------------- result parsing

/** Attributes of every <tag …> in the result (讯飞's XML is flat and regular). */
function attrsOf(tag: string, xml: string): Array<Record<string, string>> {
  const out: Array<Record<string, string>> = [];
  const tagRe = new RegExp(`<${tag}\\s+([^>]*?)/?>`, 'g');
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(xml))) {
    const a: Record<string, string> = {};
    const attrRe = /([\w-]+)="([^"]*)"/g;
    let x: RegExpExecArray | null;
    while ((x = attrRe.exec(m[1]))) a[x[1]] = x[2];
    out.push(a);
  }
  return out;
}

/** 讯飞 scores are already 0–100: no rescaling. */
const score = (v: string | undefined) => {
  const n = parseFloat(v ?? '');
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
};
const isFiller = (w: string | undefined) => !w || /^(sil|silv|fil|\.)$/i.test(w);

/** Parse an ISE read_sentence result. */
export function parseIseXml(xml: string): ReadingScore {
  const chapter = attrsOf('read_chapter', xml)[0] ?? {};
  const src = Object.keys(chapter).length ? chapter : (attrsOf('sentence', xml)[0] ?? {});
  if ((src.is_rejected ?? 'false') === 'true') {
    // Noise / nothing readable: a normal result, not a zero.
    return { overall: 0, accuracy: 0, fluency: 0, completeness: 0, words: [], heard: '', unclear: true };
  }
  const words = attrsOf('word', xml)
    .filter((w) => !isFiller(w.content))
    .map((w) => {
      const dp = parseInt(w.dp_message ?? '0', 10);
      const sc = parseFloat(w.total_score ?? '');
      let state: WordState = 'ok';
      if (dp === 16) state = 'miss'; // 漏读
      else if (dp === 64 || dp === 128) state = 'wrong'; // 回读 / 替换
      else if (Number.isFinite(sc) && sc < 40) state = 'wrong';
      return { word: w.content, state };
    });
  return {
    overall: score(src.total_score),
    accuracy: score(src.accuracy_score),
    fluency: score(src.fluency_score),
    completeness: score(src.integrity_score),
    words,
    heard: words.map((w) => w.word).join(' '),
  };
}

// ---------------------------------------------------------------- the exchange

/** What the scorer needs from a WebSocket (the browser's, or a fake in tests). */
export interface SocketLike {
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  send(data: string): void;
  close(): void;
}
export type SocketFactory = (url: string) => SocketLike;

const browserSocket: SocketFactory = (url) => new WebSocket(url) as unknown as SocketLike;

/** 讯飞 wants plain text: straight quotes, no line breaks. */
function referenceText(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export class XfyunError extends Error {}

/**
 * Score one reading of `reference` (16 kHz PCM frames from audio.ts).
 * Throws XfyunError for real failures (network, credentials, timeout) — those
 * are not the child's fault either, and the caller must say so.
 */
export async function scoreWithXfyun(
  frames: string[],
  reference: string,
  cred: XfyunCredentials,
  open: SocketFactory = browserSocket,
  timeoutMs = 25_000,
): Promise<ReadingScore> {
  if (frames.length === 0) throw new XfyunError('没有录到声音');
  const ws = open(await signedUrl(cred));
  const close = () => {
    try {
      ws.close();
    } catch {
      /* already closed */
    }
  };

  const result = new Promise<string>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    const timer = setTimeout(() => finish(() => (close(), reject(new XfyunError('讯飞评测超时')))), timeoutMs);
    ws.onerror = () => finish(() => reject(new XfyunError('连不上讯飞语音评测（检查网络）')));
    ws.onclose = () => finish(() => reject(new XfyunError('讯飞连接已关闭（检查 AppID / APIKey / APISecret 和设备时间）')));
    ws.onmessage = (ev) => {
      let msg: { code?: number; message?: string; data?: { status?: number; data?: string } };
      try {
        msg = JSON.parse(typeof ev.data === 'string' ? ev.data : new TextDecoder().decode(ev.data as ArrayBuffer));
      } catch {
        return finish(() => (close(), reject(new XfyunError('讯飞返回了无法识别的数据'))));
      }
      if (msg.code !== 0) {
        return finish(() => (close(), reject(new XfyunError(`讯飞返回 ${msg.code}：${msg.message ?? ''}`))));
      }
      if (msg.data?.status === 2) {
        const bytes = Uint8Array.from(atob(msg.data.data ?? ''), (c) => c.charCodeAt(0));
        finish(() => (close(), resolve(new TextDecoder().decode(bytes))));
      }
    };
    ws.onopen = () => {
      // First frame: parameters only.
      ws.send(
        JSON.stringify({
          common: { app_id: cred.appId },
          business: {
            category: 'read_sentence',
            sub: 'ise',
            ent: 'en_vip',
            cmd: 'ssb',
            auf: 'audio/L16;rate=16000',
            aue: 'raw',
            tte: 'utf-8',
            rstcd: 'utf8',
            group: 'pupil', // 小学学段：童声评分更宽容
            rst: 'entirety',
            ise_unite: '1',
            extra_ability: 'multi_dimension',
            text: `﻿[content]\n${referenceText(reference)}`,
          },
          data: { status: 0, data: '' },
        }),
      );
      // Audio frames: aus 1 = first, 2 = middle, 4 = last.
      frames.forEach((data, i) => {
        const last = i === frames.length - 1;
        ws.send(
          JSON.stringify({
            business: { cmd: 'auw', aus: i === 0 ? 1 : last ? 4 : 2, aue: 'raw' },
            data: { status: last ? 2 : 1, data, data_type: 1, encoding: 'raw' },
          }),
        );
      });
    };
  });

  const text = (await result).trim();
  if (!text.startsWith('<')) throw new XfyunError('讯飞没有返回评测结果');
  return parseIseXml(text);
}

/**
 * Check the credentials end to end: score half a second of silence against
 * "Hello." (a wrong AppID only shows up after the first frame, not at handshake).
 */
export async function testXfyun(cred: XfyunCredentials, open: SocketFactory = browserSocket): Promise<void> {
  await scoreWithXfyun(toBase64Frames(new Uint8Array(16000)), 'Hello.', cred, open, 10_000);
}
