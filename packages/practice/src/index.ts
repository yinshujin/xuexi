/**
 * @xuexi/practice — question generators, grading with error diagnosis,
 * mastery, spaced review, mistake book and the daily plan. Pure TypeScript,
 * deterministic, no DOM.
 */

export type * from './types';

export { createRng, hashString, mulberry32, questionRng, seedFrom, type Rng } from './rng';

export {
  ALL_GENERATORS,
  generateQuestion,
  getGenerator,
  gradeQuestion,
  hasGenerator,
} from './registry';
export {
  DEFAULT_FEEDBACK,
  allowedTags,
  responseMatches,
  type PracticeGenerator,
} from './generators/base';

export { readChineseNumber, koujue, type ReadBugs } from './chinese';

export {
  DAY_MS,
  describeQuestionForParent,
  questionFromRef,
  questionRefKey,
  refOfQuestion,
  shanghaiDay,
  shanghaiDayStart,
} from './refs';

export {
  DEFAULT_TARGET_DIFFICULTY,
  ELO_SCALE,
  INITIAL_THETA,
  RECENT_WINDOW,
  attemptScore,
  computeMastery,
  expectedSuccess,
  kFactor,
  newMasteryState,
  recommendDifficulty,
  type MasteryOptions,
  type MasteryState,
  type MasteryStatus,
} from './mastery';

export {
  REVIEW_INTERVALS_DAYS,
  REVIEW_PASS_ACCURACY,
  computeReviewSchedule,
  dueReviews,
  type ReviewItem,
  type ReviewOptions,
} from './review';

export {
  VARIANT_DAYS_TO_CLEAR,
  computeMistakeBook,
  mistakeKey,
  openMistakes,
  type MistakeEntry,
  type MistakeOptions,
} from './mistakes';

export {
  NON_SPEED_FACTOR,
  WARMUP_GENERATORS,
  WARMUP_SECONDS,
  buildDailyPlan,
  chooseCurrentKp,
  type DailyBlock,
  type DailyBlockKind,
  type DailyKp,
  type DailyPlan,
  type DailyPlanInput,
  type DailyPracticeSpec,
  type PlannedQuestion,
} from './daily';
