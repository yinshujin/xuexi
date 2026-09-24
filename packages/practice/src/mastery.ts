import {
  DEFAULT_SETTINGS,
  type AttemptEvent,
  type FamilySettings,
  type LearningEvent,
} from '@xuexi/shared';
import { questionFromRef, questionRefKey } from './refs';

/**
 * Mastery per (child, knowledge point), derived from the attempt log.
 *
 * Ability θ and question difficulty d live on the same 1..5 scale. After each
 * attempt (Elo):
 *
 *   expected = 1 / (1 + 10^((d − θ) / ELO_SCALE))
 *   θ ← θ + K(n) · (score − expected)
 *
 * ELO_SCALE = 2 means: one difficulty level above θ → ~24 % expected success,
 * one level below → ~76 %, and 80 % success sits 1.2 levels below θ.
 * K(n) = max(0.25, 1.5 / (1 + n / 10)) decays with the number of attempts n,
 * so early answers move θ quickly and later ones fine-tune it.
 *
 * score: correct 1, wrong 0. Half credit (0.5) when a correct answer was
 * hinted, or when a speed-mode answer took longer than the question's
 * targetSeconds. recentAccuracy uses the plain `correct` flag.
 *
 * Status:
 *   'new'      no attempts
 *   'mastered' θ ≥ targetDifficulty AND ≥ minAttempts attempts AND accuracy of
 *              the last RECENT_WINDOW attempts ≥ settings.masteryAccuracy
 *   'learning' otherwise
 * Hysteresis: once mastered, a KP only falls back to 'learning' when recent
 * accuracy drops below masteryAccuracy − 0.2 or θ < target − 0.75, so one
 * slip does not flip the status back and forth.
 */

export const ELO_SCALE = 2;
export const INITIAL_THETA = 1;
export const THETA_MIN = 0;
export const THETA_MAX = 6;
export const RECENT_WINDOW = 10;
export const DEFAULT_TARGET_DIFFICULTY = 3;
const DROP_ACCURACY_MARGIN = 0.2;
const DROP_THETA_MARGIN = 0.75;

export type MasteryStatus = 'new' | 'learning' | 'mastered';

export interface MasteryState {
  childId: string;
  kpId: string;
  theta: number;
  attempts: number;
  correct: number;
  /** Accuracy over the last RECENT_WINDOW attempts (0 when none). */
  recentAccuracy: number;
  /** Number of attempts in the recent window (≤ RECENT_WINDOW). */
  recentCount: number;
  status: MasteryStatus;
  /** First time the KP became mastered (kept even if it later drops back). */
  masteredAt?: number;
  lastAttemptAt?: number;
  /** Average seconds per answer over the recent window. */
  recentAvgSeconds?: number;
  /** Target difficulty used for the mastery decision. */
  targetDifficulty: number;
}

export interface MasteryOptions {
  /** Only events of this child. Required when the log contains several children. */
  childId?: string;
  settings?: Pick<FamilySettings, 'masteryAccuracy'>;
  /** Shorthand for settings.masteryAccuracy (takes precedence). */
  masteryAccuracy?: number;
  /** θ needed for mastery; per KP (e.g. its maxDifficulty) or a constant. Default 3. */
  targetDifficulty?: number | ((kpId: string) => number);
  /** Starting θ per KP. Default 1. */
  initialTheta?: number | ((kpId: string) => number);
  /** Minimum attempts before mastery. Default RECENT_WINDOW. */
  minAttempts?: number;
  /**
   * targetSeconds of the attempted question, used for speed-mode half credit.
   * Default: regenerate the question from its generator reference.
   */
  targetSecondsFor?: (event: AttemptEvent) => number | undefined;
  /** Difficulty of a bank question (generator refs carry their own). Default 3. */
  difficultyFor?: (event: AttemptEvent) => number | undefined;
}

export function expectedSuccess(theta: number, difficulty: number, scale = ELO_SCALE): number {
  return 1 / (1 + 10 ** ((difficulty - theta) / scale));
}

export function kFactor(attemptsSoFar: number): number {
  return Math.max(0.25, 1.5 / (1 + attemptsSoFar / 10));
}

/** Score of one attempt in [0, 1]. */
export function attemptScore(e: AttemptEvent, targetSeconds?: number): number {
  if (!e.correct) return 0;
  if (e.hinted) return 0.5;
  if (e.mode === 'speed' && targetSeconds !== undefined && e.durationMs > targetSeconds * 1000)
    return 0.5;
  return 1;
}

/** Attempt events of one child, sorted deterministically by (at, id). */
export function attemptsOf(events: readonly LearningEvent[], childId?: string): AttemptEvent[] {
  const attempts = events.filter((e): e is AttemptEvent => e.type === 'attempt');
  if (childId === undefined) {
    const kids = new Set(attempts.map((e) => e.childId));
    if (kids.size > 1) throw new Error('practice: events of several children; pass opts.childId');
  }
  return attempts
    .filter((e) => childId === undefined || e.childId === childId)
    .sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function defaultTargetSeconds(): (e: AttemptEvent) => number | undefined {
  const cache = new Map<string, number | undefined>();
  return (e) => {
    const key = questionRefKey(e.question);
    if (!cache.has(key)) cache.set(key, questionFromRef(e.question)?.targetSeconds);
    return cache.get(key);
  };
}

export function computeMastery(
  events: readonly LearningEvent[],
  opts: MasteryOptions = {},
): Map<string, MasteryState> {
  const accuracyNeeded =
    opts.masteryAccuracy ?? (opts.settings ?? DEFAULT_SETTINGS).masteryAccuracy;
  const minAttempts = opts.minAttempts ?? RECENT_WINDOW;
  const targetOf = (kp: string) =>
    typeof opts.targetDifficulty === 'function'
      ? opts.targetDifficulty(kp)
      : (opts.targetDifficulty ?? DEFAULT_TARGET_DIFFICULTY);
  const thetaOf = (kp: string) =>
    typeof opts.initialTheta === 'function'
      ? opts.initialTheta(kp)
      : (opts.initialTheta ?? INITIAL_THETA);
  const targetSecondsFor = opts.targetSecondsFor ?? defaultTargetSeconds();

  const out = new Map<string, MasteryState>();
  const recent = new Map<string, Array<{ correct: boolean; ms: number }>>();

  for (const e of attemptsOf(events, opts.childId)) {
    let s = out.get(e.kpId);
    if (!s) {
      s = {
        childId: e.childId,
        kpId: e.kpId,
        theta: thetaOf(e.kpId),
        attempts: 0,
        correct: 0,
        recentAccuracy: 0,
        recentCount: 0,
        status: 'new',
        targetDifficulty: targetOf(e.kpId),
      };
      out.set(e.kpId, s);
      recent.set(e.kpId, []);
    }
    const d =
      e.question.source === 'generator'
        ? e.question.difficulty
        : (opts.difficultyFor?.(e) ?? DEFAULT_TARGET_DIFFICULTY);
    const score = attemptScore(e, e.mode === 'speed' ? targetSecondsFor(e) : undefined);
    const k = kFactor(s.attempts);
    s.theta = Math.min(
      THETA_MAX,
      Math.max(THETA_MIN, s.theta + k * (score - expectedSuccess(s.theta, d))),
    );
    s.attempts++;
    if (e.correct) s.correct++;
    s.lastAttemptAt = e.at;

    const win = recent.get(e.kpId)!;
    win.push({ correct: e.correct, ms: e.durationMs });
    if (win.length > RECENT_WINDOW) win.shift();
    s.recentCount = win.length;
    s.recentAccuracy = win.filter((w) => w.correct).length / win.length;
    s.recentAvgSeconds = win.reduce((sum, w) => sum + w.ms, 0) / win.length / 1000;

    const meets =
      s.theta >= s.targetDifficulty &&
      s.attempts >= minAttempts &&
      s.recentAccuracy >= accuracyNeeded;
    if (s.status === 'mastered') {
      const drops =
        s.recentAccuracy < accuracyNeeded - DROP_ACCURACY_MARGIN ||
        s.theta < s.targetDifficulty - DROP_THETA_MARGIN;
      if (drops) s.status = 'learning';
    } else if (meets) {
      s.status = 'mastered';
      if (s.masteredAt === undefined) s.masteredAt = e.at;
    } else {
      s.status = 'learning';
    }
  }
  return out;
}

/**
 * The difficulty in [range.min, range.max] whose predicted success is closest
 * to `targetSuccess` (default 0.8, “跳一跳够得着”). Ties go to the easier level.
 * Without a state (never practised) → range.min.
 */
export function recommendDifficulty(
  state: Pick<MasteryState, 'theta'> | undefined,
  range: { min: number; max: number },
  targetSuccess = 0.8,
): number {
  const lo = Math.max(1, Math.min(range.min, range.max));
  const hi = Math.min(5, Math.max(range.min, range.max));
  if (!state) return lo;
  let best = lo;
  let bestGap = Infinity;
  for (let d = lo; d <= hi; d++) {
    const gap = Math.abs(expectedSuccess(state.theta, d) - targetSuccess);
    if (gap < bestGap - 1e-12) {
      best = d;
      bestGap = gap;
    }
  }
  return best;
}

/** The state of a KP that has no attempts yet ('new'). */
export function newMasteryState(
  kpId: string,
  childId = '',
  opts: Pick<MasteryOptions, 'targetDifficulty' | 'initialTheta'> = {},
): MasteryState {
  return {
    childId,
    kpId,
    theta:
      typeof opts.initialTheta === 'function'
        ? opts.initialTheta(kpId)
        : (opts.initialTheta ?? INITIAL_THETA),
    attempts: 0,
    correct: 0,
    recentAccuracy: 0,
    recentCount: 0,
    status: 'new',
    targetDifficulty:
      typeof opts.targetDifficulty === 'function'
        ? opts.targetDifficulty(kpId)
        : (opts.targetDifficulty ?? DEFAULT_TARGET_DIFFICULTY),
  };
}
