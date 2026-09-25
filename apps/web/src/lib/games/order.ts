/** 拼一拼: tap tiles in order — 英语 build the sentence for a situation, 语文 看拼音拼词语, 写作 字块拼成一句话. */
import { displayPinyin } from '@xuexi/practice';
import type { GameBuilder, GameInfo, OrderGame, UnitGame } from './types';
import { EN_BANKS, mixed, unitWords, writingPick, XZ_GAMES } from './util';

export function orderCorrect(g: OrderGame, picked: string[]): boolean {
  return picked.join(g.joiner) === g.answer.join(g.joiner);
}

export const orderBuilder: GameBuilder = {
  id: 'order',
  build({ book, unit, paper, rng, kpOf }): UnitGame[] {
    if (book.subject === 'writing') {
      const got = writingPick(XZ_GAMES[book.id]?.build, kpOf, paper);
      if (!got) return [];
      const answer = got.item.chunks;
      return [
        {
          kpId: got.kp.id,
          kpTitle: got.kp.title,
          game: {
            kind: 'order',
            title: '拼一拼：把字块排成一句话',
            prompt: got.item.prompt,
            answer,
            tiles: mixed(rng, [...answer, ...(got.item.decoys ?? [])], (t) => t.join('') === answer.join('')),
            joiner: '',
          },
        },
      ];
    }
    if (book.subject === 'english') {
      const bank = EN_BANKS[book.id];
      // A situation from the unit's items, answered by building the sentence.
      const sentences = (bank?.items ?? []).filter(
        (it) => kpOf(it.kp) && !it.tier && /^[A-Z][A-Za-z' ,]*[.?!]$/.test(it.answer) && it.answer.split(' ').length >= 3 && it.answer.split(' ').length <= 9,
      );
      if (!sentences.length) return [];
      const it = rng.pick(sentences);
      const answer = it.answer.split(' ');
      const decoys = [
        ...new Set(it.wrong.flatMap(([w]) => w.split(' ')).filter((t) => /^[A-Za-z'.,?!]+$/.test(t) && !answer.includes(t))),
      ].slice(0, 2);
      const kp = kpOf(it.kp)!;
      return [
        {
          kpId: kp.id,
          kpTitle: kp.title,
          game: {
            kind: 'order',
            title: '拼一拼：把单词排成一句话',
            // "选出正确的句子。（我奶奶做家务。）" asks to choose; here the child builds it.
            prompt: it.prompt.replace(/^选出[^。：:]*[。：:]\s*/, '').replace(/（　）/g, '……'),
            answer,
            tiles: mixed(rng, [...answer, ...decoys], (t) => t.join(' ') === answer.join(' ')),
            joiner: ' ',
          },
        },
      ];
    }
    if (book.subject === 'chinese') {
      const all = unitWords(book.id, unit);
      // 看拼音拼词语: longer words first (more to put in order).
      const long = all.filter((w) => w.w.length >= 3);
      const pool = long.length ? long : all.filter((w) => w.w.length === 2);
      if (!pool.length) return [];
      const w = rng.pick(pool);
      const answer = [...w.w];
      const decoys = rng
        .shuffle([...new Set(all.flatMap((x) => [...x.w]))].filter((c) => !answer.includes(c)))
        .slice(0, answer.length >= 3 ? 3 : 2);
      return [
        {
          kpId: w.kp.id,
          kpTitle: w.kp.title,
          game: {
            kind: 'order',
            title: '拼一拼：看拼音，拼出词语',
            prompt: displayPinyin(w),
            answer,
            tiles: mixed(rng, [...answer, ...decoys], (t) => t.join('') === w.w),
            joiner: '',
            words: [w.w],
          },
        },
      ];
    }
    return [];
  },
};

export const orderInfo: GameInfo<OrderGame> = {
  prompt: (g) => `${g.title}：${g.prompt}`,
  answer: (g) => g.answer.join(g.joiner),
};
