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
  RulerSpec,
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
  ruler?: RulerSpec;
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
  'ruler-read': '量长度要看两端：末端对着的刻度减去起点对着的刻度，才是它的长度。',
  'measure-count': '量同一样东西，“尺子”越长，量的次数越少；次数越多，“尺子”越短。',
  'line-type': '数一数端点：线段 2 个端点能量长度，射线 1 个端点，直线没有端点，都是无限长。',
  'perp-parallel': '平行：同一平面内不相交；垂直：相交成直角。抓住关键词再判断！',
  'negative-compare': '负数比大小：负号后面的数越大，这个负数反而越小，想想数轴吧！',
  'relation-confused': '先说清数量关系：单价 × 数量 = 总价，速度 × 时间 = 路程，总量 = 分量 + 分量，再列式。',
  'figure-count': '数图形要有序地数：先数从第一个点出发的，再数从第二个点出发的……不重复也不遗漏。',
  symmetry: '想象真的把它对折：两边能完全重合才是轴对称图形，只是看起来差不多可不算哦！',
  'motion-type': '平移是沿直线移动、方向不变；旋转是绕着一个点或一根轴转动。',
  'shift-count': '数平移了几格，要盯住图形上的同一个点，数它走了几步，别只数中间的空格。',
  spatial: '在脑子里（或用手边的东西）摆一摆、转一转：视线是直的，被挡住的看不到；切面、展开图要一步一步想。',
  direction: '先找准观察点，再按「上北下南，左西右东」判断；换一个观察点，方向正好相反。',
  'data-read': '先看清一格表示几、每一段从几到几，再一个一个数，最后检查总数对不对。',
  'data-judge': '下结论要看多次的数据，还要想想堵车、天气这些实际情况。',
  'char-pinyin': '读一读，注意声调、平舌翘舌和前鼻音后鼻音。',
  polyphone: '多音字要看它在词语里的意思，意思不同，读音就不同。',
  'similar-char': '这几个字长得像（或读音一样），看看偏旁，想想字的意思。',
  'word-usage': '把词语放回句子里读一读，看意思通不通、搭配对不对。',
  // ---- 写作（写话）
  'sentence-incomplete': '一句完整的话要有谁、在哪里、干什么。指着句子问一问，缺的那一块补上。',
  punctuation: '读一读语气：说完一件事用句号，问问题用问号，高兴着急用叹号；说的话放进引号，前面加冒号。',
  'not-specific': '想一想：它是什么颜色、什么样子？有什么声音？怎么动的？写出来，别人就像看到了一样。',
  'writing-order': '先找第一句，再看“先、接着、然后、最后”和时间词，按事情的先后排。',
  'writing-format': '留言条：称呼顶格加冒号，正文空两格，署名和日期在右下方。日记：第一行写日期、星期、天气。',
  'not-fluent': '小声读一读，哪里别扭、前后对不上、词语搭配不对，就改哪里。',
  'picture-misread': '看图先问四个问题：什么时候？在哪里？有谁？在干什么？写的要和图上一样。',
  'imagine-unreasonable': '想象要接得上开头：角色、地点不变，蜗牛还是慢、兔子还是快，事情顺着往下发展。',
  'en-meaning': '想一想这个单词在课文里是什么意思，可以配着动作记。',
  'en-spelling': '一个字母一个字母地拼一拼，和课本上的单词对一对。',
  'en-sentence': '想一想对方问的是什么，用课文里学过的句子来回答。',
  // ---- 写作（四年级）
  'topic-off': '先圈出题目的关键词：写谁、写什么？和题目没关系的材料再好也不能用。',
  'no-detail': '“很好玩”“很紧张”说得太笼统，换成看得见、听得到的动作、声音和感受。',
  'order-mixed': '想一想事情先发生什么、再发生什么，或者参观时先到哪里、再到哪里。',
  'method-confused': '再分一分：写样子、写动作、写说的话、写表情、写心里想的，各是哪一种写法？',
  'structure-weak': '开头要点题，结尾要收住，还可以回应开头；两段之间用一句话搭座桥。',
  'revise-wrong': '把句子慢慢读一遍：有没有重复、缺了什么、搭配对不对、前后矛不矛盾？',
  'letter-format': '称呼顶格加冒号，问候和正文空两格，祝福语分两行，署名日期在右下方。',
  'imagine-off': '想象可以大胆，可人物的本领和性格不能变，事情的前因后果也要说得通。',
  'material-copy': '资料要挑有用的，再把长句拆短、难词换成自己的话。',
  'guess-range':
    '先把可能的范围写出来：“比 50 大”不包括 50，“不比 50 大”包括 50；再从范围的中间猜起。',
  reasoning: '这是一道拔高 / 创新题，别着急：把题目再读一遍，想想用学过的哪个知识，一步一步来。',
  careless: '差一点点！静下心来再想一遍，你一定行！',
};

const PRAISE = ['太棒了，答对了！', '完全正确，继续加油！', '真厉害，答对啦！', '又对又快，真棒！'];

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
    if (draft.ruler) q.ruler = draft.ruler;
    return q;
  };

  const derive = (opts: GenerateOptions): P => buildDraft(opts).draft.params;

  const grade = (question: Question, response: Response): GradeResult => {
    if (isEmpty(question.answer, response)) {
      return { correct: false, errorTags: [], feedback: '还没有作答哦，试一试吧！' };
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
