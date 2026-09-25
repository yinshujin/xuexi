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
  // ---- measuring ----
  'ruler-read': '刻度尺读数错（没有用末端刻度减起点刻度）',
  'measure-count': '量的次数和“尺子”长短的关系弄反',
  // ---- 猜数游戏 ----
  'guess-range': '猜数时范围想错（边界包不包括、从中间猜）',
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
  // ---- lines ----
  'line-type': '线段、射线、直线的特征弄混',
  'perp-parallel': '垂直与平行的概念弄错',
  // ---- negative numbers ----
  'negative-compare': '负数比较大小方向弄反',
  // ---- word problems / counting figures ----
  'relation-confused': '数量关系用错（该乘用了除、该减用了加，或漏了一部分）',
  'figure-count': '数图形没有有序地数（只数了基本图形或有遗漏）',
  // ---- 图形的运动 / 空间 / 统计（概念题库） ----
  symmetry: '轴对称判断错（只看左右差不多，没想对折后能否完全重合）',
  'motion-type': '平移和旋转分不清',
  'shift-count': '数平移的格数出错（数了图形之间的空格，没有盯住同一个点）',
  spatial: '空间想象出错（观察的范围、看到的形状、切面、展开图与翻滚）',
  direction: '方向判断错（观察点弄混、相对方向说反）',
  'data-read': '统计表 / 统计图读错或整理数据出错（一格表示几、分段、漏数重数）',
  'data-judge': '用数据下结论不当（只看一次记录、不考虑实际情况）',
  // ---- 语文 ----
  'char-pinyin': '字音读错（声调、平翘舌、前后鼻音）',
  polyphone: '多音字的读音和意思没对上',
  'similar-char': '形近字、同音字混淆',
  'word-usage': '词语意思或搭配用错',
  // ---- English ----
  'en-meaning': '英语单词意思记混',
  'en-spelling': '英语单词拼写错误',
  'en-sentence': '英语句型或答语用错',
  // ---- generic ----
  reasoning: '拔高 / 创新题思路没理清',
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
    id: 'g2.addsub.word',
    grade: 2,
    title: '100 以内加减法解决问题（一共、还剩、比多比少）',
    errorTags: ['op-confused', 'carry-missed', 'borrow-missed'],
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
  {
    id: 'g2.measure',
    grade: 2,
    title: '测量（刻度尺量长度、比较测量结果）',
    errorTags: ['ruler-read', 'measure-count'],
  },
  {
    id: 'g2.guess',
    grade: 2,
    title: '猜数游戏（根据回答确定范围、从中间猜）',
    errorTags: ['guess-range'],
  },
  {
    id: 'g2.concepts',
    grade: 2,
    title: '图形的运动（概念题）',
    errorTags: ['symmetry', 'motion-type', 'shift-count', 'reasoning'],
  },
  // ---------------- 四年级 ----------------
  {
    id: 'g4.bignum.place',
    grade: 4,
    title: '计数单位、数位与数的组成',
    errorTags: ['place-value', 'zero-reading'],
  },
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
    id: 'g4.lines',
    grade: 4,
    title: '线段、射线、直线与相交、垂直、平行',
    errorTags: ['line-type', 'perp-parallel'],
  },
  {
    id: 'g4.quantity',
    grade: 4,
    title: '运用数量关系解决问题（总量与分量、单价数量总价、速度时间路程、相遇）',
    errorTags: ['relation-confused'],
  },
  {
    id: 'g4.figures',
    grade: 4,
    title: '数图形的学问（数线段、射线、角、三角形、长方形）',
    errorTags: ['figure-count'],
  },
  {
    id: 'g4.negative',
    grade: 4,
    title: '生活中的负数',
    errorTags: ['negative-compare'],
  },
  {
    id: 'g4.concepts',
    grade: 4,
    title: '空间、图形与统计（概念题）',
    errorTags: ['spatial', 'direction', 'data-read', 'data-judge', 'relation-confused', 'reasoning'],
  },
  // ---------------- 拔高题 / 创新题 ----------------
  {
    id: 'g2.challenge',
    grade: 2,
    title: '二年级数学拔高题、创新题',
    errorTags: [
      'reasoning',
      'carry-missed',
      'borrow-missed',
      'op-confused',
      'order-of-ops',
      'measure-count',
      'ruler-read',
      'unit-rate',
      'unit-choice',
      'mul-meaning',
      'table-add-confused',
      'table-neighbor',
      'div-wrong-table',
      'guess-range',
    ],
  },
  {
    id: 'g4.challenge',
    grade: 4,
    title: '四年级数学拔高题、创新题',
    errorTags: [
      'reasoning',
      'zero-reading',
      'place-value',
      'rewrite-vs-approx',
      'rounding',
      'perp-parallel',
      'angle-type',
      'angle-sum',
      'partial-shift',
      'trailing-zero',
      'order-of-ops',
      'distributive-miss',
    ],
  },
  // ---------------- 语文 / 英语 (item banks) ----------------
  {
    id: 'yw2.words',
    grade: 2,
    title: '语文字词（读音、字形、词语）',
    errorTags: ['char-pinyin', 'polyphone', 'similar-char', 'word-usage'],
  },
  {
    id: 'yw4.words',
    grade: 4,
    title: '语文字词（读音、字形、词语）',
    errorTags: ['char-pinyin', 'similar-char', 'word-usage'],
  },
  {
    id: 'yw4.polyphone',
    grade: 4,
    title: '多音字（据义定音）',
    errorTags: ['polyphone'],
  },
  {
    id: 'yw2.dictation',
    grade: 2,
    title: '看拼音写词语（课本听写词语）',
    errorTags: ['similar-char'],
  },
  {
    id: 'yw4.dictation',
    grade: 4,
    title: '看拼音写词语（课本听写词语）',
    errorTags: ['similar-char'],
  },
  {
    id: 'en2.words',
    grade: 2,
    title: '英语单词与句型',
    errorTags: ['en-meaning', 'en-spelling', 'en-sentence'],
  },
  {
    id: 'en4.words',
    grade: 4,
    title: '英语单词与句型',
    errorTags: ['en-meaning', 'en-spelling', 'en-sentence'],
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
