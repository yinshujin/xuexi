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
export {
  challengeGenerator,
  shuffledOptions,
  type ChallengeDraft,
  type ChallengeParams,
  type ChallengeTemplate,
  type ChallengeTier,
} from './generators/challenge';
export { YW_G2A_WORDS } from './banks/yw-g2a-words';
export { YW_G4A_WORDS } from './banks/yw-g4a-words';
export type { DictWord, DictationList } from './banks/types';
export { displayPinyin } from './generators/dictation';
export { soundAlikeWrongs } from './generators/dictation';
export { YW_G2A_SOUNDALIKE_WORDS } from './banks/yw-g2a-words';
export { YW_G4A_SOUNDALIKE_WORDS } from './banks/yw-g4a-words';
export { EN_G2A } from './banks/en-g2a';
export { EN_G4A } from './banks/en-g4a';
export { XZ_G4A } from './banks/xz-g4a';
export type { EnglishBank, EnWord, ChoiceItem } from './banks/types';
export { XZ_G2A, XZ_G2A_GAMES } from './banks/xz-g2a';
export { XZ_G4A_GAMES } from './banks/xz-g4a-games';
export type { WritingGames } from './banks/types';
