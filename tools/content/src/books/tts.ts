import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sha256Hex, wordKey, type Book, type BookWord } from '@xuexi/course-pack';
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
          [script, `--voice=${voice}`, `--rate=${rate}`, `--concurrency=${concurrency}`],
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

/**
 * Narrate everything that has no audio yet: every sentence (with word
 * timings), each word on its own (tap a word to hear it), and the quiz
 * questions and options (听题选答案). Returns the number of clips placed.
 */
export async function narrateBook(paths: Paths, book: Book, o: BookTtsOptions): Promise<number> {
  const dir = bookDir(paths, book.id);
  mkdirSync(join(dir, 'audio'), { recursive: true });
  mkdirSync(o.cacheDir, { recursive: true });
  const ext = o.voice.ext;
  const has = (rel: string | undefined) => !!rel && !o.force && existsSync(join(dir, rel));

  /** One clip to place: `text` spoken, stored at `rel`, then `done(words file)` updates book.json. */
  type Slot = { text: string; rel: string; done: (wordsFile: string) => void };
  const slots: Slot[] = [];
  for (const [pi, page] of book.pages.entries()) {
    for (const [si, s] of page.sentences.entries()) {
      if (has(s.audio)) continue;
      slots.push({
        text: s.text,
        rel: `audio/p${String(pi + 1).padStart(2, '0')}-s${si + 1}.${ext}`,
        done: (wordsFile) => {
          const words = existsSync(wordsFile) ? alignWords(s.text, JSON.parse(readFileSync(wordsFile, 'utf8'))) : undefined;
          if (words) s.words = words;
          else delete s.words;
        },
      });
      s.audio = slots.at(-1)!.rel;
    }
  }
  for (const [qi, q] of (book.quiz ?? []).entries()) {
    const base = `audio/q${String(qi + 1).padStart(2, '0')}`;
    if (!has(q.audio)) {
      q.audio = `${base}.${ext}`;
      slots.push({ text: q.question, rel: q.audio, done: () => {} });
    }
    const opts = q.optionAudio?.length === q.options.length ? q.optionAudio : q.options.map((_, i) => `${base}-o${i + 1}.${ext}`);
    q.optionAudio = opts;
    q.options.forEach((text, i) => {
      if (!has(opts[i])) slots.push({ text, rel: opts[i], done: () => {} });
    });
  }
  const words = new Set<string>();
  for (const p of book.pages) for (const s of p.sentences) for (const t of tokens(s.text)) if (wordKey(t)) words.add(wordKey(t));
  book.wordAudio = Object.fromEntries(Object.entries(book.wordAudio ?? {}).filter(([k]) => words.has(k)));
  for (const w of [...words].sort()) {
    if (has(book.wordAudio[w])) continue;
    const rel = `audio/w-${w.replace(/[^a-z0-9]/g, '_')}.${ext}`;
    book.wordAudio[w] = rel;
    slots.push({ text: w, rel, done: () => {} });
  }

  const keyed = await Promise.all(
    slots.map(async (x) => ({ ...x, cached: join(o.cacheDir, await sha256Hex(new TextEncoder().encode(`${o.voice.cacheKey}\n${x.text}`))) })),
  );
  const missing = keyed.filter((t) => o.force || !existsSync(`${t.cached}.${ext}`));
  const unique = [...new Map(missing.map((t) => [t.cached, t])).values()];
  if (unique.length) o.log?.(`  ${book.id}：合成 ${unique.length} 段`);
  await o.voice.synthesize(unique.map((t) => ({ text: t.text, audio: `${t.cached}.${ext}`, words: `${t.cached}.words.json` })));

  for (const t of keyed) {
    copyFileSync(`${t.cached}.${ext}`, join(dir, t.rel));
    t.done(`${t.cached}.words.json`);
  }
  saveBook(paths, book);
  return keyed.length;
}
