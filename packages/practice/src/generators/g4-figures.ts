import type { ErrorTag } from '@xuexi/shared';
import type { Rng } from '../rng';
import type { Answer } from '../types';
import { step } from './base';
import { wordGenerator, type WordTemplate } from './word-templates';

/**
 * g4.figures — 四上（2024 修订）数学好玩“数图形的学问”：有序地数线段、射线、角、
 * 三角形和长方形（图形用文字描述）。
 *
 * Variants: 'segments' | 'angles' | 'shapes' (+ 'mixed').
 * Difficulty raises the number of points / lines: 1 → 3–4 个点，5 → 7–8 个点。
 */

const num = (value: number): Answer => ({ type: 'number', value });
const FC: ErrorTag = 'figure-count';
const pairs = (n: number) => (n * (n - 1)) / 2;
const sumText = (n: number) => Array.from({ length: n }, (_, i) => n - i).join(' + ');
const size = (rng: Rng, d: number) => rng.int(2 + Math.ceil(d / 1.5), 3 + Math.ceil(d / 1.5));

/** Count pairs by listing them (the independent check). */
function countPairs(n: number): number {
  let c = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) c++;
  return c;
}

/** 一条线段上有 n 个点（含端点），一共有几条线段？ */
const segments: WordTemplate<{ n: number }> = {
  id: 'seg.count',
  variant: 'segments',
  make(rng, d) {
    return { n: size(rng, d) };
  },
  render({ n }) {
    const names = 'ABCDEFGH'.slice(0, n).split('');
    return {
      widget: 'numeric',
      prompt: `线段 ${names[0]}${names[n - 1]} 上依次有 ${names.join('、')} ${n} 个点（包括两个端点）。图中一共有几条线段？`,
      answer: num(pairs(n)),
      hint: `有序地数：先数以 ${names[0]} 为左端点的线段，再数以 ${names[1]} 为左端点的……`,
      steps: [
        step(`以 ${names[0]} 为左端点的有 ${n - 1} 条，以 ${names[1]} 为左端点的有 ${n - 2} 条……`),
        step('一共：', `${sumText(n - 1)} = ${pairs(n)}（条）`),
      ],
      targetSeconds: 90,
    };
  },
  solve: ({ n }) => num(countPairs(n)),
  bugs: ({ n }) => [
    [n - 1, FC],
    [n, FC],
  ],
};

/** 一条直线上有 n 个点，以这些点为端点的射线有几条？ */
const rays: WordTemplate<{ n: number }> = {
  id: 'seg.rays',
  variant: 'segments',
  make(rng, d) {
    return { n: size(rng, d) };
  },
  render({ n }) {
    return {
      widget: 'numeric',
      prompt: `一条直线上有 ${n} 个点。以这些点为端点的射线一共有几条？`,
      answer: num(2 * n),
      hint: '射线只有一个端点，从一个点出发可以向两个方向画射线。',
      steps: [
        step('每个点可以向左、向右各引出一条射线。'),
        step('一共：', `${n} × 2 = ${2 * n}（条）`),
      ],
      targetSeconds: 60,
    };
  },
  solve({ n }) {
    let c = 0;
    for (let p = 0; p < n; p++) for (const dir of [-1, 1]) if (dir !== 0) c++;
    return num(c);
  },
  bugs: ({ n }) => [
    [n, FC],
    [n - 1, FC],
  ],
};

/** 从一点出发画 n 条射线，一共组成几个角？ */
const anglesFromPoint: WordTemplate<{ n: number; inside: boolean }> = {
  id: 'ang.fan',
  variant: 'angles',
  make(rng, d) {
    return { n: size(rng, d), inside: rng.chance(0.5) };
  },
  render({ n, inside }) {
    return {
      widget: 'numeric',
      prompt: inside
        ? `从 ∠AOB 的顶点 O 出发，在角的内部画了 ${n - 2} 条射线。图中一共有几个角？`
        : `从点 O 出发，在一条直线的同一侧画了 ${n} 条射线（最外面两条射线组成的角比平角小）。图中一共有几个角？`,
      answer: num(pairs(n)),
      hint: '每两条从 O 出发的射线组成一个角。先数一共有几条射线，再像数线段一样有序地数。',
      steps: [
        step(`从 O 出发一共有 ${n} 条射线${inside ? '（包括 OA 和 OB）' : ''}。`),
        step('有序地数：', `${sumText(n - 1)} = ${pairs(n)}（个）`),
      ],
      targetSeconds: 90,
    };
  },
  solve: ({ n }) => num(countPairs(n)),
  bugs: ({ n }) => [
    [n - 1, FC],
    [n, FC],
  ],
};

/** 从三角形的一个顶点向对边画 k 条线段，一共有几个三角形？ */
const triangles: WordTemplate<{ k: number }> = {
  id: 'shape.triangles',
  variant: 'shapes',
  make(rng, d) {
    return { k: size(rng, d) - 2 };
  },
  render({ k }) {
    const pts = k + 2;
    return {
      widget: 'numeric',
      prompt: `从三角形 ABC 的顶点 A 向对边 BC 画了 ${k} 条线段。图中一共有几个三角形？`,
      answer: num(pairs(pts)),
      hint: '每个三角形都以 A 为顶点，底边在 BC 上。BC 上一共能数出几条线段？',
      steps: [
        step(`BC 上一共有 ${pts} 个点，有 ${pairs(pts)} 条线段。`),
        step(`每条线段和 A 组成一个三角形，一共 ${pairs(pts)} 个。`),
      ],
      targetSeconds: 90,
    };
  },
  solve: ({ k }) => num(countPairs(k + 2)),
  bugs: ({ k }) => [
    [k + 1, FC],
    [k + 2, FC],
  ],
};

/** 长方形被竖线分成一行 c 个（或 r 行 c 列）小长方形，一共有几个长方形？ */
const rectangles: WordTemplate<{ r: number; c: number }> = {
  id: 'shape.rectangles',
  variant: 'shapes',
  make(rng, d) {
    return { r: d >= 4 ? rng.int(2, 3) : 1, c: size(rng, d) - 1 };
  },
  render({ r, c }) {
    const across = pairs(c + 1);
    const down = pairs(r + 1);
    const grid = r > 1;
    return {
      widget: 'numeric',
      prompt: grid
        ? `一个长方形被横线和竖线分成了 ${r} 行、每行 ${c} 个同样大小的小长方形。图中一共有几个长方形（正方形也算）？`
        : `一个长方形被 ${c - 1} 条竖线分成了 ${c} 个小长方形（排成一行）。图中一共有几个长方形？`,
      answer: num(across * down),
      hint: grid
        ? '先看一行能数出几个，再想竖着能组合出几种高度。'
        : '把长方形的一条长边看成线段，上面有几个点？每条线段对应一个长方形。',
      steps: grid
        ? [
            step(
              `横着：长边上有 ${c + 1} 个点，有 ${across} 条线段。竖着：短边上有 ${r + 1} 个点，有 ${down} 条线段。`,
            ),
            step('一共：', `${across} × ${down} = ${across * down}（个）`),
          ]
        : [
            step(`长边上有 ${c + 1} 个点，有 ${sumText(c)} = ${across} 条线段。`),
            step(`每条线段对应一个长方形，一共 ${across} 个。`),
          ],
      targetSeconds: 120,
    };
  },
  solve({ r, c }) {
    let n = 0;
    for (let t = 0; t < r; t++)
      for (let b = t + 1; b <= r; b++)
        for (let l = 0; l < c; l++) for (let rt = l + 1; rt <= c; rt++) n++;
    return num(n);
  },
  bugs: ({ r, c }) => [
    [r * c, FC],
    [r * c + 1, FC],
  ],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TEMPLATES: WordTemplate<any>[] = [segments, rays, anglesFromPoint, triangles, rectangles];

export const g4Figures = wordGenerator('g4.figures', TEMPLATES);
