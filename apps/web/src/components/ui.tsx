import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { href } from '../lib/router';

export function Page({
  title,
  back,
  right,
  children,
}: {
  title: ReactNode;
  back?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col px-4 pb-10 pt-[max(env(safe-area-inset-top),12px)]">
      <header className="mb-4 flex items-center gap-3">
        {back && (
          <a href={href(back)} className="rounded-full bg-white px-4 py-2 text-lg shadow-sm ring-1 ring-slate-200">
            ←
          </a>
        )}
        <h1 className="min-w-0 flex-1 truncate text-2xl font-bold">{title}</h1>
        {right}
      </header>
      {children}
    </div>
  );
}

type Tone = 'primary' | 'green' | 'plain' | 'danger';
const TONES: Record<Tone, string> = {
  primary: 'bg-sky-500 text-white hover:bg-sky-600',
  green: 'bg-emerald-500 text-white hover:bg-emerald-600',
  plain: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
  danger: 'bg-rose-500 text-white hover:bg-rose-600',
};

export function Btn({
  tone = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      type="button"
      {...rest}
      className={`rounded-2xl px-5 py-3 text-lg font-bold shadow-sm transition disabled:opacity-40 ${TONES[tone]} ${className}`}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  // A caller's own background (e.g. bg-sky-500) must win over the default white;
  // both are plain utilities, so only one of them may be on the element.
  const bg = /(^|\s)bg-(?!gradient)/.test(className) ? '' : 'bg-white ';
  return <div className={`rounded-3xl ${bg}p-5 shadow-sm ring-1 ring-slate-200 ${className}`}>{children}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-3xl border-2 border-dashed border-slate-300 p-8 text-center text-slate-500">{children}</div>;
}

export function Stars({ n }: { n: number }) {
  return <span className="text-amber-400">{'★'.repeat(n)}<span className="text-slate-200">{'★'.repeat(Math.max(0, 3 - n))}</span></span>;
}
