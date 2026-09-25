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

/** Every game kind. New kinds add their interface here. */
export type Game = MatchGame | OrderGame;

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
