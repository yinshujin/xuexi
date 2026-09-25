/**
 * Game questions of the 单元闯关 (after Duolingo and similar products): each
 * kind lives in its own module (match.ts, order.ts, …) with a builder that
 * makes candidates for a unit and paper from the unit's own material, and a
 * view in practice/games/. index.ts picks a paper's games from the candidates.
 */
import type { Book, KnowledgePoint, Unit } from '@xuexi/curriculum';
import type { Rng } from '@xuexi/practice';

/** What a game needs from the device; games whose needs are not met are left out of the run. */
export type GameRequirement =
  /** 讯飞评测 credentials entered on this device (开口读). */
  | 'scoring'
  /** The built-in word audio pack (听音). */
  | 'audio'
  /** Stroke data for writing characters (写汉字). */
  | 'hanzi';

export interface GameBase {
  /** Registry key of the kind, e.g. 'match'. */
  kind: string;
  /** Shown above the game, e.g. 「连连看：单词和意思配对」. */
  title: string;
  /** Points in the paper (default 1): a reading passage with 4 questions weighs 4. */
  weight?: number;
  requires?: GameRequirement[];
  /** 语文: the words asked; missed ones go to 看拼音写词语. */
  words?: string[];
}

export interface MatchGame extends GameBase {
  kind: 'match';
  /** [left, right]; the right column is shown shuffled. */
  pairs: Array<[string, string]>;
  /** Right column order (indices into pairs). */
  order: number[];
}

export interface OrderGame extends GameBase {
  kind: 'order';
  prompt: string;
  /** The tiles in the right order. */
  answer: string[];
  /** All tiles as shown (answer + decoys, shuffled). */
  tiles: string[];
  /** '' for Chinese characters, ' ' for English words. */
  joiner: string;
}

/** 看图题: emoji pictures (groups of things for 数学, a word's picture for 英语 / 语文), choose one option. */
export interface PictureGame extends GameBase {
  kind: 'picture';
  /** The question under the picture, e.g. 「一共有几个苹果？」. */
  prompt: string;
  /** The picture: emoji in groups, each group drawn in its own rounded box (a lone emoji is drawn big, without a box). */
  groups: string[][];
  /** Drawn between the boxes, e.g. '➡️' for 平均分给. */
  between?: string;
  /** The picture in words, for going over the paper (and screen readers). */
  alt: string;
  options: string[];
  /** Index of the right option. */
  answer: number;
  /** 'emoji': the options are pictures (看单词选图). */
  optionStyle?: 'emoji';
}

/** 排序: tap all tiles into order (no decoys). */
export interface SortGame extends GameBase {
  kind: 'sort';
  prompt: string;
  /** The tiles in the right order. */
  answer: string[];
  /** The tiles as shown (shuffled). */
  tiles: string[];
  /** Shown between the tiles in the answer text, e.g. ' < '. */
  sep: string;
  /** Why, per answer tile (e.g. the value or the first letter), for the answer text. */
  notes?: string[];
}

/** 分类: put every card into its bucket. */
export interface ClassifyGame extends GameBase {
  kind: 'classify';
  /** Bucket labels (2 or 3). */
  buckets: string[];
  /** The cards as shown, each with the index of its bucket. */
  cards: Array<{ text: string; bucket: number }>;
}

/** A 对 / 错 statement. */
export interface JudgeStatement {
  text: string;
  truth: boolean;
  /** The right statement, when this one is wrong. */
  fix?: string;
  /** 语文: the word the statement is about. */
  word?: string;
}

/** 判断: a few 对 / 错 statements, one after the other. */
export interface JudgeGame extends GameBase {
  kind: 'judge';
  statements: JudgeStatement[];
}

/** ⚡限时挑战: as many 对 / 错 statements as possible in `seconds`. */
export interface TimedGame extends GameBase {
  kind: 'timed';
  seconds: number;
  /** Enough statements for a fast child (precomputed, in order). */
  statements: JudgeStatement[];
  /** earned = weight with at least full.right right and at most full.wrong wrong; 1 with pass; else 0. */
  full: { right: number; wrong: number };
  pass: { right: number; wrong: number };
}

/** Every game kind. New kinds add their interface here. */
export type Game =
  | MatchGame
  | OrderGame
  | PictureGame
  | SortGame
  | ClassifyGame
  | JudgeGame
  | TimedGame;

export interface UnitGame {
  kpId: string;
  kpTitle: string;
  game: Game;
}

/** What a builder gets: the unit, which paper, and a seeded rng for this kind and paper. */
export interface GameContext {
  book: Book;
  unit: Unit;
  paper: number;
  rng: Rng;
  /** A seed prefix unique to (unit, paper, builder), for seedFrom(). */
  seed: string;
  kpOf(variant: string): KnowledgePoint | undefined;
}

export interface GameBuilder {
  /** Unique id, also used to rotate kinds between papers. */
  id: string;
  /** In every paper that has a candidate, on top of the rotating slots (e.g. the reading passage). */
  always?: boolean;
  /** Candidates for this unit and paper (none when the unit has no material for it). */
  build(ctx: GameContext): UnitGame[];
}

/** How a game describes itself for going over the paper afterwards. */
export interface GameInfo<G extends Game = Game> {
  /** The question as text (for the review list). */
  prompt(g: G): string;
  /** The right answer as text. */
  answer(g: G): string;
}
