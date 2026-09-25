/**
 * 排序: tap four tiles into order. 数学 得数 / 大数 / 长度 from small to large
 * (or large to small), 语文 音序, 英语 字母顺序, 写作 a short passage (顺序词、时间、
 * 故事的先后). Every tile has its own key, so there is exactly one right order.
 */
import type { GameBuilder, GameInfo, SortGame, UnitGame } from './types';
import { bigNumbers, lengths, mathTopic, topicKp, unitSumPool, valueOf } from './mathfacts';
import { mixed, writingPick, XZ_GAMES } from './util';
import { enWords, ywWords, yinxu } from './words';

const TILES = 4;

export function sortCorrect(g: SortGame, picked: string[]): boolean {
  return picked.length === g.answer.length && picked.every((t, i) => t === g.answer[i]);
}

/** Up to `n` items with different keys (the first of each key). */
function distinctBy<T>(items: T[], key: (t: T) => string | number, n: number): T[] {
  const seen = new Set<string | number>();
  const out: T[] = [];
  for (const it of items) {
    const k = key(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
    if (out.length === n) break;
  }
  return out;
}

export const sortBuilder: GameBuilder = {
  id: 'sort',
  build({ book, unit, paper, rng, kpOf }): UnitGame[] {
    const ctx = { book, unit, kpOf };
    if (book.subject === 'writing') {
      const got = writingPick(XZ_GAMES[book.id]?.sort, kpOf, paper);
      if (!got) return [];
      const answer = got.item.sentences;
      const game: SortGame = {
        kind: 'sort',
        title: '排序：排成一段话',
        prompt: got.item.prompt,
        answer,
        tiles: mixed(rng, answer, (t) => sortCorrect({ answer } as SortGame, t)),
        sep: ' → ',
      };
      return [{ kpId: got.kp.id, kpTitle: got.kp.title, game }];
    }
    if (book.subject === 'math') {
      const topic = mathTopic(unit);
      const kp = topic && topicKp(unit, topic);
      if (!kp) return [];
      let tiles: string[];
      let what: string;
      if (topic === 'sums') {
        tiles = distinctBy(rng.shuffle(unitSumPool(unit)), (s) => s.value, TILES).map((s) => s.text);
        what = '按得数';
      } else if (topic === 'bignum') {
        tiles = bigNumbers(rng, TILES).map(String);
        what = '比一比大小，';
      } else if (topic === 'length') {
        tiles = distinctBy(lengths(rng, TILES + 2), valueOf, TILES);
        what = '比一比长短，';
      } else return [];
      if (tiles.length < TILES) return [];
      const down = paper % 2 === 1;
      const answer = [...tiles].sort((a, b) => (down ? valueOf(b) - valueOf(a) : valueOf(a) - valueOf(b)));
      const game: SortGame = {
        kind: 'sort',
        title: '排序：排一排',
        prompt: `${what}${down ? '从大到小' : '从小到大'}排一排`,
        answer,
        tiles: mixed(rng, tiles, (t) => sortCorrect({ answer } as SortGame, t)),
        sep: down ? ' > ' : ' < ',
        ...(topic === 'sums' ? { notes: answer.map((t) => `= ${valueOf(t)}`) } : topic === 'length' ? { notes: answer.map((t) => `${valueOf(t)} 厘米`) } : {}),
      };
      return [{ kpId: kp.id, kpTitle: kp.title, game }];
    }
    if (book.subject === 'chinese') {
      const words = distinctBy(rng.shuffle(ywWords(ctx)), (w) => yinxu(w.py), TILES);
      if (words.length < TILES) return [];
      const answer = [...words].sort((a, b) => yinxu(a.py).localeCompare(yinxu(b.py)));
      const texts = answer.map((w) => w.w);
      return [
        {
          kpId: words[0].kp.id,
          kpTitle: words[0].kp.title,
          game: {
            kind: 'sort',
            title: '排序：按音序排一排',
            prompt: '看每个词语第一个字的拼音首字母，按字母表的顺序排',
            answer: texts,
            tiles: mixed(rng, texts, (t) => t.join() === texts.join()),
            sep: ' → ',
            notes: answer.map((w) => yinxu(w.py)),
          },
        },
      ];
    }
    const first = (en: string) => en[0].toLowerCase();
    const words = distinctBy(
      rng.shuffle(enWords(ctx).filter((w) => /^[A-Za-z]/.test(w.en) && !/^a /.test(w.en))),
      (w) => first(w.en),
      TILES,
    );
    if (words.length < TILES) return [];
    const texts = words.map((w) => w.en).sort((a, b) => first(a).localeCompare(first(b)));
    return [
      {
        kpId: words[0].kp.id,
        kpTitle: words[0].kp.title,
        game: {
          kind: 'sort',
          title: '排序：按字母顺序排一排',
          prompt: '看第一个字母，按 a b c … 的顺序排',
          answer: texts,
          tiles: mixed(rng, texts, (t) => t.join() === texts.join()),
          sep: ' → ',
        },
      },
    ];
  },
};

export const sortInfo: GameInfo<SortGame> = {
  prompt: (g) => `${g.title}：${g.prompt}（${g.tiles.join('，')}）`,
  answer: (g) => g.answer.map((t, i) => (g.notes ? `${t}（${g.notes[i]}）` : t)).join(g.sep),
};
