import { loadScoringConfig } from '../scoring';
import { loadWordAudio } from '../wordAudio';
import type { Game, GameRequirement } from './types';

/** What this device offers the games (see GameRequirement). */
export type GameEnv = Record<GameRequirement, boolean>;

export async function loadGameEnv(): Promise<GameEnv> {
  const scoring = !!(await loadScoringConfig().catch(() => null));
  // 听音选择 / 拼写: the word audio pack built into the app (APK / desktop).
  const audio = await loadWordAudio();
  return { scoring, audio, hanzi: false };
}

export function gameAvailable(g: Game, env: GameEnv): boolean {
  return (g.requires ?? []).every((r) => env[r]);
}
