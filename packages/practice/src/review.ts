import type { LearningEvent } from '@xuexi/shared';
import { attemptsOf, type MasteryState } from './mastery';
import { DAY_MS, shanghaiDay, shanghaiDayStart } from './refs';

/**
 * Spaced review (间隔复习).
 *
 * After a KP is first mastered (MasteryState.masteredAt) reviews fall due at
 * +1, +3, +7, +14, +30 days; after the last step it stays at 30 days.
 *
 * A review session = the 'review'-mode attempts of that KP on one Asia/Shanghai
 * calendar day. Session accuracy ≥ 0.8 → passed, move to the next interval.
 * Otherwise → failed: the interval resets to +1 day and the review status
 * goes back to 'learning' until a later review session passes.
 *
 * Due times are aligned to 00:00 Asia/Shanghai, so "due in 1 day" means
 * "any time tomorrow", regardless of the hour the KP was mastered.
 * Review sessions done early (before the due day) still count.
 */

export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;
export const REVIEW_PASS_ACCURACY = 0.8;

export interface ReviewItem {
  childId: string;
  kpId: string;
  /** Index into REVIEW_INTERVALS_DAYS of the upcoming review. */
  stage: number;
  intervalDays: number;
  /** When the next review is due (epoch ms, 00:00 Asia/Shanghai). */
  dueAt: number;
  isDue: boolean;
  /** 'learning' after a failed review until a review passes again. */
  status: 'mastered' | 'learning';
  reviewsPassed: number;
  lastReviewAt?: number;
  lastReviewAccuracy?: number;
}

export interface ReviewOptions {
  childId?: string;
}

/**
 * All scheduled reviews, sorted by dueAt (then kpId). Filter with `isDue`
 * (or use `dueReviews`) to get what should be reviewed now.
 */
export function computeReviewSchedule(
  events: readonly LearningEvent[],
  masteryMap: ReadonlyMap<string, MasteryState>,
  now: number,
  opts: ReviewOptions = {},
): ReviewItem[] {
  const childId = opts.childId ?? [...masteryMap.values()][0]?.childId;
  const attempts = attemptsOf(events, childId);
  const out: ReviewItem[] = [];
  for (const state of masteryMap.values()) {
    if (state.masteredAt === undefined) continue;
    // Group review attempts after mastery into sessions by Shanghai day.
    const sessions = new Map<string, { correct: number; total: number; last: number }>();
    for (const e of attempts) {
      if (e.kpId !== state.kpId || e.mode !== 'review' || e.at < state.masteredAt) continue;
      const day = shanghaiDay(e.at);
      const s = sessions.get(day) ?? { correct: 0, total: 0, last: e.at };
      s.total++;
      if (e.correct) s.correct++;
      s.last = Math.max(s.last, e.at);
      sessions.set(day, s);
    }
    let stage = 0;
    let anchor = state.masteredAt;
    let status: ReviewItem['status'] = 'mastered';
    let reviewsPassed = 0;
    let lastReviewAt: number | undefined;
    let lastReviewAccuracy: number | undefined;
    for (const s of [...sessions.values()].sort((a, b) => a.last - b.last)) {
      const acc = s.correct / s.total;
      lastReviewAt = s.last;
      lastReviewAccuracy = acc;
      anchor = s.last;
      if (acc >= REVIEW_PASS_ACCURACY) {
        stage = Math.min(stage + 1, REVIEW_INTERVALS_DAYS.length - 1);
        status = 'mastered';
        reviewsPassed++;
      } else {
        stage = 0;
        status = 'learning';
      }
    }
    const intervalDays = REVIEW_INTERVALS_DAYS[stage];
    const dueAt = shanghaiDayStart(anchor) + intervalDays * DAY_MS;
    const item: ReviewItem = {
      childId: state.childId,
      kpId: state.kpId,
      stage,
      intervalDays,
      dueAt,
      isDue: dueAt <= now,
      status,
      reviewsPassed,
    };
    if (lastReviewAt !== undefined) {
      item.lastReviewAt = lastReviewAt;
      item.lastReviewAccuracy = lastReviewAccuracy;
    }
    out.push(item);
  }
  return out.sort((a, b) => a.dueAt - b.dueAt || (a.kpId < b.kpId ? -1 : a.kpId > b.kpId ? 1 : 0));
}

export function dueReviews(schedule: readonly ReviewItem[]): ReviewItem[] {
  return schedule.filter((r) => r.isDue);
}
