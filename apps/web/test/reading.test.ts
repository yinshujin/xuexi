import { describe, expect, it } from 'vitest';
import { recordLimitMs, wordAt, wordTimings } from '../src/lib/reading';

describe('reading helpers', () => {
  it('uses the engine timings when present', () => {
    const words = [{ w: 'Hi!', start: 50, end: 300 }];
    expect(wordTimings({ text: 'Hi!', words }, 1000)).toBe(words);
  });

  it('spreads words over the clip by length when there are no timings', () => {
    const w = wordTimings({ text: 'I see a butterfly.' }, 2000);
    expect(w.map((x) => x.w)).toEqual(['I', 'see', 'a', 'butterfly.']);
    expect(w[0].start).toBeGreaterThan(0);
    expect(w.at(-1)!.end).toBeLessThanOrEqual(2000);
    for (let i = 1; i < w.length; i++) expect(w[i].start).toBe(w[i - 1].end);
    // Longer words get more time.
    expect(w[3].end - w[3].start).toBeGreaterThan(w[2].end - w[2].start);
  });

  it('finds the word being spoken', () => {
    const w = [
      { w: 'a', start: 100, end: 200 },
      { w: 'b', start: 300, end: 400 },
    ];
    expect(wordAt(w, 50)).toBe(-1);
    expect(wordAt(w, 150)).toBe(0);
    expect(wordAt(w, 250)).toBe(0); // short pause keeps the last word lit
    expect(wordAt(w, 350)).toBe(1);
    expect(wordAt(w, 2000)).toBe(-1);
  });

  it('gives enough but bounded time to read back', () => {
    expect(recordLimitMs(500)).toBe(3000);
    expect(recordLimitMs(3000)).toBe(7500);
    expect(recordLimitMs(60_000)).toBe(20_000);
  });
});
