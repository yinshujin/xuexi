import { describe, expect, it } from 'vitest';
import { WRITING_EVENT_PREFIX, type LearningEvent } from '@xuexi/shared';
import {
  countChars,
  findWritingByKp,
  findWritingTask,
  handedInTasks,
  lengthStatus,
  scaledSize,
  taskStatus,
  unseenReviews,
  writingEvent,
  writingTasks,
} from '../src/lib/writing';

describe('写作任务 helpers', () => {
  it('counts characters like squares on paper: punctuation counts, spaces and line breaks do not', () => {
    expect(countChars('我在教室里读书。')).toBe(8);
    expect(countChars('妈妈问：“你饿了吗？”')).toBe(11);
    expect(countChars('10月12日　星期六　晴\n　　今天真开心！')).toBe(16);
    expect(countChars('  \n\t')).toBe(0);
  });

  it('compares the length with the task', () => {
    expect(lengthStatus('我在家。', { minChars: 10 })).toEqual({ count: 4, missing: 6, over: false });
    expect(lengthStatus('一二三四五六七八九十', { minChars: 10, maxChars: 12 })).toEqual({ count: 10, missing: 0, over: false });
    expect(lengthStatus('一二三四五六七八九十一二三', { minChars: 10, maxChars: 12 }).over).toBe(true);
  });

  it('scales photos so the long side is at most 1600 px and never enlarges them', () => {
    expect(scaledSize(4032, 3024)).toEqual({ width: 1600, height: 1200 });
    expect(scaledSize(3024, 4032)).toEqual({ width: 1200, height: 1600 });
    expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 });
    expect(scaledSize(1600, 1600)).toEqual({ width: 1600, height: 1600 });
    expect(scaledSize(3000, 10, 1600)).toEqual({ width: 1600, height: 5 });
  });

  it('finds the tasks of a child’s books', () => {
    const g2 = writingTasks(['bsd-g2a', 'yw-g2a', 'en-g2a', 'xz-g2a']);
    expect(g2.length).toBe(8);
    expect(g2.every((r) => r.book.id === 'xz-g2a' && r.kp.writing === r.task)).toBe(true);
    expect(writingTasks(['bsd-g2a', 'yw-g2a'])).toEqual([]);
    const first = g2[0];
    expect(findWritingByKp(first.kp.id)?.task.id).toBe(first.task.id);
    expect(findWritingTask(first.task.id)?.kp.id).toBe(first.kp.id);
    expect(findWritingByKp('xz-g2a.u1.complete')).toBeUndefined();
  });

  it('records a handed-in piece as a completed lesson event "writing:<task id>"', () => {
    const e = writingEvent({ id: 'e1', childId: 'c', deviceId: 'd', taskId: 'xz-g2a.u1.task', at: 5, durationMs: 60_000 });
    expect(e).toMatchObject({ type: 'lesson', lessonId: `${WRITING_EVENT_PREFIX}xz-g2a.u1.task`, completed: true, progress: 1, at: 5 });
    const events: LearningEvent[] = [
      e,
      { ...e, id: 'e2', at: 9 },
      { ...e, id: 'e3', lessonId: 'exam:xz-g2a.u1.A' },
      { ...e, id: 'e4', lessonId: `${WRITING_EVENT_PREFIX}xz-g2a.u2.task`, completed: false },
    ];
    expect([...handedInTasks(events)]).toEqual([['xz-g2a.u1.task', { times: 2, lastAt: 9 }]]);
  });

  it('works out a task’s status from the pieces, the synced events and the drafts', () => {
    const none = new Map<string, unknown>();
    expect(taskStatus('t', [], none)).toBe('new');
    expect(taskStatus('t', [], none, new Set(['t']))).toBe('draft');
    // Handed in on another device: only the synced event is here.
    expect(taskStatus('t', [], new Map([['t', {}]]))).toBe('handed-in');
    expect(taskStatus('t', [{ taskId: 't', at: 1 }], none)).toBe('handed-in');
    expect(taskStatus('t', [{ taskId: 't', at: 1, stars: 2 }], none)).toBe('reviewed');
    // A newer piece without a review yet.
    expect(taskStatus('t', [{ taskId: 't', at: 1, stars: 2 }, { taskId: 't', at: 2 }], none)).toBe('handed-in');
    expect(taskStatus('t', [{ taskId: 'other', at: 1, stars: 3 }], none)).toBe('new');
  });

  it('counts reviews the child has not seen', () => {
    expect(
      unseenReviews([
        { stars: 3, reviewedAt: 10 },
        { stars: 2, reviewedAt: 10, seenAt: 11 },
        { stars: 1, reviewedAt: 20, seenAt: 11 },
        {},
      ]),
    ).toBe(2);
  });
});
