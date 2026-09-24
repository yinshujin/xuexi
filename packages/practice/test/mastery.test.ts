import { describe, expect, it } from 'vitest';
import type { LessonEvent } from '@xuexi/shared';
import {
  attemptScore,
  computeMastery,
  expectedSuccess,
  kFactor,
  newMasteryState,
  recommendDifficulty,
} from '../src/mastery';
import { attempt, sh } from './helpers';

const t0 = sh('2026-09-01');
const min = 60_000;

describe('Elo helpers', () => {
  it('expected success is 0.5 at θ = d and ~0.76 one level below', () => {
    expect(expectedSuccess(3, 3)).toBeCloseTo(0.5);
    expect(expectedSuccess(3, 2)).toBeCloseTo(0.76, 2);
    expect(expectedSuccess(3, 4)).toBeCloseTo(0.24, 2);
  });
  it('K-factor decays with attempts but keeps a floor', () => {
    expect(kFactor(0)).toBeGreaterThan(kFactor(10));
    expect(kFactor(1000)).toBe(0.25);
  });
  it('speed attempts over targetSeconds get half credit; hints too', () => {
    const fast = attempt({ at: t0, correct: true, mode: 'speed', durationMs: 2000 });
    const slow = attempt({ at: t0, correct: true, mode: 'speed', durationMs: 9000 });
    expect(attemptScore(fast, 3)).toBe(1);
    expect(attemptScore(slow, 3)).toBe(0.5);
    expect(attemptScore({ ...slow, mode: 'kp' }, 3)).toBe(1);
    expect(attemptScore(attempt({ at: t0, correct: true, hinted: true }))).toBe(0.5);
    expect(attemptScore(attempt({ at: t0, correct: false }))).toBe(0);
  });
});

describe('computeMastery', () => {
  it('is empty without attempts and ignores lesson events', () => {
    const lesson: LessonEvent = {
      type: 'lesson',
      id: 'l1',
      childId: 'kid',
      deviceId: 'd',
      at: t0,
      lessonId: 'x',
      packVersion: 1,
      progress: 1,
      completed: true,
      durationMs: 1000,
    };
    expect(computeMastery([lesson]).size).toBe(0);
    expect(newMasteryState('kp.a', 'kid').status).toBe('new');
  });

  it('masters after 10 correct answers at the target difficulty', () => {
    const events = Array.from({ length: 12 }, (_, i) =>
      attempt({ at: t0 + i * min, correct: true, difficulty: 3 }),
    );
    const s = computeMastery(events, { targetDifficulty: 3 }).get('kp.a')!;
    expect(s.theta).toBeGreaterThanOrEqual(3);
    expect(s.status).toBe('mastered');
    expect(s.masteredAt).toBe(t0 + 9 * min); // 10th attempt (minAttempts = 10)
    expect(s.attempts).toBe(12);
    expect(s.recentAccuracy).toBe(1);
  });

  it('is order-independent in input (sorted by time)', () => {
    const events = Array.from({ length: 12 }, (_, i) =>
      attempt({ at: t0 + i * min, correct: i % 3 !== 0, difficulty: 2 }),
    );
    const a = computeMastery(events).get('kp.a');
    const b = computeMastery([...events].reverse()).get('kp.a');
    expect(b).toEqual(a);
  });

  it('needs the recent accuracy threshold', () => {
    const events = Array.from({ length: 10 }, (_, i) =>
      attempt({ at: t0 + i * min, correct: i !== 3 && i !== 6, difficulty: 4 }),
    );
    const s = computeMastery(events, {
      targetDifficulty: 2,
      settings: { masteryAccuracy: 0.9 },
    }).get('kp.a')!;
    expect(s.recentAccuracy).toBe(0.8);
    expect(s.status).toBe('learning');
    const lenient = computeMastery(events, {
      targetDifficulty: 2,
      settings: { masteryAccuracy: 0.8 },
    }).get('kp.a')!;
    expect(lenient.status).toBe('mastered');
  });

  it('θ goes down with wrong answers; one slip does not un-master (hysteresis), many do', () => {
    const good = Array.from({ length: 12 }, (_, i) =>
      attempt({ at: t0 + i * min, correct: true, difficulty: 3 }),
    );
    // Two slips: recent accuracy 0.8 < 0.9 but still within the hysteresis margin.
    const slip = [
      ...good,
      attempt({ at: t0 + 13 * min, correct: false, difficulty: 3 }),
      attempt({ at: t0 + 14 * min, correct: false, difficulty: 3 }),
    ];
    const m1 = computeMastery(slip, { targetDifficulty: 3 }).get('kp.a')!;
    expect(m1.recentAccuracy).toBe(0.8);
    expect(m1.status).toBe('mastered');
    expect(m1.theta).toBeLessThan(computeMastery(good, { targetDifficulty: 3 }).get('kp.a')!.theta);
    const bad = [
      ...slip,
      ...Array.from({ length: 4 }, (_, i) =>
        attempt({ at: t0 + (20 + i) * min, correct: false, difficulty: 3 }),
      ),
    ];
    const m2 = computeMastery(bad, { targetDifficulty: 3 }).get('kp.a')!;
    expect(m2.status).toBe('learning');
    expect(m2.masteredAt).toBe(t0 + 9 * min); // first mastery is remembered
  });

  it('speed-mode slow answers count half (default targetSeconds from the generator)', () => {
    // g2.mul.table product questions have targetSeconds ≤ 5.
    const mk = (durationMs: number) =>
      Array.from({ length: 6 }, (_, i) =>
        attempt({
          at: t0 + i * min,
          correct: true,
          difficulty: 2,
          seed: i,
          generatorId: 'g2.mul.table',
          mode: 'speed',
          durationMs,
        }),
      );
    const fast = computeMastery(mk(1500)).get('kp.a')!.theta;
    const slow = computeMastery(mk(20_000)).get('kp.a')!.theta;
    expect(slow).toBeLessThan(fast);
    const custom = computeMastery(mk(20_000), { targetSecondsFor: () => 60 }).get('kp.a')!.theta;
    expect(custom).toBeCloseTo(fast);
  });

  it('separates children', () => {
    const events = [
      attempt({ at: t0, correct: true, childId: 'a' }),
      attempt({ at: t0 + 1, correct: false, childId: 'b' }),
    ];
    expect(() => computeMastery(events)).toThrow();
    const a = computeMastery(events, { childId: 'a' });
    expect(a.get('kp.a')!.correct).toBe(1);
    expect(computeMastery(events, { childId: 'b' }).get('kp.a')!.correct).toBe(0);
  });

  it('per-KP target difficulty and initial θ', () => {
    const events = Array.from({ length: 10 }, (_, i) =>
      attempt({ at: t0 + i * min, correct: true, difficulty: 2, kpId: i % 2 ? 'x' : 'y' }),
    );
    const m = computeMastery(events, {
      targetDifficulty: (kp) => (kp === 'x' ? 5 : 1),
      initialTheta: 2,
      minAttempts: 5,
    });
    expect(m.get('x')!.targetDifficulty).toBe(5);
    expect(m.get('x')!.status).toBe('learning');
    expect(m.get('y')!.status).toBe('mastered');
  });
});

describe('recommendDifficulty', () => {
  it('starts at the minimum and picks ≈80 % success', () => {
    expect(recommendDifficulty(undefined, { min: 2, max: 5 })).toBe(2);
    expect(recommendDifficulty({ theta: 1 }, { min: 1, max: 5 })).toBe(1);
    // θ − 1.2 ≈ 3.8 → 4
    expect(recommendDifficulty({ theta: 5 }, { min: 1, max: 5 })).toBe(4);
    expect(recommendDifficulty({ theta: 6 }, { min: 1, max: 3 })).toBe(3);
    expect(recommendDifficulty({ theta: 0 }, { min: 2, max: 3 })).toBe(2);
  });
  it('is monotone in θ', () => {
    let prev = 0;
    for (let theta = 0; theta <= 6; theta += 0.1) {
      const d = recommendDifficulty({ theta }, { min: 1, max: 5 });
      expect(d).toBeGreaterThanOrEqual(prev);
      prev = d;
    }
  });
});
