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

describe('whiteboard tables', () => {
  const draw = (data: string[][]) =>
    replayWhiteboard([
      { id: 'o', type: 'wb_open' },
      { id: 't', type: 'wb_draw_table', x: 80, y: 40, width: 420, height: data.length * 44, data },
    ] as never);
  const cellStyle = (wb: ReturnType<typeof draw>) =>
    (wb.elements[0] as unknown as { data: Array<Array<{ style?: { fontsize: string; align: string } }>> })
      .data[0][0].style;

  it('shows digit grids such as 竖式 large and centred', () => {
    const wb = draw([
      ['', '十位', '个位'],
      ['', '5', '2'],
      ['−', '', '7'],
    ]);
    expect(cellStyle(wb)).toEqual({ fontsize: '26px', align: 'center' });
  });

  it('keeps the default style for tables with longer text', () => {
    expect(cellStyle(draw([['退 1 当 10', '4 颗', '12 颗']]))).toBeUndefined();
  });
});

describe('whiteboard timing', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const draw = (id: string, y: number) => ({ id, type: 'wb_draw_text', content: id, x: 80, y, width: 800, height: 60 });
  const scene = (id: string, actions: unknown[]) => ({
    id,
    stageId: 'x',
    title: id,
    order: 0,
    type: 'slide',
    content: { type: 'slide', canvas: { id: `${id}-c`, viewportSize: 1000, viewportRatio: 0.5625, elements: [] } },
    actions,
  });
  const lesson = {
    stage: { id: 'x', name: 'x' },
    scenes: [
      scene('s0', [
        { id: 'o', type: 'wb_open' },
        draw('d1', 40),
        draw('d2', 116),
        draw('d3', 192),
        { id: 'sp', type: 'speech', text: '一边写一边讲', audioId: 'a.mp3' },
        { id: 'sp2', type: 'speech', text: '讲完了', audioId: 'b.mp3' },
      ]),
      scene('s1', [{ id: 'sp3', type: 'speech', text: '下一页', audioId: 'c.mp3' }]),
    ],
  } as never;

  it('writes the items before a speech while it plays, one after another', async () => {
    const audio = fakeAudio();
    const engine = new LessonEngine(lesson, { audio: audio.port, resolveAudio: (p) => p, onChange: () => {}, revealMs: 900 });
    engine.play();
    await flush();
    await vi.advanceTimersByTimeAsync(500); // wb_open animation pause
    await flush();
    // The speech has started together with the first item.
    expect(audio.log).toEqual(['a.mp3']);
    expect(engine.snapshot.whiteboard.elements.map((e) => e.id)).toEqual(['wb_d1']);
    await vi.advanceTimersByTimeAsync(900);
    expect(engine.snapshot.whiteboard.elements.length).toBe(2);
    // Pausing holds the next item back.
    engine.pause();
    await vi.advanceTimersByTimeAsync(3000);
    expect(engine.snapshot.whiteboard.elements.length).toBe(2);
    engine.resume();
    await vi.advanceTimersByTimeAsync(900);
    expect(engine.snapshot.whiteboard.elements.length).toBe(3);
    // Next speech only after the first one ends.
    expect(audio.log).toEqual(['a.mp3']);
    audio.end();
    await flush();
    expect(audio.log).toEqual(['a.mp3', 'b.mp3']);
  });

  it('closes the board when the next scene starts, also when seeking', async () => {
    const audio = fakeAudio();
    const engine = new LessonEngine(lesson, { audio: audio.port, resolveAudio: (p) => p, onChange: () => {} });
    engine.play();
    for (let i = 0; i < 10 && engine.snapshot.sceneIndex === 0; i++) {
      await vi.advanceTimersByTimeAsync(1000);
      if (audio.playing) audio.end();
      await flush();
    }
    expect(engine.snapshot.sceneIndex).toBe(1);
    expect(engine.snapshot.whiteboard.open).toBe(false);
    expect(engine.snapshot.whiteboard.elements.length).toBe(3);
    engine.goToScene(1, false);
    expect(engine.snapshot.whiteboard.open).toBe(false);
  });
});
