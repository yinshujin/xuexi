/**
 * 开口读 (英语): read a word or a short sentence of the unit aloud; 讯飞 ISE
 * scores it (the family's 跟读 pass line). Needs 讯飞 credentials on the
 * device (requires: scoring); when 讯飞 cannot be reached the child moves on
 * without losing the points.
 */
import type { EnWord } from '@xuexi/practice';
import type { GameBuilder, GameContext, GameInfo, SpeakGame, UnitGame } from './types';
import { EN_BANKS } from './util';

/** Sentences short enough to read in one go (and to fit the recording limit). */
export const SPEAK_MAX_WORDS = 8;

function wordGame({ rng, kpOf }: GameContext, words: EnWord[]): UnitGame | null {
  const pool = words.filter((w) => /^[A-Za-z][A-Za-z' -]*$/.test(w.en) && w.en.split(' ').length <= 3);
  if (!pool.length) return null;
  const w = rng.pick(pool);
  const kp = kpOf(w.kp)!;
  return { kpId: kp.id, kpTitle: kp.title, game: { kind: 'speak', title: '开口读：大声读出这个单词', requires: ['scoring'], lang: 'en', text: w.en, zh: w.zh } };
}

function sentenceGame({ book, rng, kpOf }: GameContext): UnitGame | null {
  const pool = (EN_BANKS[book.id]?.items ?? []).filter((it) => {
    if (!kpOf(it.kp) || it.tier || !/^[A-Z][A-Za-z' ,]*[.?!]$/.test(it.answer)) return false;
    const n = it.answer.split(' ').length;
    return n >= 2 && n <= SPEAK_MAX_WORDS;
  });
  if (!pool.length) return null;
  const it = rng.pick(pool);
  const kp = kpOf(it.kp)!;
  return { kpId: kp.id, kpTitle: kp.title, game: { kind: 'speak', title: '开口读：大声读出这句话', requires: ['scoring'], lang: 'en', text: it.answer } };
}

export const speakBuilder: GameBuilder = {
  id: 'speak',
  build(ctx): UnitGame[] {
    if (ctx.book.subject !== 'english') return [];
    const words = (EN_BANKS[ctx.book.id]?.words ?? []).filter((w) => ctx.kpOf(w.kp));
    const both = [wordGame(ctx, words), sentenceGame(ctx)];
    return (ctx.paper % 2 === 0 ? both : both.reverse()).flatMap((g) => g ?? []);
  },
};

export const speakInfo: GameInfo<SpeakGame> = {
  prompt: (g) => `${g.title}：${g.text}${g.zh ? `（${g.zh}）` : ''}`,
  answer: (g) => `读出 ${g.text}`,
};
