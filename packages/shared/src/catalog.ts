/**
 * Shared contract between the practice engine, the curriculum data and the app.
 *
 * - Every practice generator id used anywhere must be listed in GENERATOR_IDS.
 * - Every error tag produced by diagnosis or referenced by a technique lesson
 *   must be listed in ERROR_TAGS.
 *
 * Tests in @xuexi/practice and @xuexi/curriculum assert both directions.
 */

export const ERROR_TAGS = {
  // ---- addition / subtraction ----
  'carry-missed': '忘记进位',
  'borrow-missed': '退位后没有减 1',
  'op-confused': '加减号看错',
  'order-of-ops': '运算顺序错误',
  // ---- multiplication table / division table ----
  'table-neighbor': '相邻乘法口诀记混',
  'table-add-confused': '把乘法当成加法',
  'div-wrong-table': '用错乘法口诀求商',
  'mul-meaning': '乘法意义理解错（几个几）',
  // ---- units ----
  'unit-rate': '单位进率记错',
  'unit-choice': '单位选择不合适',
  // ---- big numbers ----
  'zero-reading': '数中间或末尾的 0 读写错',
  'place-value': '数位 / 计数单位弄错',
  'rewrite-vs-approx': '改写和求近似数混淆',
  rounding: '四舍五入出错',
  // ---- multi-digit multiplication ----
  'partial-shift': '部分积没有错位',
  'trailing-zero': '因数末尾 0 的处理错误',
  'mul-fact': '乘法口诀算错',
  // ---- division with 2-digit divisor ----
  'quotient-too-big': '试商偏大没有调商',
  'quotient-too-small': '试商偏小（余数不小于除数）',
  'quotient-place': '商的位置错或漏写 0',
  'remainder-error': '余数算错',
  // ---- laws of operations ----
  'distributive-miss': '乘法分配律漏乘',
  pairing: '凑整组合用错',
  // ---- angles ----
  'protractor-scale': '量角器内外圈读反',
  'angle-type': '角的分类弄错',
  'angle-sum': '平角 / 周角关系用错',
  // ---- negative numbers ----
  'negative-compare': '负数比较大小方向弄反',
  // ---- generic ----
  careless: '粗心（与典型错误都不符）',
} as const;

export type ErrorTag = keyof typeof ERROR_TAGS;

export interface GeneratorInfo {
  id: string;
  grade: 2 | 4;
  title: string;
  /** Error tags this generator's diagnosis can emit. */
  errorTags: ErrorTag[];
}

export const GENERATORS = [
  // ---------------- 二年级 ----------------
  {
    id: 'g2.addsub.2d',
    grade: 2,
    title: '两位数加减法（口算 / 竖式）',
    errorTags: ['carry-missed', 'borrow-missed', 'op-confused'],
  },
  {
    id: 'g2.addsub.chain',
    grade: 2,
    title: '连加连减、加减混合、带括号',
    errorTags: ['carry-missed', 'borrow-missed', 'order-of-ops'],
  },
  {
    id: 'g2.mul.meaning',
    grade: 2,
    title: '乘法的意义（几个几）',
    errorTags: ['mul-meaning', 'table-add-confused'],
  },
  {
    id: 'g2.mul.table',
    grade: 2,
    title: '乘法口诀（2~9）',
    errorTags: ['table-neighbor', 'table-add-confused'],
  },
  {
    id: 'g2.div.table',
    grade: 2,
    title: '表内除法（用口诀求商）',
    errorTags: ['div-wrong-table'],
  },
  {
    id: 'g2.unit.money',
    grade: 2,
    title: '人民币单位换算（元角分）',
    errorTags: ['unit-rate'],
  },
  {
    id: 'g2.unit.length',
    grade: 2,
    title: '长度单位（厘米、米）',
    errorTags: ['unit-rate', 'unit-choice'],
  },
  // ---------------- 四年级 ----------------
  {
    id: 'g4.bignum.read',
    grade: 4,
    title: '大数的读法与写法',
    errorTags: ['zero-reading', 'place-value'],
  },
  {
    id: 'g4.bignum.rewrite',
    grade: 4,
    title: '改写成以万 / 亿作单位、求近似数',
    errorTags: ['rewrite-vs-approx', 'rounding'],
  },
  {
    id: 'g4.bignum.compare',
    grade: 4,
    title: '大数比较大小',
    errorTags: ['place-value'],
  },
  {
    id: 'g4.oral.muldiv',
    grade: 4,
    title: '整十、整百数乘除口算',
    errorTags: ['trailing-zero', 'mul-fact'],
  },
  {
    id: 'g4.mul.3x2',
    grade: 4,
    title: '三位数乘两位数（竖式）',
    errorTags: ['partial-shift', 'carry-missed', 'trailing-zero', 'mul-fact'],
  },
  {
    id: 'g4.mul.estimate',
    grade: 4,
    title: '乘法估算',
    errorTags: ['rounding'],
  },
  {
    id: 'g4.div.2d',
    grade: 4,
    title: '除数是两位数的除法（试商、调商）',
    errorTags: ['quotient-too-big', 'quotient-too-small', 'quotient-place', 'remainder-error'],
  },
  {
    id: 'g4.law.simplify',
    grade: 4,
    title: '运算律与简便计算',
    errorTags: ['distributive-miss', 'pairing', 'order-of-ops'],
  },
  {
    id: 'g4.angle.measure',
    grade: 4,
    title: '用量角器量角',
    errorTags: ['protractor-scale'],
  },
  {
    id: 'g4.angle.classify',
    grade: 4,
    title: '角的分类与求未知角',
    errorTags: ['angle-type', 'angle-sum'],
  },
  {
    id: 'g4.negative',
    grade: 4,
    title: '生活中的负数',
    errorTags: ['negative-compare'],
  },
] as const satisfies readonly GeneratorInfo[];

export type GeneratorId = (typeof GENERATORS)[number]['id'];

export const GENERATOR_IDS: readonly GeneratorId[] = GENERATORS.map((g) => g.id);

export function isGeneratorId(value: string): value is GeneratorId {
  return (GENERATOR_IDS as readonly string[]).includes(value);
}

export function isErrorTag(value: string): value is ErrorTag {
  return Object.prototype.hasOwnProperty.call(ERROR_TAGS, value);
}
