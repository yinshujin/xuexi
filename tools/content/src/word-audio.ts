/**
 * The word audio pack for the 单元闯关 games 听音选择 and 拼写: every English
 * word / phrase of the 英语 banks (the picture books' child-friendly en-US
 * voice) and every 语文 听写 word (a zh-CN voice), one clip each, zipped with
 * a manifest (see @xuexi/course-pack word-audio.ts). Made at CI time by
 * .github/workflows/word-audio.yml; the app builds unpack it with
 * `pnpm content builtin`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { zipSync, type Zippable } from 'fflate';
import {
  sha256Hex,
  WORD_AUDIO_FORMAT,
  WORD_AUDIO_MANIFEST,
  wordAudioKey,
  wordAudioPath,
  type WordAudioLang,
  type WordAudioManifest,
} from '@xuexi/course-pack';
import { EN_G2A, EN_G4A, YW_G2A_WORDS, YW_G4A_WORDS } from '@xuexi/practice';
import type { BookVoice } from './books/tts';

export interface WordAudioText {
  lang: WordAudioLang;
  text: string;
}

/** Every word the games may speak: 英语 bank words, then 语文 听写 words (each once). */
export function wordAudioTexts(): WordAudioText[] {
  const out = new Map<string, WordAudioText>();
  const add = (lang: WordAudioLang, text: string) => {
    const t = text.replace(/\s+/g, ' ').trim();
    if (t && !out.has(wordAudioKey(lang, t))) out.set(wordAudioKey(lang, t), { lang, text: t });
  };
  for (const bank of [EN_G2A, EN_G4A]) for (const w of bank.words) add('en', w.en);
  for (const list of [YW_G2A_WORDS, YW_G4A_WORDS]) for (const words of Object.values(list)) for (const d of words) add('zh', d.w);
  return [...out.values()];
}

export interface WordAudioOptions {
  /** The voice for each language (edge-tts on CI: the books' en-US voice and a zh-CN one). */
  voices: Record<WordAudioLang, BookVoice>;
  /** Clips keyed by sha256(voice key + text), shared across runs (CI cache). */
  cacheDir: string;
  /** The zip to write. */
  out: string;
  /** Defaults to wordAudioTexts(). */
  texts?: WordAudioText[];
  force?: boolean;
  log?: (s: string) => void;
}

export interface WordAudioResult {
  file: string;
  words: number;
  /** Clips synthesized now (the rest came from the cache). */
  synthesized: number;
  bytes: number;
}

export async function buildWordAudioPack(o: WordAudioOptions): Promise<WordAudioResult> {
  const texts = o.texts ?? wordAudioTexts();
  mkdirSync(o.cacheDir, { recursive: true });
  const jobs = await Promise.all(
    texts.map(async (t) => {
      const voice = o.voices[t.lang];
      const hash = await sha256Hex(new TextEncoder().encode(`${voice.cacheKey}\n${t.text}`));
      return { ...t, voice, cached: join(o.cacheDir, `${hash}.${voice.ext}`), words: join(o.cacheDir, `${hash}.words.json`) };
    }),
  );
  let synthesized = 0;
  for (const lang of ['en', 'zh'] as const) {
    const voice = o.voices[lang];
    const missing = jobs.filter((j) => j.lang === lang && (o.force || !existsSync(j.cached)));
    const unique = [...new Map(missing.map((j) => [j.cached, j])).values()];
    if (!unique.length) continue;
    o.log?.(`  ${lang === 'en' ? '英语' : '语文'}：合成 ${unique.length} 个词`);
    await voice.synthesize(unique.map((j) => ({ text: j.text, audio: j.cached, words: j.words })));
    synthesized += unique.length;
  }

  const zip: Zippable = {};
  const manifest: WordAudioManifest = {
    format: WORD_AUDIO_FORMAT,
    builtAt: new Date().toISOString(),
    voices: { en: o.voices.en.cacheKey, zh: o.voices.zh.cacheKey },
    words: {},
    files: {},
  };
  let bytes = 0;
  for (const j of jobs) {
    if (!existsSync(j.cached)) throw new Error(`没有合成出「${j.text}」的语音`);
    const data = new Uint8Array(readFileSync(j.cached));
    if (data.byteLength === 0) throw new Error(`「${j.text}」的语音是空的`);
    const rel = await wordAudioPath(j.lang, j.text, j.voice.ext);
    manifest.words[wordAudioKey(j.lang, j.text)] = rel;
    if (!manifest.files[rel]) {
      manifest.files[rel] = { bytes: data.byteLength, sha256: await sha256Hex(data) };
      zip[rel] = [data, { level: 0 }];
      bytes += data.byteLength;
    }
  }
  zip[WORD_AUDIO_MANIFEST] = [new TextEncoder().encode(JSON.stringify(manifest)), { level: 6 }];
  mkdirSync(dirname(o.out), { recursive: true });
  writeFileSync(o.out, zipSync(zip));
  return { file: o.out, words: jobs.length, synthesized, bytes };
}
