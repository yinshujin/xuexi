/**
 * Chinese number reading following 小学数学 rules (北师大版 四上「认识更大的数」):
 *
 * 1. 从右往左四位一级：个级、万级、亿级（up to 12 digits）。
 * 2. 先读亿级，再读万级，最后读个级；读完亿级 / 万级的数，加上「亿」/「万」。
 * 3. 每级末尾的 0 都不读。
 * 4. 其他数位上有一个 0 或连续几个 0，都只读一个「零」（包括跨级的 0）。
 * 5. 最高级的 10~19 读作「十几」；其他位置读作「一十几」（如 10012 读作 一万零一十二）。
 *
 * `ReadBugs` flags reproduce typical wrong readings, used for choice distractors.
 */

export const CN_DIGITS = '零一二三四五六七八九';
const SECTION_UNITS = ['', '万', '亿'];
const IN_SECTION_UNITS = ['', '十', '百', '千'];

export interface ReadBugs {
  /** Never read 零 for zeros in the middle (三亿五百万八十). */
  omitMiddleZeros?: boolean;
  /** Read every single 0 digit that is not at the end of a section (三亿零五百万零零八十). */
  readEveryZero?: boolean;
  /** Also read 零 for the trailing zeros of a section when a later section follows (一亿二千万零一千). */
  zeroForSectionTrailing?: boolean;
}

export const MAX_READ_DIGITS = 12;

/** Read one 4-digit section (1..9999). `leadingTen` → 10..19 read as 十几. */
function readSection(s: number, leadingTen: boolean, bugs: ReadBugs): string {
  const ds = [Math.floor(s / 1000) % 10, Math.floor(s / 100) % 10, Math.floor(s / 10) % 10, s % 10];
  let out = '';
  let started = false;
  let pendingZeros = 0;
  for (let i = 0; i < 4; i++) {
    const d = ds[i];
    const unit = IN_SECTION_UNITS[3 - i];
    if (d === 0) {
      if (started) pendingZeros++;
      continue;
    }
    if (pendingZeros > 0 && !bugs.omitMiddleZeros)
      out += bugs.readEveryZero ? '零'.repeat(pendingZeros) : '零';
    pendingZeros = 0;
    const isTenLead = !started && unit === '十' && d === 1 && leadingTen;
    out += (isTenLead ? '' : CN_DIGITS[d]) + unit;
    started = true;
  }
  return out;
}

/** Reads a non-negative integer (≤ 12 digits) in Chinese. */
export function readChineseNumber(n: number, bugs: ReadBugs = {}): string {
  if (!Number.isInteger(n) || n < 0) throw new Error(`readChineseNumber: bad input ${n}`);
  if (n === 0) return '零';
  if (String(n).length > MAX_READ_DIGITS)
    throw new Error(`readChineseNumber: too many digits ${n}`);
  const sections: number[] = [];
  for (let m = n; m > 0; m = Math.floor(m / 10000)) sections.push(m % 10000);
  let out = '';
  let needZero = false; // zeros between the previous non-zero digit and the next section
  let zeroCount = 0; // for readEveryZero: how many zero digits are pending
  for (let i = sections.length - 1; i >= 0; i--) {
    const s = sections[i];
    const isHighest = out === '';
    if (s === 0) {
      if (!isHighest) {
        needZero = true;
        zeroCount += 4;
      }
      continue;
    }
    if (!isHighest) {
      const lead = s < 10 ? 3 : s < 100 ? 2 : s < 1000 ? 1 : 0;
      if (lead > 0) {
        needZero = true;
        zeroCount += lead;
      }
    }
    if (needZero && !bugs.omitMiddleZeros)
      out += bugs.readEveryZero ? '零'.repeat(zeroCount) : '零';
    needZero = false;
    zeroCount = 0;
    out += readSection(s, isHighest, bugs) + SECTION_UNITS[i];
    // Trailing zeros of this section: not read (rule 3) unless the bug flag says so.
    if (i > 0 && s % 10 === 0 && bugs.zeroForSectionTrailing) {
      if (sections.slice(0, i).some((x) => x > 0)) needZero = true;
    }
  }
  return out;
}

/** Split a number into its 4-digit sections from high to low, zero-padded except the first. */
export function sectionsOf(n: number): string[] {
  const s = String(n);
  const out: string[] = [];
  let end = s.length;
  while (end > 0) {
    const start = Math.max(0, end - 4);
    out.unshift(s.slice(start, end));
    end = start;
  }
  return out;
}

/** 小写 → 大写 Chinese for a small number (0..99), used in 口诀 and steps. */
export function cnSmall(n: number): string {
  if (n < 10) return CN_DIGITS[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return (t === 1 ? '十' : CN_DIGITS[t] + '十') + (o ? CN_DIGITS[o] : '');
}

/** 乘法口诀 for a × b (1..9), e.g. 7×8 → 七八五十六, 2×5 → 二五一十, 2×2 → 二二得四. */
export function koujue(a: number, b: number): string {
  const x = Math.min(a, b);
  const y = Math.max(a, b);
  const p = x * y;
  let prod: string;
  if (p < 10) prod = '得' + CN_DIGITS[p];
  else if (p === 10) prod = '一十';
  else prod = cnSmall(p);
  return CN_DIGITS[x] + CN_DIGITS[y] + prod;
}
