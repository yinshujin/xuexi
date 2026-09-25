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
