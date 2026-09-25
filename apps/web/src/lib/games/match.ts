/** 连连看: match pairs — 英语 word ↔ 中文, 语文 词语 ↔ 拼音, 数学 算式 ↔ 得数. */
import { displayPinyin, type Rng } from '@xuexi/practice';
import type { GameBuilder, GameInfo, MatchGame, UnitGame } from './types';
import { distinctPairs, EN_BANKS, mixed, unitSums, unitWords } from './util';

const PAIRS = 5;
/** A 连连看 counts as right with at most one wrong match. */
export const MATCH_SLIPS = 1;

function matchOf(rng: Rng, title: string, pairs: Array<[string, string]>, words?: string[]): MatchGame {
  const idx = pairs.map((_, i) => i);
  return { kind: 'match', title, pairs, order: mixed(rng, idx, (o) => o.every((x, i) => x === i)), ...(words ? { words } : {}) };
}

export const matchBuilder: GameBuilder = {
  id: 'match',
  build({ book, unit, rng, seed, kpOf }): UnitGame[] {
    if (book.subject === 'english') {
      const bank = EN_BANKS[book.id];
      const words = bank?.words.filter((w) => kpOf(w.kp)) ?? [];
      const picked = distinctPairs(rng, words, (w) => w.en, (w) => w.zh, PAIRS);
      if (picked.length < 4) return [];
      const kp = kpOf(picked[0].kp)!;
      return [{ kpId: kp.id, kpTitle: kp.title, game: matchOf(rng, '连连看：单词和意思配对', picked.map((w) => [w.en, w.zh])) }];
    }
    if (book.subject === 'chinese') {
      const picked = distinctPairs(rng, unitWords(book.id, unit), (w) => w.w, (w) => displayPinyin(w), PAIRS);
      if (picked.length < 4) return [];
      return [
        {
          kpId: picked[0].kp.id,
          kpTitle: picked[0].kp.title,
          game: matchOf(rng, '连连看：词语和拼音配对', picked.map((w) => [w.w, displayPinyin(w)]), picked.map((w) => w.w)),
        },
      ];
    }
    const picked = distinctPairs(rng, unitSums(unit, seed), (x) => x.text, (x) => String(x.value), PAIRS);
    if (picked.length < 4) return [];
    return [
      {
        kpId: picked[0].kp.id,
        kpTitle: picked[0].kp.title,
        game: matchOf(rng, '连连看：算式和得数配对', picked.map((x) => [x.text, String(x.value)])),
      },
    ];
  },
};

export const matchInfo: GameInfo<MatchGame> = {
  prompt: (g) => g.title,
  answer: (g) => g.pairs.map(([a, b]) => `${a} — ${b}`).join('；'),
};
