import type { ErrorTag, GeneratorId } from '@xuexi/shared';

/** A lesson that the content CLI generates with OpenMAIC ahead of time. */
export interface LessonSpec {
  /** Globally unique, stable, filesystem-safe id, e.g. "bsd-g4a.u3.mul-3x2.lecture". */
  id: string;
  kind: 'lecture' | 'technique';
  title: string;
  /** Target length in minutes (lecture 8–12, technique 3–5). */
  minutes: number;
  /**
   * What this lesson must teach, written for the generation prompt:
   * concept, method, typical examples, what to avoid. Chinese, 1–4 sentences.
   */
  focus: string;
  /** Technique lessons: error tags this lesson remediates (math only; empty for other subjects). */
  remedies?: ErrorTag[];
}

/** A practice link from a knowledge point to a generator configuration. */
export interface PracticeSpec {
  generatorId: GeneratorId;
  /** Difficulty range suitable for this knowledge point (1..5). */
  minDifficulty: number;
  maxDifficulty: number;
  /** Optional generator variant, e.g. "vertical", "oral", "tables-2-5". */
  variant?: string;
  /** Default is the knowledge point's main practice. */
  label?: string;
  /**
   * 拔高 (stretch) / 创新 (creative) questions: asked at the end of a practice
   * set, never in the routine rotation, and not counted against mastery.
   */
  tier?: 'stretch' | 'creative';
}

export interface KnowledgePoint {
  /** e.g. "bsd-g4a.u3.mul-3x2" */
  id: string;
  title: string;
  /** Learning objectives in child-friendly Chinese (2–4 items). */
  objectives: string[];
  /** Key points / difficulties for teaching (for generation prompts). */
  keyPoints: string[];
  /** Knowledge point ids (same or earlier books) that should be mastered first. */
  prerequisites: string[];
  /** Suggested Shenzhen-local real-life contexts for examples. */
  localContexts?: string[];
  lessons: LessonSpec[];
  /** Empty when the topic has no programmatic practice yet (e.g. 观察物体). */
  practice: PracticeSpec[];
  /** 写作: the writing task of this knowledge point (write on paper or type, self-check, parent review). */
  writing?: WritingTask;
}

/**
 * A 写作任务: the child reads the prompt, fills in an outline, writes (on paper
 * and takes a photo, or types), checks the list, and a parent reviews it.
 * Nothing here is auto-graded; the example is original (never a textbook text).
 */
export interface WritingTask {
  /** e.g. "xz-g2a.u1.task" */
  id: string;
  title: string;
  /** What to write, in child-friendly Chinese (the 题目要求). */
  prompt: string;
  /** How to go about it: 3–5 short tips. */
  tips: string[];
  /** Outline boxes to fill in before writing, e.g. 开头 / 经过 / 结尾, each with a hint. */
  outline: Array<{ label: string; hint: string }>;
  /** Good words and phrases the child may use. */
  wordBank?: string[];
  /** Self-check list shown after writing (标点、顺序、写具体 …). */
  checklist: string[];
  /** Suggested length in Chinese characters. */
  minChars: number;
  maxChars?: number;
  /** An original model text at the child's level (shown after writing, or on request). */
  example?: string;
}

export interface Unit {
  /** e.g. "bsd-g4a.u3" */
  id: string;
  /** 1-based unit number as printed in the textbook. */
  index: number;
  title: string;
  knowledgePoints: KnowledgePoint[];
}

export type Subject = 'math' | 'chinese' | 'english' | 'writing';

export const SUBJECT_LABEL: Record<Subject, string> = { math: '数学', chinese: '语文', english: '英语', writing: '写作' };

export interface Book {
  /** e.g. "bsd-g4a" = 北师大版 四年级上册 */
  id: string;
  subject: Subject;
  /** e.g. "北师大版", "统编版", "沪教牛津版（深圳）" */
  edition: string;
  /** Edition revision, e.g. "2024修订" or "2014". */
  revision: string;
  grade: 2 | 4;
  term: '上' | '下';
  title: string;
  /** Free-form notes about the source used to verify the table of contents. */
  sourceNote: string;
  units: Unit[];
}
