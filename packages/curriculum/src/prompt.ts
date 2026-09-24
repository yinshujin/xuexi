import { ERROR_TAGS } from '@xuexi/shared';
import { SUBJECT_LABEL, type Book, type KnowledgePoint, type LessonSpec, type Subject, type Unit } from './types';

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
const NOT_YET: Record<Subject, Record<Book['grade'], string>> = {
  math: {
    2: '有余数的除法、除法竖式、三位数加减、小数、分数、方程',
    4: '小数、分数、方程和用字母求未知数',
  },
  chinese: {
    2: '本册以后才学的生字、古诗和语法术语（如主谓宾、修辞手法名称）',
    4: '本册以后才学的古诗文和语法术语（如主谓宾、词性分类）',
  },
  english: {
    2: '本册以后才学的单词、句型和语法术语',
    4: '本册以后才学的单词、句型和语法术语（如时态名称）',
  },
};

const STRUCTURE: Record<Subject, { lecture: string; technique: string }> = {
  math: {
    lecture:
      '结构：情境导入 → 讲解概念与方法 → 2 道例题在白板上逐步推导 → 易错提醒 → 学法口诀（2~4 句顺口好记，和方法一致）→ ' +
      '快速推理（如求最大、最小的数，□ 里最大或最小能填几）→ 一句话小结 → ' +
      '课堂小题按题型分组：判断题 3 道、选择题 3~4 道（可含多选）、填空与解决问题 3 道（附答案讲评）。',
    technique:
      '结构：只讲一个方法 → 演示 2 个例子 → 对比一个常见错误说明错在哪 → 学法口诀 → 小练习分两组：判断题 2 道、选择与填空 2~3 道（附答案）。',
  },
  chinese: {
    lecture:
      '结构：情境导入 → 朗读感知（只引用课文关键句，不整篇抄录）→ 识字写字（生字读音、结构、易错笔画，形近字、多音字）→ ' +
      '理解词语和内容（借助图片、动作、生活经验）→ 学法口诀（2~4 句顺口好记）→ 一句话小结 → ' +
      '课堂小题按题型分组：判断题 3 道、选择题 3~4 道（可含多选）、填空与积累运用 3 道（附答案讲评）。',
    technique:
      '结构：只讲一个方法（如识字、朗读、提问、写话的方法）→ 演示 2 个例子 → 对比一个常见错误说明错在哪 → 学法口诀 → ' +
      '小练习分两组：判断题 2 道、选择与填空 2~3 道（附答案）。',
  },
  english: {
    lecture:
      '结构：情境导入 → 新单词（每个词英文领读两遍、中文意思、图示或动作）→ 核心句型放进情境对话里练（领读、替换）→ ' +
      '语音或书写小提示 → 学法口诀（中文口诀或英文 chant）→ 一句话小结 → ' +
      '课堂小题按题型分组：判断题 3 道、选择题 3~4 道、填空与情景交际 3 道（附答案讲评）。',
    technique:
      '结构：只讲一个方法（如自然拼读、记单词、句型替换、问答技巧）→ 演示 2 个例子 → 对比一个常见错误说明错在哪 → ' +
      '学法口诀或 chant → 小练习分两组：判断题 2 道、选择与填空 2~3 道（附答案）。',
  },
};

function rules(book: Book): string {
  const notYet = NOT_YET[book.subject][book.grade];
  switch (book.subject) {
    case 'math':
      return (
        `要求：口语化短句，像老师面对面讲；每页文字不超过 40 字；术语与北师大版教材一致；不超纲，` +
        `不要使用${notYet}等本册未学内容；所有数学计算必须准确；全部使用中文。`
      );
    case 'chinese':
      return (
        `要求：口语化短句，像老师面对面讲；每页文字不超过 40 字；字音（拼音带声调）、字形、词义准确，与${book.edition}教材一致；` +
        `不超纲，不要使用${notYet}；课文只引用关键句，不整篇抄录；全部使用中文。`
      );
    case 'english':
      return (
        `要求：讲解用中文口语化短句，英语单词和句子写英文，拼写、语法准确，与${book.edition}教材一致；每页文字不超过 40 字；` +
        `不超纲，不要使用${notYet}。`
      );
  }
}

const UNIT_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

function list(items: string[]): string {
  return items.map((s, i) => `${i + 1}. ${s}`).join('；');
}

function render(ctx: LessonContext, objectives: string[], keyPoints: string[]): string {
  const { book, unit, kp, lesson } = ctx;
  const isLecture = lesson.kind === 'lecture';
  const lines: string[] = [];

  lines.push(
    `教材：${book.edition}（${book.revision}）小学${SUBJECT_LABEL[book.subject]}${book.grade === 2 ? '二' : '四'}年级${book.term}册，` +
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
  lines.push(STRUCTURE[book.subject][isLecture ? 'lecture' : 'technique']);
  lines.push(rules(book));
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
