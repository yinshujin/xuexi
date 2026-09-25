import { useState } from 'react';
import type { WriteGame } from '../../lib/games';
import { charResultText, WordWriter, type CharResult } from '../WordWriter';
import type { GameViewProps } from './types';

/** 写汉字: each word's missing character(s), written stroke by stroke in a 田字格. */
export function WriteView({ game, onDone, done }: GameViewProps<WriteGame>) {
  const [at, setAt] = useState(0);
  const [results, setResults] = useState<CharResult[][]>([]);
  const item = game.items[at];
  const last = at + 1 >= game.items.length;
  const finished = results[at];

  const wordDone = (rs: CharResult[]) => {
    const all = [...results];
    all[at] = rs;
    setResults(all);
    if (!last) {
      if (rs.every((r) => r.ok)) window.setTimeout(() => setAt((x) => x + 1), 900);
      return;
    }
    const flat = all.flat();
    const right = flat.filter((r) => r.ok).length;
    onDone({
      correct: right === flat.length,
      earned: right,
      missedWords: game.items.filter((_, i) => all[i]?.some((r) => !r.ok)).map((it) => it.word),
      given: game.items.map((it, i) => `${it.word}：${(all[i] ?? []).map(charResultText).join('，')}`).join('；'),
    });
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-center text-2xl font-bold">{game.title}</div>
      {game.items.length > 1 && (
        <div className="text-slate-500">
          第 {at + 1} / {game.items.length} 个词
        </div>
      )}
      <WordWriter key={at} word={item.word} pinyin={item.pinyin} blanks={item.blanks} onDone={wordDone} disabled={done} />
      {finished && !last && finished.some((r) => !r.ok) && (
        <button
          type="button"
          onClick={() => setAt(at + 1)}
          className="rounded-2xl border-b-4 border-sky-700 bg-sky-500 px-10 py-3 text-xl font-bold text-white active:translate-y-0.5"
        >
          下一个词 →
        </button>
      )}
    </div>
  );
}
