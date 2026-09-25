import { describe, expect, it } from 'vitest';
import { findKnowledgePoint } from '@xuexi/curriculum';
import { DEFAULT_SETTINGS, type AttemptEvent, type ChildProfile } from '@xuexi/shared';
import { extraItems, isChallengeRef, ItemPicker, makeQuestion, progressMap, setShape } from '../src/lib/learning';

const kp = (id: string) => findKnowledgePoint(id)!.kp;
const child: ChildProfile = { id: 'c1', name: '小明', grade: 2, avatar: '🐼', bookIds: ['bsd-g2a', 'yw-g2a', 'en-g2a'] };

describe('practice sets', () => {
  it('ends a set with 拔高 and 创新 questions', () => {
    const shape = setShape(kp('yw-g2a.u1.tadpole'), 15);
    expect(shape).toHaveLength(15);
    expect(shape.slice(0, 11).every((x) => x === 'core')).toBe(true);
    expect(shape.slice(11)).toEqual(['stretch', 'stretch', 'creative', 'creative']);
  });

  it('never repeats a question within a set while the bank has fresh ones', () => {
    const k = kp('yw-g2a.u1.tadpole');
    const picker = new ItemPicker([]);
    const prompts = Array.from({ length: 20 }, (_, i) => makeQuestion(picker.next([], DEFAULT_SETTINGS, k, i, 'kp')!.ref).prompt);
    expect(new Set(prompts).size).toBe(20);
  });

  it('avoids the questions practised recently', () => {
    const k = kp('en-g2a.u1.talk');
    const first = new ItemPicker([]);
    const earlier = Array.from({ length: 10 }, (_, i) => first.next([], DEFAULT_SETTINGS, k, i, 'kp')!);
    const events: AttemptEvent[] = earlier.map((it, i) => ({
      type: 'attempt',
      id: `e${i}`,
      childId: 'c1',
      at: i,
      deviceId: 'd',
      kpId: k.id,
      question: it.ref,
      correct: true,
      response: null,
      errorTags: [],
      durationMs: 1000,
      mode: 'kp',
    }));
    const seen = new Set(earlier.map((it) => makeQuestion(it.ref).prompt));
    const next = new ItemPicker(events);
    const again = Array.from({ length: 10 }, (_, i) => makeQuestion(next.next(events, DEFAULT_SETTINGS, k, i, 'kp')!.ref).prompt);
    expect(again.filter((p) => seen.has(p))).toEqual([]);
  });

  it('加练: a full set across subjects, each group ending with 拔高 or 创新', () => {
    const items = extraItems(child, [], DEFAULT_SETTINGS, 15, new ItemPicker([]), () => 0);
    expect(items).toHaveLength(15);
    const subjects = new Set(items.map((it) => it.label?.split(' · ')[1]));
    expect(subjects).toEqual(new Set(['数学', '语文', '英语']));
    expect(items.filter((it) => isChallengeRef(it.ref)).length).toBeGreaterThanOrEqual(3);
    expect(new Set(items.map((it) => makeQuestion(it.ref).prompt)).size).toBe(15);
  });

  it('a missed 拔高 question does not count against mastery', () => {
    const k = kp('yw-g2a.u1.tadpole');
    const picker = new ItemPicker([]);
    const mk = (i: number, ref: AttemptEvent['question'], correct: boolean): AttemptEvent => ({
      type: 'attempt', id: `a${i}`, childId: 'c1', at: i, deviceId: 'd', kpId: k.id, question: ref, correct,
      response: null, errorTags: [], durationMs: 1000, mode: 'kp',
    });
    const core = Array.from({ length: 10 }, (_, i) => mk(i, picker.next([], DEFAULT_SETTINGS, k, i, 'kp')!.ref, true));
    const hard = Array.from({ length: 5 }, (_, i) => mk(20 + i, picker.challenge([], DEFAULT_SETTINGS, k, 'stretch', 'kp')!.ref, false));
    const a = progressMap(core, DEFAULT_SETTINGS).get(k.id)!;
    const b = progressMap([...core, ...hard], DEFAULT_SETTINGS).get(k.id)!;
    expect(b.accuracy).toBe(a.accuracy);
    expect(b.attempts).toBe(a.attempts);
  });
});
