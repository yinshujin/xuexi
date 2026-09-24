import { describe, expect, it } from 'vitest';
import { sampleClassroom } from '../../../tools/content/src/mock/sample-classroom';
import {
  assertLesson,
  convertClassroom,
  estimateDurationSec,
  referencedFiles,
  sha256Hex,
} from '../src';

const base = 'http://localhost:3000';

describe('convertClassroom', () => {
  it('rewrites audio and media to pack paths and strips live-only actions', () => {
    const { classroom } = sampleClassroom({ id: 'c1', baseUrl: base, title: '三位数乘两位数', withAudio: true });
    const { lesson, assets, warnings } = convertClassroom(classroom, base);
    assertLesson(lesson);
    expect(lesson.scenes.map((s) => s.type)).toEqual(['slide', 'slide', 'quiz']);

    const speech = lesson.scenes.flatMap((s) => s.actions ?? []).filter((a) => a.type === 'speech');
    expect(speech.length).toBe(7);
    for (const a of speech) {
      expect(a.audioId).toMatch(/^audio\/tts_s\d_\w+\.wav$/);
      expect((a as unknown as Record<string, unknown>).audioUrl).toBeUndefined();
    }
    expect(lesson.scenes.flatMap((s) => s.actions ?? []).some((a) => a.type === 'discussion')).toBe(false);
    expect(warnings.some((w) => w.includes('discussion'))).toBe(true);

    const img = (lesson.scenes[0].content as { canvas: { elements: Array<{ id: string; src?: string }> } })
      .canvas.elements.find((e) => e.id === 'img0');
    expect(img?.src).toBe('media/books.png');

    expect(assets).toContainEqual({ url: `${base}/api/classroom-media/c1/media/books.png`, path: 'media/books.png' });
    expect(assets.length).toBe(8);
    expect(referencedFiles(lesson)).toEqual(assets.map((a) => a.path).sort());
  });

  it('warns about narration without audio and removes dangling audio ids', () => {
    const { classroom } = sampleClassroom({ id: 'c2', baseUrl: base, title: 'x', withAudio: false });
    const { lesson, warnings } = convertClassroom(classroom, base);
    const speech = lesson.scenes.flatMap((s) => s.actions ?? []).filter((a) => a.type === 'speech');
    expect(speech.every((a) => a.audioId === undefined)).toBe(true);
    expect(warnings.filter((w) => w.includes('没有语音')).length).toBe(7);
  });

  it('estimates duration and hashes deterministically', async () => {
    const { classroom } = sampleClassroom({ id: 'c3', baseUrl: base, title: 'x', withAudio: true });
    const { lesson } = convertClassroom(classroom, base);
    expect(estimateDurationSec(lesson)).toBeGreaterThan(60);
    expect(await sha256Hex(new TextEncoder().encode('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
