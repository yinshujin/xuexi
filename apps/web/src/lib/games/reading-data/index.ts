/** 阅读题组 passages of every book, by unit id; index = paper (0 = A, 1 = B, 2 = C). */
import { EN_G2A_READING } from './en-g2a';
import { EN_G4A_READING } from './en-g4a';
import { MATH_READING } from './math';
import type { ReadingBank } from './types';
import { YW_G2A_READING } from './yw-g2a';
import { YW_G4A_READING } from './yw-g4a';

export type * from './types';
export { isNumberQuestion } from './types';

export const READING: ReadingBank = {
  ...YW_G2A_READING,
  ...YW_G4A_READING,
  ...EN_G2A_READING,
  ...EN_G4A_READING,
  ...MATH_READING,
};
