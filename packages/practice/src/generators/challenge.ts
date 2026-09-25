import type { ErrorTag, GeneratorId } from '@xuexi/shared';
import type { Rng } from '../rng';
import type { Answer, SolutionStep } from '../types';
import { choiceDiagnosis, defineGenerator, type PracticeGenerator } from './base';

/**
 * 拔高题 / 创新题 for math: questions that use a knowledge point in a new way
 * (reverse problems, missing digits, patterns, multi-step situations, spotting
 * a mistake, "how many ways"), so the child learns to apply it, not only to
 * repeat the routine exercise.
 *
 *   stretch (拔高)  — the same knowledge, one step harder: reverse / multi-step / 比较不计算
 *   creative (创新) — a new situation or an open question: 有几种方法、找规律、判断对错并说理由
 *
 * Every template splits into `make` (random parameters, including the order of
 * any choice options) and `render` (deterministic text). `solve` must reach the
 * answer a different way than `render` (usually brute force / enumeration):
 * the tests run it on many seeds as an independent check.
 */
export type ChallengeTier = 'stretch' | 'creative';

export interface ChallengeDraft {
  widget: 'numeric' | 'choice' | 'compare';
  prompt: string;
  options?: string[];
  answer: Answer;
  hint: string;
  steps: SolutionStep[];
  targetSeconds: number;
  /** choice: the mistake each wrong option reveals (null for the correct one). */
  optionTags?: Array<ErrorTag | null>;
}

export interface ChallengeTemplate<P = unknown> {
  /** Unique within the generator, e.g. "addsub.max-fill". */
  id: string;
  /** Knowledge-point family; the curriculum uses variant `${family}#${tier}`. */
  family: string;
  tier: ChallengeTier;
  /** Lowest difficulty (1..5) the template suits; the generator falls back to any. */
  minDifficulty?: number;
  make(rng: Rng, difficulty: number): P;
  render(p: P): ChallengeDraft;
  /** Independent solution (enumeration / another method) for the tests. */
  solve(p: P): Answer;
}

export interface ChallengeParams {
  template: string;
  p: unknown;
  optionTags: Array<ErrorTag | null>;
}

export function challengeGenerator(
  id: GeneratorId,
  templates: ReadonlyArray<ChallengeTemplate<any>>, // eslint-disable-line @typescript-eslint/no-explicit-any
): PracticeGenerator<ChallengeParams> & { templates: ReadonlyArray<ChallengeTemplate<any>> } { // eslint-disable-line @typescript-eslint/no-explicit-any
  const ids = new Set<string>();
  for (const t of templates) {
    if (ids.has(t.id)) throw new Error(`${id}: duplicate template ${t.id}`);
    ids.add(t.id);
  }
  const variants = [...new Set(templates.map((t) => `${t.family}#${t.tier}`))];
  if (variants.length === 0) throw new Error(`${id}: no templates`);
  const gen = defineGenerator<ChallengeParams>({
    id,
    variants,
    build({ difficulty, variant, rng }) {
      const [family, tier] = variant.split('#');
      const pool = templates.filter((t) => t.family === family && t.tier === tier);
      const fit = pool.filter((t) => (t.minDifficulty ?? 1) <= difficulty);
      const t = rng.pick(fit.length > 0 ? fit : pool);
      const p = t.make(rng, difficulty);
      const d = t.render(p);
      return {
        widget: d.widget,
        prompt: `${tier === 'stretch' ? '【拔高】' : '【创新】'}${d.prompt}`,
        ...(d.options ? { options: d.options } : {}),
        answer: d.answer,
        hint: d.hint,
        steps: d.steps,
        targetSeconds: d.targetSeconds,
        params: { template: t.id, p, optionTags: d.optionTags ?? [] },
      };
    },
    diagnose(params, response) {
      const byOption = choiceDiagnosis(params.optionTags, response);
      return byOption.tags.length > 0 ? byOption : { tags: ['reasoning'] };
    },
  });
  return Object.assign(gen, { templates });
}

/** Shuffle the correct answer in with the distractors; the order becomes part of the params. */
export function shuffledOptions(
  rng: Rng,
  correct: string,
  wrong: Array<[text: string, tag: ErrorTag]>,
): { options: string[]; tags: Array<ErrorTag | null> } {
  const all: Array<[string, ErrorTag | null]> = rng.shuffle([[correct, null], ...wrong]);
  return { options: all.map(([t]) => t), tags: all.map(([, g]) => g) };
}
