import { describe, expect, it } from 'vitest';
import { generateQuestion } from '@xuexi/practice';
import { BOOKS } from '../src/index';

describe('拔高题 / 创新题', () => {
  for (const book of BOOKS) {
    it(`${book.id}: every knowledge point with practice has 拔高 and 创新 questions`, () => {
      const missing: string[] = [];
      for (const u of book.units) {
        for (const kp of u.knowledgePoints) {
          if (kp.practice.length === 0) continue;
          for (const tier of ['stretch', 'creative'] as const) {
            const specs = kp.practice.filter((p) => p.tier === tier);
            if (specs.length === 0) missing.push(`${kp.id} ${tier}`);
            for (const s of specs) {
              // Every tiered spec must produce questions across its difficulty range.
              for (let d = s.minDifficulty; d <= s.maxDifficulty; d++) {
                const q = generateQuestion(s.generatorId, { difficulty: d, seed: d * 7 + 1, variant: s.variant });
                expect(q.prompt.startsWith(tier === 'stretch' ? '【拔高】' : '【创新】'), `${kp.id}: ${q.prompt}`).toBe(true);
              }
            }
          }
          expect(kp.practice.some((p) => !p.tier), `${kp.id} has routine practice`).toBe(true);
        }
      }
      expect(missing).toEqual([]);
    });
  }
});
