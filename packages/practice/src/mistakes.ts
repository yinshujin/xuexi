import type { AttemptEvent, ErrorTag, LearningEvent, QuestionRef } from '@xuexi/shared';
import { attemptsOf } from './mastery';
import { questionRefKey, shanghaiDay } from './refs';

/**
 * Mistake book (错题本), derived from the attempt log.
 *
 * - Any wrong attempt creates (or re-opens) an entry keyed by kpId + question
 *   reference (generator refs include the variant).
 * - It is cleared when, after the latest wrong attempt on the original:
 *     1. the original question is answered correctly, AND
 *     2. there are correct 'mistakes'-mode attempts on variant questions of
 *        the same generator (same bank for bank questions) and KP on at least
 *        2 distinct Asia/Shanghai calendar days.
 *   A variant built for a specific error tag (variant "base@tag") only counts
 *   when that tag is one of the entry's error tags (or the entry has none).
 * - A new wrong attempt on the original resets the progress; a wrong attempt
 *   after clearing re-opens the entry.
 */

export const VARIANT_DAYS_TO_CLEAR = 2;

export interface MistakeEntry {
  /** `${kpId}|${questionRefKey}` */
  key: string;
  childId: string;
  kpId: string;
  question: QuestionRef;
  firstWrongAt: number;
  lastWrongAt: number;
  wrongCount: number;
  /** Union of diagnosed error tags over all wrong attempts on this question. */
  errorTags: ErrorTag[];
  /** The latest wrong response, as recorded. */
  lastResponse: unknown;
  /** Original answered correctly since the last wrong attempt. */
  originalRedone: boolean;
  /** Distinct Shanghai days with a correct variant redo since the last wrong attempt. */
  variantDays: string[];
  cleared: boolean;
  clearedAt?: number;
}

export interface MistakeOptions {
  childId?: string;
}

/** Group key of "same kind of question": generator id, or bank id. */
function familyOf(ref: QuestionRef): string {
  return ref.source === 'generator' ? `gen:${ref.generatorId}` : `bank:${ref.bankId}`;
}

function targetTagOf(ref: QuestionRef): string | undefined {
  if (ref.source !== 'generator' || !ref.variant) return undefined;
  const at = ref.variant.indexOf('@');
  return at >= 0 ? ref.variant.slice(at + 1) : undefined;
}

export function mistakeKey(kpId: string, ref: QuestionRef): string {
  return `${kpId}|${questionRefKey(ref)}`;
}

/** All entries (open and cleared), oldest first. Use `openMistakes` for the open ones. */
export function computeMistakeBook(
  events: readonly LearningEvent[],
  opts: MistakeOptions = {},
): MistakeEntry[] {
  const entries = new Map<string, MistakeEntry>();
  const order: string[] = [];

  const tryClear = (m: MistakeEntry, at: number) => {
    if (!m.cleared && m.originalRedone && m.variantDays.length >= VARIANT_DAYS_TO_CLEAR) {
      m.cleared = true;
      m.clearedAt = at;
    }
  };

  const creditVariant = (e: AttemptEvent) => {
    const fam = familyOf(e.question);
    const refKey = questionRefKey(e.question);
    const tag = targetTagOf(e.question);
    const day = shanghaiDay(e.at);
    for (const m of entries.values()) {
      if (m.cleared || m.childId !== e.childId || m.kpId !== e.kpId || familyOf(m.question) !== fam)
        continue;
      if (questionRefKey(m.question) === refKey || e.at <= m.lastWrongAt) continue;
      if (tag !== undefined && m.errorTags.length > 0 && !m.errorTags.includes(tag as ErrorTag))
        continue;
      if (!m.variantDays.includes(day)) m.variantDays.push(day);
      tryClear(m, e.at);
    }
  };

  for (const e of attemptsOf(events, opts.childId)) {
    const key = mistakeKey(e.kpId, e.question);
    const m = entries.get(key);
    if (!e.correct) {
      if (!m) {
        entries.set(key, {
          key,
          childId: e.childId,
          kpId: e.kpId,
          question: e.question,
          firstWrongAt: e.at,
          lastWrongAt: e.at,
          wrongCount: 1,
          errorTags: [...new Set(e.errorTags)],
          lastResponse: e.response,
          originalRedone: false,
          variantDays: [],
          cleared: false,
        });
        order.push(key);
      } else {
        m.lastWrongAt = e.at;
        m.wrongCount++;
        m.errorTags = [...new Set([...m.errorTags, ...e.errorTags])];
        m.lastResponse = e.response;
        m.originalRedone = false;
        m.variantDays = [];
        m.cleared = false;
        delete m.clearedAt;
      }
      continue;
    }
    // Correct attempt: the original itself, or a variant redo.
    if (m && !m.cleared && e.at > m.lastWrongAt) {
      m.originalRedone = true;
      tryClear(m, e.at);
    }
    if (e.mode === 'mistakes') creditVariant(e);
  }
  return order.map((k) => entries.get(k)!);
}

export function openMistakes(book: readonly MistakeEntry[]): MistakeEntry[] {
  return book.filter((m) => !m.cleared);
}
