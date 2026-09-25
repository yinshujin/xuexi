import { loadScoringConfig } from '../scoring';
import type { Game, GameRequirement } from './types';

/** What this device offers the games (see GameRequirement). */
export type GameEnv = Record<GameRequirement, boolean>;

export async function loadGameEnv(): Promise<GameEnv> {
  const scoring = !!(await loadScoringConfig().catch(() => null));
  return { scoring, audio: false, hanzi: false };
}

export function gameAvailable(g: Game, env: GameEnv): boolean {
  return (g.requires ?? []).every((r) => env[r]);
}
