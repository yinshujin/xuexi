/**
 * 单元测试: two or three fixed papers for every unit, each covering all the
 * unit's knowledge points (every one at least twice, its question types in
 * turn, mid to top difficulty), then game questions (连连看, 拼一拼, 听音,
 * 开口读 … see games/), ending with one 拔高 and one 创新 question.
 * Papers are built from fixed seeds, so paper A is the same paper on every
 * device and every time; questions do not repeat within or across a unit's
 * papers while the banks have fresh ones.
 */
import { BOOKS, type Book, type KnowledgePoint, type PracticeSpec, type Subject, type Unit } from '@xuexi/curriculum';
import { EXAM_EVENT_PREFIX, type LearningEvent, type LessonEvent } from '@xuexi/shared';
import type { Question, Response } from '@xuexi/practice';
import { seedFrom } from '@xuexi/practice';
import { coreSpecs, makeQuestion, tierSpecs, type ChallengeTier, type SessionItem } from './learning';
import { GAME_SLOTS, gamesFor, type Game } from './games';

/** A question of a paper: a practice question (`ref`) or a game question (`game`). */
export interface ExamItem {
  kpId: string;
  kpTitle: string;
  ref?: SessionItem['ref'];
  game?: Game;
  tier?: ChallengeTier;
}

export interface ExamPaper {
  /** e.g. "bsd-g2a.u1.A" */
  id: string;
  bookId: string;
  bookTitle: string;
  subject: Subject;
  unitId: string;
  unitIndex: number;
  unitTitle: string;
  /** 0 = A, 1 = B, 2 = C */
  paper: number;
  name: string;
  items: ExamItem[];
  /** The knowledge points the paper covers. */
  kps: Array<{ id: string; title: string }>;
}

/** Questions per paper (more when a unit has many knowledge points: each gets at least two). */
export const PAPER_SIZE = 20;
const MIN_PER_KP = 2;
const PAPER_NAMES = ['A 卷', 'B 卷', 'C 卷'];
/** A third paper is only made when at most this share of it would repeat papers A and B. */
const MAX_REPEAT_SHARE = 0.2;
const TRIES = 120;

/** Difficulty across a knowledge point's questions: mid, top, upper-mid, … */
const LEVELS = [0.5, 1, 0.75];

const clamp = (d: number, s: PracticeSpec) => Math.min(s.maxDifficulty, Math.max(s.minDifficulty, d));

function levelFor(spec: PracticeSpec, slot: number): number {
  return clamp(Math.round(spec.minDifficulty + (spec.maxDifficulty - spec.minDifficulty) * LEVELS[slot % LEVELS.length]), spec);
}

const examKps = (unit: Unit) => unit.knowledgePoints.filter((kp) => coreSpecs(kp).length > 0);

interface Candidate {
  item: ExamItem;
  identity: string;
  /** Not in any paper of the unit yet. */
  fresh: boolean;
  /** Not in this paper yet. */
  freshHere: boolean;
}

/**
 * A question for (kp, spec): fixed seeds, then a level lower / higher when the
 * bank runs dry at that level. Prefers one not used in the unit's papers yet,
 * then one not in this paper.
 */
function candidate(
  used: Set<string>,
  inPaper: Set<string>,
  paperId: string,
  kp: KnowledgePoint,
  spec: PracticeSpec,
  slot: string,
  difficulty: number,
  tier?: ChallengeTier,
): Candidate {
  let first: Candidate | null = null;
  let here: Candidate | null = null;
  for (let t = 0; t < TRIES; t++) {
    const shift = t < TRIES / 2 ? 0 : t < (3 * TRIES) / 4 ? -1 : 1;
    const ref: SessionItem['ref'] = {
      source: 'generator',
      generatorId: spec.generatorId,
      ...(spec.variant ? { variant: spec.variant } : {}),
      difficulty: clamp(difficulty + shift, spec),
      seed: seedFrom('exam', paperId, kp.id, slot, t),
    };
    const identity = promptOf(ref);
    const c: Candidate = {
      item: { kpId: kp.id, kpTitle: kp.title, ref, ...(tier ? { tier } : {}) },
      identity,
      fresh: !used.has(identity),
      freshHere: !inPaper.has(identity),
    };
    if (c.fresh) return c;
    first ??= c;
    if (c.freshHere) here ??= c;
  }
  return here ?? first!;
}

/** Try the specs in turn until one gives a fresh question; take it into the paper. */
function take(
  used: Set<string>,
  inPaper: Set<string>,
  specs: PracticeSpec[],
  make: (spec: PracticeSpec) => Candidate,
): { item: ExamItem; repeat: boolean } {
  let best: Candidate | null = null;
  for (const spec of specs) {
    const c = make(spec);
    if (!best || (c.fresh && !best.fresh) || (c.freshHere && !best.freshHere)) best = c;
    if (c.fresh) break;
  }
  used.add(best!.identity);
  inPaper.add(best!.identity);
  return { item: best!.item, repeat: !best!.fresh };
}

/**
 * What makes two questions the same to a child: the wording and the figure
 * (量角 questions share their wording but not their angle). Choice questions
 * with other options are still the same question.
 */
export function questionIdentity(q: Question): string {
  return `${q.prompt}|${JSON.stringify(q.angle ?? q.ruler ?? q.vertical ?? null)}`;
}

const promptCache = new Map<string, string>();
function promptOf(ref: SessionItem['ref']): string {
  const k = `${ref.generatorId}|${ref.variant ?? ''}|${ref.difficulty}|${ref.seed}`;
  let p = promptCache.get(k);
  if (p === undefined) {
    p = questionIdentity(makeQuestion(ref));
    promptCache.set(k, p);
  }
  return p;
}

function buildPaper(book: Book, unit: Unit, paper: number, used: Set<string>): { exam: ExamPaper; repeats: number } {
  const kps = examKps(unit);
  const id = `${unit.id}.${'ABC'[paper]}`;
  const challengeKps = (tier: ChallengeTier) => kps.filter((kp) => tierSpecs(kp, tier).length > 0);
  const tiers = (['stretch', 'creative'] as const).filter((t) => challengeKps(t).length > 0);
  const games = gamesFor(book, unit, paper);
  const coreTotal = Math.max(PAPER_SIZE - tiers.length - Math.min(games.length, GAME_SLOTS), kps.length * MIN_PER_KP);
  const items: ExamItem[] = [];
  const inPaper = new Set<string>();
  let repeats = 0;
  kps.forEach((kp, i) => {
    const specs = coreSpecs(kp);
    // The extra questions go to different knowledge points on each paper.
    const extra = (i - paper + kps.length * 3) % kps.length < coreTotal % kps.length ? 1 : 0;
    const count = Math.floor(coreTotal / kps.length) + extra;
    for (let j = 0; j < count; j++) {
      // Question types in turn; another type when this one has run out.
      const order = specs.map((_, k) => specs[(j + paper + k) % specs.length]);
      const got = take(used, inPaper, order, (spec) => candidate(used, inPaper, id, kp, spec, `c${j}`, levelFor(spec, j + paper)));
      items.push(got.item);
      if (got.repeat) repeats++;
    }
  });
  for (const g of games) items.push({ kpId: g.kpId, kpTitle: g.kpTitle, game: g.game });
  // One 拔高 and one 创新 at the end, from different knowledge points on each paper.
  for (const tier of tiers) {
    const pool = challengeKps(tier);
    const kp = pool[(paper + (tier === 'creative' ? 1 : 0)) % pool.length];
    const specs = tierSpecs(kp, tier);
    const order = specs.map((_, k) => specs[(paper + k) % specs.length]);
    const got = take(used, inPaper, order, (spec) => candidate(used, inPaper, id, kp, spec, tier, spec.maxDifficulty, tier));
    items.push(got.item);
    if (got.repeat) repeats++;
  }
  return {
    exam: {
      id,
      bookId: book.id,
      bookTitle: book.title,
      subject: book.subject,
      unitId: unit.id,
      unitIndex: unit.index,
      unitTitle: unit.title,
      paper,
      name: PAPER_NAMES[paper],
      items,
      kps: kps.map((kp) => ({ id: kp.id, title: kp.title })),
    },
    repeats,
  };
}

const papersMemo = new Map<string, ExamPaper[]>();

/** The unit's papers (A, B and, when the question banks allow, C). */
export function unitPapers(unitId: string): ExamPaper[] {
  const hit = papersMemo.get(unitId);
  if (hit) return hit;
  const book = BOOKS.find((b) => b.units.some((u) => u.id === unitId));
  const unit = book?.units.find((u) => u.id === unitId);
  if (!book || !unit || examKps(unit).length === 0) return [];
  const used = new Set<string>();
  const out: ExamPaper[] = [];
  for (let p = 0; p < PAPER_NAMES.length; p++) {
    const { exam, repeats } = buildPaper(book, unit, p, used);
    if (p >= 2 && repeats > exam.items.length * MAX_REPEAT_SHARE) break;
    out.push(exam);
  }
  papersMemo.set(unitId, out);
  return out;
}

export function findPaper(id: string): ExamPaper | undefined {
  return unitPapers(id.replace(/\.[A-C]$/, '')).find((p) => p.id === id);
}

// ---------------------------------------------------------------- results

export interface ExamAnswer {
  correct: boolean;
  response: Response | null;
  /** Points earned out of the item's weight (default: all when correct). */
  earned?: number;
}

/** Points a question is worth: 1, or a game's weight (a reading passage with 4 questions: 4). */
export const itemWeight = (it: ExamItem) => it.game?.weight ?? 1;

export interface ExamResult {
  score: number;
  correct: number;
  total: number;
  byKp: Array<{ kpId: string; title: string; correct: number; total: number }>;
}

/**
 * 100 points shared by the questions by weight (a game such as a reading
 * passage can be worth several); unanswered questions score nothing.
 * `correct` / `total` and the per-knowledge-point rows count points.
 */
export function scoreExam(paper: ExamPaper, answers: Array<ExamAnswer | undefined>): ExamResult {
  const byKp = new Map<string, { kpId: string; title: string; correct: number; total: number }>();
  for (const k of paper.kps) byKp.set(k.id, { kpId: k.id, title: k.title, correct: 0, total: 0 });
  let correct = 0;
  let total = 0;
  paper.items.forEach((it, i) => {
    const w = itemWeight(it);
    const a = answers[i];
    const got = a ? Math.max(0, Math.min(w, a.earned ?? (a.correct ? w : 0))) : 0;
    const row = byKp.get(it.kpId)!;
    row.total += w;
    row.correct += got;
    total += w;
    correct += got;
  });
  return { score: total ? Math.round((100 * correct) / total) : 0, correct, total, byKp: [...byKp.values()] };
}

/** What the child answered, as text (for going over the paper). */
export function responseText(q: Question, r: Response | null): string {
  if (!r) return '没有作答';
  switch (r.type) {
    case 'number':
    case 'vertical':
      return r.value === null ? '没有作答' : String(r.value);
    case 'choice':
      return r.index === null ? '没有作答' : (q.options?.[r.index] ?? '');
    case 'compare':
      return r.value ?? '没有作答';
    case 'division':
      return r.quotient === null ? '没有作答' : r.remainder ? `${r.quotient} …… ${r.remainder}` : String(r.quotient);
  }
}

// ---------------------------------------------------------------- history

export interface PaperHistory {
  best: number;
  last: number;
  times: number;
  lastAt: number;
}

/** Finished papers of a child: best / last score and how often, by paper id. */
export function examHistory(events: LearningEvent[]): Map<string, PaperHistory> {
  const out = new Map<string, PaperHistory>();
  const done = events
    .filter((e): e is LessonEvent => e.type === 'lesson' && e.completed && e.lessonId.startsWith(EXAM_EVENT_PREFIX) && e.examScore !== undefined)
    .sort((a, b) => a.at - b.at);
  for (const e of done) {
    const id = e.lessonId.slice(EXAM_EVENT_PREFIX.length);
    const h = out.get(id);
    out.set(id, {
      best: Math.max(h?.best ?? 0, e.examScore!),
      last: e.examScore!,
      times: (h?.times ?? 0) + 1,
      lastAt: e.at,
    });
  }
  return out;
}

/** Units of the child's books that have papers, in book / unit order. */
export function examUnits(bookIds: string[]): Array<{ book: Book; unit: Unit }> {
  return BOOKS.filter((b) => bookIds.includes(b.id)).flatMap((book) =>
    book.units.filter((u) => examKps(u).length > 0).map((unit) => ({ book, unit })),
  );
}

// ---------------------------------------------------------------- 闯关 rewards

/** XP for an answer: 10 for a right one, +5 while on a streak of 3 or more. */
export function answerXp(correct: boolean, comboAfter: number): number {
  return correct ? 10 + (comboAfter >= 3 ? 5 : 0) : 0;
}

/** Bonus for finishing a paper: a full score, or 90 and up. */
export function finishXp(score: number): number {
  return score === 100 ? 50 : score >= 90 ? 20 : 0;
}

/** Combos worth a cheer. */
export const COMBO_CHEERS: Record<number, string> = { 3: '连对 3 题！🔥', 5: '连对 5 题！太棒了！🔥🔥', 10: '连对 10 题！势不可挡！🔥🔥🔥' };

export type Medal = 'gold' | 'silver' | 'bronze' | null;
export function medalOf(score: number | undefined): Medal {
  if (score === undefined) return null;
  return score >= 90 ? 'gold' : score >= 75 ? 'silver' : score >= 60 ? 'bronze' : null;
}
export const MEDAL_ICON: Record<Exclude<Medal, null>, string> = { gold: '🥇', silver: '🥈', bronze: '🥉' };

/** All XP a child earned in 单元闯关. */
export function totalXp(events: LearningEvent[]): number {
  return events.reduce((t, e) => t + (e.type === 'lesson' && e.lessonId.startsWith(EXAM_EVENT_PREFIX) ? (e.xp ?? 0) : 0), 0);
}
