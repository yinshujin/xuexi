import { generatorProperties } from './properties.shared';

/**
 * 语文 / 英语 item banks and the 数学概念题 banks (g2.concepts, g4.concepts).
 * A variant draws from a finite pool, so 120 seeds × 5 difficulties already
 * cover every item of it many times over.
 */
generatorProperties((id) => /^(yw|en)\d\./.test(id) || id.endsWith('.concepts'), 120);
