import type { Game, GameEnv } from '../../lib/games';

export interface GameOutcome {
  correct: boolean;
  /** Points earned out of the game's weight (default: all of it when correct, none otherwise). */
  earned?: number;
  /** 语文: the words that were matched / built / written wrong (they go to 看拼音写词语). */
  missedWords: string[];
  /** What the child did, for going over the paper. */
  given: string;
  /**
   * Not the child's fault (no sound, 讯飞 unreachable …): the question is left
   * out of the score's ups and downs (counted as right, no XP, streak kept).
   */
  skipped?: boolean;
}

export interface GameViewProps<G extends Game = Game> {
  game: G;
  /** Call once, when the game is answered. */
  onDone: (o: GameOutcome) => void;
  /** True once answered (the feedback sheet is showing): stop taking input. */
  done: boolean;
  env: GameEnv;
  childId: string;
}
