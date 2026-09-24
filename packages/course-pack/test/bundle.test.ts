import { describe, expect, it } from 'vitest';
import { BUNDLE_FORMAT, PACK_FORMAT, readBundle, sha256Hex, type CatalogEntry, type PackManifest } from '../src';

const enc = (s: string) => new TextEncoder().encode(s);

async function makePack(lessonId: string, version: number) {
  const path = `packs/${lessonId}/v${version}/`;
  const lesson = enc(JSON.stringify({ stage: { id: 's', name: 'x' }, scenes: [] }));
  const audio = new Uint8Array([1, 2, 3, 4]);
  const manifest: PackManifest = {
    format: PACK_FORMAT,
    lessonId,
    kpId: 'bsd-g4a.u3.mul-3x2',
    bookId: 'bsd-g4a',
    kind: 'lecture',
    title: lessonId,
    version,
    createdAt: '2026-09-24T00:00:00Z',
    source: { generator: 'openmaic', openmaicVersion: 't', classroomId: 'c', templateVersion: 't' },
    review: { status: 'approved', reviewedAt: '2026-09-24T00:00:00Z' },
    aiGenerated: true,
    durationSec: 60,
    sceneCount: 0,
    files: {
      'lesson.json': { bytes: lesson.byteLength, sha256: await sha256Hex(lesson) },
      'audio/a.mp3': { bytes: audio.byteLength, sha256: await sha256Hex(audio) },
    },
  };
  const entry: CatalogEntry = {
    lessonId,
    kpId: manifest.kpId,
    bookId: manifest.bookId,
    kind: 'lecture',
    title: lessonId,
    version,
    path,
    durationSec: 60,
    totalBytes: lesson.byteLength + audio.byteLength,
  };
  const files: Record<string, Uint8Array> = {
    [`${path}manifest.json`]: enc(JSON.stringify(manifest)),
    [`${path}lesson.json`]: lesson,
    [`${path}audio/a.mp3`]: audio,
  };
  return { entry, files };
}

describe('readBundle', () => {
  it('returns verified packs and skips broken ones', async () => {
    const a = await makePack('lesson-a', 1);
    const b = await makePack('lesson-b', 2);
    b.files['packs/lesson-b/v2/audio/a.mp3'] = new Uint8Array([9, 9, 9, 9]); // tampered
    const c = await makePack('lesson-c', 1);
    delete c.files['packs/lesson-c/v1/manifest.json'];
    const index = { format: BUNDLE_FORMAT, createdAt: 'now', title: '四上 第3单元', lessons: [a.entry, b.entry, c.entry] };
    const bundle = await readBundle({ 'bundle.json': enc(JSON.stringify(index)), ...a.files, ...b.files, ...c.files });

    expect(bundle.title).toBe('四上 第3单元');
    expect(bundle.packs.map((p) => p.entry.lessonId)).toEqual(['lesson-a']);
    expect(Object.keys(bundle.packs[0].files).sort()).toEqual(['audio/a.mp3', 'lesson.json']);
    expect(bundle.skipped).toHaveLength(2);
    expect(bundle.skipped[0]).toContain('audio/a.mp3');
    expect(bundle.skipped[1]).toContain('manifest.json');
  });

  it('rejects files that are not bundles', async () => {
    await expect(readBundle({})).rejects.toThrow('bundle.json');
    await expect(readBundle({ 'bundle.json': enc('{"format":"other"}') })).rejects.toThrow('不支持');
    await expect(readBundle({ 'bundle.json': enc('not json') })).rejects.toThrow('损坏');
  });

  it('refuses paths outside packs/', async () => {
    const a = await makePack('lesson-a', 1);
    const index = { format: BUNDLE_FORMAT, createdAt: 'now', title: 't', lessons: [{ ...a.entry, path: '../x/' }] };
    const bundle = await readBundle({ 'bundle.json': enc(JSON.stringify(index)), ...a.files });
    expect(bundle.packs).toHaveLength(0);
    expect(bundle.skipped[0]).toContain('路径无效');
  });
});
