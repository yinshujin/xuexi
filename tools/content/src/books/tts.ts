import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sha256Hex, type Book, type BookWord } from '@xuexi/course-pack';
import { REPO_ROOT, type Paths } from '../paths';
import { sayEngine } from '../tts';
import { bare, tokens } from './sentences';
import { bookDir, saveBook } from './store';

/** A spoken word from the TTS engine, in milliseconds from the start of the clip. */
export interface SpokenWord {
  text: string;
  start: number;
  end: number;
}

export interface BookVoice {
  name: string;
  ext: string;
  cacheKey: string;
  /** Synthesize every job; `words` is written when the engine knows word timings. */
  synthesize(jobs: Array<{ text: string; audio: string; words: string }>): Promise<void>;
}

/** Microsoft Edge voice via edge-tts (needs `pip3 install edge-tts` and the internet). */
export function edgeBookVoice(voice = 'en-US-AnaNeural', rate = '-10%', concurrency = 4): BookVoice {
  return {
    name: 'edge',
    ext: 'mp3',
    cacheKey: `edge-words:${voice}:${rate}`,
    synthesize(jobs) {
      if (jobs.length === 0) return Promise.resolve();
      const script = join(REPO_ROOT, 'tools', 'content', 'scripts', 'edge_tts_words.py');
      return new Promise((resolve, reject) => {
        const child = spawn(
          process.env.PYTHON ?? 'python3',
          [script, '--voice', voice, '--rate', rate, '--concurrency', String(concurrency)],
          { stdio: ['pipe', 'inherit', 'inherit'] },
        );
        child.on('error', reject);
        child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`edge-tts 退出码 ${code}`))));
        child.stdin.end(JSON.stringify(jobs));
      });
    },
  };
}

/** macOS built-in voice (offline). No word timings: the app spreads the words over the clip. */
export function sayBookVoice(voice = 'Samantha', rate = 150): BookVoice {
  const engine = sayEngine(voice, rate);
  return {
    name: 'say',
    ext: engine.ext,
    cacheKey: `say-words:${voice}:${rate}`,
    async synthesize(jobs) {
      for (const j of jobs) await engine.synthesize(j.text, j.audio);
    },
  };
}

/**
 * Match the engine's spoken words to the printed tokens (which keep their
 * punctuation). Tokens the engine skipped are placed between their
 * neighbours; with too few matches the timings are dropped (the app then
 * estimates them from the clip length).
 */
export function alignWords(sentence: string, spoken: SpokenWord[]): BookWord[] | undefined {
  const toks = tokens(sentence);
  const times: Array<{ start: number; end: number } | null> = toks.map(() => null);
  let k = 0;
  toks.forEach((tok, i) => {
    const b = bare(tok);
    if (!b) return;
    for (let j = k; j < Math.min(spoken.length, k + 4); j++) {
      const s = bare(spoken[j].text);
      if (s && (s === b || b.startsWith(s) || s.startsWith(b))) {
        times[i] = { start: spoken[j].start, end: spoken[j].end };
        k = j + 1;
        return;
      }
    }
  });
  const matched = times.filter(Boolean).length;
  const wordy = toks.filter((t) => bare(t)).length;
  if (wordy === 0 || matched / wordy < 0.8) return undefined;
  // Fill gaps (punctuation-only tokens, skipped words) from the neighbours.
  const out: BookWord[] = [];
  for (let i = 0; i < toks.length; i++) {
    let t = times[i];
    if (!t) {
      const prev = out[i - 1]?.end ?? 0;
      const next = times.slice(i + 1).find(Boolean)?.start ?? prev + 300;
      t = { start: prev, end: Math.max(prev, next) };
    }
    out.push({ w: toks[i], start: t.start, end: t.end });
  }
  return out;
}

export interface BookTtsOptions {
  voice: BookVoice;
  cacheDir: string;
  force?: boolean;
  log?: (s: string) => void;
}

/** Narrate every sentence that has no audio yet. Returns the number of clips made. */
export async function narrateBook(paths: Paths, book: Book, o: BookTtsOptions): Promise<number> {
  const dir = bookDir(paths, book.id);
  mkdirSync(join(dir, 'audio'), { recursive: true });
  mkdirSync(o.cacheDir, { recursive: true });
  type Todo = { page: number; idx: number; text: string; cached: string };
  const todo: Todo[] = [];
  for (const [pi, page] of book.pages.entries()) {
    for (const [si, s] of page.sentences.entries()) {
      if (s.audio && !o.force && existsSync(join(dir, s.audio))) continue;
      const key = await sha256Hex(new TextEncoder().encode(`${o.voice.cacheKey}\n${s.text}`));
      todo.push({ page: pi, idx: si, text: s.text, cached: join(o.cacheDir, key) });
    }
  }
  const missing = todo.filter((t) => o.force || !existsSync(`${t.cached}.${o.voice.ext}`));
  const unique = [...new Map(missing.map((t) => [t.cached, t])).values()];
  if (unique.length) o.log?.(`  ${book.id}：合成 ${unique.length} 句`);
  await o.voice.synthesize(unique.map((t) => ({ text: t.text, audio: `${t.cached}.${o.voice.ext}`, words: `${t.cached}.words.json` })));

  for (const t of todo) {
    const rel = `audio/p${String(t.page + 1).padStart(2, '0')}-s${t.idx + 1}.${o.voice.ext}`;
    copyFileSync(`${t.cached}.${o.voice.ext}`, join(dir, rel));
    const s = book.pages[t.page].sentences[t.idx];
    s.audio = rel;
    const wordsFile = `${t.cached}.words.json`;
    const words = existsSync(wordsFile) ? alignWords(s.text, JSON.parse(readFileSync(wordsFile, 'utf8'))) : undefined;
    if (words) s.words = words;
    else delete s.words;
  }
  saveBook(paths, book);
  return todo.length;
}
