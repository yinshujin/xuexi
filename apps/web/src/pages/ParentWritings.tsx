import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { deleteWriting, findWritingTask, lengthStatus, reviewWriting, writingsOf, type WritingRow } from '../lib/writing';
import { BlobImage } from '../components/BlobImage';
import { Btn, Card, Empty } from '../components/ui';

const COMMENT_MAX = 80;

function when(ms: number): string {
  const d = new Date(ms);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** One piece with the review form: ⭐1–3 and a short comment, saved on the piece. */
function PieceReview({ piece, onChanged }: { piece: WritingRow; onChanged: () => void }) {
  const ref = findWritingTask(piece.taskId);
  const [stars, setStars] = useState<0 | 1 | 2 | 3>(piece.stars ?? 0);
  const [comment, setComment] = useState(piece.comment ?? '');
  const [saved, setSaved] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const dirty = stars !== (piece.stars ?? 0) || comment.trim() !== (piece.comment ?? '');

  const save = async () => {
    if (!stars) return;
    await reviewWriting(piece.id, stars, comment);
    setSaved(true);
    onChanged();
  };

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="text-xl font-bold">{ref?.task.title ?? piece.taskId}</h3>
        <span className="text-slate-500">
          {ref ? `第 ${ref.unit.index} 单元 · ` : ''}
          {when(piece.at)} · {piece.photo ? '照片' : `打字 ${lengthStatus(piece.text ?? '', { minChars: 0 }).count} 字`}
          {ref && piece.text ? `（要求至少 ${ref.task.minChars} 字）` : ''}
        </span>
        {!piece.stars && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-sm font-bold text-rose-700">待点评</span>}
      </div>
      {ref && <p className="text-slate-600">题目要求：{ref.task.prompt}</p>}
      {piece.photo && (
        <BlobImage blob={piece.photo} alt="孩子拍的作品" className="max-h-[85vh] w-full rounded-2xl bg-slate-50 object-contain ring-1 ring-slate-200" />
      )}
      {piece.text && <p className="whitespace-pre-wrap rounded-2xl bg-amber-50 p-4 text-xl leading-relaxed">{piece.text}</p>}
      {piece.outline?.some((x) => x.trim()) && ref && (
        <p className="text-slate-500">
          提纲：{ref.task.outline.map((o, i) => (piece.outline?.[i]?.trim() ? `${o.label}：${piece.outline[i]}` : '')).filter(Boolean).join('；')}
        </p>
      )}
      {ref && (
        <details className="text-slate-600" open={showExample} onToggle={(e) => setShowExample((e.target as HTMLDetailsElement).open)}>
          <summary className="cursor-pointer">自查清单和范文</summary>
          <ul className="mt-2 list-disc pl-6">
            {ref.task.checklist.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          {ref.task.example && <p className="mt-2 whitespace-pre-wrap rounded-xl bg-lime-50 p-3">{ref.task.example}</p>}
        </details>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {([1, 2, 3] as const).map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} 颗星`}
            onClick={() => {
              setStars(n);
              setSaved(false);
            }}
            className={`h-14 min-w-14 rounded-2xl px-3 text-3xl ring-2 transition active:scale-95 ${n <= stars ? 'bg-amber-50 text-amber-400 ring-amber-300' : 'bg-white text-slate-200 ring-slate-200'}`}
          >
            ★
          </button>
        ))}
        <span className="text-slate-500">{stars ? ['', '再加油', '写得不错', '写得真棒'][stars] : '点星星打分'}</span>
      </div>
      <input
        value={comment}
        maxLength={COMMENT_MAX}
        onChange={(e) => {
          setComment(e.target.value);
          setSaved(false);
        }}
        placeholder="写一句点评，比如：用上了引号，真棒！下次把结尾写上心情。"
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Btn disabled={!stars || (!dirty && !!piece.stars)} onClick={() => void save()}>
          保存点评
        </Btn>
        {saved && <span className="text-emerald-700">已保存，孩子在「我的作品」里能看到</span>}
        <Btn
          tone="plain"
          className="ml-auto"
          onClick={async () => {
            if (!confirm('删除这篇作品？删除后不能恢复。')) return;
            await deleteWriting(piece.id);
            onChanged();
          }}
        >
          删除
        </Btn>
      </div>
    </Card>
  );
}

/** 家长模式 → 作文: every child's pieces on this device, newest first, with the review form. */
export function ParentWritings() {
  const { family } = useApp();
  const [childId, setChildId] = useState(family.children[0]?.id ?? '');
  const [pieces, setPieces] = useState<WritingRow[] | null>(null);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (childId) writingsOf(childId).then(setPieces, () => setPieces([]));
  }, [childId, version]);

  const shown = useMemo(() => (pieces ?? []).filter((p) => !onlyOpen || !p.stars), [pieces, onlyOpen]);
  const open = (pieces ?? []).filter((p) => !p.stars).length;

  if (family.children.length === 0) return <Empty>先在"孩子"里添加孩子档案。</Empty>;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {family.children.map((c) => (
          <Btn key={c.id} tone={c.id === childId ? 'primary' : 'plain'} onClick={() => setChildId(c.id)}>
            {c.avatar} {c.name}
          </Btn>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Btn tone={!onlyOpen ? 'primary' : 'plain'} onClick={() => setOnlyOpen(false)}>
          全部 {pieces?.length ?? 0}
        </Btn>
        <Btn tone={onlyOpen ? 'primary' : 'plain'} onClick={() => setOnlyOpen(true)}>
          待点评 {open}
        </Btn>
        <span className="text-sm text-slate-500">作品（照片和文字）只保存在孩子写作的这台设备上，不同步、不进备份。</span>
      </div>
      {pieces === null ? null : shown.length === 0 ? (
        <Empty>{onlyOpen ? '没有待点评的作品。' : '还没有作品。孩子在「✏️ 写作」里交的作文会出现在这里。'}</Empty>
      ) : (
        shown.map((p) => <PieceReview key={p.id} piece={p} onChanged={() => setVersion((v) => v + 1)} />)
      )}
    </div>
  );
}
