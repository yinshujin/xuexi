/** The view of every game kind (builders: lib/games/index.ts). */
import type { ComponentType } from 'react';
import type { Game } from '../../lib/games';
import { MatchView } from './MatchView';
import { OrderView } from './OrderView';
import { WriteView } from './WriteView';
import { ListenView } from './ListenView';
import { SpeakView } from './SpeakView';
import { SpellView } from './SpellView';
import { PictureView } from './PictureView';
import { SortView } from './SortView';
import { ClassifyView } from './ClassifyView';
import { JudgeView } from './JudgeView';
import { TimedView } from './TimedView';
import { ReadingView } from './ReadingView';
import type { GameViewProps } from './types';

export type { GameOutcome, GameViewProps } from './types';

export const GAME_VIEWS: Record<string, ComponentType<GameViewProps<Game>>> = {
  match: MatchView as ComponentType<GameViewProps<Game>>,
  order: OrderView as ComponentType<GameViewProps<Game>>,
  write: WriteView as ComponentType<GameViewProps<Game>>,
  listen: ListenView as ComponentType<GameViewProps<Game>>,
  speak: SpeakView as ComponentType<GameViewProps<Game>>,
  spell: SpellView as ComponentType<GameViewProps<Game>>,
  picture: PictureView as ComponentType<GameViewProps<Game>>,
  sort: SortView as ComponentType<GameViewProps<Game>>,
  classify: ClassifyView as ComponentType<GameViewProps<Game>>,
  judge: JudgeView as ComponentType<GameViewProps<Game>>,
  timed: TimedView as ComponentType<GameViewProps<Game>>,
  reading: ReadingView as ComponentType<GameViewProps<Game>>,
};
