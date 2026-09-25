/**
 * Game questions for the 单元测试 (after Duolingo's match and tap-the-tiles
 * exercises), built from the unit's own material with a fixed seed:
 *
 *   连连看  match pairs — 英语 word ↔ 中文, 语文 词语 ↔ 拼音, 数学 算式 ↔ 得数
 *   拼一拼  tap tiles in order — 英语 build the sentence for a situation,
 *           语文 看拼音拼词语 (the word's characters plus look-alike decoys)
 */
import type { Book, Unit } from '@xuexi/curriculum';
import { createRng, displayPinyin, EN_G2A, EN_G4A, seedFrom, YW_G2A_WORDS, YW_G4A_WORDS, type DictWord, type EnglishBank, type Rng } from '@xuexi/practice';
import { coreSpecs, makeQuestion } from './learning';

export interface MatchGame {
  kind: 'match';
  title: string;
  /** [left, right]; the right column is shown shuffled. */
  pairs: Array<[string, string]>;
  /** Right column order (indices into pairs). */
  order: number[];
  /** 语文: the words asked (a miss goes to 看拼音写词语). */
  words?: string[];
}

export interface OrderGame {
  kind: 'order';
  title: string;
  prompt: string;
  /** The tiles in the right order. */
  answer: string[];
  /** All tiles as shown (answer + decoys, shuffled). */
  tiles: string[];
  /** '' for Chinese characters, ' ' for English words. */
  joiner: string;
  words?: string[];
}

export type Game = MatchGame | OrderGame;

export interface UnitGame {
  kpId: string;
  kpTitle: string;
  game: Game;
}

const EN: Record<string, EnglishBank> = { 'en-g2a': EN_G2A, 'en-g4a': EN_G4A };
const YW: Record<string, Record<string, DictWord[]>> = { 'yw-g2a': YW_G2A_WORDS, 'yw-g4a': YW_G4A_WORDS };

const PAIRS = 5;
const variantOf = (kpId: string) => kpId.split('.').slice(1).join('.');

/** Shuffle until the order differs from the original (when it can). */
function mixed<T>(rng: Rng, xs: T[], same: (a: T[]) => boolean): T[] {
  let out = rng.shuffle(xs);
  for (let i = 0; i < 6 && xs.length > 1 && same(out); i++) out = rng.shuffle(xs);
  return out;
}

function matchOf(rng: Rng, title: string, pairs: Array<[string, string]>, words?: string[]): MatchGame {
  const idx = pairs.map((_, i) => i);
  return { kind: 'match', title, pairs, order: mixed(rng, idx, (o) => o.every((x, i) => x === i)), ...(words ? { words } : {}) };
}

/** Pick `n` items whose keys are all different on both sides. */
function distinctPairs<T>(rng: Rng, items: T[], left: (t: T) => string, right: (t: T) => string, n: number): T[] {
  const out: T[] = [];
  const ls = new Set<string>();
  const rs = new Set<string>();
  for (const it of rng.shuffle(items)) {
    if (ls.has(left(it)) || rs.has(right(it))) continue;
    ls.add(left(it));
    rs.add(right(it));
    out.push(it);
    if (out.length === n) break;
  }
  return out;
}

function englishGames(book: Book, unit: Unit, rng: Rng): UnitGame[] {
  const bank = EN[book.id];
  if (!bank) return [];
  const kpOf = new Map(unit.knowledgePoints.map((k) => [variantOf(k.id), k]));
  const out: UnitGame[] = [];
  const words = bank.words.filter((w) => kpOf.has(w.kp));
  const picked = distinctPairs(rng, words, (w) => w.en, (w) => w.zh, PAIRS);
  if (picked.length >= 4) {
    const kp = kpOf.get(picked[0].kp)!;
    out.push({ kpId: kp.id, kpTitle: kp.title, game: matchOf(rng, '连连看：单词和意思配对', picked.map((w) => [w.en, w.zh])) });
  }
  // A situation from the unit's items, answered by building the sentence.
  const sentences = bank.items.filter(
    (it) => kpOf.has(it.kp) && !it.tier && /^[A-Z][A-Za-z' ,]*[.?!]$/.test(it.answer) && it.answer.split(' ').length >= 3 && it.answer.split(' ').length <= 9,
  );
  if (sentences.length) {
    const it = rng.pick(sentences);
    const answer = it.answer.split(' ');
    const decoys = [
      ...new Set(
        it.wrong
          .flatMap(([w]) => w.split(' '))
          .filter((t) => /^[A-Za-z'.,?!]+$/.test(t) && !answer.includes(t)),
      ),
    ].slice(0, 2);
    const kp = kpOf.get(it.kp)!;
    out.push({
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
    });
  }
  return out;
}

function chineseGames(book: Book, unit: Unit, rng: Rng): UnitGame[] {
  const lists = YW[book.id];
  if (!lists) return [];
  const all = unit.knowledgePoints.flatMap((k) => (lists[variantOf(k.id)] ?? []).map((w) => ({ ...w, kp: k })));
  const out: UnitGame[] = [];
  const picked = distinctPairs(rng, all, (w) => w.w, (w) => displayPinyin(w), PAIRS);
  if (picked.length >= 4) {
    out.push({
      kpId: picked[0].kp.id,
      kpTitle: picked[0].kp.title,
      game: matchOf(rng, '连连看：词语和拼音配对', picked.map((w) => [w.w, displayPinyin(w)]), picked.map((w) => w.w)),
    });
  }
  // 看拼音拼词语: longer words first (more to put in order).
  const long = all.filter((w) => w.w.length >= 3);
  const pool = long.length ? long : all.filter((w) => w.w.length === 2);
  if (pool.length) {
    const w = rng.pick(pool);
    const answer = [...w.w];
    const decoys = rng
      .shuffle([...new Set(all.flatMap((x) => [...x.w]))].filter((c) => !answer.includes(c)))
      .slice(0, answer.length >= 3 ? 3 : 2);
    out.push({
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
    });
  }
  return out;
}

/** 数学: short sums with number answers from the unit's own question types. */
function mathGames(unit: Unit, rng: Rng, seedBase: string): UnitGame[] {
  const found: Array<{ left: string; right: string; kp: Unit['knowledgePoints'][number] }> = [];
  for (const kp of unit.knowledgePoints) {
    for (const spec of coreSpecs(kp)) {
      for (let t = 0; t < 12; t++) {
        const q = makeQuestion({
          source: 'generator',
          generatorId: spec.generatorId,
          ...(spec.variant ? { variant: spec.variant } : {}),
          difficulty: spec.minDifficulty,
          seed: seedFrom(seedBase, kp.id, spec.generatorId, t),
        });
        const prompt = q.prompt.replace(/\s*=\s*[（(]\s*[)）]\s*$/, '').replace(/\s*=\s*\?$/, '').trim();
        if (q.answer.type !== 'number' || q.widget !== 'numeric' || prompt.length > 14 || /\n|（|\(/.test(prompt)) continue;
        if (!/[+\-×÷]/.test(prompt)) continue;
        found.push({ left: prompt, right: String(q.answer.value), kp });
      }
    }
  }
  const picked = distinctPairs(rng, found, (x) => x.left, (x) => x.right, PAIRS);
  if (picked.length < 4) return [];
  return [
    {
      kpId: picked[0].kp.id,
      kpTitle: picked[0].kp.title,
      game: matchOf(rng, '连连看：算式和得数配对', picked.map((x) => [x.left, x.right])),
    },
  ];
}

/** The game questions of one paper of a unit (0–2 of them). */
export function unitGames(book: Book, unit: Unit, paper: number): UnitGame[] {
  const seed = seedFrom('exam-game', unit.id, paper);
  const rng = createRng(seed);
  if (book.subject === 'english') return englishGames(book, unit, rng);
  if (book.subject === 'chinese') return chineseGames(book, unit, rng);
  return mathGames(unit, rng, `exam-game-${unit.id}-${paper}`);
}

// ---------------------------------------------------------------- grading

/** A 连连看 counts as right with at most one wrong match. */
export const MATCH_SLIPS = 1;

export function orderCorrect(g: OrderGame, picked: string[]): boolean {
  return picked.join(g.joiner) === g.answer.join(g.joiner);
}

export function gameAnswerText(g: Game): string {
  return g.kind === 'match' ? g.pairs.map(([a, b]) => `${a} — ${b}`).join('；') : g.answer.join(g.joiner);
}
