import { EN_G2A } from '../banks/en-g2a';
import { EN_G4A } from '../banks/en-g4a';
import { YW_G2A } from '../banks/yw-g2a';
import { YW_G4A_ITEMS } from '../banks/yw-g4a';
import { YW_G4A_POLY } from '../banks/yw-g4a-poly';
import { chineseWordsGenerator, englishGenerator, polyphoneGenerator } from './lang';

/** 语文 / 英语 practice, one generator per book (and 多音字 for 四上). */
export const yw2Words = chineseWordsGenerator('yw2.words', YW_G2A);
export const yw4Words = chineseWordsGenerator('yw4.words', { items: YW_G4A_ITEMS, polyphones: [] });
export const yw4Polyphone = polyphoneGenerator('yw4.polyphone', YW_G4A_POLY);
export const en2Words = englishGenerator('en2.words', EN_G2A);
export const en4Words = englishGenerator('en4.words', EN_G4A);
