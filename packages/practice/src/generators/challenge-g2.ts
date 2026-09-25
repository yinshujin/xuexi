import { challengeGenerator, type ChallengeTemplate } from './challenge';
import { ADDSUB_TEMPLATES } from './challenge-g2-addsub';
import { COMPARE_TEMPLATES } from './challenge-g2-compare';
import { DIV_TEMPLATES } from './challenge-g2-div';
import { GUESS_TEMPLATES } from './challenge-g2-guess';
import { MEASURE_TEMPLATES } from './challenge-g2-measure';
import { MUL_TEMPLATES } from './challenge-g2-mul';
import { SHOP_TEMPLATES } from './challenge-g2-shop';
import { TABLE_TEMPLATES } from './challenge-g2-table';

/**
 * 二年级上册 拔高题 / 创新题, one family per group of knowledge points (see
 * curriculum/src/books/bsd-g2a.ts, specs with a `tier`).
 *
 *  add / sub          第一单元 进位加、退位减             challenge-g2-addsub.ts
 *  compare / addsub   第一单元 比多比少、综合运用          challenge-g2-compare.ts
 *  guess              数学好玩 猜数游戏                    challenge-g2-guess.ts
 *  informal / cm / meter  第二单元 测量（一）            challenge-g2-measure.ts
 *  mul / times        第三单元 乘法、倍（times 也用于第五单元） challenge-g2-mul.ts
 *  table25 / table69  第四、七单元 乘法口诀               challenge-g2-table.ts
 *  div                第五、八单元 除法（难度 1~2 只用 2~5 的口诀）challenge-g2-div.ts
 *  shop               综合实践 参加欢乐购物活动（整元）     challenge-g2-shop.ts
 *
 * Each family has at least two 拔高 (stretch) and two 创新 (creative) templates
 * that work at difficulty 1.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TEMPLATES: ChallengeTemplate<any>[] = [
  ...ADDSUB_TEMPLATES,
  ...COMPARE_TEMPLATES,
  ...GUESS_TEMPLATES,
  ...MEASURE_TEMPLATES,
  ...MUL_TEMPLATES,
  ...TABLE_TEMPLATES,
  ...DIV_TEMPLATES,
  ...SHOP_TEMPLATES,
];

export const g2Challenge = challengeGenerator('g2.challenge', TEMPLATES);
