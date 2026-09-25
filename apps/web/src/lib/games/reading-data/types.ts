/**
 * 阅读题组 content: original short passages (never textbook texts), each
 * themed on its unit. Keyed by unit id; the array index is the paper
 * (0 = A 卷, 1 = B 卷, 2 = C 卷).
 */

/** 语文四上: what each of the four questions asks, in this order. */
export type ReadingSkill = '信息提取' | '词语理解' | '句子理解' | '推断感悟';

/** A single-choice question. */
export interface ReadingChoice {
  /** The question. For 完形填空 leave it '' (the blank's number is the question). */
  q: string;
  options: string[];
  /** Index of the right option in `options`. */
  answer: number;
  /** Why, one short Chinese sentence. */
  explain: string;
  skill?: ReadingSkill;
}

/** 数学: a question answered with a number. */
export interface ReadingNumber {
  q: string;
  num: number;
  /** Shown after the input box, e.g. 本, 元. */
  unit?: string;
  explain: string;
}

export type ReadingQuestion = ReadingChoice | ReadingNumber;

export interface ReadingPassage {
  /** 'read' = 阅读理解 / 情境题组, 'cloze' = 完形填空 (blanks in the text as {1}, {2}, …). */
  mode: 'read' | 'cloze';
  title: string;
  /** Paragraphs separated by \n. */
  text: string;
  questions: ReadingQuestion[];
  /** Knowledge point slug of the unit it goes with (default: the unit's first). */
  kp?: string;
}

/** Passages by unit id ("yw-g2a.u1"), one per paper. */
export type ReadingBank = Record<string, ReadingPassage[]>;

export const isNumberQuestion = (q: ReadingQuestion): q is ReadingNumber => 'num' in q;
