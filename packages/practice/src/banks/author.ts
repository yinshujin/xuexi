import type { ErrorTag } from '@xuexi/shared';
import type { BankLevel, ChoiceItem } from './types';

export type WrongOptions = Array<[text: string, tag: ErrorTag]>;

/** A routine item: level, 题型, prompt, right answer, 2–3 tagged wrong options, explanation. */
export type AddItem = (
  level: BankLevel,
  kind: string,
  prompt: string,
  answer: string,
  wrong: WrongOptions,
  explain: string,
) => void;

/** A 拔高 / 创新 item (no level: tiered items are picked by knowledge point only). */
export type AddTiered = (kind: string, prompt: string, answer: string, wrong: WrongOptions, explain: string) => void;

/**
 * Positional authoring helper for one knowledge point's items (see ChoiceItem):
 * `q` adds routine items, `s` 拔高 (stretch) items, `c` 创新 (creative) items.
 */
export function kpItems(kp: string, author: (q: AddItem, s: AddTiered, c: AddTiered) => void): ChoiceItem[] {
  const out: ChoiceItem[] = [];
  const q: AddItem = (level, kind, prompt, answer, wrong, explain) => {
    out.push({ kp, level, kind, prompt, answer, wrong, explain });
  };
  const tiered =
    (tier: 'stretch' | 'creative'): AddTiered =>
    (kind, prompt, answer, wrong, explain) => {
      out.push({ kp, level: 3, kind, prompt, answer, wrong, explain, tier });
    };
  author(q, tiered('stretch'), tiered('creative'));
  return out;
}
