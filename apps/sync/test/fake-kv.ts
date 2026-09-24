import type { KVListResult, KVNamespaceLike } from '../src/storage-kv';

/**
 * In-memory fake of an EdgeOne Pages KV namespace, mirroring the behaviour of
 * the EdgeOne CLI's local KV client (edgeone@1.6.41):
 * - keys: /^[A-Za-z0-9_]+$/, <= 512 bytes
 * - values: <= 25 MiB
 * - get() returns text (null when missing); `{type: 'json'}` parses
 * - list({prefix, limit = 10, cursor}) returns keys in lexicographic order,
 *   starting after `cursor` (a key), with {keys: [{key}], complete, cursor}
 *
 * `inclusiveCursor: true` simulates a backend whose list cursor is inclusive,
 * to check the storage does not depend on exclusive semantics.
 */
export class FakeKV implements KVNamespaceLike {
  readonly data = new Map<string, string>();
  ops = { get: 0, put: 0, delete: 0, list: 0 };

  constructor(private readonly opts: { inclusiveCursor?: boolean; maxListLimit?: number } = {}) {}

  private checkKey(key: string): void {
    if (!key || typeof key !== 'string') throw new Error('Key must be a non-empty string');
    if (new TextEncoder().encode(key).length > 512) throw new Error('Key size exceeds 512 bytes');
    if (!/^[a-zA-Z0-9_]+$/.test(key))
      throw new Error('Key can only contain letters, numbers, and underscores');
  }

  async get(key: string, options?: { type: string } | string): Promise<unknown> {
    this.ops.get++;
    const v = this.data.get(key);
    if (v === undefined) return null;
    const type = typeof options === 'string' ? options : (options?.type ?? 'text');
    if (type === 'json') return JSON.parse(v);
    return v;
  }

  async put(key: string, value: string): Promise<void> {
    this.ops.put++;
    this.checkKey(key);
    if (typeof value !== 'string') throw new Error('fake only supports string values');
    if (value.length > 26214400) throw new Error('Value size exceeds maximum limit of 25 MB');
    this.data.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.ops.delete++;
    this.data.delete(key);
  }

  async list(
    options: { prefix?: string; limit?: number; cursor?: string } = {},
  ): Promise<KVListResult> {
    this.ops.list++;
    const prefix = options.prefix ?? '';
    const limit = Math.min(options.limit ?? 10, this.opts.maxListLimit ?? 256);
    const all = [...this.data.keys()].filter((k) => k.startsWith(prefix)).sort();
    const start = options.cursor
      ? all.findIndex((k) =>
          this.opts.inclusiveCursor ? k >= options.cursor! : k > options.cursor!,
        )
      : 0;
    const from = start === -1 ? all.length : start;
    const page = all.slice(from, from + limit);
    const complete = from + limit >= all.length;
    return {
      keys: page.map((key) => ({ key })),
      complete,
      cursor: complete ? undefined : page[page.length - 1],
    };
  }
}
