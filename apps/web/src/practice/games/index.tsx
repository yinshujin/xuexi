/** The view of every game kind (builders: lib/games/index.ts). */
import type { ComponentType } from 'react';
import type { Game } from '../../lib/games';
import { MatchView } from './MatchView';
import { OrderView } from './OrderView';
import { PictureView } from './PictureView';
import { SortView } from './SortView';
import { ClassifyView } from './ClassifyView';
import { JudgeView } from './JudgeView';
import { TimedView } from './TimedView';
import type { GameViewProps } from './types';

export type { GameOutcome, GameViewProps } from './types';

export const GAME_VIEWS: Record<string, ComponentType<GameViewProps<Game>>> = {
  match: MatchView as ComponentType<GameViewProps<Game>>,
  order: OrderView as ComponentType<GameViewProps<Game>>,
  picture: PictureView as ComponentType<GameViewProps<Game>>,
  sort: SortView as ComponentType<GameViewProps<Game>>,
  classify: ClassifyView as ComponentType<GameViewProps<Game>>,
  judge: JudgeView as ComponentType<GameViewProps<Game>>,
  timed: TimedView as ComponentType<GameViewProps<Game>>,
};
