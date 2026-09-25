import { useEffect, useMemo, useState } from 'react';
import { findKnowledgePoint } from '@xuexi/curriculum';
import type { DictWord } from '@xuexi/practice';
import type { ChildProfile } from '@xuexi/shared';
import { displayPinyin, missedWords, roundOrder, saveResults, wordsOf } from '../lib/dictation';
import { navigate } from '../lib/router';
import { Btn, Card, Empty, Page, Stars } from '../components/ui';

/** ✍️ 看拼音写词语: pinyin on screen, the word on paper, then check and mark. */
export function DictationPage({ child, kpId, back }: { child: ChildProfile; kpId: string; back: string }) {
  const kp = findKnowledgePoint(kpId)?.kp;
  const words = useMemo(() => wordsOf(kpId), [kpId]);
  const [round, setRound] = useState<DictWord[] | null>(null);
  const [missed, setMissed] = useState<string[]>([]);
  const [at, setAt] = useState(0);
  const [shown, setShown] = useState(false);
  const [right, setRight] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [n, setN] = useState(0);

  useEffect(() => {
    void missedWords(child.id).then((m) => {
      const miss = m[kpId] ?? [];
      setMissed(miss);
      setRound(roundOrder(words, miss));
      setAt(0);
      setShown(false);
      setRight([]);
      setWrong([]);
    });
  }, [child.id, kpId, words, n]);

  const title = `✍️ 看拼音写词语${kp ? ` · ${kp.title}` : ''}`;
  if (words.length === 0) {
    return (
      <Page title={title} back={back}>
        <Empty>这一课还没有听写词语。</Empty>
      </Page>
    );
  }
  if (!round) return null;

  if (at >= round.length) {
    const ratio = right.length / round.length;
    return (
      <Page title={title} back={back}>
        <Card className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 py-8 text-center">
          <div className="text-6xl">
            <Stars n={ratio === 1 ? 3 : ratio >= 0.8 ? 2 : 1} />
          </div>
          <div className="text-3xl font-bold">
            写对 {right.length} / {round.length} 个
          </div>
          {wrong.length > 0 ? (
            <div className="w-full text-left">
              <p className="mb-2 text-lg text-slate-600">这些词订正一下，每个写三遍，下次会先考它们：</p>
              <div className="flex flex-wrap gap-2">
                {round
                  .filter((d) => wrong.includes(d.w))
                  .map((d) => (
                    <span key={d.w} className="rounded-xl bg-rose-50 px-3 py-2 text-center ring-1 ring-rose-200">
                      <span className="block text-sm text-slate-500">{displayPinyin(d)}</span>
                      <span className="text-2xl">{d.w}</span>
                    </span>
                  ))}
              </div>
            </div>
          ) : (
            <p className="text-lg text-emerald-700">全部写对了，太棒了！</p>
          )}
          <div className="flex gap-3">
            <Btn onClick={() => setN((x) => x + 1)}>再写一遍</Btn>
            <Btn tone="plain" onClick={() => navigate(back)}>
              返回
            </Btn>
          </div>
        </Card>
      </Page>
    );
  }

  const d = round[at];
  const mark = async (ok: boolean) => {
    const r = ok ? [...right, d.w] : right;
    const w = ok ? wrong : [...wrong, d.w];
    setRight(r);
    setWrong(w);
    setShown(false);
    if (at + 1 >= round.length) await saveResults(child.id, kpId, r, w);
    setAt(at + 1);
  };
  return (
    <Page
      title={title}
      back={back}
      right={
        <span className="rounded-full bg-white px-4 py-2 text-lg tabular-nums shadow-sm ring-1 ring-slate-200">
          {at + 1} / {round.length}
        </span>
      }
    >
      <Card className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 py-10 text-center">
        {missed.includes(d.w) && <span className="rounded-full bg-rose-50 px-3 text-rose-700">上次写错的词</span>}
        <div className="text-5xl font-medium tracking-wide text-slate-800">{displayPinyin(d)}</div>
        <p className="text-lg text-slate-500">{shown ? '对一对，写对了吗？' : '在本子上写出这个词语，写好了再看答案。'}</p>
        {shown ? (
          <>
            <div className="text-6xl font-bold tracking-widest">{d.w}</div>
            <div className="flex gap-3">
              <Btn tone="green" onClick={() => void mark(true)}>
                ✓ 写对了
              </Btn>
              <Btn tone="danger" onClick={() => void mark(false)}>
                ✗ 写错了
              </Btn>
            </div>
          </>
        ) : (
          <Btn onClick={() => setShown(true)}>看答案</Btn>
        )}
      </Card>
    </Page>
  );
}
