/**
 * The word audio pack (xuexi-word-audio.zip): one spoken clip for every
 * English word / phrase of the 英语 banks and every 语文 听写 word, made with
 * edge-tts at CI time (`pnpm content word-audio`) and built into the app
 * (`pnpm content builtin` → builtin/word-audio/). The 单元闯关 games 听音选择
 * and 拼写 play them.
 *
 * Zip layout: word-audio.json (this manifest) plus the clips under en/ and zh/.
 */
import { sha256Hex } from './hash';

export const WORD_AUDIO_FORMAT = 'xuexi-word-audio@1';
/** The manifest's name, in the zip and in builtin/word-audio/. */
export const WORD_AUDIO_MANIFEST = 'word-audio.json';

export type WordAudioLang = 'en' | 'zh';

export interface WordAudioManifest {
  format: typeof WORD_AUDIO_FORMAT;
  builtAt: string;
  /** Engine and voice per language, e.g. "edge-words:en-US-AnaNeural:-10%". */
  voices: Partial<Record<WordAudioLang, string>>;
  /** wordAudioKey(lang, text) → clip path ("en/3f2a….mp3"). */
  words: Record<string, string>;
  /** Every clip with its size and hash (checked when unpacking). */
  files: Record<string, { bytes: number; sha256: string }>;
}

/** Lookup key of a word: language, then the text with spaces tidied (English in lower case). */
export function wordAudioKey(lang: WordAudioLang, text: string): string {
  const t = text.normalize('NFC').replace(/\s+/g, ' ').trim();
  return `${lang}:${lang === 'en' ? t.toLowerCase() : t}`;
}

/** Where a word's clip goes in the pack: a hash, so any text makes a safe file name. */
export async function wordAudioPath(lang: WordAudioLang, text: string, ext: string): Promise<string> {
  const h = await sha256Hex(new TextEncoder().encode(wordAudioKey(lang, text)));
  return `${lang}/${h.slice(0, 16)}.${ext}`;
}

export function isWordAudioZip(zipFiles: Record<string, Uint8Array>): boolean {
  return !!zipFiles[WORD_AUDIO_MANIFEST] && !zipFiles['bundle.json'];
}

/**
 * Read and verify a word audio pack from unzipped files: every clip the
 * manifest lists must be there with the right size and hash; words whose clip
 * is broken are dropped (and reported).
 */
export async function readWordAudioPack(
  zipFiles: Record<string, Uint8Array>,
): Promise<{ manifest: WordAudioManifest; files: Record<string, Uint8Array>; skipped: string[] }> {
  const bytes = zipFiles[WORD_AUDIO_MANIFEST];
  if (!bytes) throw new Error(`这不是单词语音包（缺少 ${WORD_AUDIO_MANIFEST}）`);
  let manifest: WordAudioManifest;
  try {
    manifest = JSON.parse(new TextDecoder().decode(bytes)) as WordAudioManifest;
  } catch {
    throw new Error('单词语音包已损坏');
  }
  if (manifest?.format !== WORD_AUDIO_FORMAT || typeof manifest.words !== 'object' || typeof manifest.files !== 'object') {
    throw new Error('单词语音包格式不支持，请更新 App');
  }
  const files: Record<string, Uint8Array> = {};
  const skipped: string[] = [];
  for (const [rel, info] of Object.entries(manifest.files)) {
    const data = zipFiles[rel];
    if (!/^(en|zh)\/[0-9a-f]+\.(mp3|m4a)$/.test(rel) || !data || data.byteLength !== info.bytes || (await sha256Hex(data)) !== info.sha256) {
      skipped.push(`单词语音 ${rel}：文件缺失或损坏`);
      continue;
    }
    files[rel] = data;
  }
  const words = Object.fromEntries(Object.entries(manifest.words).filter(([, rel]) => !!files[rel]));
  const kept = Object.fromEntries(Object.entries(manifest.files).filter(([rel]) => !!files[rel]));
  return { manifest: { ...manifest, words, files: kept }, files, skipped };
}
