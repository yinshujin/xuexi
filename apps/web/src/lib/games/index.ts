/**
 * The game questions of a 单元闯关 paper. Every kind registers its builder in
 * BUILDERS and its text description in INFO (views: practice/games/index.tsx).
 * A paper gets up to GAME_SLOTS games, one per kind, with the kinds taken in a
 * different order on each paper so A, B and C show different games.
 */
import type { Book, Unit } from '@xuexi/curriculum';
import { createRng, seedFrom } from '@xuexi/practice';
import { matchBuilder, matchInfo } from './match';
import { orderBuilder, orderInfo } from './order';
import type { Game, GameBuilder, GameContext, GameInfo, UnitGame } from './types';
import { variantOf } from './util';

export type * from './types';
export { MATCH_SLIPS } from './match';
export { orderCorrect } from './order';
export { gameAvailable, loadGameEnv, type GameEnv } from './env';

/** Every game kind's builder (order matters only as the start of the rotation). */
export const BUILDERS: GameBuilder[] = [matchBuilder, orderBuilder];

/** Every game kind's text description, by kind. */
const INFO: Record<string, GameInfo> = {
  match: matchInfo as GameInfo,
  order: orderInfo as GameInfo,
};

/** Game questions per paper. */
export const GAME_SLOTS = 5;

export function gamesFor(book: Book, unit: Unit, paper: number, builders: GameBuilder[] = BUILDERS): UnitGame[] {
  const kps = new Map(unit.knowledgePoints.map((k) => [variantOf(k.id), k]));
  const byBuilder = builders.map((b) => {
    const seed = `exam-game|${unit.id}|${paper}|${b.id}`;
    const ctx: GameContext = { book, unit, paper, rng: createRng(seedFrom(seed)), seed, kpOf: (v) => kps.get(v) };
    return b.build(ctx);
  });
  // One game per kind, kinds rotated by paper; a second round only if slots are left.
  const picked: UnitGame[] = [];
  for (let round = 0; picked.length < GAME_SLOTS && byBuilder.some((c) => c.length > round); round++) {
    for (let k = 0; k < builders.length && picked.length < GAME_SLOTS; k++) {
      const c = byBuilder[(k + paper) % builders.length][round];
      if (c) picked.push(c);
    }
  }
  return picked;
}

export function gamePrompt(g: Game): string {
  return INFO[g.kind]?.prompt(g) ?? g.title;
}

export function gameAnswerText(g: Game): string {
  return INFO[g.kind]?.answer(g) ?? '';
}
