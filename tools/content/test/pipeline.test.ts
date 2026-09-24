import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { unzipSync } from 'fflate';
import { assertCatalog, assertManifest, readBundle, sha256Hex, type PackManifest } from '@xuexi/course-pack';
import type { Book } from '@xuexi/curriculum';
import { buildPacks } from '../src/build';
import { exportBundle } from '../src/export';
import { generateMany, requirementFor, selectLessons, type LessonContext } from '../src/generate';
import { startMockOpenMaic } from '../src/mock/server';
import { OpenMaicClient } from '../src/openmaic-client';
import { getPaths } from '../src/paths';
import { reviewRows, startReviewServer } from '../src/review-server';
import { loadState } from '../src/state';

const book: Book = {
  id: 'bsd-g4a',
  edition: '北师大版',
  revision: '2014',
  grade: 4,
  term: '上',
  title: '四年级上册',
  sourceNote: 'test',
  units: [
    {
      id: 'bsd-g4a.u3',
      index: 3,
      title: '乘法',
      knowledgePoints: [
        {
          id: 'bsd-g4a.u3.mul-3x2',
          title: '三位数乘两位数',
          objectives: ['会用竖式计算'],
          keyPoints: ['部分积错位'],
          prerequisites: [],
          lessons: [
            { id: 'bsd-g4a.u3.mul-3x2.lecture', kind: 'lecture', title: '卫星运行时间', minutes: 10, focus: '竖式' },
            { id: 'bsd-g4a.u3.mul-3x2.tech-shift', kind: 'technique', title: '部分积为什么错位', minutes: 4, focus: '错位', remedies: ['partial-shift'] },
            { id: 'bsd-g4a.u3.mul-3x2.tech-fail', kind: 'technique', title: 'FAILME', minutes: 4, focus: 'x' },
          ],
          practice: [{ generatorId: 'g4.mul.3x2', minDifficulty: 1, maxDifficulty: 5 }],
        },
      ],
    },
  ],
};
const unit = book.units[0];
const kp = unit.knowledgePoints[0];
const ctxs: LessonContext[] = kp.lessons.map((lesson) => ({ book, unit, kp, lesson }));
const buildRequirement = (c: LessonContext) => `为「${c.lesson.title}」生成一节课 ${c.lesson.title}`;

let server: Server;
let base: string;
let dir: string;

beforeAll(async () => {
  server = await startMockOpenMaic({ port: 0, pollsToFinish: 2, failMarker: 'FAILME' });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  dir = mkdtempSync(join(tmpdir(), 'xuexi-content-'));
});
afterAll(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('content pipeline (mock OpenMAIC)', () => {
  it('generates, reviews, rejects with a note, builds versioned packs', async () => {
    const paths = getPaths(dir);
    const state = loadState(paths.state);
    const logs: string[] = [];
    const deps = {
      client: new OpenMaicClient(base),
      paths,
      state,
      buildRequirement,
      templateVersion: 't1',
      enableTTS: true,
      log: (s: string) => logs.push(s),
      pollMs: 1,
    };

    const picked = selectLessons(ctxs, state, {}, 't1');
    expect(picked.length).toBe(3);
    const summary = await generateMany(deps, picked);
    expect(summary.ok.length).toBe(2);
    expect(summary.failed.map((f) => f.id)).toEqual(['bsd-g4a.u3.mul-3x2.tech-fail']);
    expect(state.lessons['bsd-g4a.u3.mul-3x2.lecture'].status).toBe('generated');
    expect(state.lessons['bsd-g4a.u3.mul-3x2.tech-fail'].status).toBe('failed');
    expect(existsSync(join(paths.work, 'bsd-g4a.u3.mul-3x2.lecture', 'draft', 'audio'))).toBe(true);
    expect(logs.some((l) => l.includes('discussion'))).toBe(true);

    // Only the failed lesson is picked again.
    expect(selectLessons(ctxs, state, {}, 't1').map((c) => c.lesson.id)).toEqual(['bsd-g4a.u3.mul-3x2.tech-fail']);
    // --stale picks lessons from an older template.
    expect(selectLessons(ctxs, state, { stale: true }, 't2').length).toBe(3);

    // Review via HTTP.
    const review = await startReviewServer({ paths, state, lessons: ctxs, webDir: join(dir, 'noweb'), port: 0 });
    const rbase = `http://127.0.0.1:${(review.address() as AddressInfo).port}`;
    const list = await (await fetch(`${rbase}/api/review/lessons`)).json();
    expect(list.lessons.map((l: { status: string }) => l.status)).toEqual(['generated', 'generated', 'failed']);
    const draftLesson = await (await fetch(`${rbase}/api/review/draft/bsd-g4a.u3.mul-3x2.lecture/lesson.json`)).json();
    expect(draftLesson.scenes.length).toBe(3);
    const audio = await fetch(`${rbase}/api/review/draft/bsd-g4a.u3.mul-3x2.lecture/audio/tts_s0_a0.wav`);
    expect(audio.headers.get('content-type')).toBe('audio/wav');
    expect((await fetch(`${rbase}/api/review/draft/bsd-g4a.u3.mul-3x2.lecture/..%2F..%2Fstate.json`)).status).not.toBe(200);

    const post = (id: string, body: unknown) =>
      fetch(`${rbase}/api/review/lessons/${id}`, { method: 'POST', body: JSON.stringify(body) });
    expect((await post('bsd-g4a.u3.mul-3x2.lecture', { action: 'approve' })).status).toBe(200);
    expect((await post('bsd-g4a.u3.mul-3x2.tech-shift', { action: 'reject', note: '例子换成地铁' })).status).toBe(200);
    expect((await post('bsd-g4a.u3.mul-3x2.tech-fail', { action: 'approve' })).status).toBe(409);
    review.close();

    // Persisted to disk.
    const onDisk = loadState(paths.state);
    expect(onDisk.lessons['bsd-g4a.u3.mul-3x2.lecture'].status).toBe('approved');
    expect(onDisk.lessons['bsd-g4a.u3.mul-3x2.tech-shift'].reviewNote).toBe('例子换成地铁');

    // Rejected lesson is regenerated with the parent's note appended.
    expect(requirementFor(deps, ctxs[1])).toContain('家长对上一版的修改意见（务必遵守）：例子换成地铁');
    expect(reviewRows(ctxs, state, paths)[1].status).toBe('rejected');

    // Build packs.
    const r1 = await buildPacks(paths, state, ctxs, 'test');
    expect(r1.built).toEqual(['bsd-g4a.u3.mul-3x2.lecture']);
    const catalog = JSON.parse(readFileSync(paths.catalog, 'utf8'));
    assertCatalog(catalog);
    const entry = catalog.lessons['bsd-g4a.u3.mul-3x2.lecture'];
    expect(entry.path).toBe('packs/bsd-g4a.u3.mul-3x2.lecture/v1/');
    const packDir = join(paths.out, entry.path);
    const manifest = JSON.parse(readFileSync(join(packDir, 'manifest.json'), 'utf8')) as PackManifest;
    assertManifest(manifest);
    expect(manifest.kpId).toBe('bsd-g4a.u3.mul-3x2');
    for (const [f, info] of Object.entries(manifest.files)) {
      expect(await sha256Hex(readFileSync(join(packDir, f)))).toBe(info.sha256);
    }

    // Rebuild without changes keeps v1; regenerate + approve → v2.
    const r2 = await buildPacks(paths, state, ctxs, 'test');
    expect(r2.unchanged).toEqual(['bsd-g4a.u3.mul-3x2.lecture']);
    await generateMany(deps, [ctxs[0]]);
    // While the new draft awaits review, v1 stays published.
    const pending = await buildPacks(paths, state, ctxs, 'test');
    expect(pending.catalog.lessons['bsd-g4a.u3.mul-3x2.lecture'].version).toBe(1);
    state.lessons['bsd-g4a.u3.mul-3x2.lecture'].status = 'approved';
    const r3 = await buildPacks(paths, state, ctxs, 'test');
    expect(r3.built).toEqual(['bsd-g4a.u3.mul-3x2.lecture']);
    expect(existsSync(join(paths.packs, 'bsd-g4a.u3.mul-3x2.lecture', 'v2', 'manifest.json'))).toBe(true);
    expect(existsSync(join(paths.packs, 'bsd-g4a.u3.mul-3x2.lecture', 'v1'))).toBe(false);

    // Export a course-bundle file and read it back the way the app does.
    expect(() => exportBundle(paths, { book: 'bsd-g2a' })).toThrow('没有符合条件');
    const exported = exportBundle(paths, { book: 'bsd-g4a', unit: '3', title: '四上 第3单元' });
    expect(exported.lessons.map((e) => e.lessonId)).toEqual(['bsd-g4a.u3.mul-3x2.lecture']);
    const bundle = await readBundle(unzipSync(new Uint8Array(readFileSync(exported.file))));
    expect(bundle.title).toBe('四上 第3单元');
    expect(bundle.skipped).toEqual([]);
    expect(bundle.packs).toHaveLength(1);
    expect(bundle.packs[0].entry.version).toBe(2);
    expect(Object.keys(bundle.packs[0].files)).toContain('lesson.json');
  });
});

describe('quota handling', () => {
  it('stops the run on HTTP 403 instead of failing every remaining lesson', async () => {
    const paths = getPaths(mkdtempSync(join(tmpdir(), 'xuexi-quota-')));
    const state = loadState(paths.state);
    let calls = 0;
    const fakeFetch = (async () => {
      calls += 1;
      return new Response(JSON.stringify({ success: false, error: 'Daily quota exhausted' }), { status: 403 });
    }) as typeof fetch;
    const summary = await generateMany(
      {
        client: new OpenMaicClient('http://quota.test', 'sk-x', fakeFetch),
        paths,
        state,
        buildRequirement,
        templateVersion: 't1',
        enableTTS: true,
        log: () => {},
        pollMs: 1,
      },
      ctxs,
    );
    expect(summary.stopped).toBe(true);
    expect(summary.failed.length).toBe(1);
    expect(calls).toBe(1);
  });
});
