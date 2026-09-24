import type { GeneratorId, PracticeMode, QuestionRef } from '@xuexi/shared';
import { recommendDifficulty, type MasteryState } from './mastery';
import type { MistakeEntry } from './mistakes';
import { questionFromRef, shanghaiDay } from './refs';
import { getGenerator, hasGenerator } from './registry';
import type { ReviewItem } from './review';
import { createRng, seedFrom } from './rng';

/**
 * 今日任务 (daily plan): 口算热身 → 到期复习 → 错题重练 → 当前知识点专项.
 *
 * Deterministic given its inputs. Time estimates use each question's
 * targetSeconds: speed drills at 1×, everything else at NON_SPEED_FACTOR×
 * (children answer slower outside speed drills). Budget shares:
 *   warm-up   WARMUP_SECONDS (skipped when the budget is under 4 minutes)
 *   reviews   ≤ 35 % of the budget, 3–5 questions per KP
 *   mistakes  ≤ 25 % of the budget, original + one variant per entry
 *   practice  everything left (adaptive: the UI should re-run
 *             recommendDifficulty after each answer)
 * Unused shares flow on to the later blocks.
 */

export const WARMUP_SECONDS = 120;
export const NON_SPEED_FACTOR = 1.5;
const REVIEW_SHARE = 0.35;
const MISTAKE_SHARE = 0.25;
const MAX_MISTAKE_ENTRIES = 5;
const BANK_QUESTION_SECONDS = 60;
/** Hard caps so a child's session stays short even for very quick questions. */
const MAX_WARMUP_QUESTIONS = 12;
const MAX_PRACTICE_QUESTIONS = 25;
/** Per-question overhead for reading feedback and moving on, seconds. */
const OVERHEAD_SECONDS = { speed: 2, other: 5 } as const;

/** Generators suitable for a timed warm-up (口算). */
export const WARMUP_GENERATORS: readonly GeneratorId[] = [
  'g2.addsub.2d',
  'g2.addsub.chain',
  'g2.mul.table',
  'g2.div.table',
  'g4.oral.muldiv',
];

export interface DailyPracticeSpec {
  generatorId: GeneratorId;
  minDifficulty: number;
  maxDifficulty: number;
  variant?: string;
}

/** Minimal mirror of the curriculum's KnowledgePoint. `kps` must be in curriculum order. */
export interface DailyKp {
  id: string;
  practice: DailyPracticeSpec[];
  prerequisites: string[];
}

export interface DailyPlanInput {
  kps: readonly DailyKp[];
  masteryMap: ReadonlyMap<string, MasteryState>;
  /** Due reviews (items with isDue: false are ignored). */
  reviewDue: readonly ReviewItem[];
  /** Mistake book entries (cleared ones are ignored). */
  mistakes: readonly MistakeEntry[];
  minutes: number;
  now: number;
  seedBase: number | string;
  /** Parent-assigned focus; otherwise the first unmastered KP in curriculum order. */
  currentKpId?: string;
}

export type DailyBlockKind = 'warmup' | 'review' | 'mistakes' | 'practice';

export interface PlannedQuestion {
  kpId: string;
  /** Reproduces the question (questionFromRef); bank refs are rendered by the app. */
  ref: QuestionRef;
  mode: PracticeMode;
  role: 'new' | 'original' | 'variant';
  targetSeconds: number;
  estSeconds: number;
  /** Mistake-book entry this question works on. */
  mistakeKey?: string;
}

export interface DailyBlock {
  kind: DailyBlockKind;
  title: string;
  kpId?: string;
  mode: PracticeMode;
  questions: PlannedQuestion[];
  estSeconds: number;
  /** practice: difficulty may be re-chosen after every answer. */
  adaptive: boolean;
}

export interface DailyPlan {
  blocks: DailyBlock[];
  budgetSeconds: number;
  estSeconds: number;
  currentKpId?: string;
}

function planned(
  kpId: string,
  generatorId: GeneratorId,
  difficulty: number,
  seed: number,
  variant: string | undefined,
  mode: PracticeMode,
  role: PlannedQuestion['role'],
): PlannedQuestion {
  const ref: QuestionRef = { source: 'generator', generatorId, difficulty, seed };
  if (variant !== undefined) ref.variant = variant;
  const q = getGenerator(generatorId).generate({ difficulty, seed, variant });
  const est =
    mode === 'speed'
      ? q.targetSeconds + OVERHEAD_SECONDS.speed
      : Math.round(q.targetSeconds * NON_SPEED_FACTOR) + OVERHEAD_SECONDS.other;
  return { kpId, ref, mode, role, targetSeconds: q.targetSeconds, estSeconds: est };
}

function block(
  kind: DailyBlockKind,
  title: string,
  mode: PracticeMode,
  questions: PlannedQuestion[],
  kpId?: string,
): DailyBlock {
  const b: DailyBlock = {
    kind,
    title,
    mode,
    questions,
    estSeconds: questions.reduce((s, q) => s + q.estSeconds, 0),
    adaptive: kind === 'practice',
  };
  if (kpId !== undefined) b.kpId = kpId;
  return b;
}

const isMastered = (m: ReadonlyMap<string, MasteryState>, id: string) =>
  m.get(id)?.status === 'mastered';

/** Focus KP: parent choice, else first unmastered KP with practice; stuck KPs fall back to an unmastered prerequisite. */
export function chooseCurrentKp(
  kps: readonly DailyKp[],
  mastery: ReadonlyMap<string, MasteryState>,
  currentKpId?: string,
): DailyKp | undefined {
  const byId = new Map(kps.map((k) => [k.id, k]));
  let kp = currentKpId !== undefined ? byId.get(currentKpId) : undefined;
  if (!kp || kp.practice.length === 0)
    kp = kps.find((k) => k.practice.length > 0 && !isMastered(mastery, k.id));
  const seen = new Set<string>();
  while (kp && !seen.has(kp.id)) {
    seen.add(kp.id);
    const s = mastery.get(kp.id);
    const stuck = s !== undefined && s.attempts >= 10 && s.recentAccuracy < 0.6;
    if (!stuck) break;
    const pre = kp.prerequisites
      .map((id) => byId.get(id))
      .find((p) => p && p.practice.length > 0 && !isMastered(mastery, p.id));
    if (!pre) break;
    kp = pre;
  }
  return kp;
}

function specDifficulty(
  spec: DailyPracticeSpec,
  state: MasteryState | undefined,
  success = 0.8,
): number {
  return recommendDifficulty(state, { min: spec.minDifficulty, max: spec.maxDifficulty }, success);
}

export function buildDailyPlan(input: DailyPlanInput): DailyPlan {
  const budget = Math.max(0, Math.round(input.minutes * 60));
  const rng = createRng(seedFrom('daily', input.seedBase));
  const seed = (...parts: Array<string | number>) =>
    seedFrom(input.seedBase, ...parts) & 0x7fffffff;
  const blocks: DailyBlock[] = [];
  let used = 0;
  const current = chooseCurrentKp(input.kps, input.masteryMap, input.currentKpId);
  const kpById = new Map(input.kps.map((k) => [k.id, k]));

  // 1. Warm-up speed drill from a mastered computation KP (or the current KP).
  if (budget >= 240) {
    const candidates: Array<{ kp: DailyKp; spec: DailyPracticeSpec }> = [];
    for (const kp of input.kps) {
      if (!isMastered(input.masteryMap, kp.id)) continue;
      for (const spec of kp.practice)
        if (WARMUP_GENERATORS.includes(spec.generatorId)) candidates.push({ kp, spec });
    }
    if (candidates.length === 0 && current) {
      for (const spec of current.practice)
        if (WARMUP_GENERATORS.includes(spec.generatorId)) candidates.push({ kp: current, spec });
    }
    if (candidates.length > 0) {
      const { kp, spec } = rng.pick(candidates);
      // Speed drills stay comfortable: aim at 90 % success; vertical grids are not for speed.
      const variant =
        spec.generatorId === 'g2.addsub.2d' && spec.variant === 'vertical' ? 'oral' : spec.variant;
      const d = specDifficulty(spec, input.masteryMap.get(kp.id), 0.9);
      const qs: PlannedQuestion[] = [];
      let t = 0;
      for (let i = 0; t < WARMUP_SECONDS && i < MAX_WARMUP_QUESTIONS; i++) {
        const q = planned(kp.id, spec.generatorId, d, seed('warmup', i), variant, 'speed', 'new');
        qs.push(q);
        t += q.estSeconds;
      }
      blocks.push(block('warmup', '口算热身', 'speed', qs, kp.id));
      used += t;
    }
  }

  // 2. Due reviews, most overdue first, 3–5 questions each.
  const reviewCap = Math.round(budget * REVIEW_SHARE);
  let reviewUsed = 0;
  const due = input.reviewDue
    .filter((r) => r.isDue)
    .slice()
    .sort((a, b) => a.dueAt - b.dueAt || (a.kpId < b.kpId ? -1 : 1));
  for (const r of due) {
    const kp = kpById.get(r.kpId);
    if (!kp || kp.practice.length === 0) continue;
    const state = input.masteryMap.get(kp.id);
    const qs: PlannedQuestion[] = [];
    for (let i = 0; i < 5; i++) {
      const spec = kp.practice[i % kp.practice.length];
      qs.push(
        planned(
          kp.id,
          spec.generatorId,
          specDifficulty(spec, state),
          seed('review', kp.id, i),
          spec.variant,
          'review',
          'new',
        ),
      );
    }
    // Keep 3..5 questions, as many as fit in the review share and the whole budget.
    let n = 5;
    const cost = (k: number) => qs.slice(0, k).reduce((s, q) => s + q.estSeconds, 0);
    while (n > 3 && (reviewUsed + cost(n) > reviewCap || used + cost(n) > budget)) n--;
    if (reviewUsed + cost(n) > reviewCap || used + cost(n) > budget) break;
    const chosen = qs.slice(0, n);
    blocks.push(block('review', '到期复习', 'review', chosen, kp.id));
    reviewUsed += cost(n);
    used += cost(n);
  }

  // 3. Mistake redo: the original (until redone) + one variant per entry per day.
  const mistakeCap = Math.round(budget * MISTAKE_SHARE) + (reviewCap - reviewUsed);
  let mistakeUsed = 0;
  const today = shanghaiDay(input.now);
  const open = input.mistakes
    .filter((m) => !m.cleared)
    .slice()
    .sort((a, b) => a.lastWrongAt - b.lastWrongAt || (a.key < b.key ? -1 : 1));
  const mistakeQs: PlannedQuestion[] = [];
  let entriesTaken = 0;
  for (const m of open) {
    if (entriesTaken >= MAX_MISTAKE_ENTRIES) break;
    const qs: PlannedQuestion[] = [];
    if (!m.originalRedone) {
      if (m.question.source === 'generator') {
        const q = questionFromRef(m.question);
        if (q) {
          qs.push({
            kpId: m.kpId,
            ref: m.question,
            mode: 'mistakes',
            role: 'original',
            targetSeconds: q.targetSeconds,
            estSeconds: Math.round(q.targetSeconds * NON_SPEED_FACTOR),
            mistakeKey: m.key,
          });
        }
      } else {
        qs.push({
          kpId: m.kpId,
          ref: m.question,
          mode: 'mistakes',
          role: 'original',
          targetSeconds: BANK_QUESTION_SECONDS,
          estSeconds: BANK_QUESTION_SECONDS,
          mistakeKey: m.key,
        });
      }
    }
    if (
      m.question.source === 'generator' &&
      hasGenerator(m.question.generatorId) &&
      !m.variantDays.includes(today)
    ) {
      const g = getGenerator(m.question.generatorId);
      const base = (m.question.variant ?? g.variants[0]).split('@')[0];
      const tag = m.errorTags.find((t) => g.targets.includes(t));
      const variant = tag ? `${base}@${tag}` : m.question.variant !== undefined ? base : undefined;
      const q = planned(
        m.kpId,
        g.id,
        m.question.difficulty,
        seed('mistake', m.key, today),
        variant,
        'mistakes',
        'variant',
      );
      q.mistakeKey = m.key;
      qs.push(q);
    }
    const cost = qs.reduce((s, q) => s + q.estSeconds, 0);
    if (qs.length === 0) continue;
    if (mistakeUsed + cost > mistakeCap || used + cost > budget) break;
    mistakeQs.push(...qs);
    mistakeUsed += cost;
    used += cost;
    entriesTaken++;
  }
  if (mistakeQs.length > 0) blocks.push(block('mistakes', '错题重练', 'mistakes', mistakeQs));

  // 4. Current KP practice with the rest of the budget.
  if (current && current.practice.length > 0) {
    const state = input.masteryMap.get(current.id);
    const qs: PlannedQuestion[] = [];
    let misses = 0;
    for (let i = 0; qs.length < MAX_PRACTICE_QUESTIONS && misses < 3 && i < 200; i++) {
      // Mostly the main practice (first spec); every 4th question from the other specs, if any.
      const others = current.practice.length - 1;
      const spec =
        others > 0 && i % 4 === 3
          ? current.practice[1 + (Math.floor(i / 4) % others)]
          : current.practice[0];
      const q = planned(
        current.id,
        spec.generatorId,
        specDifficulty(spec, state),
        seed('practice', current.id, i),
        spec.variant,
        'daily',
        'new',
      );
      if (used + q.estSeconds > budget) {
        misses++; // try a few more (shorter questions may still fit), then stop
        continue;
      }
      qs.push(q);
      used += q.estSeconds;
    }
    if (qs.length > 0) blocks.push(block('practice', '专项练习', 'daily', qs, current.id));
  }

  const plan: DailyPlan = { blocks, budgetSeconds: budget, estSeconds: used };
  if (current) plan.currentKpId = current.id;
  return plan;
}
