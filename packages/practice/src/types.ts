import type { ErrorTag, GeneratorId } from '@xuexi/shared';

/**
 * Answer widgets supported by the app. Each question declares exactly one.
 *
 * - numeric:     big number keypad, single integer answer
 * - choice:      pick one option (also used for true/false and 大数读法)
 * - compare:     pick one of '<' '>' '='
 * - vertical:    column arithmetic grid (addition / subtraction / multiplication)
 * - division:    quotient + remainder (long division grid)
 * - angle:       an SVG angle with a protractor drawn over it; answer in degrees (numeric)
 */
export type AnswerWidget = 'numeric' | 'choice' | 'compare' | 'vertical' | 'division' | 'angle';

export type Answer =
  | { type: 'number'; value: number }
  | { type: 'choice'; index: number }
  | { type: 'compare'; value: '<' | '>' | '=' }
  | { type: 'division'; quotient: number; remainder: number };

/** What the child submits. Mirrors Answer; vertical grids also report partial rows. */
export type Response =
  | { type: 'number'; value: number | null }
  | { type: 'choice'; index: number | null }
  | { type: 'compare'; value: '<' | '>' | '=' | null }
  | {
      type: 'division';
      quotient: number | null;
      remainder: number | null;
    }
  | {
      type: 'vertical';
      /** Final result row as a number (null when empty). */
      value: number | null;
      /**
       * Multiplication only: partial product rows as the child wrote them,
       * right-aligned digit strings exactly as they appear in the grid
       * (e.g. ["1284", "3210"] where the second row is shifted one column left
       * and the shift is represented by the grid column, not by a trailing 0).
       */
      partials?: string[];
      /** Carry marks the child wrote, keyed by column index from the right. */
      carries?: Record<number, number>;
    };

/** Layout data for the vertical (column arithmetic) widget. */
export interface VerticalSpec {
  op: '+' | '-' | '×';
  /** Operands top-to-bottom, e.g. [326, 48]. */
  operands: number[];
  /** Multiplication: number of partial product rows the grid should show (0 = none). */
  partialRows: number;
  /** Total columns in the grid (enough for the widest row). */
  columns: number;
}

export interface AngleSpec {
  /** Degrees, 0 < degrees < 360 */
  degrees: number;
  /** Rotation of the first ray in degrees (0 = pointing right), for variety. */
  baseRotation: number;
  /** Whether the vertex opens to the left (forces reading the other scale). */
  opensLeft: boolean;
}

/** A single step of the programmatic worked solution. */
export interface SolutionStep {
  /** Plain Chinese text; may contain simple inline math like 326×48. */
  text: string;
  /** Optional formula line shown in monospace, e.g. "326 × 8 = 2608". */
  formula?: string;
}

export interface Question {
  /** Deterministic: `${generatorId}:${difficulty}:${seed}` (+ `:${variant}` if any). */
  key: string;
  generatorId: GeneratorId;
  difficulty: number;
  seed: number;
  variant?: string;
  widget: AnswerWidget;
  /** Plain text prompt in Chinese; may contain line breaks. */
  prompt: string;
  /** For choice widgets. */
  options?: string[];
  vertical?: VerticalSpec;
  angle?: AngleSpec;
  answer: Answer;
  /** Short hint shown on first wrong try (does not reveal the answer). */
  hint: string;
  steps: SolutionStep[];
  /** Soft time budget for speed drills, in seconds. */
  targetSeconds: number;
}

export interface GradeResult {
  correct: boolean;
  /** Diagnosed error tags (empty when correct or unknown). */
  errorTags: ErrorTag[];
  /** Child-facing feedback line, e.g. "第二行部分积要向左错一位哦". */
  feedback: string;
}

export interface GenerateOptions {
  difficulty: number;
  seed: number;
  variant?: string;
}

export interface Generator {
  id: GeneratorId;
  /** Variants this generator understands (first is the default). */
  variants: string[];
  generate(opts: GenerateOptions): Question;
  /** Grades and diagnoses. Must be pure and deterministic. */
  grade(question: Question, response: Response): GradeResult;
  /**
   * Produce a question that specifically targets an error tag, used for
   * remediation after diagnosis. Return null if the tag is not applicable.
   */
  targetFor?(tag: ErrorTag, opts: GenerateOptions): Question | null;
}
