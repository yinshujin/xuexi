import type { ErrorTag } from '@xuexi/shared';
import type { Rng } from '../rng';
import type { SolutionStep } from '../types';
import { BLANK, buildChoice, choiceDiagnosis, defineGenerator, numOf, step } from './base';

/**
 * g4.lines — 四上第二单元“线与角”中线的部分：线段、射线、直线，相交与垂直，平移与平行。
 *
 * 题型（form）：
 *  endpoint     填空：线段 / 射线 / 直线有几个端点
 *  line-name    选择：按特征选线段、射线、直线
 *  line-tf      判断：线的说法对不对
 *  count-seg    填空：一条直线上有 n 个点，有几条线段（有序数：(n−1) + … + 1）
 *  count-lines  填空：n 个点（任意三点不共线）每两点画一条直线，能画几条
 *  perp-name    选择：垂直、垂足、垂线段、点到直线的距离
 *  perp-tf      判断：垂直的说法
 *  perp-angle   填空：互相垂直的两条直线相交成的角是多少度
 *  distance     填空：三条线段中哪条是垂线段（最短），点到直线的距离
 *  rect-perp    填空：长方形 / 正方形中互相垂直的边有几组
 *  para-name    选择：平行线的定义、画法、平移
 *  para-tf      判断：平行的说法
 *  rect-para    填空：长方形 / 正方形中互相平行的边有几组
 *  perp-perp    选择：a ⊥ c、b ⊥ c 则 a ∥ b；a ∥ b、c ⊥ a 则 c ⊥ b
 *
 * Variants: 'mixed' | 'lines' | 'perpendicular' | 'parallel'.
 * Difficulty: 1 基本概念；2 基本判断；3 数线段、点到直线的距离；4 较难的判断；5 综合推理。
 */

export type LinesForm =
  | 'endpoint'
  | 'line-name'
  | 'line-tf'
  | 'count-seg'
  | 'count-lines'
  | 'perp-name'
  | 'perp-tf'
  | 'perp-angle'
  | 'distance'
  | 'rect-perp'
  | 'para-name'
  | 'para-tf'
  | 'rect-para'
  | 'perp-perp';

export interface LinesParams {
  form: LinesForm;
  /** Bank index for choice / true-false forms, or the numbers of numeric forms. */
  n: number[];
  optionTags: Array<ErrorTag | null>;
}

type Level = 1 | 2;

/** [statement, true?, level, explanation] */
type TF = [string, boolean, Level, string];

const LINE_TF: TF[] = [
  ['线段有两个端点。', true, 1, '线段有两个端点，可以量出长度。'],
  ['射线只有一个端点。', true, 1, '射线只有一个端点，向一端无限延伸。'],
  ['直线没有端点。', true, 1, '直线没有端点，向两端无限延伸。'],
  ['线段可以量出长度。', true, 1, '线段有两个端点，长度是有限的，可以量。'],
  ['一条直线长 10 厘米。', false, 1, '直线向两端无限延伸，不能量出长度。'],
  ['一条射线长 5 米。', false, 1, '射线向一端无限延伸，不能量出长度。'],
  ['把线段的两端无限延长，就得到一条直线。', true, 1, '两端都无限延长，就没有端点了，是直线。'],
  ['射线比直线短。', false, 2, '射线和直线都是无限长的，不能比较长短。'],
  [
    '射线 AB 和射线 BA 是同一条射线。',
    false,
    2,
    '射线 AB 的端点是 A，射线 BA 的端点是 B，方向也相反，不是同一条。',
  ],
  ['线段 AB 和线段 BA 是同一条线段。', true, 2, '线段 AB 和线段 BA 的两个端点相同，是同一条线段。'],
  ['过一点可以画无数条直线。', true, 2, '经过一个点，可以朝各个方向画直线，能画无数条。'],
  ['过两点可以画无数条直线。', false, 2, '经过两点只能画一条直线。'],
  ['两点之间所有的连线中，线段最短。', true, 2, '两点之间，线段最短。'],
  [
    '手电筒射出的光线可以近似地看成线段。',
    false,
    2,
    '光线从手电筒射出，向一端无限延伸，可以看成射线。',
  ],
  ['把线段的一端无限延长，就得到一条直线。', false, 2, '只延长一端，还剩一个端点，得到的是射线。'],
];

const PERP_TF: TF[] = [
  ['两条直线相交成直角时，这两条直线互相垂直。', true, 1, '相交成直角，就是互相垂直。'],
  ['两条直线相交，就一定互相垂直。', false, 1, '相交成直角才互相垂直，斜着相交不是垂直。'],
  ['两条互相垂直的直线的交点叫做垂足。', true, 1, '互相垂直的两条直线的交点叫做垂足。'],
  ['长方形相邻的两条边互相垂直。', true, 1, '长方形的四个角都是直角，相邻的两条边互相垂直。'],
  ['正方形相邻的两条边互相垂直。', true, 1, '正方形的四个角都是直角，相邻的两条边互相垂直。'],
  [
    '从直线外一点到这条直线所画的线段中，垂线段最短。',
    true,
    2,
    '从直线外一点到这条直线的所有线段中，垂线段最短。',
  ],
  [
    '在同一平面内，过直线外一点可以画无数条已知直线的垂线。',
    false,
    2,
    '在同一平面内，过直线外一点只能画一条已知直线的垂线。',
  ],
  [
    '只有一条横着、一条竖着的两条直线才互相垂直。',
    false,
    2,
    '只要相交成直角就互相垂直，和摆放的方向没有关系。',
  ],
  [
    '点到直线的距离，就是从这点到直线的垂线段的长度。',
    true,
    2,
    '从直线外一点到这条直线的垂线段的长度，叫做点到直线的距离。',
  ],
  [
    '两条直线相交成的四个角中，有一个是直角，这两条直线就互相垂直。',
    true,
    2,
    '有一个角是直角，另外三个角也都是直角，两条直线互相垂直。',
  ],
];

const PARA_TF: TF[] = [
  ['在同一平面内，不相交的两条直线叫做平行线。', true, 1, '这正是平行线的意思。'],
  ['长方形的两组对边分别互相平行。', true, 1, '长方形上下两条边平行，左右两条边也平行。'],
  ['正方形相邻的两条边互相平行。', false, 1, '正方形相邻的两条边互相垂直，相对的边才互相平行。'],
  [
    '铁轨的两条钢轨可以近似地看成互相平行。',
    true,
    1,
    '两条钢轨在同一平面内，一直不相交，可以看成平行。',
  ],
  ['不相交的两条直线叫做平行线。', false, 2, '少了“在同一平面内”这个条件。'],
  ['两条线段不相交，它们就一定互相平行。', false, 2, '线段延长以后可能会相交，那就不平行。'],
  [
    '在同一平面内，过直线外一点只能画一条已知直线的平行线。',
    true,
    2,
    '过直线外一点，只能画一条已知直线的平行线。',
  ],
  [
    '在同一平面内，过直线外一点可以画无数条已知直线的平行线。',
    false,
    2,
    '过直线外一点，只能画一条已知直线的平行线。',
  ],
  [
    '在同一平面内，两条直线的位置关系不是平行就是垂直。',
    false,
    2,
    '两条直线还可能斜着相交，既不平行也不垂直。',
  ],
];

/** [prompt with % for the blank, correct option, distractors, level] */
type Named = [string, string, string[], Level];

const LINE_NAME: Named[] = [
  ['有两个端点、可以量出长度的是%。', '线段', ['射线', '直线'], 1],
  ['只有一个端点、向一端无限延伸的是%。', '射线', ['线段', '直线'], 1],
  ['没有端点、向两端无限延伸的是%。', '直线', ['线段', '射线'], 1],
  ['手电筒射出的光线，可以近似地看成%。', '射线', ['线段', '直线'], 2],
  ['拉紧的绳子两端之间的部分，可以近似地看成%。', '线段', ['射线', '直线'], 2],
  ['把线段的一端无限延长，得到的是%。', '射线', ['线段', '直线'], 2],
  ['把线段的两端无限延长，得到的是%。', '直线', ['线段', '射线'], 2],
];

const PERP_NAME: Named[] = [
  ['两条直线相交成直角时，这两条直线%。', '互相垂直', ['互相平行', '不一定垂直'], 1],
  ['两条互相垂直的直线的交点叫做%。', '垂足', ['端点', '顶点'], 1],
  ['从直线外一点到这条直线所画的线段中，%最短。', '垂线段', ['斜着画的线段', '每条都一样长'], 1],
  [
    '从直线外一点到这条直线的垂线段的长度，叫做%。',
    '点到直线的距离',
    ['两点之间的距离', '直线的长度'],
    2,
  ],
  ['用三角板画垂线时，要让三角板的一条%和已知直线重合。', '直角边', ['斜边', '任意一条边'], 2],
];

const PARA_NAME: Named[] = [
  ['在同一平面内，不相交的两条直线叫做%。', '平行线', ['垂线', '射线'], 1],
  ['推拉窗打开和关上时，窗扇的运动是%现象。', '平移', ['旋转', '翻转'], 1],
  ['在同一平面内，两条直线的位置关系有相交和%两种。', '平行', ['垂直', '重合'], 2],
  [
    '画平行线时，三角板的一条边靠紧已知直线，直尺靠紧三角板的另一条边，然后%三角板，再画线。',
    '沿着直尺平移',
    ['旋转', '翻过来'],
    2,
  ],
];

const PERP_PERP: Named[] = [
  [
    '在同一平面内，直线 a ⊥ 直线 c，直线 b ⊥ 直线 c，那么直线 a 和直线 b%。',
    '互相平行',
    ['互相垂直', '一定相交'],
    2,
  ],
  [
    '在同一平面内，直线 a ∥ 直线 b，直线 c ⊥ 直线 a，那么直线 c 和直线 b%。',
    '互相垂直',
    ['互相平行', '不相交'],
    2,
  ],
];

const LINES = ['线段', '射线', '直线'] as const;
const ENDPOINTS = [2, 1, 0];
const LETTERS = 'ABCDEF';
const CN_NUM = ['零', '一', '二', '三', '四', '五', '六'];

const TOPIC_TAG: Record<'line' | 'perp' | 'para', ErrorTag> = {
  line: 'line-type',
  perp: 'perp-parallel',
  para: 'perp-parallel',
};

function formsFor(variant: string, d: number, target?: ErrorTag): LinesForm[] {
  if (target === 'line-type') return ['line-name', 'line-tf', 'endpoint'];
  if (target === 'perp-parallel')
    return ['perp-name', 'perp-tf', 'para-name', 'para-tf', 'distance', 'rect-para'];
  const lines: LinesForm[][] = [
    ['endpoint', 'line-name'],
    ['line-name', 'line-tf'],
    ['line-tf', 'count-seg'],
    ['line-tf', 'line-name', 'count-seg'],
    ['count-seg', 'count-lines', 'line-tf'],
  ];
  const perp: LinesForm[][] = [
    ['perp-name'],
    ['perp-name', 'perp-tf', 'perp-angle'],
    ['perp-tf', 'distance'],
    ['perp-tf', 'distance', 'rect-perp'],
    ['perp-tf', 'distance', 'rect-perp', 'perp-perp'],
  ];
  const para: LinesForm[][] = [
    ['para-name'],
    ['para-name', 'para-tf'],
    ['para-tf', 'rect-para'],
    ['para-tf', 'rect-para', 'rect-perp'],
    ['para-tf', 'perp-perp', 'rect-para'],
  ];
  if (variant === 'lines') return lines[d - 1];
  if (variant === 'perpendicular') return perp[d - 1];
  if (variant === 'parallel') return para[d - 1];
  return [...new Set([...lines[d - 1], ...perp[d - 1], ...para[d - 1]])];
}

/** Levels allowed at a difficulty for bank questions. */
function levelOk(level: Level, d: number): boolean {
  return d <= 2 ? level === 1 : d === 3 ? true : level === 2;
}

function pickIndex<T>(rng: Rng, bank: readonly T[], ok: (x: T) => boolean): number {
  const idx = bank.map((_, i) => i).filter((i) => ok(bank[i]));
  return rng.pick(idx.length ? idx : bank.map((_, i) => i));
}

/** Numeric answer for numeric forms. */
export function solveLines(form: LinesForm, n: number[]): number {
  switch (form) {
    case 'endpoint':
      return ENDPOINTS[n[0]];
    case 'count-seg':
    case 'count-lines':
      return (n[0] * (n[0] - 1)) / 2;
    case 'perp-angle':
      return 90;
    case 'distance':
      return Math.min(...n);
    case 'rect-perp':
      return 4;
    case 'rect-para':
      return 2;
    default:
      return -1;
  }
}

function countSteps(n: number): SolutionStep[] {
  const terms = Array.from({ length: n - 1 }, (_, i) => n - 1 - i);
  return [
    step(
      `有序地数：从第一个点出发，能连出 ${n - 1} 条线段；从第二个点出发，还有 ${n - 2} 条新的……`,
    ),
    step('把每个点出发的线段条数加起来：', `${terms.join(' + ')} = ${(n * (n - 1)) / 2}`),
  ];
}

export const g4Lines = defineGenerator<LinesParams>({
  id: 'g4.lines',
  variants: ['mixed', 'lines', 'perpendicular', 'parallel'],
  targets: ['line-type', 'perp-parallel'],
  build({ difficulty: d, variant, target, rng }) {
    const form = rng.pick(formsFor(variant, d, target));

    // ------------------------------------------------------------ 判断题
    if (form === 'line-tf' || form === 'perp-tf' || form === 'para-tf') {
      const bank = form === 'line-tf' ? LINE_TF : form === 'perp-tf' ? PERP_TF : PARA_TF;
      const tag = TOPIC_TAG[form === 'line-tf' ? 'line' : form === 'perp-tf' ? 'perp' : 'para'];
      const i = pickIndex(rng, bank, (x) => levelOk(x[2], d));
      const [text, truth, , why] = bank[i];
      const options = ['对', '错'];
      return {
        widget: 'choice',
        prompt: `判断：${text}`,
        options,
        answer: { type: 'choice', index: truth ? 0 : 1 },
        hint:
          form === 'line-tf'
            ? '想一想：它有几个端点？能不能量出长度？'
            : '抓住关键词：“同一平面内”“相交”“直角”。',
        steps: [step(`这句话是${truth ? '对' : '错'}的。`), step(why)],
        targetSeconds: 15,
        params: {
          form,
          n: [i],
          optionTags: options.map((_, k) => (k === (truth ? 0 : 1) ? null : tag)),
        },
      };
    }

    // ------------------------------------------------------------ 选择题
    if (
      form === 'line-name' ||
      form === 'perp-name' ||
      form === 'para-name' ||
      form === 'perp-perp'
    ) {
      const bank =
        form === 'line-name'
          ? LINE_NAME
          : form === 'perp-name'
            ? PERP_NAME
            : form === 'para-name'
              ? PARA_NAME
              : PERP_PERP;
      const tag = form === 'line-name' ? TOPIC_TAG.line : TOPIC_TAG.perp;
      const i = pickIndex(rng, bank, (x) => form === 'perp-perp' || levelOk(x[3], d));
      const [text, correct, wrong] = bank[i];
      // 线段、射线、直线固定顺序，方便孩子对照；其他题打乱。
      const { options, index, optionTags } =
        form === 'line-name'
          ? {
              options: [...LINES] as string[],
              index: LINES.indexOf(correct as (typeof LINES)[number]),
              optionTags: LINES.map((o): ErrorTag | null => (o === correct ? null : tag)),
            }
          : buildChoice(
              rng,
              correct,
              wrong.map((t) => ({ text: t, tag })),
            );
      const steps: SolutionStep[] =
        form === 'perp-perp'
          ? i === 0
            ? [
                step('a 和 b 都垂直于同一条直线 c，它们和 c 都相交成直角。'),
                step('在同一平面内，a 和 b 的方向一样，永远不会相交，所以互相平行。'),
              ]
            : [
                step('c 垂直于 a，说明 c 和 a 相交成直角。'),
                step('b 和 a 平行，方向一样，所以 c 和 b 也相交成直角，互相垂直。'),
              ]
          : [step(`答案是“${correct}”。`), step(`${text.replace('%', correct)}`)];
      return {
        widget: 'choice',
        prompt: text.replace('%', BLANK),
        options,
        answer: { type: 'choice', index },
        hint:
          form === 'line-name'
            ? '数一数端点，想一想能不能延伸。'
            : form === 'perp-perp'
              ? '在纸上画一画这几条直线，看看它们的位置关系。'
              : '回想课上的定义，抓住关键词。',
        steps,
        targetSeconds: form === 'perp-perp' ? 30 : 15,
        params: { form, n: [i], optionTags },
      };
    }

    // ------------------------------------------------------------ 填空题
    let n: number[];
    let prompt: string;
    let steps: SolutionStep[];
    let hint: string;
    switch (form) {
      case 'endpoint': {
        const k = rng.int(0, 2);
        n = [k];
        prompt = `${LINES[k]}有${BLANK}个端点。`;
        hint = '想一想它能不能向两端延伸。';
        steps = [
          step('线段有 2 个端点，射线有 1 个端点，直线没有端点。'),
          step(`所以${LINES[k]}有 ${ENDPOINTS[k]} 个端点。`),
        ];
        break;
      }
      case 'count-seg': {
        const k = d <= 3 ? rng.int(3, 4) : d === 4 ? rng.int(4, 5) : rng.int(5, 6);
        n = [k];
        const pts = [...LETTERS.slice(0, k)].join('、');
        prompt = `一条直线上依次有 ${pts} ${CN_NUM[k]}个点，以这些点为端点的线段一共有${BLANK}条。`;
        hint = '从第一个点出发数，再从第二个点出发数……不重复，不遗漏。';
        steps = countSteps(k);
        break;
      }
      case 'count-lines': {
        const k = rng.int(3, 5);
        n = [k];
        prompt = `平面上有 ${k} 个点，其中任意 3 个点都不在同一条直线上。经过每两个点画一条直线，一共可以画${BLANK}条直线。`;
        hint = '过两点只能画一条直线。有序地数：每个点和它后面的点各画一条。';
        steps = countSteps(k).map((s) => ({ ...s, text: s.text.replace(/线段/g, '直线') }));
        break;
      }
      case 'perp-angle': {
        n = [];
        prompt = `两条直线互相垂直，它们相交成的四个角都是${BLANK}°。`;
        hint = '互相垂直就是相交成什么角？';
        steps = [step('两条直线互相垂直，就是相交成直角。'), step('直角是 90°，四个角都是 90°。')];
        break;
      }
      case 'distance': {
        const lens = new Set<number>();
        while (lens.size < 3) lens.add(rng.int(3, 12));
        n = [...lens];
        prompt = `从直线外一点 A 向这条直线画了三条线段，长分别是 ${n[0]} 厘米、${n[1]} 厘米、${n[2]} 厘米，其中一条是垂线段。点 A 到这条直线的距离是${BLANK}厘米。`;
        hint = '从直线外一点到这条直线的所有线段中，哪一种最短？';
        steps = [
          step('从直线外一点到这条直线的所有线段中，垂线段最短。'),
          step(`最短的是 ${Math.min(...n)} 厘米，它就是垂线段。`),
          step(`点到直线的距离就是垂线段的长度：${Math.min(...n)} 厘米。`),
        ];
        break;
      }
      case 'rect-perp':
      case 'rect-para': {
        const shape = rng.pick(['长方形', '正方形']);
        n = [shape === '长方形' ? 0 : 1];
        const what = form === 'rect-perp' ? '互相垂直' : '互相平行';
        prompt = `一个${shape}中，${what}的边有${BLANK}组。`;
        hint =
          form === 'rect-perp'
            ? '相邻的两条边互相垂直，数一数有几个直角。'
            : '相对的两条边互相平行，上下一组，左右一组。';
        steps =
          form === 'rect-perp'
            ? [
                step(`${shape}有 4 个直角，每个直角的两条边互相垂直。`),
                step('所以互相垂直的边有 4 组。'),
              ]
            : [
                step(`${shape}上下两条边互相平行，左右两条边互相平行。`),
                step('所以互相平行的边有 2 组。'),
              ];
        break;
      }
      default:
        throw new Error(`g4.lines: unhandled form ${form}`);
    }
    return {
      widget: 'numeric',
      prompt,
      answer: { type: 'number', value: solveLines(form, n) },
      hint,
      steps,
      targetSeconds: form === 'count-seg' || form === 'count-lines' ? 30 : 15,
      params: { form, n, optionTags: [] },
    };
  },
  diagnose(p, r) {
    if (r.type === 'choice') return choiceDiagnosis(p.optionTags, r);
    const x = numOf(r);
    if (x === null) return { tags: [] };
    const ans = solveLines(p.form, p.n);
    switch (p.form) {
      case 'endpoint':
        return { tags: ENDPOINTS.includes(x) && x !== ans ? ['line-type'] : [] };
      case 'count-seg':
      case 'count-lines': {
        const k = p.n[0];
        if (x === k - 1 || x === k)
          return {
            tags: [],
            feedback: '只数了相邻两点之间的吗？跨过中间点的长线段也要数，从每个点出发有序地数。',
          };
        return { tags: [] };
      }
      case 'perp-angle':
        return { tags: [45, 180, 360].includes(x) ? ['perp-parallel'] : [] };
      case 'distance':
        return { tags: p.n.includes(x) && x !== ans ? ['perp-parallel'] : [] };
      case 'rect-perp':
        return { tags: x === 2 ? ['perp-parallel'] : [] };
      case 'rect-para':
        return { tags: x === 4 ? ['perp-parallel'] : [] };
      default:
        return { tags: [] };
    }
  },
});
