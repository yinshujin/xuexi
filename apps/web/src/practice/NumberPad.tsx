import { useEffect } from 'react';

export interface NumberPadProps {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onSubmit?: () => void;
  allowMinus?: boolean;
  onMinus?: () => void;
  submitLabel?: string;
  disabled?: boolean;
}

/** Big on-screen keypad (no system keyboard on tablets); also listens to the physical keyboard. */
export function NumberPad({ onDigit, onBackspace, onSubmit, allowMinus, onMinus, submitLabel = '提交', disabled }: NumberPadProps) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (disabled || (e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (/^[0-9]$/.test(e.key)) onDigit(e.key);
      else if (e.key === 'Backspace') onBackspace();
      else if (e.key === 'Enter') onSubmit?.();
      else if (e.key === '-' && allowMinus) onMinus?.();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [onDigit, onBackspace, onSubmit, onMinus, allowMinus, disabled]);

  const key = 'h-14 rounded-2xl bg-white text-2xl font-bold shadow-sm ring-1 ring-slate-200 active:scale-95 active:bg-sky-50 disabled:opacity-40 sm:h-16';
  return (
    <div className="mx-auto grid w-full max-w-md select-none grid-cols-4 gap-2">
      {['7', '8', '9'].map((d) => (
        <button key={d} type="button" disabled={disabled} className={key} onClick={() => onDigit(d)}>
          {d}
        </button>
      ))}
      <button type="button" disabled={disabled} className={`${key} text-xl`} onClick={onBackspace} aria-label="删除">
        ⌫
      </button>
      {['4', '5', '6'].map((d) => (
        <button key={d} type="button" disabled={disabled} className={key} onClick={() => onDigit(d)}>
          {d}
        </button>
      ))}
      {allowMinus ? (
        <button type="button" disabled={disabled} className={key} onClick={onMinus}>
          −
        </button>
      ) : (
        <span />
      )}
      {['1', '2', '3'].map((d) => (
        <button key={d} type="button" disabled={disabled} className={key} onClick={() => onDigit(d)}>
          {d}
        </button>
      ))}
      <button
        type="button"
        disabled={disabled || !onSubmit}
        className="row-span-2 rounded-2xl bg-emerald-500 text-xl font-bold text-white shadow-sm active:scale-95 disabled:opacity-40"
        onClick={onSubmit}
      >
        {submitLabel}
      </button>
      <button type="button" disabled={disabled} className={`${key} col-span-3`} onClick={() => onDigit('0')}>
        0
      </button>
    </div>
  );
}
