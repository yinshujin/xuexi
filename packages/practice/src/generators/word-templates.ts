import type { ErrorTag, GeneratorId } from '@xuexi/shared';
import type { Rng } from '../rng';
import type { Answer, SolutionStep } from '../types';
import { choiceDiagnosis, defineGenerator, numOf, type PracticeGenerator } from './base';

/**
 * Routine practice built from small templates (word problems, counting
 * figures described in words). Like the 拔高 / 创新 templates in challenge.ts,
 * each template splits into `make` (random parameters, including the order of
 * any choice options) and `render` (deterministic text), and has its own
 * `solve` that reaches the answer another way (simulation / enumeration) for
 * the tests. Variant = the template's `variant`; 'mixed' draws from all.
 */
export interface WordDraft {
  widget: 'numeric' | 'choice';
  prompt: string;
  options?: string[];
  answer: Answer;
  hint: string;
  steps: SolutionStep[];
  targetSeconds: number;
  /** choice: the mistake each wrong option reveals (null for the correct one). */
  optionTags?: Array<ErrorTag | null>;
}

export interface WordTemplate<P = unknown> {
  /** Unique within the generator. */
  id: string;
  /** Knowledge-point variant this template serves. */
  variant: string;
  /** Lowest difficulty (1..5) the template suits; the generator falls back to any. */
  minDifficulty?: number;
  make(rng: Rng, difficulty: number): P;
  render(p: P): WordDraft;
  /** Independent solution for the tests. */
  solve(p: P): Answer;
  /** Numeric answers: typical wrong results and the mistake each reveals. */
  bugs?(p: P): Array<[number, ErrorTag]>;
}

export interface WordParams {
  template: string;
  p: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTemplate = WordTemplate<any>;

export function wordGenerator(
  id: GeneratorId,
  templates: ReadonlyArray<AnyTemplate>,
): PracticeGenerator<WordParams> & { templates: ReadonlyArray<AnyTemplate> } {
  const byId = new Map(templates.map((t) => [t.id, t]));
  if (byId.size !== templates.length) throw new Error(`${id}: duplicate template id`);
  const variants = ['mixed', ...new Set(templates.map((t) => t.variant))];
  const gen = defineGenerator<WordParams>({
    id,
    variants,
    build({ difficulty, variant, rng }) {
      const pool = variant === 'mixed' ? templates : templates.filter((t) => t.variant === variant);
      const fit = pool.filter((t) => (t.minDifficulty ?? 1) <= difficulty);
      const t = rng.pick(fit.length > 0 ? fit : pool);
      const p = t.make(rng, difficulty);
      const d = t.render(p);
      return {
        widget: d.widget,
        prompt: d.prompt,
        ...(d.options ? { options: d.options } : {}),
        answer: d.answer,
        hint: d.hint,
        steps: d.steps,
        targetSeconds: d.targetSeconds,
        params: { template: t.id, p },
      };
    },
    diagnose(params, response) {
      const t = byId.get(params.template)!;
      const d = t.render(params.p);
      if (d.widget === 'choice') return choiceDiagnosis(d.optionTags ?? [], response);
      const v = numOf(response);
      const correct = d.answer.type === 'number' ? d.answer.value : NaN;
      const hit = (t.bugs?.(params.p) ?? []).find(([x]) => x === v && x !== correct);
      return { tags: hit ? [hit[1]] : [] };
    },
  });
  return Object.assign(gen, { templates });
}
