/**
 * Seeded pseudo-random numbers. Every question is reproducible from
 * (generatorId, difficulty, seed, variant): the four parts are hashed into a
 * 32-bit state that seeds mulberry32.
 */

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] (both inclusive). */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** Returns a shuffled copy. */
  shuffle<T>(items: readonly T[]): T[];
  /** True with probability p. */
  chance(p: number): boolean;
}

/** mulberry32: tiny, fast, good enough for question generation. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a with a murmur3 finalizer, returns an unsigned 32-bit integer. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Combine several parts into one 32-bit seed. */
export function seedFrom(...parts: Array<string | number | undefined>): number {
  return hashString(parts.map((p) => (p === undefined ? '' : String(p))).join('␟'));
}

export function createRng(seed: number | string): Rng {
  const next = mulberry32(typeof seed === 'number' ? seed : hashString(seed));
  const int = (min: number, max: number): number => {
    if (max < min) throw new Error(`rng.int: empty range [${min}, ${max}]`);
    return min + Math.floor(next() * (max - min + 1));
  };
  return {
    next,
    int,
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('rng.pick: empty list');
      return items[int(0, items.length - 1)];
    },
    shuffle<T>(items: readonly T[]): T[] {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    chance(p: number): boolean {
      return next() < p;
    },
  };
}

/** The RNG used to build one question. */
export function questionRng(
  generatorId: string,
  difficulty: number,
  seed: number,
  variant: string,
): Rng {
  return createRng(seedFrom(generatorId, difficulty, seed, variant));
}
