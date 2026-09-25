import type { FamilySettings, LearningEvent, PracticeMode, PutFamilyRequest } from '@xuexi/shared';

/** Shape validation for untrusted request bodies. Returns an error message or null. */

const PRACTICE_MODES: readonly PracticeMode[] = [
  'kp',
  'speed',
  'mistakes',
  'review',
  'unit-test',
  'daily',
];

export const MAX_EVENT_BYTES = 16 * 1024;

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown, max = 128): v is string =>
  typeof v === 'string' && v.length >= 1 && v.length <= max;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';

const ID_RE = /^[A-Za-z0-9_.:-]{1,128}$/;

export function validateEvent(v: unknown): string | null {
  if (!isObj(v)) return 'event must be an object';
  if (typeof v.id !== 'string' || !ID_RE.test(v.id)) return 'id must match [A-Za-z0-9_.:-]{1,128}';
  if (!isStr(v.childId)) return 'childId must be a non-empty string';
  if (!isNum(v.at) || v.at < 0 || v.at > 1e13) return 'at must be epoch milliseconds';
  if (!isStr(v.deviceId)) return 'deviceId must be a non-empty string';
  if (!isNum(v.durationMs) || v.durationMs < 0) return 'durationMs must be a number >= 0';

  if (v.type === 'attempt') {
    if (!isStr(v.kpId)) return 'kpId must be a non-empty string';
    const q = v.question;
    if (!isObj(q)) return 'question must be an object';
    if (q.source === 'generator') {
      if (!isStr(q.generatorId)) return 'question.generatorId must be a string';
      if (!isNum(q.difficulty)) return 'question.difficulty must be a number';
      if (!isNum(q.seed)) return 'question.seed must be a number';
    } else if (q.source === 'bank') {
      if (!isStr(q.bankId)) return 'question.bankId must be a string';
      if (!isStr(q.questionId)) return 'question.questionId must be a string';
    } else {
      return "question.source must be 'generator' or 'bank'";
    }
    if (!isBool(v.correct)) return 'correct must be a boolean';
    if (
      !Array.isArray(v.errorTags) ||
      v.errorTags.length > 32 ||
      !v.errorTags.every((t) => isStr(t, 64))
    )
      return 'errorTags must be an array of strings';
    if (!PRACTICE_MODES.includes(v.mode as PracticeMode))
      return 'mode is not a known practice mode';
    if (v.hinted !== undefined && !isBool(v.hinted)) return 'hinted must be a boolean';
  } else if (v.type === 'lesson') {
    if (!isStr(v.lessonId)) return 'lessonId must be a non-empty string';
    if (!isNum(v.packVersion) || v.packVersion < 0) return 'packVersion must be a number >= 0';
    if (!isNum(v.progress) || v.progress < 0 || v.progress > 1) return 'progress must be in 0..1';
    if (!isBool(v.completed)) return 'completed must be a boolean';
  } else {
    return "type must be 'attempt' or 'lesson'";
  }
  if (JSON.stringify(v).length > MAX_EVENT_BYTES)
    return `event larger than ${MAX_EVENT_BYTES} bytes`;
  return null;
}

export type EventsValidation =
  { ok: true; events: LearningEvent[] } | { ok: false; message: string; index?: number };

export function validatePushBody(body: unknown, maxBatch: number): EventsValidation {
  if (!isObj(body) || !Array.isArray(body.events))
    return { ok: false, message: 'body must be {events: [...]}' };
  if (body.events.length > maxBatch)
    return { ok: false, message: `too many events in one batch (max ${maxBatch})` };
  for (let i = 0; i < body.events.length; i++) {
    const err = validateEvent(body.events[i]);
    if (err) return { ok: false, message: `events[${i}]: ${err}`, index: i };
  }
  return { ok: true, events: body.events as LearningEvent[] };
}

function validateSettings(s: unknown): string | null {
  if (!isObj(s)) return 'doc.settings must be an object';
  const inRange = (v: unknown, lo: number, hi: number) => isNum(v) && v >= lo && v <= hi;
  if (!inRange(s.dailyMinutes, 0, 1440)) return 'settings.dailyMinutes must be 0..1440';
  if (!inRange(s.eyeBreakMinutes, 0, 1440)) return 'settings.eyeBreakMinutes must be 0..1440';
  if (!inRange(s.masteryAccuracy, 0, 1)) return 'settings.masteryAccuracy must be 0..1';
  if (s.readPassScore !== undefined && !inRange(s.readPassScore, 0, 100))
    return 'settings.readPassScore must be 0..100';
  if (s.practiceSize !== undefined && !inRange(s.practiceSize, 1, 100))
    return 'settings.practiceSize must be 1..100';
  if (s.parentPinHash !== undefined && !isStr(s.parentPinHash, 256))
    return 'settings.parentPinHash must be a string';
  return null;
}

export type FamilyValidation =
  { ok: true; value: PutFamilyRequest } | { ok: false; message: string };

export function validatePutFamilyBody(body: unknown): FamilyValidation {
  if (!isObj(body)) return { ok: false, message: 'body must be {doc, baseVersion}' };
  const { doc, baseVersion } = body;
  if (!Number.isSafeInteger(baseVersion) || (baseVersion as number) < 0)
    return { ok: false, message: 'baseVersion must be an integer >= 0' };
  if (!isObj(doc)) return { ok: false, message: 'doc must be an object' };
  if (!Array.isArray(doc.children) || doc.children.length > 20)
    return { ok: false, message: 'doc.children must be an array (max 20)' };
  const ids = new Set<string>();
  for (let i = 0; i < doc.children.length; i++) {
    const c = doc.children[i] as unknown;
    const p = `doc.children[${i}]`;
    if (!isObj(c)) return { ok: false, message: `${p} must be an object` };
    if (!isStr(c.id)) return { ok: false, message: `${p}.id must be a non-empty string` };
    if (ids.has(c.id)) return { ok: false, message: `${p}.id is duplicated` };
    ids.add(c.id);
    if (!isStr(c.name, 64)) return { ok: false, message: `${p}.name must be 1..64 chars` };
    if (!Number.isInteger(c.grade) || (c.grade as number) < 1 || (c.grade as number) > 6)
      return { ok: false, message: `${p}.grade must be an integer 1..6` };
    if (typeof c.avatar !== 'string' || c.avatar.length > 512)
      return { ok: false, message: `${p}.avatar must be a string` };
    if (!Array.isArray(c.bookIds) || c.bookIds.length > 50 || !c.bookIds.every((b) => isStr(b, 64)))
      return { ok: false, message: `${p}.bookIds must be an array of strings` };
  }
  const settingsErr = validateSettings(doc.settings);
  if (settingsErr) return { ok: false, message: settingsErr };
  return {
    ok: true,
    value: {
      doc: {
        children: doc.children as PutFamilyRequest['doc']['children'],
        settings: doc.settings as FamilySettings,
      },
      baseVersion: baseVersion as number,
    },
  };
}
