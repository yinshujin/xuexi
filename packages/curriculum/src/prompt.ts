import { ERROR_TAGS } from '@xuexi/shared';
import type { Book, KnowledgePoint, LessonSpec, Unit } from './types';

/**
 * Bump whenever the requirement template below changes, so that the content
 * CLI knows previously generated lessons are stale.
 */
export const lessonTemplateVersion = '2026-09-24.2';

/** Hard upper bound on the requirement text length (characters). */
export const MAX_REQUIREMENT_LENGTH = 900;

export interface LessonContext {
  book: Book;
  unit: Unit;
  kp: KnowledgePoint;
  lesson: LessonSpec;
}

const AGE: Record<Book['grade'], string> = { 2: '7~8 岁', 4: '9~10 岁' };

/** Content this grade has not learned yet (keeps generated lessons within the book). */
const NOT_YET: Record<Book['grade'], string> = {
  2: '有余数的除法、除法竖式、三位数加减、小数、分数、方程',
  4: '小数、分数、方程和用字母求未知数',
};

const UNIT_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

function list(items: string[]): string {
  return items.map((s, i) => `${i + 1}. ${s}`).join('；');
}

function render(ctx: LessonContext, objectives: string[], keyPoints: string[]): string {
  const { book, unit, kp, lesson } = ctx;
  const isLecture = lesson.kind === 'lecture';
  const lines: string[] = [];

  lines.push(
    `教材：${book.edition}（${book.revision}）小学数学${book.grade === 2 ? '二' : '四'}年级${book.term}册，` +
      `第${UNIT_NUM[unit.index] ?? unit.index}单元“${unit.title}”，知识点“${kp.title}”。`,
  );
  lines.push(
    `课程：《${lesson.title}》，${isLecture ? '讲解课' : '技巧微课'}，约 ${lesson.minutes} 分钟；` +
      `学生是深圳${book.grade === 2 ? '二' : '四'}年级小学生（${AGE[book.grade]}）。`,
  );
  lines.push(`本课要求：${lesson.focus}`);
  if (!isLecture && lesson.remedies && lesson.remedies.length > 0) {
    lines.push(`针对的常见错误：${lesson.remedies.map((t) => ERROR_TAGS[t]).join('、')}。`);
  }
  if (objectives.length > 0) lines.push(`学习目标：${list(objectives)}。`);
  if (keyPoints.length > 0) lines.push(`重难点与易错点：${keyPoints.join('；')}。`);
  if (kp.localContexts && kp.localContexts.length > 0) {
    lines.push(`可选用的深圳生活情境：${kp.localContexts.join('、')}（自然融入即可）。`);
  }
  lines.push(
    isLecture
      ? '结构：情境导入 → 讲解概念与方法 → 2 道例题在白板上逐步推导 → 易错提醒 → 学法口诀（2~4 句顺口好记，和方法一致）→ ' +
          '快速推理（如求最大、最小的数，□ 里最大或最小能填几）→ 一句话小结 → ' +
          '课堂小题按题型分组：判断题 3 道、选择题 3~4 道（可含多选）、填空与解决问题 3 道（附答案讲评）。'
      : '结构：只讲一个方法 → 演示 2 个例子 → 对比一个常见错误说明错在哪 → 学法口诀 → 小练习分两组：判断题 2 道、选择与填空 2~3 道（附答案）。',
  );
  lines.push(
    `要求：口语化短句，像老师面对面讲；每页文字不超过 40 字；术语与北师大版教材一致；不超纲，` +
      `不要使用${NOT_YET[book.grade]}等本册未学内容；所有数学计算必须准确；全部使用中文。`,
  );
  return lines.join('\n');
}

/**
 * Build the Chinese `requirement` text for OpenMAIC `/api/generate-classroom`.
 * Objectives / key points are trimmed if needed to stay within MAX_REQUIREMENT_LENGTH.
 */
export function buildGenerationRequirement(ctx: LessonContext): string {
  let objectives = [...ctx.kp.objectives];
  let keyPoints = [...ctx.kp.keyPoints];
  // Technique lessons are narrow: the first key point (the core) is enough.
  if (ctx.lesson.kind === 'technique') keyPoints = keyPoints.slice(0, 1);

  let text = render(ctx, objectives, keyPoints);
  while ([...text].length > MAX_REQUIREMENT_LENGTH && keyPoints.length > 1) {
    keyPoints = keyPoints.slice(0, -1);
    text = render(ctx, objectives, keyPoints);
  }
  while ([...text].length > MAX_REQUIREMENT_LENGTH && objectives.length > 1) {
    objectives = objectives.slice(0, -1);
    text = render(ctx, objectives, keyPoints);
  }
  return text;
}
