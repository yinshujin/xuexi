import { challengeGenerator, type ChallengeTemplate } from './challenge';
import { APP_TEMPLATES } from './challenge-g4-app';
import { GEO_TEMPLATES } from './challenge-g4-geo';
import { MUL_TEMPLATES } from './challenge-g4-mul';
import { NUM_TEMPLATES } from './challenge-g4-num';

/**
 * 四年级上册 拔高题 / 创新题, one family per group of knowledge points (see
 * curriculum/src/books/bsd-g4a.ts, specs with a `tier`; variant `${family}#${tier}`):
 *
 *   bignum   计数单位、大数的读写、比较大小          challenge-g4-num.ts
 *   approx   近似数（四舍五入、改写）                challenge-g4-num.ts
 *   lines    线段、射线、直线                        challenge-g4-geo.ts
 *   perp     相交与垂直、平移与平行                  challenge-g4-geo.ts
 *   angle    旋转与角、角的度量                      challenge-g4-geo.ts
 *   mul      三位数乘两位数                          challenge-g4-mul.ts
 *   mulest   乘法估算                                challenge-g4-mul.ts
 *   order    混合运算的顺序                          challenge-g4-mul.ts
 *   law      加法交换律、结合律，乘法交换律          challenge-g4-mul.ts
 *   lawmul   乘法结合律、乘法分配律                  challenge-g4-mul.ts
 *   quantity 运用数量关系解决问题（总价、行程、相遇） challenge-g4-app.ts
 *   figures  数图形的学问                            challenge-g4-app.ts
 *
 * Shared helpers live in challenge-g4-util.ts.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TEMPLATES: ChallengeTemplate<any>[] = [
  ...NUM_TEMPLATES,
  ...GEO_TEMPLATES,
  ...MUL_TEMPLATES,
  ...APP_TEMPLATES,
];

export const g4Challenge = challengeGenerator('g4.challenge', TEMPLATES);
