import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Response, VerticalSpec } from '@xuexi/practice';
import { NumberPad } from './NumberPad';

type RowKey = `p${number}` | 'r' | 'c';

interface Cells {
  [row: string]: string[]; // per row, index 0 = leftmost column
}

/** Encode a partial row: leftmost non-empty cell → rightmost column, empty cells as ' '. */
export function encodeRow(cells: string[]): string {
  const first = cells.findIndex((c) => c !== '');
  if (first < 0) return '';
  return cells
    .slice(first)
    .map((c) => (c === '' ? ' ' : c))
    .join('');
}

export function parseRow(cells: string[]): number | null {
  const digits = cells.join('');
  return digits === '' ? null : Number(digits);
}

export interface VerticalGridProps {
  spec: VerticalSpec;
  disabled?: boolean;
  onSubmit: (r: Response) => void;
  /** Called on every change so the parent can reset feedback. */
  onChange?: () => void;
}

/**
 * Column arithmetic grid. The child taps a cell (default: the ones column of the
 * first editable row) and types with the keypad; the cursor moves left after each
 * digit, like writing a real vertical calculation.
 */
export function VerticalGrid({ spec, disabled, onSubmit, onChange }: VerticalGridProps) {
  const cols = spec.columns;
  const editableRows = useMemo<RowKey[]>(
    () => [...Array.from({ length: spec.partialRows }, (_, i) => `p${i}` as RowKey), 'r'],
    [spec.partialRows],
  );
  const blank = useCallback(
    (): Cells => Object.fromEntries(['c', ...editableRows].map((r) => [r, Array(cols).fill('')])),
    [cols, editableRows],
  );
  const [cells, setCells] = useState<Cells>(blank);
  const [cursor, setCursor] = useState<{ row: RowKey; col: number }>({ row: editableRows[0], col: cols - 1 });

  useEffect(() => {
    setCells(blank());
    setCursor({ row: editableRows[0], col: cols - 1 });
  }, [spec, blank, editableRows, cols]);

  const type = (d: string) => {
    if (disabled) return;
    setCells((prev) => {
      const next = { ...prev, [cursor.row]: [...prev[cursor.row]] };
      next[cursor.row][cursor.col] = d;
      return next;
    });
    setCursor((c) => ({ ...c, col: Math.max(0, c.col - 1) }));
    onChange?.();
  };
  const back = () => {
    if (disabled) return;
    setCells((prev) => {
      const row = [...prev[cursor.row]];
      // Clear the cell to the right of the cursor if the current one is empty (undo last digit).
      const target = row[cursor.col] === '' && cursor.col < cols - 1 ? cursor.col + 1 : cursor.col;
      row[target] = '';
      setCursor((c) => ({ ...c, col: target }));
      return { ...prev, [cursor.row]: row };
    });
    onChange?.();
  };
  const submit = () => {
    onSubmit({
      type: 'vertical',
      value: parseRow(cells.r),
      partials: spec.partialRows > 0 ? editableRows.filter((r) => r !== 'r').map((r) => encodeRow(cells[r])) : undefined,
      carries: Object.fromEntries(
        cells.c.map((v, i) => [cols - 1 - i, v === '' ? 0 : Number(v)] as const).filter(([, v]) => v > 0),
      ),
    });
  };

  const digitsOf = (n: number) => {
    const s = String(n).split('');
    return [...Array(Math.max(0, cols - s.length)).fill(''), ...s];
  };

  const cellBase = 'flex h-11 w-9 items-center justify-center text-2xl font-mono sm:h-12 sm:w-10';
  const editable = (row: RowKey, small = false) => (
    <div className="flex">
      {cells[row]?.map((v, i) => {
        const active = cursor.row === row && cursor.col === i && !disabled;
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => setCursor({ row, col: i })}
            className={`${small ? 'flex h-7 w-9 items-center justify-center font-mono text-base text-rose-500 sm:w-10' : `${cellBase} rounded-md`} ${
              active ? 'bg-sky-100 ring-2 ring-sky-400' : small ? '' : 'bg-slate-50 ring-1 ring-slate-200'
            } ${small ? 'rounded' : ''} m-px`}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
  const staticRow = (n: number, sign?: string) => (
    <div className="flex items-center">
      <span className="w-8 text-center text-2xl">{sign ?? ''}</span>
      {digitsOf(n).map((d, i) => (
        <span key={i} className={`${cellBase} m-px`}>
          {d}
        </span>
      ))}
    </div>
  );
  const line = <div className="ml-8 border-t-2 border-slate-700" />;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="inline-flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        {spec.operands.map((n, i) => (
          <div key={i}>{staticRow(n, i === spec.operands.length - 1 ? spec.op : undefined)}</div>
        ))}
        {line}
        {spec.partialRows > 0 && (
          <>
            {editableRows
              .filter((r) => r !== 'r')
              .map((r) => (
                <div key={r} className="flex items-center">
                  <span className="w-8" />
                  {editable(r)}
                </div>
              ))}
            {line}
          </>
        )}
        <div className="flex items-center">
          <span className="w-8 text-right text-xs text-rose-400">进位</span>
          {editable('c', true)}
        </div>
        <div className="flex items-center">
          <span className="w-8" />
          {editable('r')}
        </div>
      </div>
      <NumberPad onDigit={type} onBackspace={back} onSubmit={submit} disabled={disabled} />
    </div>
  );
}
