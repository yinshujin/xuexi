import { useEffect, useState } from 'react';
import { sayWord, stopWord, type WordAudioLang } from '../../lib/wordAudio';

/**
 * The big 🔊 of 听音选择 / 拼写 (and a 🐢 for slower): plays the word from the
 * word audio pack, falling back to the system voice. Plays once by itself when
 * `autoPlay` (browsers may block that until the first tap; the child taps 🔊 then).
 */
export function Speaker({ lang, text, autoPlay = true, slow = true }: { lang: WordAudioLang; text: string; autoPlay?: boolean; slow?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const play = async (rate = 1) => {
    setPlaying(true);
    await sayWord(lang, text, rate);
    setPlaying(false);
  };
  useEffect(() => {
    if (autoPlay) void play();
    return stopWord;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, text]);

  return (
    <div className="flex items-end justify-center gap-4">
      <button
        type="button"
        aria-label="再听一遍"
        onClick={() => void play()}
        className={`flex h-24 w-24 items-center justify-center rounded-3xl border-b-8 border-sky-700 bg-sky-500 text-5xl text-white shadow transition active:translate-y-1 active:border-b-4 ${
          playing ? 'animate-pulse' : ''
        }`}
      >
        🔊
      </button>
      {slow && (
        <button
          type="button"
          aria-label="慢一点"
          onClick={() => void play(0.7)}
          className="flex h-16 w-16 items-center justify-center rounded-2xl border-b-4 border-sky-300 bg-sky-100 text-3xl transition active:translate-y-0.5"
        >
          🐢
        </button>
      )}
    </div>
  );
}
