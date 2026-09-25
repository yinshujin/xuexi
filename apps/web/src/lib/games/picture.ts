/**
 * 看图题: emoji pictures. 数学 几个几 / 平均分 (group boxes of fruit and so on,
 * for the 乘法 and 除法 units), 英语 看图选单词 / 看单词选图, 语文 看图选词语.
 */
import { koujue, type Rng } from '@xuexi/practice';
import type { GameBuilder, GameContext, GameInfo, PictureGame, UnitGame } from './types';
import { kpWith } from './mathfacts';
import { COUNTABLES, EN_EMOJI, EN_SIMILAR, YW_EMOJI } from './pictures';
import { EN_BANKS } from './util';
import { enWords, ywWords } from './words';

const OPTIONS = 4;

/** Options: the right one and distractors, shuffled; null when there are not enough distractors. */
function choose(rng: Rng, right: string, distractors: string[]): { options: string[]; answer: number } | null {
  const ds = rng.shuffle([...new Set(distractors)].filter((d) => d !== right)).slice(0, OPTIONS - 1);
  if (ds.length < OPTIONS - 1) return null;
  const options = rng.shuffle([right, ...ds]);
  return { options, answer: options.indexOf(right) };
}

/** Wrong numbers near the right one. */
const nearNumbers = (right: number, cands: number[]) => cands.filter((n) => Number.isInteger(n) && n > 0 && n !== right).map(String);

// ---------------------------------------------------------------- 数学

type MathPic = 'mul-count' | 'mul-expr' | 'add-expr' | 'koujue' | 'div-share' | 'div-group';

function mathPicture(ctx: GameContext): UnitGame[] {
  const { unit, rng, paper } = ctx;
  // Which pictures fit the unit (by the generators its knowledge points practise), and the numbers to use.
  const table = kpWith(unit, 'g2.mul.table');
  const div = kpWith(unit, 'g2.div.table');
  const meaning = kpWith(unit, 'g2.mul.meaning');
  let kinds: MathPic[];
  let kp = table ?? div ?? meaning;
  let per: [number, number];
  let groups: [number, number];
  if (div) {
    kinds = ['div-share', 'div-group'];
    kp = div;
    // 用 2~5 的口诀求商 (二上第五单元) or 6~9 (第八单元).
    const big = unit.knowledgePoints.some((k) => /6-9/.test(k.id));
    per = big ? [6, 9] : [2, 5];
    groups = big ? [2, 5] : [2, 6];
  } else if (table) {
    kinds = ['mul-count', 'koujue'];
    const big = coreTables(ctx) === 'tables-6-9';
    per = big ? [6, 9] : [2, 5];
    groups = big ? [2, 5] : [2, 6];
  } else if (meaning) {
    kinds = ['mul-expr', 'mul-count', 'add-expr'];
    per = [2, 5];
    groups = [2, 5];
  } else return [];
  if (!kp) return [];
  const kind = kinds[(paper + unit.index) % kinds.length];
  const thing = rng.pick(COUNTABLES);
  const a = rng.int(groups[0], groups[1]);
  let b = rng.int(per[0], per[1]);
  // 几个几 with a ≠ b, so the groups and the number in each are told apart.
  if (b === a) b = b === per[1] ? b - 1 : b + 1;
  const row = (n: number, e = thing.e) => Array.from({ length: n }, () => e);
  let game: Omit<PictureGame, 'kind' | 'title' | 'options' | 'answer'>;
  let picked: { options: string[]; answer: number } | null;
  switch (kind) {
    case 'mul-count':
      picked = choose(rng, String(a * b), rng.shuffle(nearNumbers(a * b, [a * b + b, a * b - b, a + b, a * b + 1, a * b - 1, a * b + a])));
      game = {
        prompt: `一共有几${thing.unit}${thing.name}？`,
        groups: Array.from({ length: a }, () => row(b)),
        alt: `${a} 组${thing.name}，每组 ${b} ${thing.unit}`,
      };
      break;
    case 'mul-expr': {
      // Every wrong 算式 has another value, so only the right one (not written as b × a) fits the picture.
      const wrong = [`${a} + ${b}`, `${a} × ${b + 1}`, `${a + 1} × ${b}`, `${a} × ${b - 1}`, `${b} + ${b}`, `${a} × ${a}`, `${b} × ${b}`];
      picked = choose(rng, `${a} × ${b}`, distinctValues(rng, wrong, a * b));
      game = {
        prompt: `哪个算式表示一共有几${thing.unit}？`,
        groups: Array.from({ length: a }, () => row(b)),
        alt: `${a} 组${thing.name}，每组 ${b} ${thing.unit}`,
      };
      break;
    }
    case 'add-expr': {
      // Not the same number in each group: 加法, not 乘法.
      const c = b === per[1] ? b - 1 : b + 1;
      const wrong = [`${b} × ${c}`, `${b} + ${b}`, `${c} + ${c}`, `${b} × 2`, `${c} × 2`];
      picked = choose(rng, `${b} + ${c}`, distinctValues(rng, wrong, b + c));
      kp = unit.knowledgePoints.find((k) => k.id.endsWith('animal-party')) ?? kp;
      game = {
        prompt: `两组不一样多。一共有几${thing.unit}，怎样列式？`,
        groups: [row(b), row(c)],
        alt: `两组${thing.name}，一组 ${b} ${thing.unit}，一组 ${c} ${thing.unit}`,
      };
      break;
    }
    case 'koujue': {
      const wrong = [
        [a, b + 1],
        [a + 1, b],
        [a - 1, b],
        [a, b - 1],
      ].filter(([x, y]) => x >= 1 && y >= 1 && x <= 9 && y <= 9 && x * y !== a * b);
      picked = choose(rng, koujue(a, b), wrong.map(([x, y]) => koujue(x, y)));
      game = {
        prompt: `一共有几${thing.unit}${thing.name}？用哪句口诀算？`,
        groups: Array.from({ length: a }, () => row(b)),
        alt: `${a} 组${thing.name}，每组 ${b} ${thing.unit}`,
      };
      break;
    }
    case 'div-share': {
      // a×b things shared equally among b children: a each.
      const total = a * b;
      picked = choose(rng, String(a), rng.shuffle(nearNumbers(a, [a + 1, a - 1, b, a + 2, total - b])));
      game = {
        prompt: `${total} ${thing.unit}${thing.name}平均分给 ${b} 个小朋友，每人分几${thing.unit}？`,
        groups: [row(total), row(b, '🧒')],
        between: '➡️',
        alt: `${total} ${thing.unit}${thing.name}，${b} 个小朋友`,
      };
      break;
    }
    case 'div-group': {
      // a×b things, b in each plate: a plates.
      const total = a * b;
      picked = choose(rng, String(a), rng.shuffle(nearNumbers(a, [a + 1, a - 1, b, a + 2, total - b])));
      game = {
        prompt: `${total} ${thing.unit}${thing.name}，每 ${b} ${thing.unit}放一盘，可以放几盘？`,
        groups: [row(total), ['🍽️']],
        between: '➡️',
        alt: `${total} ${thing.unit}${thing.name}，每盘放 ${b} ${thing.unit}`,
      };
      break;
    }
  }
  if (!picked) return [];
  return [{ kpId: kp.id, kpTitle: kp.title, game: { kind: 'picture', title: '看图题：看一看，选一选', ...game, ...picked } }];
}

/** 2~5 or 6~9 口诀 (the variant of the unit's 乘法口诀 practice). */
function coreTables(ctx: GameContext): string | undefined {
  for (const k of ctx.unit.knowledgePoints) {
    const s = k.practice.find((p) => p.generatorId === 'g2.mul.table' && !p.tier);
    if (s?.variant === 'tables-6-9') return s.variant;
  }
  return undefined;
}

/** 算式 with values other than `right` and than each other. */
function distinctValues(rng: Rng, exprs: string[], right: number): string[] {
  const seen = new Set([right]);
  return rng.shuffle(exprs).filter((t) => !seen.has(evalExpr(t)) && !!seen.add(evalExpr(t)));
}

/** a + b, a × b (numbers and + × only). */
function evalExpr(t: string): number {
  return t.split(' + ').reduce((sum, part) => sum + part.split(' × ').reduce((p, x) => p * Number(x), 1), 0);
}

// ---------------------------------------------------------------- 英语 / 语文

/** Words that could be taken for `w` (similar meaning, one inside the other, same picture). */
function lookAlike(w: string, other: string, emoji: Record<string, string>, similar: string[][]): boolean {
  if (other === w || other.includes(w) || w.includes(other)) return true;
  if (emoji[other] && emoji[other] === emoji[w]) return true;
  if (similar.some((g) => g.includes(w) && g.includes(other))) return true;
  // 语文: no shared character (树叶 / 叶子).
  return /[一-鿿]/.test(w) && [...other].some((c) => w.includes(c));
}

function wordPicture(ctx: GameContext, words: Array<{ text: string; kp: { id: string; title: string } }>, lang: 'en' | 'yw'): UnitGame[] {
  const { rng, paper, book } = ctx;
  const emoji = lang === 'en' ? EN_EMOJI : YW_EMOJI;
  const similar = lang === 'en' ? EN_SIMILAR : [];
  const shown = words.filter((w) => emoji[w.text]);
  if (shown.length < 2) return [];
  const x = rng.pick(shown);
  const pic = emoji[x.text];
  const fine = (o: string) => !lookAlike(x.text, o, emoji, similar);
  // 看单词选图 (英语, every other paper): pictures of the unit's words first, then of the book's.
  if (lang === 'en' && paper % 2 === 1) {
    const unitPics = shown.filter((w) => fine(w.text)).map((w) => emoji[w.text]);
    const bookPics = enBookWords(book.id).filter(fine).map((w) => emoji[w]);
    const pool = [...rng.shuffle(unitPics), ...rng.shuffle(bookPics)].filter((p) => p !== pic);
    const ds = [...new Set(pool)].slice(0, OPTIONS - 1);
    const picked = choose(rng, pic, ds);
    if (picked) {
      return [
        {
          kpId: x.kp.id,
          kpTitle: x.kp.title,
          game: { kind: 'picture', title: '看单词选图', prompt: x.text, groups: [], alt: x.text, optionStyle: 'emoji', ...picked },
        },
      ];
    }
  }
  const picked = choose(rng, x.text, words.map((w) => w.text).filter(fine));
  if (!picked) return [];
  return [
    {
      kpId: x.kp.id,
      kpTitle: x.kp.title,
      game: {
        kind: 'picture',
        title: lang === 'en' ? '看图选单词' : '看图选词语',
        prompt: lang === 'en' ? '图上是哪个单词？' : '图上是哪个词语？',
        groups: [[pic]],
        alt: pic,
        ...picked,
        ...(lang === 'yw' ? { words: [x.text] } : {}),
      },
    },
  ];
}

/** The book's words that have a picture. */
function enBookWords(bookId: string): string[] {
  return Object.keys(EN_EMOJI).filter((w) => enBankHas(bookId, w));
}

const enBankHas = (bookId: string, w: string) => !!EN_BANKS[bookId]?.words.some((x) => x.en === w);

export const pictureBuilder: GameBuilder = {
  id: 'picture',
  build(ctx): UnitGame[] {
    if (ctx.book.subject === 'math') return mathPicture(ctx);
    if (ctx.book.subject === 'english') return wordPicture(ctx, enWords(ctx).map((w) => ({ text: w.en, kp: w.kp })), 'en');
    return wordPicture(ctx, ywWords(ctx).map((w) => ({ text: w.w, kp: w.kp })), 'yw');
  },
};

export const pictureInfo: GameInfo<PictureGame> = {
  prompt: (g) => `${g.title}：${g.prompt}${g.optionStyle === 'emoji' ? '' : `（图：${g.alt}）`}`,
  answer: (g) => g.options[g.answer],
};
