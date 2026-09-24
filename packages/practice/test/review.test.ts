import { describe, expect, it } from 'vitest';
import { computeMastery, type MasteryState } from '../src/mastery';
import { DAY_MS } from '../src/refs';
import { computeReviewSchedule, dueReviews } from '../src/review';
import { attempt, sh } from './helpers';

const min = 60_000;

function masteredAt(
  state: Partial<MasteryState> & { kpId: string; masteredAt?: number },
): Map<string, MasteryState> {
  return new Map([
    [
      state.kpId,
      {
        childId: 'kid',
        theta: 4,
        attempts: 20,
        correct: 20,
        recentAccuracy: 1,
        recentCount: 10,
        status: 'mastered',
        targetDifficulty: 3,
        ...state,
      } as MasteryState,
    ],
  ]);
}

function reviewSession(date: string, correct: number, total: number) {
  return Array.from({ length: total }, (_, i) =>
    attempt({ at: sh(date, '18:00') + i * min, correct: i < correct, mode: 'review' }),
  );
}

describe('computeReviewSchedule', () => {
  const m = masteredAt({ kpId: 'kp.a', masteredAt: sh('2026-09-01', '20:30') });

  it('schedules the first review for the next Shanghai day', () => {
    const [r] = computeReviewSchedule([], m, sh('2026-09-01', '23:00'));
    expect(r).toMatchObject({
      kpId: 'kp.a',
      stage: 0,
      intervalDays: 1,
      isDue: false,
      status: 'mastered',
    });
    expect(r.dueAt).toBe(sh('2026-09-02', '00:00'));
    expect(computeReviewSchedule([], m, sh('2026-09-02', '07:00'))[0].isDue).toBe(true);
  });

  it('walks through 1, 3, 7, 14, 30 days on passed reviews and stays at 30', () => {
    const dates = [
      '2026-09-02',
      '2026-09-05',
      '2026-09-12',
      '2026-09-26',
      '2026-10-26',
      '2026-11-25',
    ];
    const expected = [3, 7, 14, 30, 30, 30];
    let events: ReturnType<typeof attempt>[] = [];
    dates.forEach((d, i) => {
      events = [...events, ...reviewSession(d, 4, 5)]; // 0.8 passes
      const [r] = computeReviewSchedule(events, m, sh(d, '23:00'));
      expect(r.intervalDays).toBe(expected[i]);
      expect(r.dueAt).toBe(sh(d, '00:00') + expected[i] * DAY_MS);
      expect(r.reviewsPassed).toBe(i + 1);
    });
  });

  it('a failed review resets to +1 day and back to learning; a later pass recovers', () => {
    const events = [...reviewSession('2026-09-02', 5, 5), ...reviewSession('2026-09-05', 2, 4)];
    const [r] = computeReviewSchedule(events, m, sh('2026-09-05', '23:00'));
    expect(r).toMatchObject({
      stage: 0,
      intervalDays: 1,
      status: 'learning',
      lastReviewAccuracy: 0.5,
    });
    expect(r.dueAt).toBe(sh('2026-09-06', '00:00'));
    const again = [...events, ...reviewSession('2026-09-06', 3, 3)];
    expect(computeReviewSchedule(again, m, sh('2026-09-06', '23:00'))[0]).toMatchObject({
      status: 'mastered',
      intervalDays: 3,
    });
  });

  it('ignores non-review attempts and KPs that were never mastered', () => {
    const events = [attempt({ at: sh('2026-09-02'), correct: false, mode: 'kp' })];
    expect(computeReviewSchedule(events, m, sh('2026-09-02', '23:00'))[0].stage).toBe(0);
    expect(
      computeReviewSchedule(
        events,
        masteredAt({ kpId: 'kp.a', status: 'learning' }),
        sh('2026-09-02'),
      ),
    ).toEqual([]);
  });

  it('works end to end from the attempt log', () => {
    const practice = Array.from({ length: 12 }, (_, i) =>
      attempt({ at: sh('2026-09-01') + i * min, correct: true, difficulty: 3 }),
    );
    const mastery = computeMastery(practice);
    const schedule = computeReviewSchedule(practice, mastery, sh('2026-09-03'));
    expect(dueReviews(schedule).map((r) => r.kpId)).toEqual(['kp.a']);
  });
});
