import type { ErrorTag } from '@xuexi/shared';
import type { SolutionStep } from '../types';
import { BLANK, choiceDiagnosis, defineGenerator, numOf, step, type Diagnosis } from './base';

// ------------------------------------------------------------ measure

/**
 * g4.angle.measure — 用量角器量角（angle widget, answer in degrees）。
 *
 * Difficulty:
 *  1 10 的倍数，一条边水平向右
 *  2 10 的倍数，开口方向随机（opensLeft 时要读另一圈）
 *  3 5 的倍数
 *  4 任意整数度数
 *  5 任意整数度数，并且角整体旋转（baseRotation ≠ 0）
 */

export interface AngleMeasureParams {
  degrees: number;
  opensLeft: boolean;
  baseRotation: number;
}

export const g4AngleMeasure = defineGenerator<AngleMeasureParams>({
  id: 'g4.angle.measure',
  variants: ['default'],
  targets: ['protractor-scale'],
  build({ difficulty: d, target, rng }) {
    const pickDeg = (): number => {
      switch (d) {
        case 1:
          return rng.int(2, 16) * 10;
        case 2:
          return rng.int(1, 17) * 10;
        case 3:
          return rng.int(1, 35) * 5;
        default:
          return rng.int(3, 177);
      }
    };
    let degrees = pickDeg();
    // For remediation avoid angles near 90°, where both scales read almost the same.
    for (let i = 0; target === 'protractor-scale' && Math.abs(degrees - 90) < 20 && i < 50; i++)
      degrees = pickDeg();
    const opensLeft = target === 'protractor-scale' ? true : d === 1 ? false : rng.chance(0.5);
    const baseRotation = d >= 5 ? rng.int(0, 23) * 15 : 0;
    const side = opensLeft ? '左' : '右';
    const steps: SolutionStep[] = [
      step('把量角器的中心和角的顶点重合，0° 刻度线和角的一条边重合。'),
      step(`这条边指向${side}边，所以从${side}边的 0° 开始，沿着同一圈往上数。`),
      step(`另一条边对着这一圈的 ${degrees}°。`),
      step(
        `检查：这个角${degrees < 90 ? '比直角小，是锐角' : degrees === 90 ? '是直角' : '比直角大，是钝角'}，所以是 ${degrees}°，不是 ${180 - degrees}°。`,
      ),
    ];
    return {
      widget: 'angle',
      prompt: '用量角器量一量，这个角是多少度？',
      angle: { degrees, baseRotation, opensLeft },
      answer: { type: 'number', value: degrees },
      hint: '中心对顶点，0° 刻度线对一条边，从这条边的 0° 那一圈开始读。',
      steps,
      targetSeconds: 20 + 5 * d,
      params: { degrees, opensLeft, baseRotation },
    };
  },
  diagnose({ degrees }, r) {
    const x = numOf(r);
    if (x === null) return { tags: [] };
    return { tags: x === 180 - degrees && degrees !== 90 ? ['protractor-scale'] : [] };
  },
});

// ----------------------------------------------------------- classify

/**
 * g4.angle.classify — 角的分类（choice）和求未知角（numeric）。
 *
 * Variants: 'mixed' | 'classify' | 'solve'.
 * Difficulty:
 *  1 典型角分类（30°, 90°, 150°, 180°, 360°）
 *  2 临界角分类（89°, 91°, 179°）/ 平角求未知角（整十度）
 *  3 平角、直角求未知角（任意整数）
 *  4 周角求未知角、三个角合成平角、临界分类
 *  5 钟面上的角、三个角合成平角、周角
 */

type ClassifyForm = 'classify' | 'straight' | 'right' | 'round' | 'three' | 'clock';

export interface AngleClassifyParams {
  form: ClassifyForm;
  /** classify: [deg]; straight/right/round: [a]; three: [a, b]; clock: [hour] */
  n: number[];
  optionTags: Array<ErrorTag | null>;
}

export const ANGLE_TYPES = ['锐角', '直角', '钝角', '平角', '周角'] as const;

export function angleType(deg: number): (typeof ANGLE_TYPES)[number] {
  if (deg < 90) return '锐角';
  if (deg === 90) return '直角';
  if (deg < 180) return '钝角';
  if (deg === 180) return '平角';
  return '周角';
}

function formsFor(variant: string, d: number, target?: ErrorTag): ClassifyForm[] {
  if (target === 'angle-type') return ['classify'];
  if (target === 'angle-sum') return ['straight', 'round', 'three'];
  const mixed: ClassifyForm[][] = [
    ['classify'],
    ['classify', 'straight'],
    ['straight', 'right'],
    ['round', 'three', 'classify'],
    ['clock', 'three', 'round'],
  ];
  const solve: ClassifyForm[][] = [
    ['straight', 'right'],
    ['straight', 'right'],
    ['straight', 'right'],
    ['round', 'three'],
    ['clock', 'three'],
  ];
  if (variant === 'classify') return ['classify'];
  if (variant === 'solve') return solve[d - 1];
  return mixed[d - 1];
}

export function solveAngle(form: ClassifyForm, n: number[]): number {
  switch (form) {
    case 'straight':
      return 180 - n[0];
    case 'right':
      return 90 - n[0];
    case 'round':
      return 360 - n[0];
    case 'three':
      return 180 - n[0] - n[1];
    case 'clock': {
      const h = n[0];
      return 30 * Math.min(h, 12 - h);
    }
    default:
      return n[0];
  }
}

export const g4AngleClassify = defineGenerator<AngleClassifyParams>({
  id: 'g4.angle.classify',
  variants: ['mixed', 'classify', 'solve'],
  targets: ['angle-type', 'angle-sum'],
  build({ difficulty: d, variant, target, rng }) {
    const form = rng.pick(formsFor(variant, d, target));
    const whole = d <= 2;
    const deg = (lo: number, hi: number) =>
      whole ? rng.int(Math.ceil(lo / 10), Math.floor(hi / 10)) * 10 : rng.int(lo, hi);

    if (form === 'classify') {
      const x =
        d === 1
          ? rng.pick([30, 45, 60, 90, 120, 135, 150, 180, 360, 20, 160])
          : rng.pick([
              89,
              91,
              179,
              1,
              90,
              180,
              360,
              rng.int(80, 100),
              rng.int(170, 179),
              rng.int(91, 120),
            ]);
      const correct = angleType(x);
      // Fixed option order so the child learns the sequence 锐角 < 直角 < 钝角 < 平角 < 周角.
      const options: string[] = [...ANGLE_TYPES];
      const optionTags = options.map((t): ErrorTag | null => (t === correct ? null : 'angle-type'));
      return {
        widget: 'choice',
        prompt: `${x}° 的角是${BLANK}。`,
        options,
        answer: { type: 'choice', index: options.indexOf(correct) },
        hint: '和 90°、180°、360° 比一比。',
        steps: [
          step('锐角 < 90°，直角 = 90°，90° < 钝角 < 180°，平角 = 180°，周角 = 360°。'),
          step(
            `${x}° ${x < 90 ? '< 90°' : x === 90 ? '= 90°' : x < 180 ? '在 90° 和 180° 之间' : x === 180 ? '= 180°' : '= 360°'}，所以是${correct}。`,
          ),
        ],
        targetSeconds: 8,
        params: { form, n: [x], optionTags },
      };
    }
    let n: number[];
    let prompt: string;
    let steps: SolutionStep[];
    switch (form) {
      case 'straight':
      case 'right':
      case 'round': {
        const [total, name] =
          form === 'straight' ? [180, '平角'] : form === 'right' ? [90, '直角'] : [360, '周角'];
        const a = form === 'round' ? deg(100, 300) : deg(10, total - 10);
        n = [a];
        prompt = `∠1 和 ∠2 合起来是一个${name}，∠1 = ${a}°，∠2 = ${BLANK}°。`;
        steps = [
          step(`一个${name}是 ${total}°。`),
          step('所以', `∠2 = ${total}° − ${a}° = ${total - a}°`),
        ];
        break;
      }
      case 'three': {
        const a = deg(20, 100);
        const b = deg(20, 160 - a);
        n = [a, b];
        prompt = `∠1、∠2、∠3 合起来是一个平角，∠1 = ${a}°，∠2 = ${b}°，∠3 = ${BLANK}°。`;
        steps = [
          step('一个平角是 180°。'),
          step('所以', `∠3 = 180° − ${a}° − ${b}° = ${180 - a - b}°`),
        ];
        break;
      }
      default: {
        const h = rng.int(1, 11);
        n = [h];
        const ans = solveAngle('clock', n);
        prompt = `钟面上 ${h} 时整，时针和分针所成的较小的角是${BLANK}°。`;
        steps = [
          step('钟面一周是 360°，被分成 12 个大格，每个大格是 30°。'),
          step(
            `${h} 时整，分针指着 12，时针指着 ${h}，两针之间较小的一边有 ${Math.min(h, 12 - h)} 个大格。`,
          ),
          step('所以', `30° × ${Math.min(h, 12 - h)} = ${ans}°`),
        ];
      }
    }
    return {
      widget: 'numeric',
      prompt,
      answer: { type: 'number', value: solveAngle(form, n) },
      hint:
        form === 'clock' ? '钟面上每个大格是多少度？' : '先想一想：平角、直角、周角各是多少度？',
      steps,
      targetSeconds: form === 'clock' ? 20 : 15,
      params: { form, n, optionTags: [] },
    };
  },
  diagnose(p, r) {
    if (p.form === 'classify') return choiceDiagnosis(p.optionTags, r);
    const x = numOf(r);
    if (x === null) return { tags: [] };
    const ans = solveAngle(p.form, p.n);
    const [a, b] = p.n;
    const wrongTotals: number[] = [];
    for (const total of [90, 180, 360]) {
      if (p.form === 'three') wrongTotals.push(total - a - b, total - a, total - b);
      else if (p.form === 'clock') wrongTotals.push(360 - ans, total - ans);
      else wrongTotals.push(total - a);
    }
    const tags: Diagnosis['tags'] = wrongTotals.some((v) => v === x && v !== ans)
      ? ['angle-sum']
      : [];
    return { tags };
  },
});
