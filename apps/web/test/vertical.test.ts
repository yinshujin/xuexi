import { describe, expect, it } from 'vitest';
import { encodeRow, parseRow } from '../src/practice/VerticalGrid';

describe('vertical grid encoding', () => {
  it('encodes partial rows from the leftmost digit to the rightmost column', () => {
    expect(encodeRow(['', '', '2', '6', '0', '8'])).toBe('2608');
    expect(encodeRow(['', '1', '3', '0', '4', ''])).toBe('1304 ');
    expect(encodeRow(['', '', '1', '3', '0', '4'])).toBe('1304');
    expect(encodeRow(['', '', '', '', '', ''])).toBe('');
  });
  it('parses the result row', () => {
    expect(parseRow(['', '1', '5', '6', '4', '8'])).toBe(15648);
    expect(parseRow(['', '', ''])).toBeNull();
  });
});
