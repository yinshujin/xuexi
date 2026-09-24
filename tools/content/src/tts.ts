/**
 * Narration audio for drafts that have none (authored lessons, or OpenMAIC runs
 * without a TTS key). Free engines only:
 *   - say:  macOS built-in voices (offline), converted to AAC .m4a with afconvert
 *   - edge: the `edge-tts` CLI (pip install edge-tts), Microsoft Edge online voices, .mp3
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sha256Hex, type PackLesson } from '@xuexi/course-pack';
import { draftDir, type Paths } from './paths';
import { run } from './run';
import { type ContentState, updateLesson } from './state';

export interface TtsEngine {
  name: string;
  ext: string;
  /** Identifies engine + voice + rate, so cached clips are reused only for the same voice. */
  cacheKey: string;
  /** Write narration for `text` to `outFile` (with this engine's extension). */
  synthesize(text: string, outFile: string): Promise<void>;
}

export function sayEngine(voice = 'Tingting', rate = 180): TtsEngine {
  return {
    name: 'say',
    ext: 'm4a',
    cacheKey: `say:${voice}:${rate}`,
    async synthesize(text, outFile) {
      const aiff = outFile.replace(/\.m4a$/, '.aiff');
      await run('say', ['-v', voice, '-r', String(rate), '-o', aiff, text]);
      await run('afconvert', ['-f', 'm4af', '-d', 'aac', aiff, outFile]);
      rmSync(aiff, { force: true });
    },
  };
}

export function edgeEngine(voice = 'zh-CN-XiaoxiaoNeural', rate = '-5%'): TtsEngine {
  return {
    name: 'edge',
    ext: 'mp3',
    cacheKey: `edge:${voice}:${rate}`,
    async synthesize(text, outFile) {
      await run('edge-tts', ['--voice', voice, `--rate=${rate}`, '--text', text, '--write-media', outFile]);
    },
  };
}

export interface TtsOptions {
  engine: TtsEngine;
  /** Re-synthesize clips that already have audio. */
  force?: boolean;
  log?: (s: string) => void;
  /** Directory of clips keyed by sha256(engine key + text); reused across runs (CI cache). */
  cacheDir?: string;
  /** Clips synthesized at the same time (default 1). */
  concurrency?: number;
}

async function synthesizeWithRetry(engine: TtsEngine, text: string, out: string, tries = 3): Promise<void> {
  for (let i = 1; ; i++) {
    try {
      await engine.synthesize(text, out);
      return;
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}

/** Add narration audio to one draft. Returns the number of clips written. */
export async function ttsDraft(paths: Paths, state: ContentState, lessonId: string, opts: TtsOptions): Promise<number> {
  const dir = draftDir(paths, lessonId);
  const file = join(dir, 'lesson.json');
  if (!existsSync(file)) throw new Error(`${lessonId} 没有草稿`);
  const lesson = JSON.parse(readFileSync(file, 'utf8')) as PackLesson;
  mkdirSync(join(dir, 'audio'), { recursive: true });
  if (opts.cacheDir) mkdirSync(opts.cacheDir, { recursive: true });

  const jobs: Array<() => Promise<void>> = [];
  for (const scene of lesson.scenes) {
    for (const action of scene.actions ?? []) {
      if (action.type !== 'speech' || !action.text?.trim()) continue;
      if (action.audioId && !opts.force && existsSync(join(dir, action.audioId))) continue;
      const rel = `audio/${action.id.replace(/[^A-Za-z0-9._-]/g, '_')}.${opts.engine.ext}`;
      const text = action.text;
      jobs.push(async () => {
        const out = join(dir, rel);
        if (opts.cacheDir) {
          const key = await sha256Hex(new TextEncoder().encode(`${opts.engine.cacheKey}\n${text}`));
          const cached = join(opts.cacheDir, `${key}.${opts.engine.ext}`);
          if (!existsSync(cached) || opts.force) await synthesizeWithRetry(opts.engine, text, cached);
          copyFileSync(cached, out);
        } else {
          await synthesizeWithRetry(opts.engine, text, out);
        }
        action.audioId = rel;
      });
    }
  }

  let written = 0;
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      await jobs[next++]();
      written++;
      if (written % 20 === 0) opts.log?.(`  已合成 ${written} / ${jobs.length} 句`);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(opts.concurrency ?? 1, jobs.length)) }, worker));

  const text = JSON.stringify(lesson);
  writeFileSync(file, text);
  const s = state.lessons[lessonId];
  updateLesson(paths.state, state, lessonId, {
    draftHash: await sha256Hex(new TextEncoder().encode(text)),
    warnings: (s?.warnings ?? []).filter((w) => !w.includes('没有语音')),
  });
  return written;
}
