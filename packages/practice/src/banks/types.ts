import type { ErrorTag } from '@xuexi/shared';

/**
 * Item banks for 语文 / 英语 practice. Unlike the math generators, questions
 * come from authored data; the generators only pick, combine and shuffle.
 *
 * `kp` is the knowledge point id without the book prefix, e.g. "u1.tide"
 * (the curriculum links a knowledge point to the bank with that variant).
 * `level` 1 = 基础（认读、词义）, 2 = 理解运用, 3 = 易混辨析.
 */
export type BankLevel = 1 | 2 | 3;

/** One authored single-choice question. */
export interface ChoiceItem {
  kp: string;
  level: BankLevel;
  /** 题型 shown before the prompt, e.g. 读音、看拼音选字、形近字、选词填空、词义、情景交际. */
  kind: string;
  /** Unique within the bank. Mark the character / word being asked with 「」. Use （　） for blanks. */
  prompt: string;
  answer: string;
  /** 2–3 wrong options, each with the mistake it reveals. */
  wrong: Array<[text: string, tag: ErrorTag]>;
  /** Why the answer is right, one or two child-friendly sentences. */
  explain: string;
  /**
   * 拔高 (stretch): the same knowledge one step harder (语境辨析、推断、综合).
   * 创新 (creative): used in a new situation (迁移到新语境、仿写选择、生活运用).
   * Unset = routine practice.
   */
  tier?: 'stretch' | 'creative';
}

/** A 多音字 with every reading used at this grade. */
export interface Polyphone {
  kp: string;
  level: BankLevel;
  char: string;
  /** Each reading with 2–4 common words that use it (every word contains `char` exactly once). */
  readings: Array<{ pinyin: string; meaning: string; words: string[] }>;
  /**
   * Optional sentences (ideally from the lesson, paraphrased) where the
   * character is wrapped in 「」 exactly once, with its reading there.
   */
  sentences?: Array<{ text: string; pinyin: string }>;
}

/** An English word or short phrase. */
export interface EnWord {
  kp: string;
  level: BankLevel;
  /** As printed in the book: 'morning', 'ride a bicycle'. */
  en: string;
  /** Short Chinese meaning, unique within the book: '早上'. */
  zh: string;
  /** Optional typical misspellings; otherwise generated. */
  misspell?: string[];
}

export interface ChineseBank {
  items: ChoiceItem[];
  polyphones: Polyphone[];
}

export interface EnglishBank {
  words: EnWord[];
  /** Sentence-level items (情景交际、句型选择、补全对话). */
  items: ChoiceItem[];
}

/**
 * A word from the class's 词语听写表 (the words each lesson requires), with
 * its pinyin as printed in the textbook: syllables separated by spaces, one per
 * character, tone marks, tone sandhi of 一/不 as the book marks it.
 */
export interface DictWord {
  w: string;
  py: string;
}

/** 听写词语 of a book, by knowledge point id without the book prefix ("u3.rainbow"). */
export type DictationList = Record<string, DictWord[]>;

/**
 * 写作: material for the 单元闯关 games of a writing book, by knowledge point id
 * without the book prefix. Every entry has exactly one right answer: the chunks
 * of a sentence have one natural order, the pairs match one to one, and the
 * sentences of a passage carry their own order (顺序词, 时间, 故事的先后).
 */
export interface WritingGames {
  /** 拼一拼: a sentence split into chunks, in the right order; `decoys` are chunks that clearly do not fit (e.g. a wrong end mark). */
  build: Array<{ kp: string; prompt: string; chunks: string[]; decoys?: string[] }>;
  /** 连连看: 4–5 pairs, all left sides and all right sides different. */
  match: Array<{ kp: string; title: string; pairs: Array<[string, string]> }>;
  /** 排序: four sentences of a short passage, in the right order. */
  sort: Array<{ kp: string; prompt: string; sentences: string[] }>;
}
