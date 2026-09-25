import { useEffect, useMemo, useRef, useState } from 'react';
import { findKnowledgePoint } from '@xuexi/curriculum';
import { practiceSizeOf, type ChildProfile, type LearningEvent, type PracticeMode } from '@xuexi/shared';
import { useApp } from '../lib/store';
import { navigate } from '../lib/router';
import {
  childKps,
  dailyItems,
  extraItems,
  gradeQuestion,
  ItemPicker,
  makeQuestion,
  mistakeItems,
  progressMap,
  setShape,
  type SessionItem,
} from '../lib/learning';
import { kvSet } from '../lib/db';
import { dayKey, uuid } from '../lib/format';
import { Btn, Card, Empty, Page, Stars } from '../components/ui';
import { QuestionView, type AnswerOutcome } from '../practice/QuestionView';

const SPEED_SECONDS = 60;
const SPEED_GENERATORS = new Set(['g2.mul.table', 'g2.div.table', 'g2.addsub.2d', 'g4.oral.muldiv']);

const TITLES: Record<string, string> = {
  kp: '专项练习',
  speed: '口算速练',
  mistakes: '错题重练',
  review: '到期复习',
  daily: '今日任务',
  extra: '加练',
};

/** Set when today's 今日任务 is finished (ChildHome then offers 加练). */
export const dailyDoneKey = (childId: string, day = dayKey(Date.now())) => `dailyDone:${childId}:${day}`;

interface Result {
  correct: number;
  total: number;
}

/** Build the fixed item list for modes that are planned up front. */
function plannedItems(
  mode: string,
  child: ChildProfile,
  events: LearningEvent[],
  settings: Parameters<typeof dailyItems>[2],
  picker: ItemPicker,
): SessionItem[] {
  if (mode === 'mistakes') return mistakeItems(events);
  if (mode === 'daily') return dailyItems(child, events, settings);
  if (mode === 'extra') return extraItems(child, events, settings, practiceSizeOf(settings), picker);
  if (mode === 'review') {
    const progress = progressMap(events, settings);
    const due = childKps(child).filter((k) => progress.get(k.kp.id)?.reviewDue).slice(0, 4);
    return due.flatMap((k) =>
      Array.from({ length: 4 }, (_, i) => picker.next(events, settings, k.kp, i, 'review')).filter(
        (x): x is SessionItem => x !== null,
      ),
    );
  }
  return [];
}

export function PracticePage({
  child,
  mode,
  query,
  back,
}: {
  child: ChildProfile;
  mode: string;
  query: URLSearchParams;
  back: string;
}) {
  const { eventsOf, addEvent, family, deviceId } = useApp();
  const events = eventsOf(child.id);
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const kpId = query.get('kp') ?? '';
  const kp = kpId ? findKnowledgePoint(kpId)?.kp : undefined;
  const [round, setRound] = useState(0);

  // One picker per set: no question twice in a set, recently seen ones avoided.
  const picker = useMemo(
    () => new ItemPicker(eventsRef.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, child.id, kpId, round],
  );
  // Planned modes freeze their list when the session starts.
  const planned = useMemo(
    () => plannedItems(mode, child, eventsRef.current, family.settings, picker),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, child.id, round, picker],
  );
  const adaptive = mode === 'kp' || mode === 'speed';
  // 专项: routine questions, then 拔高 / 创新 at the end.
  const shape = useMemo(() => (kp && mode === 'kp' ? setShape(kp, practiceSizeOf(family.settings)) : []), [kp, mode, family.settings]);
  const total = adaptive ? (mode === 'speed' ? Infinity : shape.length) : planned.length;

  const [index, setIndex] = useState(0);
  const [item, setItem] = useState<SessionItem | null>(null);
  const [result, setResult] = useState<Result>({ correct: 0, total: 0 });
  const [done, setDone] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const pick = (i: number): SessionItem | null => {
    if (!adaptive) return planned[i] ?? null;
    if (!kp) return null;
    const slot = shape[i];
    if (mode === 'kp' && slot && slot !== 'core') {
      const ch = picker.challenge(eventsRef.current, family.settings, kp, slot, 'kp');
      if (ch) return ch;
    }
    const filter = mode === 'speed' ? (s: { generatorId: string }) => SPEED_GENERATORS.has(s.generatorId) : undefined;
    return picker.next(eventsRef.current, family.settings, kp, i, mode as PracticeMode, filter);
  };

  useEffect(() => {
    setIndex(0);
    setResult({ correct: 0, total: 0 });
    setDone(false);
    setItem(pick(0));
    setDeadline(mode === 'speed' ? Date.now() + SPEED_SECONDS * 1000 : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, kpId, round, planned]);

  useEffect(() => {
    if (done && mode === 'daily' && result.total > 0) void kvSet(dailyDoneKey(child.id), true);
  }, [done, mode, result.total, child.id]);

  useEffect(() => {
    if (!deadline || done) return;
    const t = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= deadline) setDone(true);
    }, 250);
    return () => clearInterval(t);
  }, [deadline, done]);

  const question = useMemo(() => (item ? makeQuestion(item.ref) : null), [item]);

  const onFirstAnswer = async (o: AnswerOutcome) => {
    if (!item) return;
    setResult((r) => ({ correct: r.correct + (o.result.correct ? 1 : 0), total: r.total + 1 }));
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
      errorTags: o.result.errorTags,
      durationMs: o.durationMs,
      mode: item.mode,
    });
  };

  const next = () => {
    const i = index + 1;
    if (i >= total) {
      setDone(true);
      return;
    }
    const it = pick(i);
    if (!it) {
      setDone(true);
      return;
    }
    setIndex(i);
    setItem(it);
  };

  const title = TITLES[mode] ?? '练习';
  if (!adaptive && planned.length === 0) {
    return (
      <Page title={title} back={back}>
        <Empty>
          {mode === 'mistakes'
            ? '错题本是空的，太棒了！🎉'
            : mode === 'review'
              ? '现在没有需要复习的知识点。'
              : mode === 'extra'
                ? '还没有可以加练的知识点，先去知识地图学一学吧。'
                : '今天没有可做的练习，先去知识地图看看课吧。'}
        </Empty>
      </Page>
    );
  }
  if (adaptive && !kp) return <Page title={title} back={back}><Empty>找不到这个知识点</Empty></Page>;

  if (done) {
    const ratio = result.total ? result.correct / result.total : 0;
    const stars = ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : result.total > 0 ? 1 : 0;
    return (
      <Page title={title} back={back}>
        <Card className="mx-auto flex w-full max-w-md flex-col items-center gap-4 py-10 text-center">
          <div className="text-6xl">
            <Stars n={stars} />
          </div>
          <div className="text-3xl font-bold">
            {mode === 'speed' ? `1 分钟做对了 ${result.correct} 题！` : `做对 ${result.correct} / ${result.total} 题`}
          </div>
          <div className="text-lg text-slate-600">
            {stars === 3 ? '太厉害了！' : stars === 2 ? '很不错，再接再厉！' : '做错的题已经放进错题本，明天再来消灭它们！'}
          </div>
          {mode === 'daily' && <div className="text-lg text-emerald-700">今日任务完成啦！还想多练一会儿吗？</div>}
          <div className="flex flex-wrap justify-center gap-3">
            {mode === 'daily' ? (
              <Btn tone="green" onClick={() => navigate(`/c/${child.id}/practice/extra?back=${encodeURIComponent(back)}`)}>
                💪 加练一组
              </Btn>
            ) : (
              <Btn onClick={() => setRound((r) => r + 1)}>{mode === 'extra' ? '💪 再加练一组' : '再来一组'}</Btn>
            )}
            <Btn tone="plain" onClick={() => navigate(back)}>
              返回
            </Btn>
          </div>
        </Card>
      </Page>
    );
  }

  const remaining = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;
  return (
    <Page
      title={title}
      back={back}
      right={
        <span className="rounded-full bg-white px-4 py-2 text-lg tabular-nums shadow-sm ring-1 ring-slate-200">
          {remaining !== null ? `⏱ ${remaining}s · 对 ${result.correct}` : `${index + 1} / ${total}`}
        </span>
      }
    >
      {item?.label && <div className="mb-2 text-center text-sm text-sky-700">{item.label}</div>}
      {question && (
        <Card className="mx-auto w-full max-w-3xl">
          <QuestionView question={question} grade={gradeQuestion} onFirstAnswer={onFirstAnswer} onNext={next} autoNext={mode === 'speed'} />
        </Card>
      )}
    </Page>
  );
}
