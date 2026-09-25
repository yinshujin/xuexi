import { describe, expect, it } from 'vitest';
import { mergeReading, practiceOrder, practiseWord, type ReadWord } from '../src/lib/pron';
import { bookReading, pageLimitMs, splitBySentence } from '../src/lib/reading';
import { parseIseXml } from '../src/lib/scoring/xfyun';

const book = { id: 'b1', title: 'Cat' };
const day = (d: number) => Date.UTC(2026, 8, d, 4);
const read = (pairs: Array<[string, ReadWord['state']]>): ReadWord[] =>
  pairs.map(([token, state]) => ({ token, state, sentence: 'The cat sat.' }));

describe('读不准的单词', () => {
  it('misread and missed words go in (without punctuation); short words and good ones do not', () => {
    const list = mergeReading([], book, read([['The', 'ok'], ['cat', 'wrong'], ['sat.', 'miss'], ['a', 'wrong'], ['on', undefined]]), day(1));
    expect(list.map((m) => [m.key, m.word])).toEqual([
      ['cat', 'cat'],
      ['sat', 'sat'],
    ]);
    expect(list[0]).toMatchObject({ bookId: 'b1', bookTitle: 'Cat', sentence: 'The cat sat.', misses: 1, passDays: [] });
  });

  it('is cleared after reading it well on two different days; a new miss starts over', () => {
    let list = mergeReading([], book, read([['cat', 'wrong']]), day(1));
    list = practiseWord(list, 'cat', true, day(2));
    list = practiseWord(list, 'cat', true, day(2)); // same day counts once
    expect(list[0].passDays).toHaveLength(1);
    list = practiseWord(list, 'cat', false, day(3));
    expect(list[0]).toMatchObject({ misses: 2, passDays: [] });
    list = practiseWord(list, 'cat', true, day(4));
    list = mergeReading(list, book, read([['Cat!', 'ok']]), day(5)); // a later 跟读 counts too
    expect(list).toEqual([]);
  });

  it('a word both right and wrong in one reading stays wrong', () => {
    const list = mergeReading([], book, read([['cat', 'ok'], ['cat', 'wrong']]), day(1));
    expect(list[0].passDays).toEqual([]);
  });

  it('practises the most-missed first', () => {
    let list = mergeReading([], book, read([['dog', 'wrong']]), day(1));
    list = mergeReading(list, book, read([['cat', 'wrong']]), day(2));
    list = mergeReading(list, book, read([['cat', 'wrong']]), day(3));
    expect(practiceOrder(list).map((m) => m.key)).toEqual(['cat', 'dog']);
  });
});

describe('跟读 page by page', () => {
  it('splits page verdicts back into sentences', () => {
    expect(splitBySentence([2, 1, 3], ['a', 'b', 'c', 'd', 'e', 'f'])).toEqual([['a', 'b'], ['c'], ['d', 'e', 'f']]);
  });

  it('the book total is the average of the pages read; stars count all text pages', () => {
    expect(bookReading([{ best: 90, passed: true }, undefined, { best: 60, passed: false }, { best: 81, passed: true }], 4)).toEqual({
      readPassed: 2,
      readTotal: 4,
      readScore: 77,
    });
    expect(bookReading([undefined, undefined], 2)).toBeNull();
  });

  it('gives a page time for all its sentences, at most a minute', () => {
    expect(pageLimitMs([1000, 1000])).toBe(7000);
    expect(pageLimitMs(Array(20).fill(5000))).toBe(60_000);
  });

  it('reads the scores of a multi-sentence page (read_chapter result)', () => {
    const xml = `<read_chapter lan="en" type="study"><rec_paper><read_chapter total_score="74.5" accuracy_score="70" fluency_score="80" integrity_score="90" is_rejected="false">
<sentence content="i see a cat" total_score="70"><word content="i" total_score="90" dp_message="0"/><word content="cat" total_score="20" dp_message="0"/></sentence>
<sentence content="it is big" total_score="79"><word content="big" dp_message="16" total_score="0"/></sentence>
</read_chapter></rec_paper></read_chapter>`;
    const s = parseIseXml(xml);
    expect(s.overall).toBe(75);
    expect(s.words.map((w) => w.state)).toEqual(['ok', 'wrong', 'miss']);
  });
});
