import { useEffect, useState } from 'react';
import { listenCorrect, type ListenGame } from '../../lib/games';
import { sfx } from '../../lib/sfx';
import { canSpeakAloud, wordAudioUrl } from '../../lib/wordAudio';
import { Speaker } from './Speaker';
import type { GameViewProps } from './types';

/** 听音选择: 🔊 plays the word (once by itself), tap an answer, then 检查. */
export function ListenView({ game, onDone, done }: GameViewProps<ListenGame>) {
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => setPicked(null), [game]);
  // A word missing from an older pack on a device without a system voice: nothing to hear.
  const silent = !wordAudioUrl(game.lang, game.say) && !canSpeakAloud();

  const check = () => {
    if (picked === null) return;
    const ok = listenCorrect(game, picked);
    onDone({ correct: ok, missedWords: ok ? [] : (game.words ?? []), given: game.options[picked] });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center text-2xl font-bold">{game.title}</div>
      {silent ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-amber-50 p-4 text-center text-lg text-amber-900">
          这个词在这台设备上还没有声音，这题跳过，不扣分。
          {!done && (
            <button
              type="button"
              onClick={() => onDone({ correct: true, skipped: true, missedWords: [], given: '没有声音，跳过（不扣分）' })}
              className="rounded-2xl border-b-4 border-amber-600 bg-amber-400 px-8 py-3 text-xl font-bold text-white active:translate-y-0.5"
            >
              跳过这题
            </button>
          )}
        </div>
      ) : (
        <Speaker lang={game.lang} text={game.say} />
      )}
      <div className="text-center text-xl text-slate-600">{game.ask}</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {game.options.map((o, i) => {
          const tone = done
            ? i === game.answer
              ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
              : i === picked
                ? 'border-rose-400 bg-rose-50 text-rose-800'
                : 'border-slate-100 bg-white text-slate-300'
            : i === picked
              ? 'border-sky-400 bg-sky-50 text-sky-800'
              : 'border-slate-200 bg-white text-slate-700';
          return (
            <button
              key={i}
              type="button"
              disabled={done || silent}
              onClick={() => {
                sfx.tap();
                setPicked(i);
              }}
              className={`min-h-16 rounded-2xl border-2 border-b-4 px-4 py-3 text-2xl font-bold transition active:translate-y-0.5 ${tone} ${
                game.lang === 'zh' ? 'tracking-widest' : ''
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
      {!done && !silent && (
        <button
          type="button"
          disabled={picked === null}
          onClick={check}
          className="mx-auto rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-12 py-3 text-xl font-bold text-white disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
        >
          检查
        </button>
      )}
    </div>
  );
}
