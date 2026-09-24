import { GENERATORS, type ErrorTag, type GeneratorId } from '@xuexi/shared';
import { questionRng, type Rng } from '../rng';
import type {
  Answer,
  AngleSpec,
  AnswerWidget,
  GenerateOptions,
  Generator,
  GradeResult,
  Question,
  Response,
  SolutionStep,
  VerticalSpec,
} from '../types';

/**
 * Shared scaffolding for all generators.
 *
 * Variant strings: `base` or `base@errorTag`. The `@errorTag` suffix is how
 * `targetFor` produces a remediation question that is still reproducible from
 * (generatorId, difficulty, seed, variant) — e.g. `vertical@carry-missed`.
 *
 * Grading never trusts hidden state: `grade` re-derives the generator's
 * internal parameters from (difficulty, seed, variant) of the question.
 */

export interface BuildContext {
  difficulty: number;
  seed: number;
  /** Base variant (without `@tag`). */
  variant: string;
  /** Error tag this question must exercise (from `targetFor`). */
  target?: ErrorTag;
  rng: Rng;
}

export interface Draft<P> {
  widget: AnswerWidget;
  prompt: string;
  options?: string[];
  vertical?: VerticalSpec;
  angle?: AngleSpec;
  answer: Answer;
  hint: string;
  steps: SolutionStep[];
  targetSeconds: number;
  params: P;
}

export interface Diagnosis {
  tags: ErrorTag[];
  /** Specific feedback; defaults to the first tag's message. */
  feedback?: string;
}

export interface GeneratorDef<P> {
  id: GeneratorId;
  variants: string[];
  /** Error tags `targetFor` can force. */
  targets?: readonly ErrorTag[];
  build(ctx: BuildContext): Draft<P>;
  /**
   * Called only for a wrong, non-empty response. Return [] when nothing matches.
   * Must work from `params` alone (`question` may be absent in diagnoseWith).
   */
  diagnose(params: P, response: Response, question: Question): Diagnosis;
  feedback?: Partial<Record<ErrorTag, string>>;
}

/** A generator plus `derive`, which exposes its internal parameters (for tests / tooling). */
export interface PracticeGenerator<P = unknown> extends Generator {
  derive(opts: GenerateOptions): P;
  /**
   * Run only the bug library on explicit parameters (for tests / tooling),
   * e.g. g4Mul3x2.diagnoseWith({ a: 326, b: 48, trailing: false }, response).
   * Returns the raw diagnosis (empty tags = nothing matched).
   */
  diagnoseWith(params: P, response: Response): Diagnosis;
  /** Error tags `targetFor` supports. */
  targets: readonly ErrorTag[];
}

export const DEFAULT_FEEDBACK: Record<ErrorTag, string> = {
  'carry-missed': '别着急，满十要向前一位进 1，别忘了加上进位哦！',
  'borrow-missed': '借了位以后，前一位要减去 1，再检查一下吧！',
  'op-confused': '先看清楚是加号还是减号，再动笔哦！',
  'order-of-ops': '有括号先算括号里面的，没有括号就从左往右算。',
  'table-neighbor': '这句口诀和旁边的口诀记混了，再背一背这一句吧！',
  'table-add-confused': '这是乘法，是几个几相加，不是把两个数加起来哦！',
  'div-wrong-table': '想一想：除数乘几等于被除数？用对口诀就能求出商。',
  'mul-meaning': '想一想：是几个几相加？数清楚一共有几个加数。',
  'unit-rate': '记住进率：1元=10角，1角=10分，1米=100厘米。',
  'unit-choice': '想一想这个东西实际有多长，用手比一比再选单位。',
  'zero-reading': '每级末尾的 0 不读，中间有一个或连续几个 0 都只读一个「零」。',
  'place-value': '先从右往左四位一级分好级，再看每一位的计数单位。',
  'rewrite-vs-approx': '改写用「=」，大小不变；求近似数用「≈」，要四舍五入。',
  rounding: '看省略部分的最高位：小于 5 就舍去，大于或等于 5 就向前一位进 1。',
  'partial-shift': '用十位上的数去乘，积的末位要和十位对齐，向左错一位哦！',
  'trailing-zero': '因数末尾一共有几个 0，积的末尾就要添上几个 0，数一数吧！',
  'mul-fact': '有一句乘法口诀算错了，慢慢把这一步再算一遍。',
  'quotient-too-big': '试商大了：商乘除数比被除数还大，把商调小 1 试试。',
  'quotient-too-small': '余数要比除数小！余数太大说明商小了，把商调大一些。',
  'quotient-place': '不够商 1 的数位要用 0 占位，别漏写商中间或末尾的 0。',
  'remainder-error': '商是对的，再仔细算一算余数：被除数 − 商 × 除数。',
  'distributive-miss': '用乘法分配律时，括号里的两个数都要乘，一个也不能漏！',
  pairing: '凑整要找对好朋友：25 × 4 = 100，125 × 8 = 1000。',
  'protractor-scale': '看清角的一条边对着哪一圈的 0°，就读那一圈上的数。',
  'angle-type': '记住：锐角小于 90°，直角 90°，钝角在 90° 和 180° 之间，平角 180°，周角 360°。',
  'angle-sum': '想一想：平角是 180°，周角是 360°，直角是 90°，这里该用哪一个？',
  'negative-compare': '负数比大小：负号后面的数越大，这个负数反而越小，想想数轴吧！',
  careless: '差一点点！静下心来再算一遍，你一定行！',
};

const PRAISE = ['太棒了，答对了！', '完全正确，继续加油！', '真厉害，答对啦！', '算得又对又好！'];

export function allowedTags(id: GeneratorId): readonly ErrorTag[] {
  const info = GENERATORS.find((g) => g.id === id);
  return info ? (info.errorTags as readonly ErrorTag[]) : [];
}

export function clampDifficulty(d: number): number {
  if (!Number.isFinite(d)) return 1;
  return Math.min(5, Math.max(1, Math.round(d)));
}

/** The number in a numeric-like response (number / vertical), or null. */
export function numOf(r: Response): number | null {
  if (r.type === 'number' || r.type === 'vertical') return r.value;
  return null;
}

function isEmpty(answer: Answer, r: Response): boolean {
  switch (answer.type) {
    case 'number':
      return numOf(r) === null;
    case 'choice':
      return r.type !== 'choice' || r.index === null;
    case 'compare':
      return r.type !== 'compare' || r.value === null;
    case 'division':
      return r.type !== 'division' || r.quotient === null;
  }
}

/** Is the response exactly the answer? Division: an empty remainder counts as 0. */
export function responseMatches(answer: Answer, r: Response): boolean {
  switch (answer.type) {
    case 'number':
      return numOf(r) === answer.value;
    case 'choice':
      return r.type === 'choice' && r.index === answer.index;
    case 'compare':
      return r.type === 'compare' && r.value === answer.value;
    case 'division':
      return (
        r.type === 'division' &&
        r.quotient === answer.quotient &&
        (r.remainder ?? 0) === answer.remainder
      );
  }
}

interface NormalizedOptions {
  difficulty: number;
  seed: number;
  base: string;
  target?: ErrorTag;
  full: string;
}

function normalize<P>(def: GeneratorDef<P>, opts: GenerateOptions): NormalizedOptions {
  const difficulty = clampDifficulty(opts.difficulty);
  const seed = Number.isFinite(opts.seed) ? Math.trunc(opts.seed) : 0;
  const raw = opts.variant ?? def.variants[0];
  const at = raw.indexOf('@');
  const base = at >= 0 ? raw.slice(0, at) : raw;
  const tagStr = at >= 0 ? raw.slice(at + 1) : undefined;
  if (!def.variants.includes(base)) {
    throw new Error(`${def.id}: unknown variant "${base}" (known: ${def.variants.join(', ')})`);
  }
  let target: ErrorTag | undefined;
  if (tagStr !== undefined) {
    if (!(def.targets ?? []).includes(tagStr as ErrorTag)) {
      throw new Error(`${def.id}: cannot target error tag "${tagStr}"`);
    }
    target = tagStr as ErrorTag;
  }
  return { difficulty, seed, base, target, full: target ? `${base}@${target}` : base };
}

export function defineGenerator<P>(def: GeneratorDef<P>): PracticeGenerator<P> {
  const buildDraft = (opts: GenerateOptions) => {
    const n = normalize(def, opts);
    const rng = questionRng(def.id, n.difficulty, n.seed, n.full);
    const draft = def.build({
      difficulty: n.difficulty,
      seed: n.seed,
      variant: n.base,
      target: n.target,
      rng,
    });
    return { n, draft };
  };

  const generate = (opts: GenerateOptions): Question => {
    const { n, draft } = buildDraft(opts);
    const q: Question = {
      key:
        `${def.id}:${n.difficulty}:${n.seed}` +
        (opts.variant !== undefined ? `:${opts.variant}` : ''),
      generatorId: def.id,
      difficulty: n.difficulty,
      seed: n.seed,
      widget: draft.widget,
      prompt: draft.prompt,
      answer: draft.answer,
      hint: draft.hint,
      steps: draft.steps,
      targetSeconds: draft.targetSeconds,
    };
    if (opts.variant !== undefined) q.variant = opts.variant;
    if (draft.options) q.options = draft.options;
    if (draft.vertical) q.vertical = draft.vertical;
    if (draft.angle) q.angle = draft.angle;
    return q;
  };

  const derive = (opts: GenerateOptions): P => buildDraft(opts).draft.params;

  const grade = (question: Question, response: Response): GradeResult => {
    if (isEmpty(question.answer, response)) {
      return { correct: false, errorTags: [], feedback: '还没有写答案哦，试着算一算吧！' };
    }
    if (responseMatches(question.answer, response)) {
      return {
        correct: true,
        errorTags: [],
        feedback: PRAISE[Math.abs(question.seed) % PRAISE.length],
      };
    }
    const params = derive({
      difficulty: question.difficulty,
      seed: question.seed,
      variant: question.variant,
    });
    const d = def.diagnose(params, response, question);
    const tags: ErrorTag[] = d.tags.length > 0 ? [...new Set(d.tags)] : ['careless'];
    const feedback = d.feedback ?? def.feedback?.[tags[0]] ?? DEFAULT_FEEDBACK[tags[0]];
    return { correct: false, errorTags: tags, feedback };
  };

  const targets = def.targets ?? [];
  const targetFor = (tag: ErrorTag, opts: GenerateOptions): Question | null => {
    if (!targets.includes(tag)) return null;
    const base = (opts.variant ?? def.variants[0]).split('@')[0];
    return generate({ ...opts, variant: `${base}@${tag}` });
  };

  const diagnoseWith = (params: P, response: Response): Diagnosis =>
    def.diagnose(params, response, undefined as unknown as Question);

  return {
    id: def.id,
    variants: def.variants,
    targets,
    generate,
    grade,
    targetFor,
    derive,
    diagnoseWith,
  };
}

/**
 * Rejection sampling helper: calls `sample` until `accept` holds.
 * Generators are designed so that acceptance is likely; the cap only guards
 * against programming errors.
 */
export function sampleUntil<T>(
  sample: () => T,
  accept: (x: T) => boolean,
  what: string,
  cap = 20000,
): T {
  for (let i = 0; i < cap; i++) {
    const x = sample();
    if (accept(x)) return x;
  }
  throw new Error(`sampleUntil: could not generate ${what}`);
}

export const BLANK = '（　）';

export function step(text: string, formula?: string): SolutionStep {
  return formula === undefined ? { text } : { text, formula };
}

/** Choice question helper: shuffles options and returns the answer index + tag per option. */
export function buildChoice(
  rng: Rng,
  correct: string,
  distractors: Array<{ text: string; tag: ErrorTag | null }>,
  shuffle = true,
): { options: string[]; index: number; optionTags: Array<ErrorTag | null> } {
  const all = [
    { text: correct, tag: null as ErrorTag | null, ok: true },
    ...distractors.map((d) => ({ ...d, ok: false })),
  ];
  const seen = new Set<string>();
  const unique = all.filter((o) => (seen.has(o.text) ? false : (seen.add(o.text), true)));
  const ordered = shuffle ? rng.shuffle(unique) : unique;
  return {
    options: ordered.map((o) => o.text),
    index: ordered.findIndex((o) => o.ok),
    optionTags: ordered.map((o) => o.tag),
  };
}

export function choiceDiagnosis(optionTags: Array<ErrorTag | null>, r: Response): Diagnosis {
  if (r.type !== 'choice' || r.index === null) return { tags: [] };
  const tag = optionTags[r.index];
  return { tags: tag ? [tag] : [] };
}
