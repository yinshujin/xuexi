/**
 * Stateless family tokens, HMAC-SHA256 via Web Crypto (works on Node 22 and on
 * edge runtimes).
 *
 * Token format: `v1.<expiresAt base36>.<base64url signature>`.
 * The signing key is derived from TOKEN_SECRET *and* FAMILY_CODE, so changing
 * either one revokes every issued token (e.g. after a device is lost).
 */

export const TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const enc = new TextEncoder();

async function hmacKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    raw as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function b64url(bytes: ArrayBuffer): string {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) return null;
  try {
    const bin = atob(
      s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4),
    );
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

export class TokenAuth {
  private tokenKey: Promise<CryptoKey>;
  private codeKey: Promise<CryptoKey>;
  private expectedCodeMac: Promise<ArrayBuffer>;

  constructor(
    familyCode: string,
    tokenSecret: string,
    private readonly ttlMs = TOKEN_TTL_MS,
  ) {
    const secretKey = hmacKey(enc.encode(tokenSecret));
    this.codeKey = secretKey;
    // tokenKey = HMAC(secret, "token-key:" + familyCode)
    this.tokenKey = secretKey.then(async (k) =>
      hmacKey(
        new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(`token-key:${familyCode}`))),
      ),
    );
    this.expectedCodeMac = secretKey.then((k) =>
      crypto.subtle.sign('HMAC', k, enc.encode(`family-code:${familyCode}`)),
    );
  }

  /**
   * Constant-time check of a submitted family code: we compare MACs with
   * crypto.subtle.verify instead of comparing the strings.
   */
  async checkCode(code: string): Promise<boolean> {
    const [key, mac] = await Promise.all([this.codeKey, this.expectedCodeMac]);
    return crypto.subtle.verify('HMAC', key, mac, enc.encode(`family-code:${code}`));
  }

  async issue(now = Date.now()): Promise<{ token: string; expiresAt: number }> {
    const expiresAt = now + this.ttlMs;
    const payload = `v1.${expiresAt.toString(36)}`;
    const sig = await crypto.subtle.sign('HMAC', await this.tokenKey, enc.encode(payload));
    return { token: `${payload}.${b64url(sig)}`, expiresAt };
  }

  /** Returns the expiry if the token is valid and unexpired, otherwise null. */
  async verify(token: string, now = Date.now()): Promise<number | null> {
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'v1') return null;
    if (!/^[0-9a-z]{1,12}$/.test(parts[1])) return null;
    const sig = fromB64url(parts[2]);
    if (!sig || sig.length !== 32) return null;
    const ok = await crypto.subtle.verify(
      'HMAC',
      await this.tokenKey,
      sig as BufferSource,
      enc.encode(`${parts[0]}.${parts[1]}`),
    );
    if (!ok) return null;
    const expiresAt = parseInt(parts[1], 36);
    if (!Number.isFinite(expiresAt) || expiresAt <= now) return null;
    return expiresAt;
  }
}
