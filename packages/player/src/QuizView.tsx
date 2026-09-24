import { useState } from 'react';
import type { QuizContent, QuizQuestion } from '@openmaic/dsl';

export interface QuizResult {
  questionId: string;
  correct: boolean | null; // null = not auto-gradable (short answer)
}

function QuestionCard({
  q,
  index,
  onAnswered,
}: {
  q: QuizQuestion;
  index: number;
  onAnswered: (r: QuizResult) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const answer = q.answer ?? [];
  const gradable = q.type !== 'short_answer' && answer.length > 0;
  const correct =
    gradable && picked.length === answer.length && picked.every((v) => answer.includes(v));

  const submit = (values: string[]) => {
    if (submitted) return;
    setSubmitted(true);
    onAnswered({ questionId: q.id, correct: gradable ? values.length === answer.length && values.every((v) => answer.includes(v)) : null });
  };

  const toggle = (value: string) => {
    if (submitted) return;
    if (q.type === 'single') {
      setPicked([value]);
      submit([value]);
    } else {
      setPicked((p) => (p.includes(value) ? p.filter((v) => v !== value) : [...p, value]));
    }
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="mb-4 text-xl font-medium leading-relaxed text-slate-800">
        {index + 1}. {q.question}
      </p>
      {q.options && (
        <div className="grid gap-3 sm:grid-cols-2">
          {q.options.map((o) => {
            const isPicked = picked.includes(o.value);
            const isAnswer = answer.includes(o.value);
            let tone = 'bg-slate-50 ring-slate-200 hover:bg-sky-50';
            if (isPicked && !submitted) tone = 'bg-sky-100 ring-sky-400';
            if (submitted && isAnswer) tone = 'bg-emerald-100 ring-emerald-500';
            if (submitted && isPicked && !isAnswer) tone = 'bg-rose-100 ring-rose-400';
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className={`min-h-14 rounded-xl px-4 py-3 text-left text-lg ring-2 transition ${tone}`}
              >
                <span className="mr-2 font-bold text-slate-500">{o.value}.</span>
                {o.label}
              </button>
            );
          })}
        </div>
      )}
      {q.type === 'multiple' && !submitted && (
        <button
          type="button"
          disabled={picked.length === 0}
          onClick={() => submit(picked)}
          className="mt-4 rounded-xl bg-sky-500 px-6 py-3 text-lg font-bold text-white disabled:opacity-40"
        >
          提交
        </button>
      )}
      {q.type === 'short_answer' && !submitted && (
        <button
          type="button"
          onClick={() => submit([])}
          className="mt-2 rounded-xl bg-sky-500 px-6 py-3 text-lg font-bold text-white"
        >
          想好了，看参考答案
        </button>
      )}
      {submitted && (
        <div className="mt-4 rounded-xl bg-amber-50 p-4 text-lg text-slate-700">
          {gradable && <p className="mb-1 font-bold">{correct ? '答对啦！🎉' : '再想一想，看看解析 💡'}</p>}
          {q.analysis && <p>{q.analysis}</p>}
        </div>
      )}
    </div>
  );
}

export function QuizView({
  content,
  onDone,
}: {
  content: QuizContent;
  onDone: (results: QuizResult[]) => void;
}) {
  const [results, setResults] = useState<Record<string, QuizResult>>({});
  const all = content.questions.length;
  const done = Object.keys(results).length;
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-sky-50/60 p-4 sm:p-6">
      {content.questions.map((q, i) => (
        <QuestionCard
          key={q.id}
          q={q}
          index={i}
          onAnswered={(r) => setResults((prev) => ({ ...prev, [r.questionId]: r }))}
        />
      ))}
      <button
        type="button"
        disabled={done < all}
        onClick={() => onDone(Object.values(results))}
        className="mx-auto mb-2 rounded-full bg-emerald-500 px-10 py-4 text-xl font-bold text-white shadow disabled:opacity-40"
      >
        {done < all ? `还有 ${all - done} 题` : '继续上课 →'}
      </button>
    </div>
  );
}
