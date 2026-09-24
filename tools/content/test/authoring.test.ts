import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertLesson, referencedFiles } from '@xuexi/course-pack';
import { allLessons } from '@xuexi/curriculum';
import { replayWhiteboard } from '../../../packages/player/src/whiteboard';
import { compileAuthored } from '../src/authoring/compile';
import { EXAMPLE_LESSON, FORMAT_SPEC } from '../src/authoring/format';
import { authorBrief, authoredFile, importAuthored } from '../src/authoring/import';
import { checkArithmetic, evaluate } from '../src/authoring/mathcheck';
import { buildPacks } from '../src/build';
import type { LessonContext } from '../src/generate';
import { getPaths } from '../src/paths';
import { loadState } from '../src/state';
import { ttsDraft, type TtsEngine } from '../src/tts';

describe('math check', () => {
  it('evaluates and flags wrong equations', () => {
    expect(evaluate('326 × 8')).toBe(2608);
    expect(evaluate('(12 + 8) × 3')).toBe(60);
    expect(checkArithmetic('326 × 8 = 2608，326 × 40 = 13040')).toEqual([]);
    expect(checkArithmetic('2608 + 13040 = 15648')).toEqual([]);
    expect(checkArithmetic('所以 326 × 48 = 15548。')).toEqual([{ expression: '326 × 48 = 15548', expected: 15648, written: 15548 }]);
    expect(checkArithmetic('96 ÷ 12 = 8')).toEqual([]);
    expect(checkArithmetic('47 ÷ 5 = 9……2')).toEqual([]);
    expect(checkArithmetic('47 ÷ 5 = 9……3').length).toBe(1);
    expect(checkArithmetic('100 - 37 = 63，12 + 30 × 2 = 72')).toEqual([]);
    expect(checkArithmetic('1 米 = 100 厘米，第 3 页')).toEqual([]);
  });

  it('checks every part of a worked chain against the first part', () => {
    expect(checkArithmetic('408 × 23 = 408 × 20 + 408 × 3')).toEqual([]);
    expect(checkArithmetic('408×20+408×3=8160+1224=9384')).toEqual([]);
    expect(checkArithmetic('114 × 21 = 114 × 20 + 114 = 2280 + 114 = 2395')).toEqual([
      { expression: '2280 + 114 = 2395', expected: 2394, written: 2395 },
    ]);
    // A wrong middle step is reported even when the final result is right.
    expect(checkArithmetic('114 × 21 = 2280 + 115 = 2394')).toEqual([
      { expression: '114 × 21 = 2280 + 115', expected: 2394, written: 2395 },
    ]);
  });

  it('reads 万 and 亿 as values but ignores counts of counting units', () => {
    expect(checkArithmetic('1200000 = 120 万，3 × 10万 = 30万，1亿 = 10000万')).toEqual([]);
    expect(checkArithmetic('1200000 = 12 万')).toEqual([
      { expression: '1200000 = 12 万', expected: 1200000, written: 120000 },
    ]);
    expect(checkArithmetic('1亿 = 1000万').length).toBe(1);
    expect(checkArithmetic('30 万 = 3 个十万，10 个一千 = 1 万，300万 = 3 百万')).toEqual([]);
    expect(checkArithmetic('4352000 ≈ 435 万，万位 = 3')).toEqual([]);
  });
});

describe('compileAuthored', () => {
  it('compiles the example into a valid lesson with effects and whiteboard', () => {
    const r = compileAuthored({ ...EXAMPLE_LESSON, lessonId: 'x.lesson' }, 'x.lesson');
    expect(r.errors).toEqual([]);
    assertLesson(r.lesson);
    const [s0, s1, s2] = r.lesson!.scenes;
    expect(s0.type).toBe('slide');
    const els = (s0.content as { canvas: { elements: Array<{ id: string; type: string }> } }).canvas.elements;
    expect(els.map((e) => e.id)).toEqual(['h1', 't1', 'c1a', 'c1b']);
    expect(s0.actions?.map((a) => a.type)).toEqual(['speech', 'spotlight', 'speech', 'laser', 'speech']);
    const wb = replayWhiteboard(s1.actions ?? []);
    expect(wb.open).toBe(false);
    const wbOpen = replayWhiteboard((s1.actions ?? []).filter((a) => a.type !== 'wb_close'));
    expect(wbOpen.elements.length).toBe(4);
    expect(s2.type).toBe('quiz');
    expect((s2.content as { questions: Array<{ answer: string[] }> }).questions[0].answer).toEqual(['B']);
  });

  it('reports wrong ids, bad arithmetic, bad answers', () => {
    const bad = structuredClone({ ...EXAMPLE_LESSON, lessonId: 'y' });
    const s0 = bad.scenes[0] as { script: unknown[] };
    s0.script.push({ spotlight: 'nope' });
    (bad.scenes[1] as { script: Array<{ board?: unknown }> }).script[1] = { board: [{ text: '326 × 40 = 1304' }] };
    (bad.scenes[2] as { questions: Array<{ answer: number[] }> }).questions[0].answer = [5];
    const r = compileAuthored(bad, 'y');
    expect(r.lesson).toBeNull();
    expect(r.errors.join('\n')).toMatch(/spotlight 指向不存在的 id "nope"/);
    expect(r.errors.join('\n')).toMatch(/算式有误：「326 × 40 = 1304」，正确结果应为 13040/);
    expect(r.errors.join('\n')).toMatch(/answer 序号无效/);
    expect(compileAuthored({ ...EXAMPLE_LESSON }, 'other').errors[0]).toMatch(/lessonId 应为 "other"/);
  });

  it('auto-clears a full whiteboard', () => {
    const lines = Array.from({ length: 12 }, (_, i) => ({ text: `${i} + 1 = ${i + 1}` }));
    const r = compileAuthored(
      {
        format: 'xuexi-authored@1',
        lessonId: 'z',
        title: 't',
        scenes: [{ type: 'slide', title: 'a', blocks: [{ id: 'h', kind: 'heading', text: 'x' }], script: [{ say: '一' }, { board: lines }, { say: '二' }, { say: '三' }, { say: '四' }, { say: '五' }] }],
      },
      'z',
    );
    expect(r.errors).toEqual([]);
    expect(r.lesson!.scenes[0].actions!.filter((a) => a.type === 'wb_clear').length).toBe(1);
  });
});

describe('authoring pipeline', () => {
  it('brief → authored file → import → tts → build', async () => {
    const paths = getPaths(mkdtempSync(join(tmpdir(), 'xuexi-author-')));
    const state = loadState(paths.state);
    const ctx = allLessons().find((l) => l.lesson.id === 'bsd-g4a.u3.mul-3x2.lecture') as LessonContext;
    const brief = authorBrief(paths, state, ctx);
    expect(brief).toContain('bsd-g4a.u3.mul-3x2.lecture');
    expect(brief).toContain(FORMAT_SPEC.slice(0, 20));

    mkdirSync(join(paths.content, 'authored'), { recursive: true });
    writeFileSync(authoredFile(paths, ctx.lesson.id), JSON.stringify({ ...EXAMPLE_LESSON, lessonId: ctx.lesson.id }));
    const r = await importAuthored(paths, state, ctx.lesson.id);
    expect(r.errors).toEqual([]);
    expect(state.lessons[ctx.lesson.id].status).toBe('generated');

    let calls = 0;
    const fake: TtsEngine = {
      name: 'fake',
      ext: 'mp3',
      cacheKey: 'fake',
      synthesize: async (_t, out) => {
        calls++;
        writeFileSync(out, 'ID3');
      },
    };
    const cacheDir = join(paths.content, 'tts-cache');
    const n = await ttsDraft(paths, state, ctx.lesson.id, { engine: fake, cacheDir, concurrency: 3 });
    expect(n).toBe(7);
    const firstCalls = calls;
    expect(firstCalls).toBeGreaterThan(0);
    // A fresh checkout (no draft audio) with a warm cache copies clips without calling the engine.
    rmSync(join(paths.work, ctx.lesson.id, 'draft', 'audio'), { recursive: true });
    expect(await ttsDraft(paths, state, ctx.lesson.id, { engine: fake, cacheDir })).toBe(7);
    expect(calls).toBe(firstCalls);
    expect(state.lessons[ctx.lesson.id].warnings?.some((w) => w.includes('没有语音'))).toBe(false);
    const lesson = JSON.parse(readFileSync(join(paths.work, ctx.lesson.id, 'draft', 'lesson.json'), 'utf8'));
    expect(referencedFiles(lesson).length).toBe(7);
    expect(await ttsDraft(paths, state, ctx.lesson.id, { engine: fake })).toBe(0);

    state.lessons[ctx.lesson.id].status = 'approved';
    const built = await buildPacks(paths, state, [ctx], 'n/a');
    expect(built.built).toEqual([ctx.lesson.id]);
    expect(existsSync(join(paths.packs, ctx.lesson.id, 'v1', 'audio'))).toBe(true);
  });
});

describe('English narration', () => {
  const withSay = (step: Record<string, unknown>) => ({
    ...EXAMPLE_LESSON,
    lessonId: 'x',
    scenes: [
      {
        type: 'slide',
        title: 't',
        blocks: [{ id: 't1', kind: 'text', text: 'Hello' }],
        script: [{ say: '跟我读。' }, step],
      },
    ],
  });

  it('marks lang "en" speech and rejects Chinese inside it', () => {
    const ok = compileAuthored(withSay({ say: "Hello! I'm Danny.", lang: 'en' }), 'x');
    expect(ok.errors).toEqual([]);
    const actions = ok.lesson!.scenes[0].actions as Array<{ type: string; lang?: string }>;
    expect(actions.filter((a) => a.type === 'speech').map((a) => a.lang)).toEqual([undefined, 'en']);
    expect(compileAuthored(withSay({ say: 'Hello 你好', lang: 'en' }), 'x').errors[0]).toContain('有中文');
    expect(compileAuthored(withSay({ say: 'Bonjour', lang: 'fr' }), 'x').errors[0]).toContain('lang');
  });

  it('reads lang "en" lines with the English voice', async () => {
    const paths = getPaths(mkdtempSync(join(tmpdir(), 'xuexi-en-')));
    const state = loadState(paths.state);
    const ctx = allLessons().find((l) => l.lesson.id === 'bsd-g4a.u3.mul-3x2.lecture') as LessonContext;
    mkdirSync(join(paths.content, 'authored'), { recursive: true });
    writeFileSync(authoredFile(paths, ctx.lesson.id), JSON.stringify({ ...withSay({ say: 'Good morning!', lang: 'en' }), lessonId: ctx.lesson.id }));
    expect((await importAuthored(paths, state, ctx.lesson.id)).errors).toEqual([]);
    const voices: string[] = [];
    const engine = (name: string): TtsEngine => ({
      name,
      ext: 'mp3',
      cacheKey: name,
      synthesize: async (text, out) => {
        voices.push(`${name}:${text}`);
        writeFileSync(out, 'ID3');
      },
    });
    await ttsDraft(paths, state, ctx.lesson.id, { engine: engine('zh'), englishEngine: engine('en') });
    expect(voices.sort()).toEqual(['en:Good morning!', 'zh:跟我读。']);
  });
});
