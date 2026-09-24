export function minutes(sec: number): string {
  return sec < 60 ? `${sec} 秒` : `${Math.round(sec / 60)} 分钟`;
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Calendar day in Asia/Shanghai, e.g. "2026-09-24". */
export function dayKey(ms: number): string {
  return new Date(ms + 8 * 3600_000).toISOString().slice(0, 10);
}

export function uuid(): string {
  return crypto.randomUUID();
}
