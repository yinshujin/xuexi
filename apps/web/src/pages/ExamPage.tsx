import { useEffect, useMemo, useRef, useState } from 'react';
import { BOOKS, SUBJECT_LABEL } from '@xuexi/curriculum';
import { EXAM_EVENT_PREFIX, type ChildProfile } from '@xuexi/shared';
import type { Question } from '@xuexi/practice';
import { useApp } from '../lib/store';
import { href, navigate } from '../lib/router';
import { gradeQuestion, makeQuestion } from '../lib/learning';
import {
  answerXp,
  COMBO_CHEERS,
  examHistory,
  examUnits,
  findPaper,
  finishXp,
  medalOf,
  MEDAL_ICON,
  responseText,
  scoreExam,
  totalXp,
  unitPapers,
  type ExamAnswer,
  type ExamPaper,
} from '../lib/exams';
import { gameAnswerText, gameAvailable, gamePrompt, loadGameEnv, type GameEnv } from '../lib/games';
import { saveResults } from '../lib/dictation';
import { sfx } from '../lib/sfx';
import { uuid } from '../lib/format';
import { Btn, Card, Empty, Page } from '../components/ui';
import { answerText, QuestionView } from '../practice/QuestionView';
import { GAME_VIEWS, type GameOutcome } from '../practice/games';

const SUBJECT_TONE = { math: 'from-sky-500 to-cyan-400', chinese: 'from-rose-500 to-orange-400', english: 'from-violet-500 to-fuchsia-400', writing: 'from-amber-500 to-lime-400' } as const;

// ================================================================ the map

/** 🏆 单元闯关: each book's units as a path, with papers A/B/C and the medals won. */
export function ExamMap({ child, query }: { child: ChildProfile; query: URLSearchParams }) {
  const { eventsOf } = useApp();
  const events = eventsOf(child.id);
  const history = useMemo(() => examHistory(events), [events]);
  const xp = useMemo(() => totalXp(events), [events]);
  const units = useMemo(() => examUnits(child.bookIds), [child.bookIds]);
  const books = BOOKS.filter((b) => units.some((u) => u.book.id === b.id));
  const [bookId, setBookId] = useState(query.get('book') ?? books[0]?.id ?? '');
  const mine = units.filter((u) => u.book.id === bookId);
  const golds = [...history.values()].filter((h) => medalOf(h.best) === 'gold').length;

  if (units.length === 0) {
    return (
      <Page title="🏆 单元闯关" back={`/c/${child.id}`}>
        <Empty>还没有可以考的单元。</Empty>
      </Page>
    );
  }
  return (
    <Page
      title="🏆 单元闯关"
      back={`/c/${child.id}`}
      right={
        <span className="flex gap-2 text-lg">
          <span className="rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-800">⚡ {xp} XP</span>
          <span className="rounded-full bg-yellow-100 px-3 py-1 font-bold text-yellow-800">🥇 {golds}</span>
        </span>
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {books.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBookId(b.id)}
            className={`rounded-2xl border-b-4 px-5 py-2 text-lg font-bold ${
              b.id === bookId ? `border-black/20 bg-gradient-to-r ${SUBJECT_TONE[b.subject]} text-white` : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {SUBJECT_LABEL[b.subject]}
          </button>
        ))}
      </div>
      <div className="mx-auto flex w-full max-w-xl flex-col items-center">
        {mine.map(({ book, unit }, i) => {
          const papers = unitPapers(unit.id);
          const bests = papers.map((p) => history.get(p.id)?.best);
          const crown = bests.every((b) => medalOf(b) === 'gold');
          const started = bests.some((b) => b !== undefined);
          const shift = [0, 56, 0, -56][i % 4];
          return (
            <div key={unit.id} className="flex w-full flex-col items-center" style={{ transform: `translateX(${shift}px)` }}>
              {i > 0 && <div className="h-6 w-2 rounded-full bg-slate-200" />}
              <div
                className={`relative flex h-20 w-20 items-center justify-center rounded-full border-b-8 text-3xl font-black shadow ${
                  crown
                    ? 'border-yellow-600 bg-yellow-400 text-white'
                    : started
                      ? `border-black/20 bg-gradient-to-br ${SUBJECT_TONE[book.subject]} text-white`
                      : 'border-slate-300 bg-white text-slate-400'
                }`}
              >
                {crown ? '👑' : unit.index}
              </div>
              <div className="mt-1 max-w-72 text-center text-lg font-bold">
                第 {unit.index} 单元 · {unit.title}
              </div>
              <div className="mt-2 flex gap-2">
                {papers.map((p, k) => {
                  const m = medalOf(bests[k]);
                  return (
                    <a
                      key={p.id}
                      href={href(`/c/${child.id}/exam/${p.id}?back=${encodeURIComponent(`/c/${child.id}/exams?book=${book.id}`)}`)}
                      className="flex min-w-20 flex-col items-center rounded-2xl border-2 border-b-4 border-slate-200 bg-white px-3 py-1 active:translate-y-0.5"
                    >
                      <span className="font-bold">{p.name}</span>
                      <span className="text-sm text-slate-500">{bests[k] === undefined ? '去挑战' : `${m ? MEDAL_ICON[m] : '💪'} ${bests[k]}分`}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-8 text-center text-slate-500">每张卷子覆盖本单元全部知识点。90 分拿金牌🥇，一个单元的卷子都拿金牌就戴上皇冠👑。</p>
    </Page>
  );
}

// ================================================================ one paper

type Feedback = {
  correct: boolean;
  answer: string;
  xp: number;
  cheer?: string;
  /** Not the child's fault: shown neutral, no answer. */
  skipped?: boolean;
  /** Questions worth several points (a reading passage, 限时挑战): points got out of the weight. */
  partial?: { got: number; of: number };
};

export function ExamPage({ child, paperId, back }: { child: ChildProfile; paperId: string; back: string }) {
  const paper = findPaper(paperId);
  if (!paper) {
    return (
      <Page title="单元闯关" back={back}>
        <Empty>找不到这张卷子</Empty>
      </Page>
    );
  }
  return <ExamRun key={paper.id} child={child} paper={paper} back={back} />;
}

function ExamRun({ child, paper: full, back }: { child: ChildProfile; paper: ExamPaper; back: string }) {
  const { addEvent, deviceId, eventsOf } = useApp();
  // Games this device cannot run (开口读 without 讯飞, 听音 without the audio pack …) are left out.
  const [env, setEnv] = useState<GameEnv | null>(null);
  useEffect(() => {
    void loadGameEnv().then(setEnv);
  }, []);
  const paper = useMemo(
    () => (env ? { ...full, items: full.items.filter((it) => !it.game || gameAvailable(it.game, env)) } : full),
    [full, env],
  );
  const best = examHistory(eventsOf(child.id)).get(paper.id);
  const [stage, setStage] = useState<'intro' | 'run' | 'result'>('intro');
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Array<(ExamAnswer & { given?: string }) | undefined>>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [xp, setXp] = useState(0);
  const [bonus, setBonus] = useState(0);
  const started = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  const item = paper.items[idx];
  const question = useMemo<Question | null>(() => (item?.ref ? makeQuestion(item.ref) : null), [item]);

  const answered = (a: ExamAnswer & { given?: string }, answer: string, extra: { skipped?: boolean; weight?: number } = {}) => {
    setAnswers((xs) => {
      const next = [...xs];
      next[idx] = a;
      return next;
    });
    if (extra.skipped) {
      // Not the child's fault: no XP, the streak stays as it was.
      setFeedback({ correct: true, answer, xp: 0, skipped: true });
      return;
    }
    const weight = extra.weight ?? 1;
    const got = a.earned ?? (a.correct ? weight : 0);
    const c = a.correct ? combo + 1 : 0;
    // A question worth several points gives XP for every point got.
    const gain = weight > 1 ? got * 10 + (a.correct && c >= 3 ? 5 : 0) : answerXp(a.correct, c);
    setCombo(c);
    setBestCombo((b) => Math.max(b, c));
    setXp((x) => x + gain);
    const cheer = a.correct ? COMBO_CHEERS[c] : undefined;
    if (cheer) sfx.combo();
    else if (a.correct || got > 0) sfx.right();
    else sfx.wrong();
    setFeedback({ correct: a.correct, answer, xp: gain, cheer, ...(weight > 1 ? { partial: { got, of: weight } } : {}) });
  };

  const onQuestion = async (o: { response: ExamAnswer['response']; result: { correct: boolean; errorTags: string[] }; durationMs: number }) => {
    if (!item?.ref || !question) return;
    answered({ correct: o.result.correct, response: o.response }, answerText(question));
    // Every question counts like practice: a wrong one goes to the 错题本.
    await addEvent({
      type: 'attempt',
      id: uuid(),
      childId: child.id,
      at: Date.now(),
      deviceId,
      kpId: item.kpId,
      question: item.ref,
      correct: o.result.correct,
      response: o.response,
      errorTags: o.result.errorTags as never,
      durationMs: o.durationMs,
      mode: 'unit-test',
    });
  };

  const onGame = (o: GameOutcome) => {
    if (!item?.game) return;
    answered({ correct: o.correct, response: null, given: o.given, earned: o.earned }, gameAnswerText(item.game), {
      skipped: o.skipped,
      weight: item.game.weight ?? 1,
    });
    // 语文 words matched / built wrong come back in 看拼音写词语.
    if (o.missedWords.length) void saveResults(child.id, item.kpId, [], o.missedWords);
  };

  const finish = async (final: Array<ExamAnswer | undefined>) => {
    const r = scoreExam(paper, final);
    const extra = finishXp(r.score);
    setBonus(extra);
    setElapsed(Date.now() - started.current);
    setStage('result');
    sfx.finish();
    await addEvent({
      type: 'lesson',
      id: uuid(),
      childId: child.id,
      at: Date.now(),
      deviceId,
      lessonId: EXAM_EVENT_PREFIX + paper.id,
      packVersion: 1,
      progress: 1,
      completed: true,
      durationMs: Date.now() - started.current,
      quizCorrect: r.correct,
      quizTotal: r.total,
      examScore: r.score,
      xp: xp + extra,
    });
  };

  const next = () => {
    setFeedback(null);
    if (idx + 1 >= paper.items.length) void finish(answers);
    else setIdx(idx + 1);
  };

  const exit = () => {
    if (stage === 'run' && !window.confirm('现在退出，这次闯关不算成绩。确定退出吗？')) return;
    navigate(back);
  };

  // ---------------------------------------------------------------- intro
  if (stage === 'intro') {
    return (
      <Page title={`${paper.name} · 第 ${paper.unitIndex} 单元`} back={back}>
        <Card className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 py-8 text-center">
          <div className="text-6xl">🏆</div>
          <div className="text-2xl font-bold">
            {SUBJECT_LABEL[paper.subject]} · {paper.unitTitle}
          </div>
          <div className="text-lg text-slate-600">
            {paper.items.length} 道题 · 满分 100 · 考这些知识点：
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {paper.kps.map((k) => (
              <span key={k.id} className="rounded-xl bg-sky-50 px-3 py-1 text-sky-800">
                {k.title}
              </span>
            ))}
          </div>
          <div className="text-slate-500">答对得 ⚡10 XP，连对 3 题以上每题再加 5。题型有连连看、拼一拼、听一听、开口读、拼单词、看图、排序、分类、判断、⚡限时挑战、写汉字和阅读，最后是拔高题和创新题！</div>
          {best && (
            <div className="text-lg">
              最好成绩 {medalOf(best.best) ? MEDAL_ICON[medalOf(best.best)!] : ''} <b>{best.best}</b> 分 · 考过 {best.times} 次
            </div>
          )}
          <button
            type="button"
            disabled={!env}
            onClick={() => {
              started.current = Date.now();
              setStage('run');
            }}
            className="rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-14 py-4 text-2xl font-bold text-white active:translate-y-0.5"
          >
            开始闯关
          </button>
        </Card>
      </Page>
    );
  }

  // ---------------------------------------------------------------- result
  if (stage === 'result') return <ExamResult child={child} paper={paper} answers={answers} xp={xp} bonus={bonus} bestCombo={bestCombo} elapsed={elapsed} back={back} />;

  // ---------------------------------------------------------------- questions
  const progress = (idx + (feedback ? 1 : 0)) / paper.items.length;
  const GameView = item.game ? GAME_VIEWS[item.game.kind] : undefined;
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 pb-44 pt-[max(env(safe-area-inset-top),12px)]">
      <header className="mb-4 flex items-center gap-3">
        <button type="button" aria-label="退出" onClick={exit} className="text-3xl text-slate-400">
          ✕
        </button>
        <div className="h-5 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className={`min-w-16 text-right text-xl font-bold ${combo >= 3 ? 'text-orange-500' : 'text-slate-400'}`}>🔥{combo}</span>
        <span className="text-lg font-bold text-amber-600">⚡{xp}</span>
      </header>
      <div className="mb-2 text-center text-sm text-slate-500">
        第 {idx + 1}/{paper.items.length} 题 · {item.kpTitle}
        {item.tier && <span className="ml-2 rounded-md bg-amber-100 px-2 text-amber-800">{item.tier === 'stretch' ? '⭐ 拔高题' : '💡 创新题'}</span>}
      </div>
      <Card className="w-full">
        {question && (
          <QuestionView key={`${paper.id}-${idx}`} question={question} grade={gradeQuestion} onFirstAnswer={(o) => void onQuestion(o)} onNext={() => {}} oneShot />
        )}
        {GameView && item.game && env && (
          <GameView key={`${paper.id}-${idx}`} game={item.game} onDone={onGame} done={!!feedback} env={env} childId={child.id} />
        )}
      </Card>

      {feedback && (
        <div
          className={`xx-rise fixed inset-x-0 bottom-0 z-40 border-t-2 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-4 ${
            feedback.skipped
              ? 'border-slate-300 bg-slate-100'
              : feedback.correct
                ? 'border-emerald-300 bg-emerald-100'
                : feedback.partial?.got
                  ? 'border-amber-300 bg-amber-100'
                  : 'border-rose-300 bg-rose-100'
          }`}
        >
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-4">
            <div className="text-5xl">{feedback.skipped ? '👌' : feedback.correct ? '🎉' : feedback.partial?.got ? '👍' : '💪'}</div>
            <div className="min-w-0 flex-1">
              <div className={`text-2xl font-black ${feedback.skipped ? 'text-slate-700' : feedback.correct ? 'text-emerald-700' : feedback.partial?.got ? 'text-amber-700' : 'text-rose-700'}`}>
                {feedback.skipped
                  ? '这题先跳过，不扣分'
                  : feedback.cheer ??
                    (feedback.partial
                      ? feedback.correct
                        ? `全对！得 ${feedback.partial.got} 分`
                        : `得了 ${feedback.partial.got} / ${feedback.partial.of} 分`
                      : feedback.correct
                        ? '答对了！'
                        : '差一点！')}
                {feedback.xp > 0 && <span className="xx-pop ml-3 inline-block text-amber-600">+{feedback.xp} XP</span>}
              </div>
              {!feedback.correct && !feedback.skipped && <div className="text-lg text-rose-800">正确答案：{feedback.answer}</div>}
            </div>
            <button
              type="button"
              onClick={next}
              autoFocus
              className={`rounded-2xl border-b-4 px-10 py-3 text-xl font-bold text-white active:translate-y-0.5 ${
                feedback.skipped ? 'border-sky-700 bg-sky-500' : feedback.correct ? 'border-emerald-700 bg-emerald-500' : feedback.partial?.got ? 'border-amber-700 bg-amber-500' : 'border-rose-700 bg-rose-500'
              }`}
            >
              {idx + 1 >= paper.items.length ? '看成绩' : '继续'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================ result

function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 2.2 + Math.random() * 1.8,
        ch: ['🎉', '⭐', '🟡', '🟢', '🔵', '🟣', '✨'][i % 7],
      })),
    [],
  );
  return (
    <>
      {bits.map((b, i) => (
        <span key={i} className="xx-confetti text-2xl" style={{ left: `${b.left}vw`, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }}>
          {b.ch}
        </span>
      ))}
    </>
  );
}

function CountUp({ to }: { to: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 900);
      setN(Math.round(to * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{n}</>;
}

function ExamResult({
  child,
  paper,
  answers,
  xp,
  bonus,
  bestCombo,
  elapsed,
  back,
}: {
  child: ChildProfile;
  paper: ExamPaper;
  answers: Array<(ExamAnswer & { given?: string }) | undefined>;
  xp: number;
  bonus: number;
  bestCombo: number;
  elapsed: number;
  back: string;
}) {
  const r = scoreExam(paper, answers);
  const medal = medalOf(r.score);
  const wrong = paper.items.map((it, i) => ({ it, a: answers[i], i })).filter((x) => !x.a?.correct);
  const minutes = Math.max(1, Math.round(elapsed / 60000));
  const siblings = unitPapers(paper.unitId);
  const nextPaper = siblings[paper.paper + 1];
  return (
    <Page title={`${paper.name} · 第 ${paper.unitIndex} 单元`} back={back}>
      {r.score >= 60 && <Confetti />}
      <Card className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 py-8 text-center">
        <div className="xx-pop text-7xl">{medal ? MEDAL_ICON[medal] : '💪'}</div>
        <div className="text-6xl font-black text-emerald-600">
          <CountUp to={r.score} />
          <span className="text-2xl"> 分</span>
        </div>
        <div className="text-xl font-bold">
          {medal === 'gold' ? '太厉害了，金牌！' : medal === 'silver' ? '很棒，银牌！再冲一冲金牌！' : medal === 'bronze' ? '过关了，铜牌！' : '还差一点点，练一练再来！'}
        </div>
        <div className="grid w-full grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-amber-50 p-2">
            <div className="text-2xl font-black text-amber-600">⚡{xp + bonus}</div>
            <div className="text-sm text-slate-500">经验{bonus ? `（含奖励 ${bonus}）` : ''}</div>
          </div>
          <div className="rounded-2xl bg-orange-50 p-2">
            <div className="text-2xl font-black text-orange-500">🔥{bestCombo}</div>
            <div className="text-sm text-slate-500">最多连对</div>
          </div>
          <div className="rounded-2xl bg-sky-50 p-2">
            <div className="text-2xl font-black text-sky-600">
              {r.correct}/{r.total}
            </div>
            <div className="text-sm text-slate-500">答对 · 用时 {minutes} 分钟</div>
          </div>
        </div>
      </Card>

      <Card className="mx-auto mt-4 w-full max-w-xl">
        <h2 className="mb-2 text-lg font-bold">各知识点</h2>
        <ul className="flex flex-col gap-2">
          {r.byKp.map((k) => {
            const ratio = k.total ? k.correct / k.total : 1;
            return (
              <li key={k.kpId} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate">{k.title}</span>
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className={`block h-full ${ratio >= 0.9 ? 'bg-emerald-500' : ratio >= 0.6 ? 'bg-amber-400' : 'bg-rose-500'}`}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </span>
                <span className="w-12 text-right tabular-nums">
                  {k.correct}/{k.total}
                </span>
                {ratio < 0.7 && (
                  <a className="text-sky-600 underline" href={href(`/c/${child.id}/kp/${k.kpId}`)}>
                    去练
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      {wrong.length > 0 && (
        <Card className="mx-auto mt-4 w-full max-w-xl">
          <h2 className="mb-2 text-lg font-bold">看看做错的题（已放进错题本）</h2>
          <ul className="divide-y divide-slate-100">
            {wrong.map(({ it, a, i }) => {
              const q = it.ref ? makeQuestion(it.ref) : null;
              return (
                <li key={i} className="py-3">
                  <div className="whitespace-pre-line text-lg">
                    <b className="mr-2 text-slate-400">{i + 1}.</b>
                    {q ? q.prompt : it.game ? gamePrompt(it.game) : ''}
                  </div>
                  <div className="text-rose-700">你的答案：{q ? responseText(q, a?.response ?? null) : (a?.given ?? '没有作答')}</div>
                  <div className="text-emerald-700">正确答案：{q ? answerText(q) : it.game ? gameAnswerText(it.game) : ''}</div>
                  {q && q.steps.length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-sky-700">看看怎么做</summary>
                      <ol className="mt-1 list-decimal pl-6">
                        {q.steps.map((s, k) => (
                          <li key={k}>
                            {s.text}
                            {s.formula && <div className="font-mono text-slate-600">{s.formula}</div>}
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Btn tone="plain" onClick={() => navigate(`/c/${child.id}/exam/${paper.id}?back=${encodeURIComponent(back)}&again=${Date.now()}`)}>
          再考一次
        </Btn>
        {nextPaper && (
          <Btn tone="green" onClick={() => navigate(`/c/${child.id}/exam/${nextPaper.id}?back=${encodeURIComponent(back)}`)}>
            挑战 {nextPaper.name} →
          </Btn>
        )}
        <Btn onClick={() => navigate(back)}>回闯关地图</Btn>
      </div>
    </Page>
  );
}
