/**
 * The built-in word audio pack (builtin/word-audio/, from xuexi-word-audio.zip
 * via `pnpm content builtin`): a clip for every English bank word and every
 * 语文 听写 word, for the 单元闯关 games 听音选择 and 拼写. Only the installed
 * apps (APK / desktop) have it; on the website the games that need it are left out.
 */
import { WORD_AUDIO_FORMAT, WORD_AUDIO_MANIFEST, wordAudioKey, type WordAudioLang, type WordAudioManifest } from '@xuexi/course-pack';

export type { WordAudioLang };

const base = () => new URL('builtin/word-audio/', document.baseURI).toString();
let words: Record<string, string> | null = null;
let loading: Promise<boolean> | null = null;

/** Load the pack's manifest once; true when the pack is there. */
export function loadWordAudio(): Promise<boolean> {
  loading ??= (async () => {
    try {
      const res = await fetch(base() + WORD_AUDIO_MANIFEST, { cache: 'no-store' });
      if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return false;
      const m = (await res.json()) as WordAudioManifest;
      if (m?.format !== WORD_AUDIO_FORMAT || !m.words || Object.keys(m.words).length === 0) return false;
      words = m.words;
      return true;
    } catch {
      return false;
    }
  })();
  return loading;
}

/** Whether the pack is loaded (after loadWordAudio). */
export const hasWordAudio = () => !!words;

/** The clip of a word, or undefined when the pack is missing or lacks it (call loadWordAudio first). */
export function wordAudioUrl(lang: WordAudioLang, text: string): string | undefined {
  const rel = words?.[wordAudioKey(lang, text)];
  return rel ? base() + rel : undefined;
}

let player: HTMLAudioElement | null = null;

/** Play a word's clip (`rate` < 1: slower); resolves false when there is none or it cannot play. */
export function playWord(lang: WordAudioLang, text: string, rate = 1): Promise<boolean> {
  const src = wordAudioUrl(lang, text);
  if (!src) return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      player ??= new Audio();
      player.pause();
      player.onended = () => resolve(true);
      player.onerror = () => resolve(false);
      player.src = src;
      player.playbackRate = rate;
      player.play().catch(() => resolve(false));
    } catch {
      resolve(false);
    }
  });
}

/** Whether the device has a system voice (the fallback for a word missing from the pack). */
export function canSpeakAloud(): boolean {
  return typeof globalThis.speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
}

/** Say a word: its clip from the pack, else the system voice. False when neither is there. */
export async function sayWord(lang: WordAudioLang, text: string, rate = 1): Promise<boolean> {
  if (wordAudioUrl(lang, text)) return playWord(lang, text, rate);
  if (!canSpeakAloud()) return false;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'en' ? 'en-US' : 'zh-CN';
    u.rate = 0.9 * rate;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

export function stopWord(): void {
  try {
    player?.pause();
    globalThis.speechSynthesis?.cancel();
  } catch {
    /* nothing playing */
  }
}

/** For tests: forget the loaded pack. */
export function resetWordAudio(m?: Pick<WordAudioManifest, 'words'>): void {
  words = m ? m.words : null;
  loading = m ? Promise.resolve(true) : null;
}
