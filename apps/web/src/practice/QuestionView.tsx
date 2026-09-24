import { useEffect, useRef, useState } from 'react';
import type { GradeResult, Question, Response } from '@xuexi/practice';
import { AngleView } from './AngleView';
import { NumberPad } from './NumberPad';
import { RulerView } from './RulerView';
import { VerticalGrid } from './VerticalGrid';

export interface AnswerOutcome {
  response: Response;
  result: GradeResult;
  durationMs: number;
  /** True when the first try was wrong and the child tried again after the hint. */
  hinted: boolean;
}

export interface QuestionViewProps {
  question: Question;
  grade: (q: Question, r: Response) => GradeResult;
  /** Called once per question with the FIRST try (used for mastery). */
  onFirstAnswer: (o: AnswerOutcome) => void;
  /** Called when the child is ready for the next question. */
  onNext: () => void;
  /** Speed drills: move on automatically after a correct answer. */
  autoNext?: boolean;
}

type Phase = 'answering' | 'retry' | 'done';

function answerText(q: Question): string {
  const a = q.answer;
  switch (a.type) {
    case 'number':
      return String(a.value);
    case 'choice':
      return q.options?.[a.index] ?? '';
    case 'compare':
      return a.value;
    case 'division':
      return a.remainder ? `${a.quotient} …… ${a.remainder}` : String(a.quotient);
  }
}

export function QuestionView({ question: q, grade, onFirstAnswer, onNext, autoNext }: QuestionViewProps) {
  const [phase, setPhase] = useState<Phase>('answering');
  const [text, setText] = useState('');
  const [quotient, setQuotient] = useState('');
  const [remainder, setRemainder] = useState('');
  const [divField, setDivField] = useState<'q' | 'r'>('q');
  const [last, setLast] = useState<GradeResult | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const started = useRef(Date.now());
  const firstReported = useRef(false);
  const firstTryCorrect = useRef(false);

  useEffect(() => {
    setPhase('answering');
    setText('');
    setQuotient('');
    setRemainder('');
    setDivField('q');
    setLast(null);
    setShowSteps(false);
    started.current = Date.now();
    firstReported.current = false;
    firstTryCorrect.current = false;
  }, [q.key]);

  const submit = (response: Response) => {
    if (phase === 'done') return;
    const result = grade(q, response);
    setLast(result);
    if (!firstReported.current) {
      firstReported.current = true;
      firstTryCorrect.current = result.correct;
      onFirstAnswer({ response, result, durationMs: Date.now() - started.current, hinted: false });
    }
    if (result.correct) {
      setPhase('done');
      if (autoNext) setTimeout(onNext, 350);
    }
    else if (phase === 'answering') setPhase('retry');
    else {
      setPhase('done');
      setShowSteps(true);
    }
  };

  const numeric = (s: string): number | null => (s === '' || s === '-' ? null : Number(s));
  const disabled = phase === 'done';
  const allowMinus = q.generatorId === 'g4.negative';

  let input: React.ReactNode = null;
  if (q.widget === 'vertical' && q.vertical) {
    input = <VerticalGrid spec={q.vertical} disabled={disabled} onSubmit={submit} />;
  } else if (q.widget === 'choice' || q.widget === 'compare') {
    const opts = q.widget === 'compare' ? ['>', '<', '='] : (q.options ?? []);
    input = (
      <div className={`mx-auto grid w-full max-w-xl gap-3 ${q.widget === 'compare' ? 'grid-cols-3' : 'sm:grid-cols-2'}`}>
        {opts.map((o, i) => (
          <button
            key={o}
            type="button"
            disabled={disabled}
            onClick={() =>
              submit(q.widget === 'compare' ? { type: 'compare', value: o as '<' | '>' | '=' } : { type: 'choice', index: i })
            }
            className={`min-h-16 rounded-2xl bg-white px-4 py-3 text-2xl font-bold shadow-sm ring-1 ring-slate-200 active:scale-95 disabled:opacity-60 ${
              q.widget === 'compare' ? 'text-4xl' : 'text-left text-xl font-medium'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    );
  } else if (q.widget === 'division') {
    const setField = (f: 'q' | 'r', v: string) => (f === 'q' ? setQuotient(v) : setRemainder(v));
    const cur = divField === 'q' ? quotient : remainder;
    input = (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-2xl">
          <span>商</span>
          <button type="button" onClick={() => setDivField('q')} className={`h-14 min-w-24 rounded-xl bg-white px-3 font-mono ring-2 ${divField === 'q' ? 'ring-sky-400' : 'ring-slate-200'}`}>
            {quotient}
          </button>
          <span>余数</span>
          <button type="button" onClick={() => setDivField('r')} className={`h-14 min-w-20 rounded-xl bg-white px-3 font-mono ring-2 ${divField === 'r' ? 'ring-sky-400' : 'ring-slate-200'}`}>
            {remainder}
          </button>
        </div>
        <p className="text-sm text-slate-500">没有余数就填 0 或空着</p>
        <NumberPad
          disabled={disabled}
          onDigit={(d) => cur.length < 6 && setField(divField, cur + d)}
          onBackspace={() => setField(divField, cur.slice(0, -1))}
          onSubmit={() =>
            submit({ type: 'division', quotient: numeric(quotient), remainder: remainder === '' ? 0 : numeric(remainder) })
          }
        />
      </div>
    );
  } else {
    // numeric and angle
    input = (
      <div className="flex flex-col items-center gap-4">
        {q.widget === 'angle' && q.angle && <AngleView spec={q.angle} />}
        {q.ruler && <RulerView spec={q.ruler} />}
        <div className="flex h-16 min-w-40 items-center justify-center rounded-2xl bg-white px-6 font-mono text-4xl shadow-inner ring-2 ring-sky-300">
          {text || <span className="text-slate-300">?</span>}
          {q.widget === 'angle' && <span className="ml-1 text-2xl">°</span>}
        </div>
        <NumberPad
          disabled={disabled}
          allowMinus={allowMinus}
          onMinus={() => setText((t) => (t.startsWith('-') ? t.slice(1) : `-${t}`))}
          onDigit={(d) => setText((t) => (t.replace('-', '').length < 12 ? t + d : t))}
          onBackspace={() => setText((t) => t.slice(0, -1))}
          onSubmit={() => submit({ type: 'number', value: numeric(text) })}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="whitespace-pre-line text-center text-2xl font-medium leading-relaxed sm:text-3xl">{q.prompt}</div>
      {input}
      {last && (
        <div
          className={`rounded-2xl p-4 text-lg ${last.correct ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}
          role="status"
        >
          {last.correct ? (
            <b>{firstTryCorrect.current ? '答对啦！🎉' : '改对了，真棒！'}</b>
          ) : phase === 'retry' ? (
            <>
              <b>再想一想：</b>
              {last.feedback || q.hint}
              <div className="mt-1 text-base text-amber-700">提示：{q.hint}</div>
            </>
          ) : (
            <>
              <b>正确答案是 {answerText(q)}。</b> {last.feedback}
            </>
          )}
        </div>
      )}
      {(showSteps || (phase === 'done' && q.steps.length > 0)) && (
        <details open={showSteps} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <summary className="cursor-pointer text-lg font-bold text-sky-700">看看怎么做</summary>
          <ol className="mt-2 list-decimal space-y-2 pl-6 text-lg">
            {q.steps.map((s, i) => (
              <li key={i}>
                {s.text}
                {s.formula && <div className="font-mono text-slate-600">{s.formula}</div>}
              </li>
            ))}
          </ol>
        </details>
      )}
      {phase === 'done' && (
        <button
          type="button"
          onClick={onNext}
          className="mx-auto rounded-full bg-sky-500 px-10 py-4 text-xl font-bold text-white shadow active:scale-95"
          autoFocus
        >
          下一题 →
        </button>
      )}
    </div>
  );
}
