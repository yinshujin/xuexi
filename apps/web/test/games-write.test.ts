// @vitest-environment node
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BOOKS } from '@xuexi/curriculum';
import { createRng, displayPinyin, seedFrom, YW_G2A_WORDS, YW_G4A_WORDS } from '@xuexi/practice';
import { unitPapers } from '../src/lib/exams';
import { blanked, gameAnswerText, gamePrompt, writeChars, type GameContext, type WriteGame } from '../src/lib/games';
import { EASY_CHARS, writeBuilder, WRITE_WORDS } from '../src/lib/games/write';
import { unitWords, variantOf } from '../src/lib/games/util';
import { hanziFile, type HanziIndex } from '../src/lib/hanzi';
import { hanziChars, hanziDataDir, writeHanziData } from '../scripts/hanzi-data';

const chineseUnits = BOOKS.filter((b) => b.subject === 'chinese').flatMap((book) => book.units.map((unit) => ({ book, unit })));

function build(book: (typeof BOOKS)[number], unit: (typeof BOOKS)[number]['units'][number], paper: number) {
  const kps = new Map(unit.knowledgePoints.map((k) => [variantOf(k.id), k]));
  const seed = `exam-game|${unit.id}|${paper}|write`;
  const ctx: GameContext = {
    book,
    unit,
    paper,
    rng: createRng(seedFrom(seed)),
    seed,
    kpOf: (v) => kps.get(v),
  };
  return writeBuilder.build(ctx);
}

describe('写汉字 stroke data (scripts/hanzi-data.ts)', () => {
  const chars = hanziChars();

  it('lists every character of the 语文 dictation words once, in code point order', () => {
    const all = new Set([YW_G2A_WORDS, YW_G4A_WORDS].flatMap((l) => Object.values(l).flatMap((ws) => ws.flatMap((d) => [...d.w]))));
    expect(chars.length).toBeGreaterThan(500);
    expect(new Set(chars).size).toBe(chars.length);
    expect(new Set(chars)).toEqual(new Set([...all].filter((c) => /\p{Script=Han}/u.test(c))));
    expect(chars.every((c) => /^\p{Script=Han}$/u.test(c))).toBe(true);
    expect([...chars].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!)).toEqual(chars);
    expect(
      hanziChars([
        {
          x: [
            { w: '哪儿', py: 'nǎ er' },
            { w: '宽广', py: 'kuān guǎng' },
            { w: 'T恤', py: 'T xù' },
          ],
        },
      ]),
    ).toEqual(['儿', '宽', '广', '恤', '哪'].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!));
  });

  it('hanzi-writer-data has every character', () => {
    const dir = hanziDataDir();
    const missing = chars.filter((c) => !existsSync(join(dir, `${c}.json`)));
    expect(missing).toEqual([]);
    const one = JSON.parse(readFileSync(join(dir, '广.json'), 'utf8')) as {
      strokes: string[];
      medians: unknown[];
    };
    expect(one.strokes.length).toBe(3);
    expect(one.medians.length).toBe(3);
  });

  it('writes the files by code point, with an index, the licence and a notice', () => {
    const out = mkdtempSync(join(tmpdir(), 'hanzi-'));
    try {
      const r = writeHanziData(out);
      expect(r.chars).toBe(chars.length);
      expect(r.bytes).toBeLessThan(5 * 1024 * 1024);
      expect(hanziFile('广')).toBe('5e7f.json');
      const files = readdirSync(out);
      for (const c of chars) expect(files).toContain(hanziFile(c));
      expect(files).toEqual(expect.arrayContaining(['index.json', 'ARPHICPL.TXT', 'NOTICE.txt']));
      expect(files.length).toBe(chars.length + 3);
      const index = JSON.parse(readFileSync(join(out, 'index.json'), 'utf8')) as HanziIndex;
      expect([...index.chars]).toEqual(chars);
      expect(index.source).toMatch(/^hanzi-writer-data@\d/);
      expect(readFileSync(join(out, 'ARPHICPL.TXT'), 'utf8')).toBe(readFileSync(join(hanziDataDir(), 'ARPHICPL.TXT'), 'utf8'));
      expect(readFileSync(join(out, hanziFile('广')), 'utf8')).toBe(readFileSync(join(hanziDataDir(), '广.json'), 'utf8'));
    } finally {
      rmSync(out, { recursive: true });
    }
  });
});

describe('写汉字 games', () => {
  const withData = new Set(hanziChars());

  it('every 语文 unit and paper has a well-formed game, with stroke data for every character', () => {
    let easy = 0;
    let total = 0;
    for (const { book, unit } of chineseUnits) {
      const words = unitWords(book.id, unit);
      for (let paper = 0; paper < 3; paper++) {
        const got = build(book, unit, paper);
        if (!words.length) {
          expect(got).toEqual([]);
          continue;
        }
        expect(got.length, unit.id).toBe(1);
        const { kpId, game } = got[0];
        expect(unit.knowledgePoints.some((k) => k.id === kpId)).toBe(true);
        const g = game as WriteGame;
        expect(g.kind).toBe('write');
        expect(g.requires).toEqual(['hanzi']);
        expect(g.items.length, unit.id).toBe(Math.min(WRITE_WORDS, words.length));
        expect(g.weight).toBe(g.items.reduce((t, it) => t + it.blanks.length, 0));
        expect(g.words).toEqual(g.items.map((it) => it.word));
        expect(new Set(g.items.map((it) => it.word)).size).toBe(g.items.length);
        const cs = writeChars(g);
        expect(new Set(cs).size, `${unit.id} ${cs}`).toBe(cs.length);
        // No word shows another word's missing character.
        for (const it of g.items) for (const c of cs) if (!writeChars({ ...g, items: [it] }).includes(c)) expect(it.word, c).not.toContain(c);
        for (const it of g.items) {
          const d = words.find((w) => w.w === it.word);
          expect(d, `${unit.id} ${it.word}`).toBeTruthy();
          expect(it.pinyin).toBe(displayPinyin(d!));
          const chars = [...it.word];
          expect(it.blanks.length).toBeGreaterThanOrEqual(1);
          expect(it.blanks.length).toBeLessThanOrEqual(2);
          for (const i of it.blanks) {
            const c = chars[i];
            expect(c, `${it.word} ${i}`).toMatch(/^\p{Script=Han}$/u);
            // Not given away by the same character elsewhere in the word (妈妈).
            expect(chars.filter((x) => x === c).length).toBe(1);
            expect(withData.has(c), c).toBe(true);
            total++;
            if (EASY_CHARS.has(c)) easy++;
          }
          expect(blanked(it)).toBe(chars.map((c, i) => (it.blanks.includes(i) ? '□' : c)).join(''));
        }
        expect(gamePrompt(g)).toContain(blanked(g.items[0]));
        expect(gameAnswerText(g)).toBe(g.items.map((it) => it.word).join('、'));
      }
    }
    expect(total).toBeGreaterThan(50);
    // Easy characters (一, 了 …) only where a unit has nothing better.
    expect(easy).toBe(0);
  });

  it('papers A, B and C of a unit ask different characters', () => {
    let same = 0;
    for (const { book, unit } of chineseUnits) {
      const papers = [0, 1, 2].map((p) => build(book, unit, p)[0]?.game as WriteGame | undefined);
      if (!papers[0]) continue;
      const sets = papers.map((g) => writeChars(g!).join(''));
      if (new Set(sets).size < 3) same++;
    }
    expect(same).toBe(0);
  });

  it('builds the same game every time, and only for 语文', () => {
    const { book, unit } = chineseUnits[0];
    expect(build(book, unit, 1)).toEqual(build(book, unit, 1));
    for (const b of BOOKS.filter((x) => x.subject !== 'chinese')) expect(build(b, b.units[0], 0)).toEqual([]);
  });

  it('语文 papers include the 写汉字 game', () => {
    for (const { unit } of chineseUnits) {
      for (const p of unitPapers(unit.id)) {
        const w = p.items.filter((it) => it.game?.kind === 'write');
        expect(w.length, p.id).toBeLessThanOrEqual(1);
      }
    }
    const some = chineseUnits.flatMap(({ unit }) => unitPapers(unit.id)).filter((p) => p.items.some((it) => it.game?.kind === 'write'));
    expect(some.length).toBeGreaterThan(0);
  });
});
