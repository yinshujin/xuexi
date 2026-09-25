/**
 * 看图题 / 排序 / 分类 / 判断 / 限时挑战: every candidate of every unit and paper is
 * well formed and has exactly one right answer, re-derived here from the
 * curriculum data (not from what the builder says).
 */
import { describe, expect, it } from 'vitest';
import { BOOKS, type Book, type Unit } from '@xuexi/curriculum';
import { createRng, displayPinyin, koujue, seedFrom } from '@xuexi/practice';
import {
  BUILDERS,
  timedEarned,
  type ClassifyGame,
  type Game,
  type JudgeStatement,
  type PictureGame,
  type SortGame,
  type UnitGame,
} from '../src/lib/games';
import { coreSpecs } from '../src/lib/learning';
import { unitPapers } from '../src/lib/exams';
import { evalMath } from '../src/lib/games/mathfacts';
import { EN_CATEGORY, EN_EMOJI, EN_SIMILAR, YW_EMOJI } from '../src/lib/games/pictures';
import { EN_BANKS, DICTATION, variantOf, XZ_GAMES } from '../src/lib/games/util';
import { misreadings, nasal, structure, tongue, toneless, withTone, yinxu } from '../src/lib/games/words';

const MINE = ['picture', 'sort', 'classify', 'judge', 'timed'];

function candidates(book: Book, unit: Unit, paper: number, id: string): UnitGame[] {
  const b = BUILDERS.find((x) => x.id === id)!;
  const kps = new Map(unit.knowledgePoints.map((k) => [variantOf(k.id), k]));
  const seed = `exam-game|${unit.id}|${paper}|${b.id}`;
  return b.build({ book, unit, paper, rng: createRng(seedFrom(seed)), seed, kpOf: (v) => kps.get(v) });
}

const all: Array<{ book: Book; unit: Unit; paper: number; g: UnitGame }> = [];
for (const book of BOOKS)
  for (const unit of book.units)
    for (let paper = 0; paper < 3; paper++)
      for (const id of MINE) for (const g of candidates(book, unit, paper, id)) all.push({ book, unit, paper, g });

const of = <G extends Game>(kind: G['kind']) =>
  all.filter((x) => x.g.game.kind === kind) as Array<{ book: Book; unit: Unit; paper: number; g: UnitGame & { game: G } }>;

/** Every 词语 of a 语文 book with its pinyin as displayed. */
const pinyinOf = (bookId: string) => {
  const m = new Map<string, Set<string>>();
  for (const list of Object.values(DICTATION[bookId] ?? {}))
    for (const d of list) m.set(d.w, (m.get(d.w) ?? new Set()).add(displayPinyin(d)));
  return m;
};
const meaningOf = (bookId: string) => new Map((EN_BANKS[bookId]?.words ?? []).map((w) => [w.en, w.zh]));

/** Product of a 口诀 such as 三八二十四. */
const KOUJUE = new Map<string, number>();
for (let a = 1; a <= 9; a++) for (let b = a; b <= 9; b++) KOUJUE.set(koujue(a, b), a * b);

const similar = (a: string, b: string) => EN_SIMILAR.some((g) => g.includes(a) && g.includes(b));

/** Is the statement right, judged from the book's data? */
function truthOf(book: Book, s: JudgeStatement): boolean {
  if (book.subject === 'math') return evalMath(s.text) as boolean;
  if (book.subject === 'chinese') {
    const m = /^「(.+)」读作 (.+)$/.exec(s.text)!;
    const readings = pinyinOf(book.id).get(m[1])!;
    expect(readings, s.text).toBeTruthy();
    return readings.has(m[2]);
  }
  const m = /^(.+) — (.+)$/.exec(s.text)!;
  return meaningOf(book.id).get(m[1]) === m[2];
}

function checkStatements(book: Book, list: JudgeStatement[], where: string) {
  list.forEach((s, i) => {
    expect(truthOf(book, s), `${where} ${s.text}`).toBe(s.truth);
    if (!s.truth) expect(s.fix && truthOf(book, { text: s.fix, truth: true }), `${where} fix of ${s.text}`).toBe(true);
    if (i > 0) expect(s.text, where).not.toBe(list[i - 1].text);
  });
}

describe('games: 看图题 / 排序 / 分类 / 判断 / 限时挑战', () => {
  it('evalMath reads statements on its own', () => {
    expect(evalMath('7 × 8 = 54')).toBe(false);
    expect(evalMath('36 − 18 = 18')).toBe(true);
    expect(evalMath('25 × (40 + 4) = 25 × 40 + 4')).toBe(false);
    expect(evalMath('1 米 20 厘米 = 120 厘米')).toBe(true);
    expect(evalMath('98 厘米 > 1 米')).toBe(false);
    expect(evalMath('350万 = 3500000')).toBe(true);
    expect(evalMath('12 ÷ 3')).toBe(4);
    expect(() => evalMath('7 × x = 8')).toThrow();
  });

  it('pinyin helpers', () => {
    expect(toneless('guǎng')).toBe('guang');
    expect(toneless('lǜ')).toBe('lv');
    expect(withTone('guang', 3)).toBe('guǎng');
    expect(withTone('liu', 2)).toBe('liú');
    expect(withTone('lv', 4)).toBe('lǜ');
    expect(yinxu('kuān guǎng')).toBe('K');
    expect(tongue('zì rán')).toEqual({ flat: true, curled: true });
    expect(nasal('qīng qīng')).toEqual({ front: false, back: true });
    expect(structure('笑呵呵')).toBe('ABB');
    expect(structure('隐隐约约')).toBe('AABB');
    expect(structure('人山人海')).toBe('ABAC');
    // Misreadings are never the book's reading; 一 / 不 keep their tone.
    for (const lists of Object.values(DICTATION))
      for (const list of Object.values(lists))
        for (const d of list) for (const r of misreadings(d.w, d.py)) expect(r, d.w).not.toBe(d.py);
    expect(misreadings('一起', 'yì qǐ').some((r) => r.startsWith('yī') || r.startsWith('yí'))).toBe(false);
  });

  it('the pictures are of words the books have, one word per picture', () => {
    const enWords = new Set(Object.values(EN_BANKS).flatMap((b) => b.words.map((w) => w.en)));
    for (const w of [...Object.keys(EN_EMOJI), ...Object.keys(EN_CATEGORY)]) expect(enWords.has(w), w).toBe(true);
    for (const bank of Object.values(EN_BANKS)) {
      const pics = bank.words.flatMap((w) => (EN_EMOJI[w.en] ? [EN_EMOJI[w.en]] : []));
      expect(new Set(pics).size, 'EN pictures unique within a book').toBe(pics.length);
    }
    const ywWords = new Set(Object.values(DICTATION).flatMap((l) => Object.values(l).flat().map((d) => d.w)));
    for (const w of Object.keys(YW_EMOJI)) expect(ywWords.has(w), w).toBe(true);
  });

  it('are deterministic and about a knowledge point of the paper', () => {
    for (const { book, unit, paper, g } of all) {
      const again = candidates(book, unit, paper, g.game.kind);
      expect(again.map((x) => x.game)).toContainEqual(g.game);
      const kp = unit.knowledgePoints.find((k) => k.id === g.kpId);
      expect(kp && coreSpecs(kp).length > 0, `${unit.id} ${g.game.kind}`).toBe(true);
      expect(g.game.title.length).toBeGreaterThan(0);
    }
  });

  it('看图题: four different options, exactly one fits the picture', () => {
    const list = of<PictureGame>('picture');
    expect(list.length).toBeGreaterThan(40);
    for (const { book, unit, g } of list) {
      const p = g.game;
      const where = `${unit.id} ${p.prompt}`;
      expect(p.options.length, where).toBe(4);
      expect(new Set(p.options).size, where).toBe(4);
      expect(p.answer).toBeGreaterThanOrEqual(0);
      let fits: boolean[];
      if (book.subject === 'math') {
        const sizes = p.groups.map((x) => x.length);
        const value = p.prompt.includes('平均分给')
          ? sizes[0] / sizes[1]
          : p.prompt.includes('放一盘')
            ? sizes[0] / Number(/每 (\d+)/.exec(p.prompt)![1])
            : sizes.reduce((a, b) => a + b, 0);
        if (!p.prompt.includes('平均分给') && !p.prompt.includes('放一盘') && !p.prompt.includes('不一样多'))
          expect(new Set(sizes).size, `${where}: groups the same size`).toBe(1);
        fits = p.options.map((o) => (KOUJUE.has(o) ? KOUJUE.get(o) : /^\d+$/.test(o) ? Number(o) : evalMath(o)) === value);
      } else if (p.optionStyle === 'emoji') {
        const word = p.prompt;
        const others = Object.entries(EN_EMOJI).filter(([w]) => w !== word);
        fits = p.options.map((o) => o === EN_EMOJI[word]);
        // No option is the picture of a word one could take for this one.
        for (const o of p.options) if (o !== EN_EMOJI[word]) expect(others.some(([w, e]) => e === o && similar(w, word)), where).toBe(false);
      } else {
        const pics = book.subject === 'english' ? EN_EMOJI : YW_EMOJI;
        const pic = p.groups[0][0];
        const right = p.options[p.answer];
        fits = p.options.map((o) => pics[o] === pic);
        for (const o of p.options)
          if (o !== right) {
            expect(similar(o, right) || o.includes(right) || right.includes(o), `${where} ${o}`).toBe(false);
            if (book.subject === 'chinese') expect([...o].some((c) => right.includes(c)), `${where} ${o}`).toBe(false);
          }
      }
      expect(fits.filter(Boolean).length, where).toBe(1);
      expect(fits[p.answer], where).toBe(true);
    }
  });

  it('排序: four tiles with different keys, shuffled, one right order', () => {
    const list = of<SortGame>('sort');
    expect(list.length).toBeGreaterThan(40);
    for (const { book, g } of list) {
      const s = g.game;
      const where = s.answer.join();
      expect(s.answer.length).toBe(4);
      expect([...s.tiles].sort()).toEqual([...s.answer].sort());
      expect(s.tiles.join(), where).not.toBe(s.answer.join());
      if (book.subject === 'writing') {
        // 写作: an authored passage whose sentences carry their own order.
        expect(XZ_GAMES[book.id].sort.some((x) => x.sentences.join() === s.answer.join()), where).toBe(true);
        continue;
      }
      const py = pinyinOf(book.id);
      const key = (t: string): number | string =>
        book.subject === 'math' ? (evalMath(t) as number) : book.subject === 'chinese' ? yinxu([...py.get(t)!][0]) : t[0].toLowerCase();
      const keys = s.answer.map(key);
      const down = s.sep.includes('>');
      keys.slice(1).forEach((k, i) => expect(down ? k < keys[i] : k > keys[i], where).toBe(true));
    }
  });

  it('分类: 6–8 cards in 2 or 3 buckets, every card fits its bucket and no other', () => {
    const list = of<ClassifyGame>('classify');
    expect(list.length).toBeGreaterThan(40);
    for (const { book, g } of list) {
      const c = g.game;
      const where = c.buckets.join('/');
      expect(c.buckets.length).toBeGreaterThanOrEqual(2);
      expect(c.buckets.length).toBeLessThanOrEqual(3);
      expect(c.cards.length).toBeGreaterThanOrEqual(6);
      expect(c.cards.length).toBeLessThanOrEqual(8);
      expect(new Set(c.cards.map((x) => x.text)).size).toBe(c.cards.length);
      c.buckets.forEach((_, b) => expect(c.cards.filter((x) => x.bucket === b).length, where).toBeGreaterThanOrEqual(2));
      const py = pinyinOf(book.id);
      const fits = (label: string, text: string): boolean => {
        if (book.subject === 'math') {
          const n = evalMath(/(\d+ ?万|\d+ 米|\d+)/.exec(label.replace(/^得数/, ''))![1]) as number;
          const v = evalMath(text) as number;
          expect(v, `${label} ${text}: a tie`).not.toBe(n);
          return /大|长/.test(label) ? v > n : v < n;
        }
        if (book.subject === 'english') return label.endsWith('结尾') ? text.endsWith(label.slice(1, label.indexOf(' '))) : EN_CATEGORY[text] === label;
        const p = [...py.get(text)!][0];
        if (label.startsWith('平舌')) return tongue(p).flat && !tongue(p).curled;
        if (label.startsWith('翘舌')) return tongue(p).curled && !tongue(p).flat;
        if (label.startsWith('前鼻')) return nasal(p).front && !nasal(p).back;
        if (label.startsWith('后鼻')) return nasal(p).back && !nasal(p).front;
        return structure(text) === label.split(' ')[0];
      };
      for (const card of c.cards) {
        const fitting = c.buckets.map((b) => fits(b, card.text));
        expect(fitting.filter(Boolean).length, `${where} ${card.text}`).toBe(1);
        expect(fitting[card.bucket], `${where} ${card.text}`).toBe(true);
      }
    }
  });

  it('判断: five statements, some right and some wrong, each checked against the books', () => {
    const list = all.filter((x) => x.g.game.kind === 'judge');
    expect(list.length).toBeGreaterThan(80);
    for (const { book, unit, g } of list) {
      if (g.game.kind !== 'judge') continue;
      const st = g.game.statements;
      expect(st.length).toBe(5);
      expect(st.some((s) => s.truth) && st.some((s) => !s.truth), unit.id).toBe(true);
      checkStatements(book, st, unit.id);
      expect(g.game.weight ?? 1).toBe(1);
    }
  });

  it('限时挑战: 30 statements made in advance, worth 2, with a clear rule', () => {
    const list = all.filter((x) => x.g.game.kind === 'timed');
    expect(list.length).toBeGreaterThan(80);
    for (const { book, unit, g } of list) {
      if (g.game.kind !== 'timed') continue;
      const t = g.game;
      expect(t.statements.length).toBe(30);
      expect(t.seconds).toBe(60);
      expect(t.weight).toBe(2);
      const falses = t.statements.filter((s) => !s.truth).length;
      expect(falses, unit.id).toBeGreaterThan(5);
      expect(falses, unit.id).toBeLessThan(25);
      checkStatements(book, t.statements, unit.id);
      expect(timedEarned(t, 10, 2)).toBe(2);
      expect(timedEarned(t, 12, 3)).toBe(1);
      expect(timedEarned(t, 6, 4)).toBe(1);
      expect(timedEarned(t, 5, 0)).toBe(0);
      expect(timedEarned(t, 15, 15)).toBe(0);
    }
  });

  it('every kind shows up in the papers and has a view', async () => {
    const { GAME_VIEWS } = await import('../src/practice/games');
    const seen = new Set<string>();
    for (const book of BOOKS)
      for (const unit of book.units) for (const p of unitPapers(unit.id)) for (const it of p.items) if (it.game) seen.add(it.game.kind);
    for (const k of MINE) {
      expect(seen.has(k), k).toBe(true);
      expect(GAME_VIEWS[k], k).toBeTruthy();
    }
  }, 120_000);
});
