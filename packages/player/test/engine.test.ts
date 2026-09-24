import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { convertClassroom } from '@xuexi/course-pack';
import { sampleClassroom } from '../../../tools/content/src/mock/sample-classroom';
import { LessonEngine, type AudioPort, type PlayerSnapshot } from '../src/engine';
import { replayWhiteboard } from '../src/whiteboard';

const base = 'http://localhost:3000';

function fakeAudio() {
  const log: string[] = [];
  let pending: { resolve: () => void; reject: (e: Error) => void } | null = null;
  const port: AudioPort = {
    play(src) {
      log.push(src);
      return new Promise((resolve, reject) => {
        pending = { resolve, reject };
      });
    },
    pause() {},
    resume() {},
    stop() {
      pending?.reject(new Error('stopped'));
      pending = null;
    },
    setRate() {},
  };
  return {
    port,
    log,
    end() {
      const p = pending;
      pending = null;
      p?.resolve();
    },
    get playing() {
      return pending !== null;
    },
  };
}

async function flush() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

describe('LessonEngine', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const lesson = convertClassroom(
    sampleClassroom({ id: 'e1', baseUrl: base, title: '测试', withAudio: true }).classroom,
    base,
  ).lesson;

  it('plays speech clips in order, applies effects and whiteboard, stops at quiz', async () => {
    const audio = fakeAudio();
    const snaps: PlayerSnapshot[] = [];
    const engine = new LessonEngine(lesson, {
      audio: audio.port,
      resolveAudio: (p) => `blob:${p}`,
      onChange: (s) => snaps.push(s),
    });
    engine.play();
    await flush();
    expect(audio.log).toEqual(['blob:audio/tts_s0_a0.wav']);
    expect(engine.snapshot.subtitle).toContain('同学们好');

    // Drive the lesson: end each clip, advance whiteboard timers.
    for (let i = 0; i < 40 && engine.snapshot.status === 'playing'; i++) {
      if (audio.playing) audio.end();
      await flush();
      await vi.advanceTimersByTimeAsync(1000);
      await flush();
    }
    expect(snaps.some((s) => s.effects.spotlight?.elementId === 't1')).toBe(true);
    expect(snaps.some((s) => s.effects.laser?.elementId === 'b1')).toBe(true);
    expect(snaps.some((s) => s.whiteboard.open && s.whiteboard.elements.length === 4)).toBe(true);
    expect(engine.snapshot.status).toBe('awaiting-user');
    expect(engine.snapshot.sceneIndex).toBe(2);
    expect(engine.snapshot.whiteboard.open).toBe(false);

    engine.continue();
    expect(engine.snapshot.status).toBe('ended');
    expect(engine.snapshot.played).toBe(engine.snapshot.total);
  });

  it('falls back to a timed wait when audio fails, and pauses/resumes', async () => {
    const failing: AudioPort = {
      play: () => Promise.reject(new Error('no audio')),
      pause() {},
      resume() {},
      stop() {},
      setRate() {},
    };
    const engine = new LessonEngine(lesson, {
      audio: failing,
      resolveAudio: () => 'x',
      onChange: () => {},
      speechMs: () => 1000,
    });
    engine.play();
    await flush();
    expect(engine.snapshot.actionIndex).toBe(0);
    engine.pause();
    await vi.advanceTimersByTimeAsync(5000);
    expect(engine.snapshot.actionIndex).toBe(0);
    engine.resume();
    await vi.advanceTimersByTimeAsync(1100);
    await flush();
    expect(engine.snapshot.actionIndex).toBeGreaterThanOrEqual(1);
  });

  it('seeks to a scene and rebuilds the whiteboard; replay restarts the scene', async () => {
    const audio = fakeAudio();
    const engine = new LessonEngine(lesson, {
      audio: audio.port,
      resolveAudio: (p) => p,
      onChange: () => {},
    });
    engine.goToScene(2, false);
    expect(engine.snapshot.status).toBe('paused');
    expect(engine.snapshot.whiteboard).toEqual(replayWhiteboard(lesson.scenes[1].actions ?? []));
    expect(engine.snapshot.whiteboard.elements.length).toBe(4);
    engine.goToScene(1, true);
    await flush();
    expect(audio.log.at(-1)).toBe('audio/tts_s1_b0.wav');
    engine.replayScene();
    await flush();
    expect(audio.log.at(-1)).toBe('audio/tts_s1_b0.wav');
    expect(engine.snapshot.whiteboard.elements.length).toBe(0);
  });
});
