/**
 * 拼写 (英语): see the Chinese meaning (🔊 too when the word audio pack is
 * there, but it works without) and spell the word with letter tiles: its own
 * letters plus a few look-alike decoys (b/d, m/n …). Single words of up to 10 letters.
 */
import type { EnWord, Rng } from '@xuexi/practice';
import type { GameBuilder, GameInfo, SpellGame, UnitGame } from './types';
import { EN_BANKS, mixed } from './util';

export const SPELL_MAX_LETTERS = 10;

/** Letters children mix up, to use as decoys. */
const CONFUSED: Record<string, string> = {
  a: 'eou', b: 'dp', c: 'ks', d: 'bt', e: 'ai', f: 'tv', g: 'jq', h: 'nk', i: 'ey', j: 'g', k: 'c', l: 'i', m: 'nw',
  n: 'mh', o: 'ua', p: 'bq', q: 'pg', r: 'l', s: 'cz', t: 'df', u: 'ov', v: 'wf', w: 'vm', x: 'z', y: 'i', z: 's',
};

export function spellDecoys(rng: Rng, word: string, n: number): string[] {
  const letters = new Set(word.toLowerCase());
  const near = rng.shuffle([...new Set([...letters].flatMap((c) => [...(CONFUSED[c] ?? '')]))].filter((c) => !letters.has(c)));
  const rest = rng.shuffle([...'abcdefghijklmnopqrstuvwxyz'].filter((c) => !letters.has(c) && !near.includes(c)));
  return [...near, ...rest].slice(0, n);
}

export function spellCorrect(g: SpellGame, typed: string): boolean {
  return typed.trim().toLowerCase() === g.answer.toLowerCase();
}

const spellable = (w: EnWord) => new RegExp(`^[A-Za-z]{2,${SPELL_MAX_LETTERS}}$`).test(w.en);

export const spellBuilder: GameBuilder = {
  id: 'spell',
  build({ book, rng, kpOf }): UnitGame[] {
    if (book.subject !== 'english') return [];
    const words = rng.shuffle((EN_BANKS[book.id]?.words ?? []).filter((w) => kpOf(w.kp) && spellable(w)));
    // Longer words first: more to spell (but a 2-letter word when that is all there is).
    const pool = [...words.filter((w) => w.en.length >= 3), ...words.filter((w) => w.en.length < 3)];
    return pool.slice(0, 2).map((w) => {
      const letters = [...w.en.toLowerCase()];
      const tiles = mixed(rng, [...letters, ...spellDecoys(rng, w.en, letters.length <= 4 ? 2 : 3)], (t) => t.join('').startsWith(w.en.toLowerCase()));
      const kp = kpOf(w.kp)!;
      return { kpId: kp.id, kpTitle: kp.title, game: { kind: 'spell', title: '拼写：拼出这个单词', zh: w.zh, answer: w.en, tiles } };
    });
  },
};

export const spellInfo: GameInfo<SpellGame> = {
  prompt: (g) => `${g.title}：${g.zh}`,
  answer: (g) => g.answer,
};
