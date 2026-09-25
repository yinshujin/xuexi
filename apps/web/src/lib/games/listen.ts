/**
 * 听音选择: tap 🔊 (it plays once by itself) and choose.
 *   英语: hear a word → its Chinese meaning, or → the English word among look-alikes.
 *   语文: hear a 听写 word → the right characters among versions with a homophone swapped in
 *         (the 看拼音选词语 misspellings of the book).
 * Needs the word audio pack (requires: audio).
 */
import { soundAlikeWrongs, YW_G2A_SOUNDALIKE_WORDS, YW_G2A_WORDS, YW_G4A_SOUNDALIKE_WORDS, YW_G4A_WORDS, type DictWord, type EnWord, type Rng } from '@xuexi/practice';
import type { GameBuilder, GameContext, GameInfo, ListenGame, UnitGame } from './types';
import { EN_BANKS, mixed, unitWords } from './util';

/** English words that sound the same (to the en-US voice): never options of each other. */
const HOMOPHONES = [
  'aunt ant', 'red read', 'right write', 'pear pair', 'flower flour', 'see sea', 'hear here', 'two too to', 'four for',
  'eight ate', 'son sun', 'one won', 'no know', 'new knew', 'meet meat', 'week weak', 'bear bare', 'whole hole',
  'hour our', 'blue blew', 'by buy bye', 'dear deer', 'tail tale', 'road rode', 'sail sale', 'there their', 'where wear',
  'wood would', 'be bee', 'wait weight', 'plane plain', 'piece peace', 'I eye', 'sum some', 'night knight', 'tea tee',
].map((g) => g.split(' '));
export const soundsAlike = (a: string, b: string) => {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x === y || HOMOPHONES.some((g) => g.includes(x) && g.includes(y));
};

/** Letters that differ between two words (edit distance). */
export function editDistance(a: string, b: string): number {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return d[b.length];
}

const WRONG_ZH: Record<string, (d: DictWord) => string[]> = {
  'yw-g2a': soundAlikeWrongs(YW_G2A_WORDS, YW_G2A_SOUNDALIKE_WORDS),
  'yw-g4a': soundAlikeWrongs(YW_G4A_WORDS, YW_G4A_SOUNDALIKE_WORDS),
};

function listenGame(rng: Rng, g: Omit<ListenGame, 'kind' | 'options' | 'answer' | 'requires'>, right: string, wrong: string[]): ListenGame {
  const options = mixed(rng, [right, ...wrong], (o) => o[0] === right);
  return { kind: 'listen', requires: ['audio'], ...g, options, answer: options.indexOf(right) };
}

/** 英语: hear the word, choose its meaning (the other meanings from the unit, then the book). */
function meaningGame(ctx: GameContext, words: EnWord[], all: EnWord[]): UnitGame | null {
  const { rng, kpOf } = ctx;
  const w = rng.pick(words);
  const others = (pool: EnWord[]) => rng.shuffle(pool.filter((x) => x.zh !== w.zh && !soundsAlike(x.en, w.en)));
  const zh = [...new Set([...others(words), ...others(all)].map((x) => x.zh))].slice(0, 3);
  if (zh.length < 2) return null;
  const kp = kpOf(w.kp)!;
  return {
    kpId: kp.id,
    kpTitle: kp.title,
    game: listenGame(rng, { title: '听音选择：听一听，选出意思', lang: 'en', say: w.en, ask: '它是什么意思？' }, w.zh, zh),
  };
}

/** 英语: hear the word, choose it among look-alike words of the book (or its typical misspellings). */
function wordGame(ctx: GameContext, words: EnWord[], all: EnWord[]): UnitGame | null {
  const { rng, kpOf } = ctx;
  const single = (x: EnWord) => /^[A-Za-z]{3,}$/.test(x.en);
  const pool = rng.shuffle(words.filter(single));
  for (const w of pool) {
    const near = rng
      .shuffle(all.filter((x) => single(x) && !soundsAlike(x.en, w.en)).map((x) => x.en))
      .map((en) => ({ en, d: editDistance(en.toLowerCase(), w.en.toLowerCase()) }))
      .filter((x) => x.d <= Math.max(2, Math.ceil(w.en.length / 3)))
      .sort((a, b) => a.d - b.d)
      .map((x) => x.en);
    const misspelt = (w.misspell ?? []).filter((m) => /^[A-Za-z]+$/.test(m) && !soundsAlike(m, w.en));
    const wrong = [...new Set([...near, ...misspelt])].filter((x) => x.toLowerCase() !== w.en.toLowerCase()).slice(0, 3);
    if (wrong.length < 2) continue;
    const kp = kpOf(w.kp)!;
    return {
      kpId: kp.id,
      kpTitle: kp.title,
      game: listenGame(rng, { title: '听音选择：听一听，选出你听到的单词', lang: 'en', say: w.en, ask: '你听到的是哪个单词？' }, w.en, wrong),
    };
  }
  return null;
}

export const listenBuilder: GameBuilder = {
  id: 'listen',
  build(ctx): UnitGame[] {
    const { book, unit, paper, rng, kpOf } = ctx;
    if (book.subject === 'english') {
      const all = EN_BANKS[book.id]?.words ?? [];
      const words = all.filter((w) => kpOf(w.kp));
      if (!words.length) return [];
      const makers = paper % 2 === 0 ? [meaningGame, wordGame] : [wordGame, meaningGame];
      return makers.flatMap((m) => m(ctx, words, all) ?? []);
    }
    if (book.subject === 'chinese') {
      const wrongOf = WRONG_ZH[book.id];
      if (!wrongOf) return [];
      const usable = rng
        .shuffle(unitWords(book.id, unit))
        .map((w) => ({ w, wrong: wrongOf(w) }))
        .filter((x) => x.wrong.length >= 2);
      return usable.slice(0, 2).map(({ w, wrong }) => ({
        kpId: w.kp.id,
        kpTitle: w.kp.title,
        game: {
          ...listenGame(
            rng,
            { title: '听音选择：听词语，选出写对的', lang: 'zh', say: w.w, ask: '哪个词语写对了？' },
            w.w,
            rng.shuffle(wrong).slice(0, 3),
          ),
          words: [w.w],
        },
      }));
    }
    return [];
  },
};

export function listenCorrect(g: ListenGame, picked: number): boolean {
  return picked === g.answer;
}

export const listenInfo: GameInfo<ListenGame> = {
  prompt: (g) => `${g.title}（${g.options.join(' / ')}）`,
  answer: (g) => (g.options[g.answer] === g.say ? g.say : `${g.say}：${g.options[g.answer]}`),
};
