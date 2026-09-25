import { describe, expect, it } from 'vitest';
import { ALL_GENERATORS, generateQuestion } from '../src/registry';
import { generatorProperties } from './properties.shared';

/** Routine math generators (the .concepts item banks run with the 语文 / 英语 banks). */
generatorProperties((id) => /^g[24]\./.test(id) && !id.endsWith('.challenge') && !id.endsWith('.concepts'));

describe('generator options', () => {
  it('rejects unknown variants and clamps difficulty', () => {
    expect(() =>
      generateQuestion('g2.addsub.2d', { difficulty: 1, seed: 1, variant: 'nope' }),
    ).toThrow();
    const q = generateQuestion('g2.addsub.2d', { difficulty: 9, seed: 1 });
    expect(q.difficulty).toBe(5);
    expect(q.key).toBe('g2.addsub.2d:5:1');
    expect(q.variant).toBeUndefined();
    // Omitted variant == the default variant (same question body).
    const v = generateQuestion('g2.addsub.2d', { difficulty: 5, seed: 1, variant: 'oral' });
    expect({ ...v, key: '', variant: undefined }).toEqual({ ...q, key: '', variant: undefined });
  });
});

describe('property test split', () => {
  it('every generator is covered by one of the properties.*.test.ts files', () => {
    const covered = (id: string) =>
      /^g[24]\./.test(id) || id.endsWith('.challenge') || /^(yw|en|xz)\d\./.test(id);
    expect(ALL_GENERATORS.map((g) => g.id).filter((id) => !covered(id))).toEqual([]);
  });
});
