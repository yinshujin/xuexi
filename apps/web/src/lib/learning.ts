/**
 * Adapter between the app and @xuexi/practice / @xuexi/curriculum.
 * Pages only use the functions here, so engine API changes stay local.
 */
import { BOOKS, SUBJECT_LABEL, type KnowledgePoint, type PracticeSpec, type Subject } from '@xuexi/curriculum';
import { ERROR_TAGS } from '@xuexi/shared';
import type { AttemptEvent, ChildProfile, FamilySettings, LearningEvent, PracticeMode, QuestionRef } from '@xuexi/shared';
import * as practice from '@xuexi/practice';
import type { Question } from '@xuexi/practice';
import { dayKey } from './format';

export interface KpRef {
  bookId: string;
  bookTitle: string;
  subject: Subject;
  unitIndex: number;
  unitTitle: string;
  kp: KnowledgePoint;
}

export function childKps(child: ChildProfile): KpRef[] {
  return BOOKS.filter((b) => child.bookIds.includes(b.id)).flatMap((b) =>
    b.units.flatMap((u) =>
      u.knowledgePoints.map((kp) => ({
        bookId: b.id,
        bookTitle: b.title,
        subject: b.subject,
        unitIndex: u.index,
        unitTitle: u.title,
        kp,
      })),
    ),
  );
}

export function attemptsOf(events: LearningEvent[]): AttemptEvent[] {
  return events.filter((e): e is AttemptEvent => e.type === 'attempt');
}

export type KpStatus = 'new' | 'learning' | 'mastered';

export interface KpProgress {
  status: KpStatus;
  attempts: number;
  /** Accuracy over the recent window, 0..1 (NaN when no attempts). */
  accuracy: number;
  theta: number;
  reviewDue: boolean;
}

/** One question to ask in a session. */
export interface SessionItem {
  kpId: string;
  ref: Extract<QuestionRef, { source: 'generator' }>;
  mode: PracticeMode;
  /** Short label shown above the question, e.g. "错题重练". */
  label?: string;
}

/** Routine practice of a knowledge point (拔高 / 创新 specs excluded). */
export function coreSpecs(kp: KnowledgePoint): PracticeSpec[] {
  return kp.practice.filter((p) => !p.tier);
}

export type ChallengeTier = 'stretch' | 'creative';

export function tierSpecs(kp: KnowledgePoint, tier: ChallengeTier): PracticeSpec[] {
  return kp.practice.filter((p) => p.tier === tier);
}

/** 拔高 / 创新 questions: enrichment, kept out of mastery (a miss there must not block 掌握). */
export function isChallengeRef(ref: QuestionRef): boolean {
  return ref.source === 'generator' && (ref.generatorId.endsWith('.challenge') || (ref.variant ?? '').includes('#'));
}

function targetDifficulty(kp: KnowledgePoint): number {
  return Math.max(...coreSpecs(kp).map((p) => p.maxDifficulty), 1);
}

const kpIndex = () => new Map(BOOKS.flatMap((b) => b.units.flatMap((u) => u.knowledgePoints.map((kp) => [kp.id, kp] as const))));

/** Events handed to the engine must belong to a single child. */
function childOf(events: LearningEvent[]): string | undefined {
  return events[0]?.childId;
}

let masteryMemo: { attempts: AttemptEvent[]; settings: FamilySettings; value: ReturnType<typeof practice.computeMastery> } | null = null;

function masteryOf(all: AttemptEvent[], settings: FamilySettings) {
  const attempts = all.filter((a) => !isChallengeRef(a.question));
  const kps = kpIndex();
  return practice.computeMastery(attempts, {
    childId: childOf(attempts),
    masteryAccuracy: settings.masteryAccuracy,
    targetDifficulty: (kpId: string) => {
      const kp = kps.get(kpId);
      return kp ? targetDifficulty(kp) : 3;
    },
  });
}

export function progressMap(events: LearningEvent[], settings: FamilySettings, now = Date.now()): Map<string, KpProgress> {
  const attempts = attemptsOf(events).filter((a) => !isChallengeRef(a.question));
  const kps = kpIndex();
  const mastery = practice.computeMastery(attempts, {
    childId: childOf(attempts),
    masteryAccuracy: settings.masteryAccuracy,
    targetDifficulty: (kpId: string) => {
      const kp = kps.get(kpId);
      return kp ? targetDifficulty(kp) : 3;
    },
  });
  const schedule = practice.computeReviewSchedule(attempts, mastery, now, { childId: childOf(attempts) });
  const due = new Set(schedule.filter((r) => r.isDue).map((r) => r.kpId));
  const failedReview = new Set(schedule.filter((r) => r.status === 'learning').map((r) => r.kpId));
  const out = new Map<string, KpProgress>();
  for (const [kpId, m] of mastery) {
    out.set(kpId, {
      // A failed review sends a mastered point back to practice.
      status: m.status === 'mastered' && failedReview.has(kpId) ? 'learning' : m.status,
      attempts: m.attempts,
      accuracy: m.recentAccuracy,
      theta: m.theta,
      reviewDue: due.has(kpId),
    });
  }
  return out;
}

/** Mastery for the events, reused while the same event list is asked about again (question picking). */
function masteryFor(events: LearningEvent[], settings: FamilySettings) {
  const attempts = attemptsOf(events);
  const m = masteryMemo;
  if (m && m.settings === settings && m.attempts.length === attempts.length && m.attempts.at(-1) === attempts.at(-1)) return m.value;
  const value = masteryOf(attempts, settings);
  masteryMemo = { attempts, settings, value };
  return value;
}

export function difficultyFor(events: LearningEvent[], settings: FamilySettings, kpId: string, spec: PracticeSpec): number {
  const mastery = masteryFor(events, settings);
  return practice.recommendDifficulty(mastery.get(kpId), { min: spec.minDifficulty, max: spec.maxDifficulty });
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

export function makeQuestion(ref: SessionItem['ref']): Question {
  return practice.generateQuestion(ref.generatorId, { difficulty: ref.difficulty, seed: ref.seed, variant: ref.variant });
}

export const gradeQuestion = practice.gradeQuestion;

/** Adaptive next item for a knowledge point (rotates through its practice specs). */
export function nextKpItem(
  events: LearningEvent[],
  settings: FamilySettings,
  kp: KnowledgePoint,
  index: number,
  mode: PracticeMode,
  specFilter?: (s: PracticeSpec) => boolean,
): SessionItem | null {
  const specs = coreSpecs(kp).filter(specFilter ?? (() => true));
  if (specs.length === 0) return null;
  return itemFor(events, settings, kp, specs[index % specs.length], mode);
}

function itemFor(
  events: LearningEvent[],
  settings: FamilySettings,
  kp: KnowledgePoint,
  spec: PracticeSpec,
  mode: PracticeMode,
  difficulty = difficultyFor(events, settings, kp.id, spec),
): SessionItem {
  return {
    kpId: kp.id,
    mode,
    ref: {
      source: 'generator',
      generatorId: spec.generatorId,
      variant: spec.variant,
      difficulty,
      seed: randomSeed(),
    },
  };
}

/**
 * Picks questions for one practice session without repeating a question the
 * child already got in this session, and preferring ones not seen in their
 * recent practice of that knowledge point. Item-bank KPs (语文 / 英语) have a
 * limited number of questions, so repeats are only allowed once they run out.
 */
export class ItemPicker {
  private seen = new Set<string>();
  private recent = new Map<string, Set<string>>();

  constructor(private readonly events: LearningEvent[]) {}

  private recentFor(kpId: string): Set<string> {
    let r = this.recent.get(kpId);
    if (!r) {
      r = new Set();
      const mine = attemptsOf(this.events).filter((a) => a.kpId === kpId && a.question.source === 'generator');
      for (const a of mine.slice(-RECENT_WINDOW)) {
        try {
          r.add(makeQuestion(a.question as SessionItem['ref']).prompt);
        } catch {
          /* generator changed since: ignore */
        }
      }
      this.recent.set(kpId, r);
    }
    return r;
  }

  /** Remember a question chosen elsewhere (e.g. a mistake redo) so it is not asked again. */
  mark(item: SessionItem): void {
    try {
      this.seen.add(makeQuestion(item.ref).prompt);
    } catch {
      /* ignore */
    }
  }

  next(
    events: LearningEvent[],
    settings: FamilySettings,
    kp: KnowledgePoint,
    index: number,
    mode: PracticeMode,
    specFilter?: (s: PracticeSpec) => boolean,
  ): SessionItem | null {
    const specs = coreSpecs(kp).filter(specFilter ?? (() => true));
    if (specs.length === 0) return null;
    return this.pick(kp.id, (t) => {
      // Rotate through the KP's question types; when the fitting level has
      // run out of fresh questions, look one level up, then one down.
      const spec = specs[(index + Math.floor(t / 4)) % specs.length];
      const base = difficultyFor(events, settings, kp.id, spec);
      const shift = t < PICK_TRIES / 3 ? 0 : t < (2 * PICK_TRIES) / 3 ? 1 : -1;
      const d = Math.min(spec.maxDifficulty, Math.max(spec.minDifficulty, base + shift));
      return itemFor(events, settings, kp, spec, mode, d);
    });
  }

  /** A 拔高 / 创新 question for the knowledge point, or null when it has none. */
  challenge(events: LearningEvent[], settings: FamilySettings, kp: KnowledgePoint, tier: ChallengeTier, mode: PracticeMode): SessionItem | null {
    const specs = tierSpecs(kp, tier);
    if (specs.length === 0) return null;
    const item = this.pick(kp.id, (t) => itemFor(events, settings, kp, specs[t % specs.length], mode));
    return item && { ...item, label: tier === 'stretch' ? CHALLENGE_LABEL.stretch : CHALLENGE_LABEL.creative };
  }

  private pick(kpId: string, make: (t: number) => SessionItem | null): SessionItem | null {
    const recent = this.recentFor(kpId);
    let unseenToday: { item: SessionItem; prompt: string } | null = null;
    let any: { item: SessionItem; prompt: string } | null = null;
    for (let t = 0; t < PICK_TRIES; t++) {
      const item = make(t);
      if (!item) return null;
      const prompt = makeQuestion(item.ref).prompt;
      any ??= { item, prompt };
      if (this.seen.has(prompt)) continue;
      if (!recent.has(prompt)) {
        this.seen.add(prompt);
        return item;
      }
      unseenToday ??= { item, prompt };
    }
    const pick = unseenToday ?? any!;
    this.seen.add(pick.prompt);
    return pick.item;
  }
}

const RECENT_WINDOW = 40;
const PICK_TRIES = 24;

export const CHALLENGE_LABEL = { stretch: '⭐ 拔高题 · 挑战一下！', creative: '💡 创新题 · 换个角度想一想' } as const;

/**
 * The shape of a practice set of `size` questions: routine first, then about a
 * quarter 拔高 and 创新 (when the knowledge point has them), so the child uses
 * what was just practised in a harder or new way.
 */
export function setShape(kp: KnowledgePoint, size: number): Array<'core' | ChallengeTier> {
  const hasS = tierSpecs(kp, 'stretch').length > 0;
  const hasC = tierSpecs(kp, 'creative').length > 0;
  const extra = hasS || hasC ? Math.max(2, Math.round(size * 0.25)) : 0;
  const creative = hasC ? (hasS ? Math.floor(extra / 2) : extra) : 0;
  const stretch = extra - creative;
  return [
    ...Array<'core'>(size - extra).fill('core'),
    ...Array<ChallengeTier>(stretch).fill('stretch'),
    ...Array<ChallengeTier>(creative).fill('creative'),
  ];
}

/**
 * 加练 after 今日任务: a set of `size` questions spread over the knowledge
 * points that need it most — the weakest ones being learned, the current one
 * of each subject, and one mastered point to keep it fresh.
 */
export function extraItems(
  child: ChildProfile,
  events: LearningEvent[],
  settings: FamilySettings,
  size: number,
  picker: ItemPicker,
  rng: () => number = Math.random,
): SessionItem[] {
  const kps = childKps(child).filter((k) => k.kp.practice.length > 0);
  if (kps.length === 0) return [];
  const progress = progressMap(events, settings);
  const status = (k: KpRef) => progress.get(k.kp.id)?.status ?? 'new';
  const chosen: KpRef[] = [];
  const add = (k: KpRef | undefined) => k && !chosen.some((c) => c.kp.id === k.kp.id) && chosen.push(k);

  // Weakest points being learned (enough attempts to judge).
  kps
    .filter((k) => status(k) === 'learning' && (progress.get(k.kp.id)?.attempts ?? 0) >= 3)
    .sort((a, b) => (progress.get(a.kp.id)?.accuracy ?? 1) - (progress.get(b.kp.id)?.accuracy ?? 1))
    .slice(0, 2)
    .forEach(add);
  // The current point of every subject: the one being learned, else the next new one.
  for (const subject of [...new Set(kps.map((k) => k.subject))]) {
    const own = kps.filter((k) => k.subject === subject);
    add(own.find((k) => status(k) === 'learning') ?? own.find((k) => status(k) === 'new'));
  }
  // One mastered point, so it does not fade.
  const mastered = kps.filter((k) => status(k) === 'mastered' && !chosen.includes(k));
  if (mastered.length) add(mastered[Math.floor(rng() * mastered.length)]);
  if (chosen.length === 0) add(kps[0]);

  const groups = chosen.slice(0, Math.max(1, Math.min(chosen.length, Math.ceil(size / 3))));
  const items: SessionItem[] = [];
  groups.forEach((k, gi) => {
    const n = Math.floor(size / groups.length) + (gi < size % groups.length ? 1 : 0);
    // Each group ends with one 拔高 or 创新 question (alternating between groups).
    const shape = n >= 3 ? [...Array<'core'>(n - 1).fill('core'), gi % 2 === 0 ? 'stretch' : 'creative'] : Array<'core'>(n).fill('core');
    shape.forEach((slot, i) => {
      const head = `加练 · ${SUBJECT_LABEL[k.subject]} · ${k.kp.title}`;
      const ch = slot !== 'core' ? picker.challenge(events, settings, k.kp, slot as ChallengeTier, 'kp') : null;
      const it = ch ?? picker.next(events, settings, k.kp, i, 'kp');
      if (it) items.push({ ...it, label: ch ? `${head} · ${ch.label}` : head });
    });
  });
  return items;
}

export interface MistakeView {
  key: string;
  kpId: string;
  ref: SessionItem['ref'];
  errorTags: string[];
  at: number;
}

export function openMistakes(events: LearningEvent[]): MistakeView[] {
  const attempts = attemptsOf(events);
  return practice
    .computeMistakeBook(attempts, { childId: childOf(attempts) })
    .filter((m) => !m.cleared && m.question.source === 'generator')
    .map((m) => ({
      key: m.key,
      kpId: m.kpId,
      ref: m.question as SessionItem['ref'],
      errorTags: m.errorTags,
      at: m.firstWrongAt,
    }));
}

/** A fresh question of the same kind, aimed at the diagnosed error when possible. */
function variantRef(ref: SessionItem['ref'], tag: string | undefined): SessionItem['ref'] {
  const opts = { difficulty: ref.difficulty, seed: randomSeed(), variant: ref.variant?.split('@')[0] };
  const gen = practice.getGenerator(ref.generatorId);
  const targeted = tag && tag !== 'careless' ? gen.targetFor?.(tag as never, opts) : null;
  const q = targeted ?? practice.generateQuestion(ref.generatorId, opts);
  return practice.refOfQuestion(q) as SessionItem['ref'];
}

/** Mistake redo: original question, then a variant targeting the diagnosed error. */
export function mistakeItems(events: LearningEvent[], limit = 6): SessionItem[] {
  const items: SessionItem[] = [];
  for (const m of openMistakes(events).slice(0, limit)) {
    items.push({ kpId: m.kpId, ref: m.ref, mode: 'mistakes', label: '错题重做' });
    items.push({ kpId: m.kpId, ref: variantRef(m.ref, m.errorTags[0]), mode: 'mistakes', label: '同类题' });
  }
  return items;
}

/** Today's plan, flattened into session items. */
export function dailyItems(child: ChildProfile, events: LearningEvent[], settings: FamilySettings, now = Date.now()): SessionItem[] {
  const kps = childKps(child);
  const attempts = attemptsOf(events);
  const childId = childOf(attempts);
  const mastery = masteryOf(attempts, settings);
  const reviewDue = practice.computeReviewSchedule(attempts, mastery, now, { childId });
  const mistakes = practice.computeMistakeBook(attempts, { childId });
  const plan = practice.buildDailyPlan({
    kps: kps.map((r) => ({ id: r.kp.id, practice: coreSpecs(r.kp), prerequisites: r.kp.prerequisites })),
    masteryMap: mastery,
    reviewDue,
    mistakes,
    minutes: Math.min(20, settings.dailyMinutes),
    now,
    seedBase: Number(dayKey(now).replace(/-/g, '')) + child.id.length,
  });
  const items: SessionItem[] = plan.blocks.flatMap((b) =>
    b.questions
      .filter((q) => q.ref.source === 'generator')
      .map((q) => ({ kpId: q.kpId, ref: q.ref as SessionItem['ref'], mode: q.mode, label: b.title })),
  );
  // Finish with one 拔高 and one 创新 question on today's knowledge point.
  const current = kps.find((k) => k.kp.id === plan.currentKpId)?.kp;
  if (current) {
    const picker = new ItemPicker(events);
    for (const it of items) picker.mark(it);
    for (const tier of ['stretch', 'creative'] as const) {
      const ch = picker.challenge(events, settings, current, tier, 'kp');
      if (ch) items.push(ch);
    }
  }
  return items;
}

export function tagLabel(tag: string): string {
  return (ERROR_TAGS as Record<string, string>)[tag] ?? tag;
}
