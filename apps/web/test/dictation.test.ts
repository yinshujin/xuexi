import { describe, expect, it } from 'vitest';
import { roundOrder } from '../src/lib/dictation';

describe('看拼音写词语', () => {
  it('asks last time’s wrong words first, then the rest', () => {
    const words = ['宽广', '长短', '哪里', '雪白'].map((w) => ({ w, py: '' }));
    const order = roundOrder(words, ['雪白', '哪里']).map((d) => d.w);
    expect(new Set(order.slice(0, 2))).toEqual(new Set(['雪白', '哪里']));
    expect(new Set(order)).toEqual(new Set(words.map((d) => d.w)));
  });
});
