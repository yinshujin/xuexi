/**
 * 分类: 6–8 cards into 2 or 3 labelled buckets. 数学 得数 / 大数 / 长度 比 N
 * 大还是小 (no card equal to N), 英语 by category (动物 / 季节 …) or by 字母组合
 * (-at / -ap), 语文 by word structure (ABB / AABB / ABAC / AA) or else by
 * 平舌音 / 翘舌音 or 前鼻音 / 后鼻音.
 */
import type { Rng } from '@xuexi/practice';
import type { ClassifyGame, GameBuilder, GameInfo, UnitGame } from './types';
import { lengths, mathTopic, topicKp, unitSumPool, valueOf } from './mathfacts';
import { EN_CATEGORY } from './pictures';
import { enWords, nasal, structure, tongue, ywWords, type YwWord } from './words';

export const CLASSIFY_MIN = 6;
export const CLASSIFY_MAX = 8;
/** A 分类 counts as right with at most one card in the wrong bucket. */
export const CLASSIFY_SLIPS = 1;

/** Cards from items grouped by bucket: up to `per` from each, 6–8 in all, shuffled; null if too few. */
function deal<T>(rng: Rng, byBucket: T[][], per: number, text: (t: T) => string): ClassifyGame['cards'] | null {
  if (byBucket.length < 2 || byBucket.some((b) => b.length < 2)) return null;
  const cards = byBucket.flatMap((items, bucket) => rng.shuffle(items).slice(0, per).map((t) => ({ text: text(t), bucket })));
  const trimmed = rng.shuffle(cards);
  // Keep at most CLASSIFY_MAX, still at least two per bucket.
  while (trimmed.length > CLASSIFY_MAX) {
    const counts = byBucket.map((_, b) => trimmed.filter((c) => c.bucket === b).length);
    const fullest = counts.indexOf(Math.max(...counts));
    trimmed.splice(trimmed.findIndex((c) => c.bucket === fullest), 1);
  }
  if (trimmed.length < CLASSIFY_MIN || new Set(trimmed.map((c) => c.text)).size !== trimmed.length) return null;
  return trimmed;
}

/** 数学: values above / below a round N (none equal to it, both sides at least two). */
function aboveBelow(rng: Rng, items: string[], steps: number[], name: (n: number) => string): { buckets: string[]; cards: ClassifyGame['cards'] } | null {
  const values = items.map(valueOf);
  const balance = (n: number) => Math.abs(values.filter((v) => v > n).length - values.filter((v) => v < n).length);
  // The roundest N between the values (multiples of the first step that works), the most even split first.
  for (const st of [...steps, 1]) {
    const cands = [...new Set(values.map((v) => Math.round(v / st) * st))]
      .filter((n) => n > 0 && !values.includes(n) && values.filter((v) => v > n).length >= 2 && values.filter((v) => v < n).length >= 2)
      .sort((a, b) => balance(a) - balance(b) || a - b);
    if (!cands.length) continue;
    const n = cands[0];
    const [lo, hi] = name(n).split('|');
    const cards = deal(rng, [items.filter((t) => valueOf(t) > n), items.filter((t) => valueOf(t) < n)], 4, (t) => t);
    if (cards) return { buckets: [hi, lo], cards };
  }
  return null;
}

function mathClassify(ctx: Parameters<GameBuilder['build']>[0]): UnitGame[] {
  const { unit, rng } = ctx;
  const topic = mathTopic(unit);
  const kp = topic && topicKp(unit, topic);
  if (!kp) return [];
  let r: ReturnType<typeof aboveBelow> = null;
  if (topic === 'sums') {
    const pool = rng.shuffle(unitSumPool(unit)).slice(0, 10).map((s) => s.text);
    const big = Math.max(...pool.map(valueOf));
    r = aboveBelow(rng, pool, big > 1000 ? [1000, 500] : big > 100 ? [100, 50] : [10, 5], (n) => `得数比 ${n} 小|得数比 ${n} 大`);
  } else if (topic === 'bignum') {
    // Numbers around 100 万 (or 1000 万): 986000 has one digit less than 1020000.
    const around = rng.pick([1_000_000, 10_000_000]);
    const nums = new Set<number>();
    for (let t = 0; nums.size < 12 && t < 100; t++) {
      nums.add(around + rng.pick([-1, 1]) * rng.int(1, 60) * (around / 200) + rng.int(0, 9) * (around / 10_000));
    }
    const items = [...nums].filter((x) => x !== around).map(String);
    const label = around === 1_000_000 ? '100万' : '1000万';
    const cards = deal(rng, [items.filter((t) => Number(t) > around), items.filter((t) => Number(t) < around)], 4, (t) => t);
    r = cards && { buckets: [`比 ${label} 大`, `比 ${label} 小`], cards };
  } else if (topic === 'length') {
    const items = lengths(rng, 12).filter((t) => valueOf(t) !== 100);
    const cards = deal(rng, [items.filter((t) => valueOf(t) > 100), items.filter((t) => valueOf(t) < 100)], 4, (t) => t);
    r = cards && { buckets: ['比 1 米长', '比 1 米短'], cards };
  }
  if (!r) return [];
  return [{ kpId: kp.id, kpTitle: kp.title, game: { kind: 'classify', title: '分类：放进对的篮子', buckets: r.buckets, cards: r.cards } }];
}

// ---------------------------------------------------------------- 语文

const STRUCTURES: Array<[ReturnType<typeof structure> & string, string]> = [
  ['AABB', 'AABB 式（隐隐约约）'],
  ['ABB', 'ABB 式（笑呵呵）'],
  ['ABAC', 'ABAC 式（人山人海）'],
  ['AA', 'AA 式（星星）'],
];

/** 语文 ways to sort a unit's words, each a list of [bucket label, words]; only clear-cut words. */
function chineseSortings(words: YwWord[]): Array<Array<[string, YwWord[]]>> {
  const out: Array<Array<[string, YwWord[]]>> = [];
  const byStructure = STRUCTURES.map(([k, label]): [string, YwWord[]] => [label, words.filter((w) => structure(w.w) === k)]).filter(
    ([, ws]) => ws.length >= 2,
  );
  if (byStructure.length >= 2) out.push(byStructure.slice(0, 3));
  const flat = words.filter((w) => tongue(w.py).flat && !tongue(w.py).curled);
  const curled = words.filter((w) => tongue(w.py).curled && !tongue(w.py).flat);
  if (flat.length >= 2 && curled.length >= 2) out.push([['平舌音 z c s', flat], ['翘舌音 zh ch sh r', curled]]);
  const front = words.filter((w) => nasal(w.py).front && !nasal(w.py).back);
  const back = words.filter((w) => nasal(w.py).back && !nasal(w.py).front);
  if (front.length >= 2 && back.length >= 2) out.push([['前鼻音 -n', front], ['后鼻音 -ng', back]]);
  return out;
}

// ---------------------------------------------------------------- 英语

/** The unit's 字母组合 (from its knowledge point titles: 「字母组合 -at、-ap」), each with its words. */
function rhymeSorting(families: string[], words: string[]): Array<[string, string[]]> {
  return families
    .map((f): [string, string[]] => [`-${f} 结尾`, words.filter((w) => /^[a-z]+$/.test(w) && w.endsWith(f))])
    .filter(([, ws]) => ws.length >= 2);
}

const deck = (s: Array<[string, unknown[]]>) => (s.length === 3 ? 3 : 4);

export const classifyBuilder: GameBuilder = {
  id: 'classify',
  build(ctx): UnitGame[] {
    const { book, rng, paper } = ctx;
    if (book.subject === 'math') return mathClassify(ctx);
    if (book.subject === 'chinese') {
      const sortings = chineseSortings(ywWords(ctx));
      // A different way on each paper, the next one when a way has too few words.
      for (const s of [...sortings.slice(paper % Math.max(1, sortings.length)), ...sortings]) {
        const cards = deal(rng, s.map(([, ws]) => ws), deck(s), (w) => w.w);
        if (!cards) continue;
        const words = cards.map((c) => c.text);
        const kp = s.flatMap(([, ws]) => ws).find((w) => w.w === words[0])!.kp;
        return [{ kpId: kp.id, kpTitle: kp.title, game: { kind: 'classify', title: '分类：放进对的篮子', buckets: s.map(([l]) => l), cards, words } }];
      }
      return [];
    }
    const words = enWords(ctx);
    const byCat = new Map<string, string[]>();
    for (const w of words) if (EN_CATEGORY[w.en]) byCat.set(EN_CATEGORY[w.en], [...(byCat.get(EN_CATEGORY[w.en]) ?? []), w.en]);
    const cats = [...byCat.entries()].filter(([, ws]) => ws.length >= 2).sort((a, b) => b[1].length - a[1].length);
    const sortings: Array<Array<[string, string[]]>> = [];
    if (cats.length >= 2) sortings.push(cats.slice(0, cats.length >= 3 && paper % 2 === 1 ? 3 : 2));
    const families = [...new Set(ctx.unit.knowledgePoints.flatMap((k) => (/字母组合/.test(k.title) ? [...k.title.matchAll(/-([a-z]+)/g)].map((m) => m[1]) : [])))];
    const rhymes = rhymeSorting(families, words.map((w) => w.en));
    if (rhymes.length >= 2) sortings.push(rhymes.slice(0, 2));
    for (const s of [...sortings.slice(paper % Math.max(1, sortings.length)), ...sortings]) {
      const cards = deal(rng, s.map(([, ws]) => ws), deck(s), (w) => w);
      if (!cards) continue;
      const kp = words.find((w) => w.en === cards[0].text)!.kp;
      return [{ kpId: kp.id, kpTitle: kp.title, game: { kind: 'classify', title: '分类：放进对的篮子', buckets: s.map(([l]) => l), cards } }];
    }
    return [];
  },
};

export function classifySlips(g: ClassifyGame, placed: Array<number | null>): number {
  return g.cards.filter((c, i) => placed[i] !== c.bucket).length;
}

export const classifyInfo: GameInfo<ClassifyGame> = {
  prompt: (g) => `${g.title}：${g.buckets.join(' / ')}（${g.cards.map((c) => c.text).join('，')}）`,
  answer: (g) => g.buckets.map((b, i) => `${b}：${g.cards.filter((c) => c.bucket === i).map((c) => c.text).join('、')}`).join('；'),
};
