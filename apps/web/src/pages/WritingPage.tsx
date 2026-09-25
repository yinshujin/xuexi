import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChildProfile } from '@xuexi/shared';
import { useApp } from '../lib/store';
import { href, navigate } from '../lib/router';
import { uuid } from '../lib/format';
import { sfx } from '../lib/sfx';
import {
  STATUS_LABEL,
  childWritingTasks,
  clearDraft,
  downscalePhoto,
  draftTasks,
  findWritingByKp,
  handedInTasks,
  lengthStatus,
  loadDraft,
  markReviewsSeen,
  saveDraft,
  saveWriting,
  taskStatus,
  unseenReviews,
  writingEvent,
  writingsOf,
  type WritingDraft,
  type WritingRow,
  type WritingStatus,
} from '../lib/writing';
import { BlobImage } from '../components/BlobImage';
import { Card, Empty, Page, Stars } from '../components/ui';

const STEPS = [
  { icon: '📖', label: '看题目' },
  { icon: '🗂️', label: '列提纲' },
  { icon: '✏️', label: '动笔写' },
  { icon: '✅', label: '自查' },
  { icon: '🌟', label: '看范文' },
] as const;

const STATUS_TONE: Record<WritingStatus, string> = {
  new: 'bg-slate-100 text-slate-600',
  draft: 'bg-sky-100 text-sky-800',
  'handed-in': 'bg-amber-100 text-amber-800',
  reviewed: 'bg-emerald-100 text-emerald-800',
};

const big = 'rounded-2xl px-6 py-4 text-xl font-bold shadow-sm transition active:scale-95 disabled:opacity-40';

function dateText(ms: number): string {
  const d = new Date(ms);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** The child's pieces, statuses of the tasks, and reloading after a change. */
function usePieces(childId: string) {
  const [pieces, setPieces] = useState<WritingRow[] | null>(null);
  const [drafts, setDrafts] = useState<Set<string>>(new Set());
  const [version, setVersion] = useState(0);
  useEffect(() => {
    writingsOf(childId).then(setPieces, () => setPieces([]));
    draftTasks(childId).then(setDrafts, () => setDrafts(new Set()));
  }, [childId, version]);
  return { pieces, drafts, reload: () => setVersion((v) => v + 1) };
}

export function StatusPill({ status }: { status: WritingStatus }) {
  return <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>;
}

/** A handed-in piece: the photo or the text, and the parent's stars and comment. */
export function PieceView({ piece, large = false }: { piece: WritingRow; large?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {piece.photo && (
        <BlobImage
          blob={piece.photo}
          alt="拍下的作品"
          className={`w-full rounded-2xl bg-slate-50 object-contain ring-1 ring-slate-200 ${large ? 'max-h-[85vh]' : 'max-h-96'}`}
        />
      )}
      {piece.text && <p className="whitespace-pre-wrap rounded-2xl bg-amber-50 p-4 text-xl leading-relaxed">{piece.text}</p>}
      {piece.stars ? (
        <div className="rounded-2xl bg-emerald-50 p-4">
          <div className="text-2xl">
            <Stars n={piece.stars} />
          </div>
          {piece.comment && <p className="mt-1 text-lg text-emerald-900">爸爸妈妈说：{piece.comment}</p>}
        </div>
      ) : (
        <p className="text-slate-500">等爸爸妈妈点评 ⏳</p>
      )}
    </div>
  );
}

// ================================================================ list

/** ✏️ 写作: the child's writing tasks with their status, and 我的作品. */
export function WritingHome({ child }: { child: ChildProfile }) {
  const { eventsOf } = useApp();
  const tasks = useMemo(() => childWritingTasks(child), [child]);
  const events = eventsOf(child.id);
  const handedIn = useMemo(() => handedInTasks(events), [events]);
  const { pieces, drafts } = usePieces(child.id);
  const [open, setOpen] = useState<string | null>(null);
  const [newReviews, setNewReviews] = useState<Set<string>>(new Set());

  // Reviews the child has not seen yet get a badge this time, then count as seen.
  useEffect(() => {
    if (!pieces) return;
    const unseen = pieces.filter((p) => unseenReviews([p]) > 0).map((p) => p.id);
    if (unseen.length === 0) return;
    setNewReviews(new Set(unseen));
    void markReviewsSeen(unseen);
  }, [pieces]);

  const back = encodeURIComponent(`/c/${child.id}/writing`);
  return (
    <Page title="✏️ 写作" back={`/c/${child.id}`}>
      {tasks.length === 0 ? (
        <Empty>你的课本里还没有写作任务。请爸爸妈妈在家长模式 → 孩子 里添加「写话」课本。</Empty>
      ) : (
        <>
          <h2 className="mb-2 text-xl font-bold">写作任务</h2>
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            {tasks.map(({ unit, kp, task }) => {
              const status = taskStatus(task.id, pieces ?? [], handedIn, drafts);
              return (
                <a key={task.id} href={href(`/c/${child.id}/writing/${kp.id}?back=${back}`)}>
                  <Card className="flex h-full items-center gap-3 transition active:scale-95">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-lime-400 text-2xl font-black text-white">
                      {unit.index}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-slate-500">第 {unit.index} 单元 · {unit.title}</span>
                      <span className="block text-xl font-bold leading-snug">{task.title}</span>
                      <span className="text-sm text-slate-500">至少 {task.minChars} 字</span>
                    </span>
                    <StatusPill status={status} />
                  </Card>
                </a>
              );
            })}
          </div>
        </>
      )}

      <h2 className="mb-2 text-xl font-bold">🗂️ 我的作品</h2>
      {pieces === null ? null : pieces.length === 0 ? (
        <Empty>还没有作品。选一个写作任务，写好交上来吧！</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {pieces.map((p) => {
            const t = tasks.find((x) => x.task.id === p.taskId);
            const expanded = open === p.id;
            return (
              <Card key={p.id}>
                <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => setOpen(expanded ? null : p.id)}>
                  <span className="text-3xl">{p.photo ? '📷' : '⌨️'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-bold">
                      {t?.task.title ?? p.taskId}
                      {newReviews.has(p.id) && <span className="ml-2 rounded-full bg-rose-500 px-2 py-0.5 text-sm text-white">新点评</span>}
                    </span>
                    <span className="text-slate-500">
                      {dateText(p.at)} · {p.photo ? '本子上写的' : `打字 ${lengthStatus(p.text ?? '', { minChars: 0 }).count} 字`}
                    </span>
                  </span>
                  {p.stars ? (
                    <span className="text-2xl">
                      <Stars n={p.stars} />
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">等点评</span>
                  )}
                  <span className="text-slate-400">{expanded ? '▲' : '▼'}</span>
                </button>
                {!expanded && p.comment && <p className="mt-2 line-clamp-1 text-emerald-800">爸爸妈妈说：{p.comment}</p>}
                {expanded && (
                  <div className="mt-3">
                    <PieceView piece={p} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </Page>
  );
}

// ================================================================ one task

function newDraft(outlineBoxes: number, checks: number): WritingDraft {
  return { step: 0, outline: Array(outlineBoxes).fill(''), text: '', checked: Array(checks).fill(false), startedAt: Date.now() };
}

/** 写作任务: 看题目 → 列提纲 → 动笔写（拍照或打字）→ 自查清单 → 交作品 → 看范文. */
export function WritingTaskPage({ child, kpId, back }: { child: ChildProfile; kpId: string; back: string }) {
  const { addEvent, deviceId } = useApp();
  const ref = findWritingByKp(kpId);
  const task = ref?.task;
  const [draft, setDraft] = useState<WritingDraft | null>(null);
  const [done, setDone] = useState<WritingRow | null>(null);
  const [before, setBefore] = useState(0);
  const [busy, setBusy] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!task) return;
    let live = true;
    loadDraft(child.id, task.id)
      .catch(() => undefined)
      .then((d) => {
        if (!live) return;
        const fresh = newDraft(task.outline.length, task.checklist.length);
        setDraft(d ? { ...fresh, ...d, step: Math.min(d.step, 3) } : fresh);
      });
    writingsOf(child.id).then((l) => live && setBefore(l.filter((p) => p.taskId === task.id).length), () => {});
    return () => {
      live = false;
    };
  }, [child.id, task]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  if (!ref || !task) {
    return (
      <Page title="找不到这个写作任务" back={back}>
        <Empty>写作任务不存在</Empty>
      </Page>
    );
  }
  if (!draft) return null;

  const update = (patch: Partial<WritingDraft>, now = false) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const save = () => void saveDraft(child.id, task.id, next).catch(() => {});
    if (now) save();
    else saveTimer.current = setTimeout(save, 400);
  };
  const go = (step: number) => {
    sfx.tap();
    update({ step }, true);
    window.scrollTo(0, 0);
  };
  const step = done ? 4 : draft.step;
  const len = lengthStatus(draft.text, task);
  const written = draft.mode === 'photo' ? !!draft.photo : draft.mode === 'type' ? len.missing === 0 && len.count > 0 : false;

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy('正在处理照片…');
    try {
      const photo = await downscalePhoto(file);
      update({ photo, mode: 'photo' }, true);
    } catch {
      setBusy('照片读不出来，再拍一次试试');
      return;
    }
    setBusy('');
  };

  const insertWord = (w: string) => {
    const el = textRef.current;
    const at = el?.selectionStart ?? draft.text.length;
    const end = el?.selectionEnd ?? at;
    const text = draft.text.slice(0, at) + w + draft.text.slice(end);
    update({ text });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + w.length, at + w.length);
    });
  };

  const handIn = async () => {
    const at = Date.now();
    const row: WritingRow = {
      id: uuid(),
      childId: child.id,
      kpId: ref.kp.id,
      taskId: task.id,
      at,
      outline: draft.outline,
      ...(draft.mode === 'photo' && draft.photo ? { photo: draft.photo } : { text: draft.text.trim() }),
    };
    setBusy('正在保存…');
    await saveWriting(row);
    await addEvent(writingEvent({ id: uuid(), childId: child.id, deviceId, taskId: task.id, at, durationMs: Math.min(at - draft.startedAt, 2 * 3600_000) }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await clearDraft(child.id, task.id);
    setBusy('');
    setDone(row);
    sfx.finish();
    window.scrollTo(0, 0);
  };

  const wordBank = task.wordBank && task.wordBank.length > 0 && (
    <div className="flex flex-wrap gap-2">
      {task.wordBank.map((w) => (
        <button
          key={w}
          type="button"
          disabled={draft.mode !== 'type' || step !== 2}
          onClick={() => insertWord(w)}
          className="rounded-full bg-lime-100 px-4 py-2 text-lg text-lime-900 ring-1 ring-lime-200 disabled:opacity-100"
        >
          {w}
        </button>
      ))}
    </div>
  );

  return (
    <Page title={`✏️ ${task.title}`} back={back}>
      {/* steps */}
      <div className="mb-4 grid grid-cols-5 gap-1 sm:gap-2">
        {STEPS.map((s, i) => {
          const reachable = done ? i === 4 : i <= 3 && i <= draft.step;
          return (
            <button
              key={s.label}
              type="button"
              disabled={!reachable || i === step}
              onClick={() => go(i)}
              className={`flex flex-col items-center rounded-2xl px-1 py-2 text-center transition ${
                i === step ? 'bg-amber-500 text-white shadow' : i < step ? 'bg-amber-100 text-amber-900' : 'bg-white text-slate-400 ring-1 ring-slate-200'
              }`}
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="text-xs font-bold sm:text-sm">{s.label}</span>
            </button>
          );
        })}
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-4">
          <Card className="bg-gradient-to-br from-amber-50 to-lime-50">
            <div className="mb-1 text-sm text-slate-500">
              第 {ref.unit.index} 单元 · {ref.unit.title}
            </div>
            <h2 className="mb-2 text-2xl font-bold">题目：{task.title}</h2>
            <p className="text-xl leading-relaxed">{task.prompt}</p>
            <p className="mt-2 text-slate-600">
              至少写 {task.minChars} 个字{task.maxChars ? `，不超过 ${task.maxChars} 字` : ''}。
            </p>
          </Card>
          <Card>
            <h3 className="mb-2 text-lg font-bold">💡 怎么写</h3>
            <ol className="list-decimal space-y-1 pl-6 text-lg">
              {task.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          </Card>
          {wordBank && (
            <Card>
              <h3 className="mb-2 text-lg font-bold">🧺 好词可以用</h3>
              {wordBank}
            </Card>
          )}
          {before > 0 && (
            <p className="text-slate-500">
              这个题目你已经交过 {before} 篇，<a className="text-sky-600 underline" href={href(`/c/${child.id}/writing`)}>去我的作品看看</a>；也可以再写一篇。
            </p>
          )}
          <button type="button" className={`${big} self-end bg-amber-500 text-white`} onClick={() => go(1)}>
            下一步：列提纲 →
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-3">
          <p className="text-lg text-slate-600">动笔前先想一想每一部分写什么。可以写几个词，也可以不写，想好了就行。</p>
          {task.outline.map((o, i) => (
            <Card key={o.label} className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xl font-black text-amber-800">{i + 1}</span>
              <label className="min-w-0 flex-1">
                <span className="block text-xl font-bold">{o.label}</span>
                <span className="mb-2 block text-slate-500">{o.hint}</span>
                <textarea
                  rows={2}
                  value={draft.outline[i] ?? ''}
                  onChange={(e) => update({ outline: draft.outline.map((x, k) => (k === i ? e.target.value : x)) })}
                  placeholder="想到的词写在这里（可以不写）"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-lg"
                />
              </label>
            </Card>
          ))}
          <button type="button" className={`${big} self-end bg-amber-500 text-white`} onClick={() => go(2)}>
            我想好了 →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          {draft.outline.some((x) => x.trim()) && (
            <Card className="bg-slate-50">
              <h3 className="mb-1 font-bold text-slate-600">我的提纲</h3>
              <ul className="space-y-0.5 text-lg">
                {task.outline.map((o, i) => (draft.outline[i]?.trim() ? <li key={o.label}>{o.label}：{draft.outline[i]}</li> : null))}
              </ul>
            </Card>
          )}
          {!draft.mode && (
            <div className="grid gap-4 sm:grid-cols-2">
              <button type="button" className="rounded-3xl bg-gradient-to-br from-amber-400 to-orange-400 p-6 text-left text-white shadow transition active:scale-95" onClick={() => fileRef.current?.click()}>
                <span className="block text-5xl">📷</span>
                <span className="mt-2 block text-2xl font-bold">在本子上写，拍照</span>
                <span className="opacity-90">写在作文本上，写好拍一张照片交上来</span>
              </button>
              <button type="button" className="rounded-3xl bg-gradient-to-br from-lime-400 to-emerald-500 p-6 text-left text-white shadow transition active:scale-95" onClick={() => update({ mode: 'type' }, true)}>
                <span className="block text-5xl">⌨️</span>
                <span className="mt-2 block text-2xl font-bold">在这里打字</span>
                <span className="opacity-90">用拼音输入法，一边写一边数字数</span>
              </button>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              void onPhoto(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          {busy && <p className="text-lg text-amber-700">{busy}</p>}
          {draft.mode === 'photo' && (
            <Card className="flex flex-col gap-3">
              {draft.photo ? (
                <BlobImage blob={draft.photo} alt="我拍的作品" className="max-h-[70vh] w-full rounded-2xl bg-slate-50 object-contain" />
              ) : (
                <p className="text-lg text-slate-500">在本子上写好以后，点下面的按钮拍照。</p>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" className={`${big} bg-amber-500 text-white`} onClick={() => fileRef.current?.click()}>
                  📷 {draft.photo ? '重拍' : '拍照'}
                </button>
                <button type="button" className={`${big} bg-white text-slate-700 ring-1 ring-slate-200`} onClick={() => update({ mode: 'type' }, true)}>
                  换成打字
                </button>
              </div>
            </Card>
          )}
          {draft.mode === 'type' && (
            <Card className="flex flex-col gap-3">
              <textarea
                ref={textRef}
                value={draft.text}
                onChange={(e) => update({ text: e.target.value })}
                placeholder="在这里写你的作品……"
                className="min-h-64 w-full rounded-2xl border-2 border-amber-200 p-4 text-xl leading-relaxed focus:border-amber-400 focus:outline-none"
              />
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-4 py-1 text-lg font-bold ${len.missing > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  已写 {len.count} 字 / 至少 {task.minChars} 字
                </span>
                {len.missing > 0 && <span className="text-slate-500">还差 {len.missing} 个字</span>}
                {len.over && <span className="text-slate-500">写得比要求的多，读一读，有没有啰嗦的地方？</span>}
                <button type="button" className="ml-auto text-sky-600 underline" onClick={() => update({ mode: 'photo' }, true)}>
                  换成拍照
                </button>
              </div>
              {wordBank && (
                <div>
                  <div className="mb-1 text-sm text-slate-500">点一点，把好词放进去：</div>
                  {wordBank}
                </div>
              )}
            </Card>
          )}
          {draft.mode && (
            <button type="button" disabled={!written} className={`${big} self-end bg-amber-500 text-white`} onClick={() => go(3)}>
              写好了，去自查 →
            </button>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-3">
          <p className="text-lg text-slate-600">一条一条读一读自己的作品，做到了就点一下 ✓。都做到了才能交哦！</p>
          {task.checklist.map((c, i) => {
            const on = draft.checked[i] ?? false;
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  sfx.tap();
                  update({ checked: task.checklist.map((_, k) => (k === i ? !on : (draft.checked[k] ?? false))) }, true);
                }}
                className={`flex items-center gap-4 rounded-2xl px-5 py-4 text-left text-xl ring-2 transition active:scale-[0.98] ${
                  on ? 'bg-emerald-50 ring-emerald-400' : 'bg-white ring-slate-200'
                }`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-2xl ${on ? 'bg-emerald-500 text-white' : 'bg-slate-100'}`}>{on ? '✓' : ''}</span>
                <span>{c}</span>
              </button>
            );
          })}
          {busy && <p className="text-lg text-amber-700">{busy}</p>}
          <button
            type="button"
            disabled={!task.checklist.every((_, i) => draft.checked[i]) || !!busy}
            className={`${big} self-end bg-emerald-500 text-white`}
            onClick={() => void handIn()}
          >
            交作品 🎉
          </button>
        </div>
      )}

      {step === 4 && done && (
        <div className="flex flex-col gap-4">
          <Card className="bg-gradient-to-r from-amber-400 to-lime-400 text-white ring-0">
            <div className="text-3xl font-bold">🎉 交好了！</div>
            <div className="text-lg opacity-90">爸爸妈妈会在家长模式里给你点评。先看看范文吧！</div>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <h3 className="mb-2 text-lg font-bold">我的作品</h3>
              <PieceView piece={done} />
            </Card>
            {task.example && (
              <Card className="bg-lime-50">
                <h3 className="mb-2 text-lg font-bold">🌟 范文：看看可以怎么写</h3>
                <p className="whitespace-pre-wrap text-xl leading-relaxed">{task.example}</p>
                <p className="mt-3 text-slate-500">比一比：范文哪里写得好？你的作品哪里写得好？</p>
              </Card>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className={`${big} bg-white text-slate-700 ring-1 ring-slate-200`} onClick={() => navigate(`/c/${child.id}/writing`)}>
              🗂️ 我的作品
            </button>
            <button type="button" className={`${big} bg-amber-500 text-white`} onClick={() => navigate(back)}>
              完成 ✓
            </button>
          </div>
        </div>
      )}
    </Page>
  );
}

/** Status of one task for a child (for the knowledge point page and the home tile). */
export function useWritingStatus(child: ChildProfile) {
  const { eventsOf } = useApp();
  const events = eventsOf(child.id);
  const handedIn = useMemo(() => handedInTasks(events), [events]);
  const { pieces, drafts } = usePieces(child.id);
  return {
    pieces: pieces ?? [],
    statusOf: (taskId: string) => taskStatus(taskId, pieces ?? [], handedIn, drafts),
    unseen: unseenReviews(pieces ?? []),
  };
}
