import { describe, expect, it } from 'vitest';
import { GENERATORS, isErrorTag, type ErrorTag } from '@xuexi/shared';
import type { ChoiceItem, EnWord, Polyphone } from '../src/banks/types';
import { EN_G2A } from '../src/banks/en-g2a';
import { EN_G4A } from '../src/banks/en-g4a';
import { MATH_G2A } from '../src/banks/math-g2a';
import { MATH_G4A } from '../src/banks/math-g4a';
import { YW_G2A } from '../src/banks/yw-g2a';
import { YW_G4A_ITEMS } from '../src/banks/yw-g4a';
import { YW_G4A_POLY } from '../src/banks/yw-g4a-poly';

/**
 * Data rules for the 语文 / 英语 item banks. The generators assume these hold
 * (every question has exactly one right option), so authored data is checked
 * here before it can reach a child.
 */

const KP_RE = /^u\d+\.[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Pinyin syllable(s) with tone marks; neutral tone has no mark. Words may be separated by spaces. */
const PINYIN_RE = /^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+( [a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+)*$/;
const RESERVED_KINDS = ['多音字', '词义', '说一说', '拼写'];

const allowed = (id: string) =>
  new Set<ErrorTag>(GENERATORS.find((g) => g.id === id)!.errorTags as readonly ErrorTag[]);

function checkItems(name: string, gid: string, items: ChoiceItem[], english: boolean) {
  const tags = allowed(gid);
  const seen = new Set<string>();
  for (const it of items) {
    const where = `${name} ${it.kind}「${it.prompt}」`;
    expect(it.kp, where).toMatch(KP_RE);
    expect([1, 2, 3], where).toContain(it.level);
    expect(it.kind.trim().length, where).toBeGreaterThan(0);
    if (english) expect(RESERVED_KINDS, `${where}: reserved kind`).not.toContain(it.kind);
    else expect(it.kind, `${where}: reserved kind`).not.toBe('多音字');
    expect(it.prompt.trim().length, where).toBeGreaterThan(0);
    const key = `${it.kind}|${it.prompt}`;
    expect(seen.has(key), `${where}: duplicate prompt`).toBe(false);
    seen.add(key);
    expect(it.answer.trim().length, where).toBeGreaterThan(0);
    expect(it.wrong.length, `${where}: 2–3 wrong options`).toBeGreaterThanOrEqual(2);
    expect(it.wrong.length, `${where}: 2–3 wrong options`).toBeLessThanOrEqual(3);
    const options = [it.answer, ...it.wrong.map(([t]) => t)];
    expect(new Set(options).size, `${where}: options must differ`).toBe(options.length);
    for (const [text, tag] of it.wrong) {
      expect(text.trim().length, where).toBeGreaterThan(0);
      expect(isErrorTag(tag), `${where}: ${tag}`).toBe(true);
      expect(tags.has(tag), `${where}: ${tag} not allowed for ${gid}`).toBe(true);
    }
    expect(it.explain.trim().length, where).toBeGreaterThan(4);
    if (english) {
      for (const o of options) expect(o, `${where}: curly quote`).not.toMatch(/[’‘]/);
    }
  }
}

function checkPolyphones(name: string, polys: Polyphone[]) {
  const chars = new Set<string>();
  for (const p of polys) {
    const where = `${name} 多音字「${p.char}」`;
    expect(p.kp, where).toMatch(KP_RE);
    expect([1, 2, 3], where).toContain(p.level);
    expect([...p.char].length, where).toBe(1);
    expect(chars.has(p.char), `${where}: listed twice`).toBe(false);
    chars.add(p.char);
    expect(p.readings.length, where).toBeGreaterThanOrEqual(2);
    const pinyins = p.readings.map((r) => r.pinyin);
    expect(new Set(pinyins).size, `${where}: duplicate reading`).toBe(pinyins.length);
    const words = new Set<string>();
    for (const r of p.readings) {
      expect(r.pinyin, where).toMatch(PINYIN_RE);
      expect(r.meaning.trim().length, `${where} ${r.pinyin}: meaning`).toBeGreaterThan(1);
      expect(r.words.length, `${where} ${r.pinyin}: 2–4 words`).toBeGreaterThanOrEqual(2);
      expect(r.words.length, `${where} ${r.pinyin}: 2–4 words`).toBeLessThanOrEqual(4);
      for (const w of r.words) {
        expect([...w].filter((c) => c === p.char).length, `${where}: 「${w}」 must contain ${p.char} once`).toBe(1);
        expect(words.has(w), `${where}: 「${w}」 in two readings`).toBe(false);
        words.add(w);
      }
    }
    for (const s of p.sentences ?? []) {
      expect(s.text.split(`「${p.char}」`).length - 1, `${where}: ${s.text}`).toBe(1);
      expect(s.text.split('「').length - 1, `${where}: only the target char may be marked: ${s.text}`).toBe(1);
      expect(s.text, where).not.toContain('\n');
      expect(pinyins, `${where}: ${s.text}`).toContain(s.pinyin);
    }
  }
}

function checkWords(name: string, words: EnWord[]) {
  const en = new Set<string>();
  const zh = new Set<string>();
  const all = new Set(words.map((w) => w.en.toLowerCase()));
  for (const w of words) {
    const where = `${name} ${w.en}`;
    expect(w.kp, where).toMatch(KP_RE);
    expect([1, 2, 3], where).toContain(w.level);
    expect(w.en, where).toMatch(/^[A-Za-z][A-Za-z' -]*[A-Za-z.!?]$|^[A-Za-z]$/);
    expect(en.has(w.en.toLowerCase()), `${where}: duplicate`).toBe(false);
    en.add(w.en.toLowerCase());
    expect(w.zh.trim().length, where).toBeGreaterThan(0);
    expect(zh.has(w.zh), `${where}: Chinese meaning 「${w.zh}」 is not unique in the book`).toBe(false);
    zh.add(w.zh);
    for (const m of w.misspell ?? []) {
      expect(m, where).not.toBe(w.en);
      expect(all.has(m.toLowerCase()), `${where}: misspelling ${m} is another word of the bank`).toBe(false);
      expect(m, where).toMatch(/^[A-Za-z][A-Za-z' -]*$/);
    }
    expect(new Set(w.misspell ?? []).size, where).toBe((w.misspell ?? []).length);
  }
}

describe('语文 banks', () => {
  it('yw-g2a', () => {
    checkItems('yw-g2a', 'yw2.words', YW_G2A.items, false);
    checkPolyphones('yw-g2a', YW_G2A.polyphones);
  });
  it('yw-g4a', () => {
    checkItems('yw-g4a', 'yw4.words', YW_G4A_ITEMS, false);
    checkPolyphones('yw-g4a', YW_G4A_POLY);
  });
});

describe('English banks', () => {
  it('en-g2a', () => {
    checkWords('en-g2a', EN_G2A.words);
    checkItems('en-g2a', 'en2.words', EN_G2A.items, true);
  });
  it('en-g4a', () => {
    checkWords('en-g4a', EN_G4A.words);
    checkItems('en-g4a', 'en4.words', EN_G4A.items, true);
  });
});

describe('数学概念题 banks', () => {
  /** The unit exams draw about 9 routine questions per knowledge point from each of three papers. */
  function checkCounts(items: ChoiceItem[]) {
    const kps = [...new Set(items.map((it) => it.kp))];
    for (const kp of kps) {
      const of = items.filter((it) => it.kp === kp);
      const routine = of.filter((it) => !it.tier);
      expect(routine.length, `${kp}: routine items`).toBeGreaterThanOrEqual(26);
      for (const level of [1, 2, 3]) expect(routine.filter((it) => it.level === level).length, `${kp}: level ${level}`).toBeGreaterThanOrEqual(8);
      for (const tier of ['stretch', 'creative'])
        expect(of.filter((it) => it.tier === tier).length, `${kp}: ${tier} items`).toBeGreaterThanOrEqual(5);
    }
  }
  it('math-g2a', () => {
    checkItems('math-g2a', 'g2.concepts', MATH_G2A.items, false);
    expect(MATH_G2A.polyphones).toEqual([]);
    checkCounts(MATH_G2A.items);
  });
  it('math-g4a', () => {
    checkItems('math-g4a', 'g4.concepts', MATH_G4A.items, false);
    expect(MATH_G4A.polyphones).toEqual([]);
    checkCounts(MATH_G4A.items);
  });
});
