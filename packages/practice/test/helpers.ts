import type { AttemptEvent, ErrorTag, GeneratorId, PracticeMode, QuestionRef } from '@xuexi/shared';

let counter = 0;

/** Shanghai wall-clock time → epoch ms. */
export function sh(date: string, time = '10:00'): number {
  return Date.parse(`${date}T${time}:00+08:00`);
}

export function attempt(p: {
  at: number;
  kpId?: string;
  correct: boolean;
  difficulty?: number;
  seed?: number;
  generatorId?: GeneratorId;
  variant?: string;
  mode?: PracticeMode;
  durationMs?: number;
  errorTags?: ErrorTag[];
  childId?: string;
  hinted?: boolean;
  question?: QuestionRef;
}): AttemptEvent {
  counter++;
  const question: QuestionRef =
    p.question ??
    ({
      source: 'generator',
      generatorId: p.generatorId ?? 'g2.mul.table',
      difficulty: p.difficulty ?? 3,
      seed: p.seed ?? counter,
      ...(p.variant !== undefined ? { variant: p.variant } : {}),
    } as QuestionRef);
  return {
    type: 'attempt',
    id: `e${String(counter).padStart(6, '0')}`,
    childId: p.childId ?? 'kid',
    deviceId: 'tablet',
    at: p.at,
    kpId: p.kpId ?? 'kp.a',
    question,
    correct: p.correct,
    response: null,
    errorTags: p.errorTags ?? (p.correct ? [] : ['careless']),
    durationMs: p.durationMs ?? 5000,
    mode: p.mode ?? 'kp',
    ...(p.hinted ? { hinted: true } : {}),
  };
}
