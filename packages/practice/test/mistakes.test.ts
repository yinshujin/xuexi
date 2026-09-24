import { describe, expect, it } from 'vitest';
import type { QuestionRef } from '@xuexi/shared';
import { computeMistakeBook, openMistakes } from '../src/mistakes';
import { shanghaiDay } from '../src/refs';
import { attempt, sh } from './helpers';

const original: QuestionRef = {
  source: 'generator',
  generatorId: 'g4.mul.3x2',
  difficulty: 3,
  seed: 7,
  variant: 'standard',
};
const wrong = (at: number) =>
  attempt({ at, correct: false, question: original, errorTags: ['partial-shift'] });
const redo = (at: number) => attempt({ at, correct: true, question: original, mode: 'mistakes' });
const variant = (
  at: number,
  seed: number,
  mode: 'mistakes' | 'kp' = 'mistakes',
  v = 'standard@partial-shift',
) =>
  attempt({
    at,
    correct: true,
    mode,
    question: { source: 'generator', generatorId: 'g4.mul.3x2', difficulty: 3, seed, variant: v },
  });

describe('computeMistakeBook', () => {
  it('a wrong attempt creates an open entry', () => {
    const [m] = computeMistakeBook([wrong(sh('2026-09-01'))]);
    expect(m).toMatchObject({
      kpId: 'kp.a',
      question: original,
      wrongCount: 1,
      errorTags: ['partial-shift'],
      cleared: false,
    });
    expect(m.key).toBe('kp.a|gen:g4.mul.3x2:3:7:standard');
  });

  it('clears after the original redo plus correct variants on two different days', () => {
    const events = [
      wrong(sh('2026-09-01')),
      redo(sh('2026-09-02')),
      variant(sh('2026-09-02', '10:05'), 100),
    ];
    expect(openMistakes(computeMistakeBook(events))).toHaveLength(1);
    // Same day again does not help.
    const sameDay = [...events, variant(sh('2026-09-02', '20:00'), 101)];
    expect(computeMistakeBook(sameDay)[0]).toMatchObject({
      cleared: false,
      variantDays: ['2026-09-02'],
    });
    const done = [...sameDay, variant(sh('2026-09-04'), 102)];
    const [m] = computeMistakeBook(done);
    expect(m.cleared).toBe(true);
    expect(m.clearedAt).toBe(sh('2026-09-04'));
    expect(openMistakes([m])).toHaveLength(0);
  });

  it('needs the original redo too', () => {
    const events = [
      wrong(sh('2026-09-01')),
      variant(sh('2026-09-02'), 100),
      variant(sh('2026-09-03'), 101),
    ];
    const [m] = computeMistakeBook(events);
    expect(m).toMatchObject({
      cleared: false,
      originalRedone: false,
      variantDays: ['2026-09-02', '2026-09-03'],
    });
    const [m2] = computeMistakeBook([...events, redo(sh('2026-09-03', '11:00'))]);
    expect(m2.cleared).toBe(true);
  });

  it('only counts mistakes-mode variants after the mistake with a matching target tag', () => {
    const events = [
      variant(sh('2026-08-30'), 99), // before the mistake
      wrong(sh('2026-09-01')),
      redo(sh('2026-09-02')),
      variant(sh('2026-09-02'), 100, 'kp'), // wrong mode
      variant(sh('2026-09-03'), 101, 'mistakes', 'standard@carry-missed'), // other target
      variant(sh('2026-09-04'), 102, 'mistakes', 'standard'), // untargeted variant counts
    ];
    expect(computeMistakeBook(events)[0].variantDays).toEqual(['2026-09-04']);
  });

  it('a new wrong answer resets progress; after clearing it re-opens', () => {
    const events = [
      wrong(sh('2026-09-01')),
      redo(sh('2026-09-02')),
      variant(sh('2026-09-02'), 1),
      wrong(sh('2026-09-03')),
    ];
    expect(computeMistakeBook(events)[0]).toMatchObject({
      wrongCount: 2,
      originalRedone: false,
      variantDays: [],
    });
    const cleared = [
      ...events,
      redo(sh('2026-09-04')),
      variant(sh('2026-09-04'), 2),
      variant(sh('2026-09-05'), 3),
    ];
    expect(computeMistakeBook(cleared)[0].cleared).toBe(true);
    const reopened = [...cleared, wrong(sh('2026-09-10'))];
    expect(computeMistakeBook(reopened)[0]).toMatchObject({ cleared: false, wrongCount: 3 });
  });

  it('question identity includes the variant', () => {
    const other: QuestionRef = { ...original, variant: 'trailing-zero' };
    const events = [
      wrong(sh('2026-09-01')),
      attempt({ at: sh('2026-09-02'), correct: true, question: other }),
    ];
    expect(computeMistakeBook(events)[0].originalRedone).toBe(false);
  });

  it('uses Asia/Shanghai calendar days', () => {
    // 23:30 and 00:30 Shanghai are different days even though they are 1 hour apart.
    expect(shanghaiDay(sh('2026-09-02', '23:30'))).toBe('2026-09-02');
    expect(shanghaiDay(sh('2026-09-03', '00:30'))).toBe('2026-09-03');
    const events = [
      wrong(sh('2026-09-01')),
      redo(sh('2026-09-02')),
      variant(sh('2026-09-02', '23:30'), 5),
      variant(sh('2026-09-03', '00:30'), 6),
    ];
    expect(computeMistakeBook(events)[0].cleared).toBe(true);
    // 09:00 and 23:00 Shanghai on the same day (01:00Z and 15:00Z) count once.
    const sameDay = [
      wrong(sh('2026-09-01')),
      redo(sh('2026-09-02')),
      variant(Date.parse('2026-09-02T01:00:00Z'), 5),
      variant(Date.parse('2026-09-02T15:00:00Z'), 6),
    ];
    expect(computeMistakeBook(sameDay)[0].cleared).toBe(false);
  });

  it('handles bank questions', () => {
    const bankQ: QuestionRef = { source: 'bank', bankId: 'wp', questionId: 'q1' };
    const events = [
      attempt({ at: sh('2026-09-01'), correct: false, question: bankQ }),
      attempt({ at: sh('2026-09-02'), correct: true, question: bankQ }),
      attempt({
        at: sh('2026-09-02'),
        correct: true,
        mode: 'mistakes',
        question: { ...bankQ, questionId: 'q2' },
      }),
      attempt({
        at: sh('2026-09-03'),
        correct: true,
        mode: 'mistakes',
        question: { ...bankQ, questionId: 'q3' },
      }),
    ];
    const book = computeMistakeBook(events);
    expect(book).toHaveLength(1);
    expect(book[0].cleared).toBe(true);
  });
});
