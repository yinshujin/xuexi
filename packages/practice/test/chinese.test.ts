import { describe, expect, it } from 'vitest';
import { koujue, readChineseNumber } from '../src/chinese';
import { createRng } from '../src/rng';
import { parseChinese, readChineseAlt } from './verify';

describe('Chinese number reader (小学读法)', () => {
  it.each([
    [305000080, '三亿零五百万零八十'],
    [10000000, '一千万'],
    [200400, '二十万零四百'],
    [100010001, '一亿零一万零一'],
    [120001000, '一亿二千万一千'],
    [100001000, '一亿零一千'],
    [30000005, '三千万零五'],
    [30400000, '三千零四十万'],
    [10012, '一万零一十二'],
    [150000, '十五万'],
    [100000, '十万'],
    [4020, '四千零二十'],
    [1001, '一千零一'],
    [110, '一百一十'],
    [12, '十二'],
    [0, '零'],
    [999999999999, '九千九百九十九亿九千九百九十九万九千九百九十九'],
    [100000000000, '一千亿'],
    [10000000000, '一百亿'],
    [1000100000, '十亿零一十万'],
  ])('%i → %s', (n, s) => {
    expect(readChineseNumber(n)).toBe(s);
  });

  it('agrees with an independent reader and parses back, for random numbers up to 12 digits', () => {
    const rng = createRng(2026);
    for (let i = 0; i < 5000; i++) {
      const len = rng.int(1, 12);
      let s = String(rng.int(1, 9));
      for (let j = 1; j < len; j++) s += rng.chance(0.45) ? '0' : String(rng.int(1, 9));
      const n = Number(s);
      const r = readChineseNumber(n);
      expect(r, s).toBe(readChineseAlt(n));
      expect(parseChinese(r), s).toBe(n);
    }
  });

  it('bug readers produce the typical wrong readings', () => {
    expect(readChineseNumber(305000080, { omitMiddleZeros: true })).toBe('三亿五百万八十');
    expect(readChineseNumber(305000080, { readEveryZero: true })).toBe('三亿零五百万零零八十');
    expect(readChineseNumber(120001000, { zeroForSectionTrailing: true })).toBe('一亿二千万零一千');
  });

  it('rejects bad input', () => {
    expect(() => readChineseNumber(-1)).toThrow();
    expect(() => readChineseNumber(1.5)).toThrow();
    expect(() => readChineseNumber(1e12)).toThrow();
  });
});

describe('乘法口诀', () => {
  it.each([
    [7, 8, '七八五十六'],
    [8, 7, '七八五十六'],
    [2, 5, '二五一十'],
    [2, 2, '二二得四'],
    [3, 4, '三四十二'],
    [5, 5, '五五二十五'],
    [1, 1, '一一得一'],
    [9, 9, '九九八十一'],
  ])('%i × %i → %s', (a, b, s) => {
    expect(koujue(a, b)).toBe(s);
  });
});
