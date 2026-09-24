import { useApp } from '../lib/store';
import { href } from '../lib/router';
import { Card, Empty } from '../components/ui';

export function ChildPicker() {
  const { family, sync, auth } = useApp();
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-8">
      <h1 className="mb-2 text-center text-3xl font-bold">今天谁来学习？</h1>
      <p className="mb-8 text-center text-slate-500">
        {auth === 'local' ? '本机模式' : sync.state === 'offline' ? '离线中，联网后自动同步' : ' '}
      </p>
      {family.children.length === 0 ? (
        <Empty>
          还没有孩子档案。请家长 <a className="text-sky-600 underline" href={href('/parent')}>进入家长模式</a> 添加。
        </Empty>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {family.children.map((c) => (
            <a key={c.id} href={href(`/c/${c.id}`)}>
              <Card className="flex flex-col items-center gap-2 py-8 transition hover:scale-[1.02]">
                <span className="text-6xl">{c.avatar}</span>
                <span className="text-2xl font-bold">{c.name}</span>
                <span className="text-slate-500">{c.grade} 年级</span>
              </Card>
            </a>
          ))}
        </div>
      )}
      <a href={href('/parent')} className="mt-auto pt-10 text-center text-slate-500 underline">
        家长模式
      </a>
    </div>
  );
}
