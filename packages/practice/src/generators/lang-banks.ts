import { EN_G2A } from '../banks/en-g2a';
import { EN_G4A } from '../banks/en-g4a';
import { MATH_G2A } from '../banks/math-g2a';
import { MATH_G4A } from '../banks/math-g4a';
import { YW_G2A } from '../banks/yw-g2a';
import { YW_G4A_ITEMS } from '../banks/yw-g4a';
import { YW_G4A_POLY } from '../banks/yw-g4a-poly';
import { YW_G2A_SOUNDALIKE_WORDS, YW_G2A_WORDS } from '../banks/yw-g2a-words';
import { YW_G4A_SOUNDALIKE_WORDS, YW_G4A_WORDS } from '../banks/yw-g4a-words';
import { XZ_G2A } from '../banks/xz-g2a';
import { XZ_G4A } from '../banks/xz-g4a';
import { dictationGenerator } from './dictation';
import { chineseWordsGenerator, englishGenerator, polyphoneGenerator } from './lang';

/** 语文 / 英语 practice, one generator per book (and 多音字 for 四上). */
export const yw2Words = chineseWordsGenerator('yw2.words', YW_G2A);
export const yw4Words = chineseWordsGenerator('yw4.words', { items: YW_G4A_ITEMS, polyphones: [] });
export const yw4Polyphone = polyphoneGenerator('yw4.polyphone', YW_G4A_POLY);
export const en2Words = englishGenerator('en2.words', EN_G2A);
export const en4Words = englishGenerator('en4.words', EN_G4A);

/** 看拼音选词语 from each book's 词语听写表. */
export const yw2Dictation = dictationGenerator('yw2.dictation', YW_G2A_WORDS, YW_G2A_SOUNDALIKE_WORDS);
export const yw4Dictation = dictationGenerator('yw4.dictation', YW_G4A_WORDS, YW_G4A_SOUNDALIKE_WORDS);

/**
 * 数学概念题（图形的运动、观察与方向、立体图形、统计与综合实践）: the hands-on
 * topics have no computable questions, so they use authored banks like 语文.
 */
export const g2Concepts = chineseWordsGenerator('g2.concepts', MATH_G2A);
export const g4Concepts = chineseWordsGenerator('g4.concepts', MATH_G4A);

/** 写作 二年级 写话小练习 (写完整、用标点、写具体、看图写话、排顺序、格式…): an authored bank like 语文. */
export const xz2Skills = chineseWordsGenerator('xz2.skills', XZ_G2A);
/** 写作 四年级上册: 写作方法选择题（审题、描写、顺序、修改、说明方法、书信格式）. */
export const xz4Skills = chineseWordsGenerator('xz4.skills', XZ_G4A);
