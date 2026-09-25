/**
 * 写汉字: the pinyin of a 语文 word and the word with a character left out
 * (「宽□」 kuān guǎng); the child writes the missing character stroke by stroke
 * (hanzi-writer checks each stroke and its order). Two words per paper.
 */
import { BOOKS } from '@xuexi/curriculum';
import { createRng, displayPinyin } from '@xuexi/practice';
import type { GameBuilder, GameInfo, UnitGame, WriteGame, WriteItem } from './types';
import { DICTATION, unitWords, variantOf } from './util';

/** Words (one character to write each) per paper. */
export const WRITE_WORDS = 2;

/** Characters too easy or too common to be worth a 写汉字 question when others are there. */
export const EASY_CHARS = new Set([...'一二三四五六七八九十了的是不个人大小上下左右中子儿们么这那你我他她它在有和也来去口日月木山水火土又几门']);

/** Characters of a 语文 book's words, by the unit they are in. */
const charsOf = (bookId: string, variants: string[]) => new Set(variants.flatMap((v) => (DICTATION[bookId]?.[v] ?? []).flatMap((d) => [...d.w])));

export const writeBuilder: GameBuilder = {
  id: 'write',
  build({ book, unit, paper }): UnitGame[] {
    if (book.subject !== 'chinese') return [];
    const words = unitWords(book.id, unit);
    if (!words.length) return [];
    // Characters the child has met before: earlier units of this book, and lower grades' books.
    const earlier = BOOKS.filter((b) => b.id === book.id)
      .flatMap((b) => b.units.filter((u) => u.index < unit.index))
      .flatMap((u) => u.knowledgePoints.map((k) => variantOf(k.id)));
    const known = charsOf(book.id, earlier);
    for (const b of BOOKS) {
      if (b.subject === 'chinese' && b.grade < book.grade) {
        for (const ch of charsOf(
          b.id,
          b.units.flatMap((u) => u.knowledgePoints.map((k) => variantOf(k.id))),
        ))
          known.add(ch);
      }
    }
    // Every character worth writing: 0 new in this unit, 1 met before, 2 easy.
    const tiers: Array<Array<{ w: (typeof words)[number]; i: number; ch: string }>> = [[], [], []];
    for (const w of words) {
      const chars = [...w.w];
      chars.forEach((ch, i) => {
        if (!/\p{Script=Han}/u.test(ch) || chars.indexOf(ch) !== chars.lastIndexOf(ch)) return; // 妈妈: the other 妈 gives it away
        tiers[EASY_CHARS.has(ch) ? 2 : known.has(ch) ? 1 : 0].push({ w, i, ch });
      });
    }
    // One order for the unit, so paper A, B and C take different words.
    const rng = createRng(`exam-game|${unit.id}|write`);
    const order = tiers.flatMap((t) => {
      const s = rng.shuffle(t);
      const k = s.length ? (paper * WRITE_WORDS) % s.length : 0;
      return [...s.slice(k), ...s.slice(0, k)];
    });
    const picked: typeof order = [];
    for (const c of order) {
      // Different words, and neither shows the other's missing character (共□党 and 共产党□).
      if (picked.some((p) => p.w.w === c.w.w || c.w.w.includes(p.ch) || p.w.w.includes(c.ch))) continue;
      picked.push(c);
      if (picked.length === WRITE_WORDS) break;
    }
    if (!picked.length) return [];
    const items: WriteItem[] = picked.map((c) => ({
      word: c.w.w,
      pinyin: displayPinyin(c.w),
      blanks: [c.i],
    }));
    const game: WriteGame = {
      kind: 'write',
      title: '写汉字：看拼音，写出空着的字',
      items,
      weight: items.reduce((t, it) => t + it.blanks.length, 0),
      requires: ['hanzi'],
      words: items.map((it) => it.word),
    };
    return [{ kpId: picked[0].w.kp.id, kpTitle: picked[0].w.kp.title, game }];
  },
};

/** 「宽□」: the word with its blanks as □. */
export const blanked = (it: WriteItem) => [...it.word].map((ch, i) => (it.blanks.includes(i) ? '□' : ch)).join('');

/** The characters to write, in order. */
export const writeChars = (g: WriteGame) => g.items.flatMap((it) => it.blanks.map((i) => [...it.word][i]));

export const writeInfo: GameInfo<WriteGame> = {
  prompt: (g) => `${g.title}：${g.items.map((it) => `${blanked(it)}（${it.pinyin}）`).join('；')}`,
  answer: (g) => g.items.map((it) => it.word).join('、'),
};
