/** The view of every game kind (builders: lib/games/index.ts). */
import type { ComponentType } from 'react';
import type { Game } from '../../lib/games';
import { MatchView } from './MatchView';
import { OrderView } from './OrderView';
import { ReadingView } from './ReadingView';
import type { GameViewProps } from './types';

export type { GameOutcome, GameViewProps } from './types';

export const GAME_VIEWS: Record<string, ComponentType<GameViewProps<Game>>> = {
  match: MatchView as ComponentType<GameViewProps<Game>>,
  order: OrderView as ComponentType<GameViewProps<Game>>,
  reading: ReadingView as ComponentType<GameViewProps<Game>>,
};
