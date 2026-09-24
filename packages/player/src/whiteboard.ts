/**
 * Whiteboard state as a pure reducer over whiteboard actions.
 *
 * Element construction is ported from OpenMAIC `lib/action/engine.ts`
 * (https://github.com/THU-MAIC/OpenMAIC, MIT License, Copyright (c) 2026 THU-MAIC),
 * rewritten as a reducer so any point of a lesson can be reconstructed by
 * replaying actions silently (used for seeking and "再讲一遍").
 */
import katex from 'katex';
import type { Action, PPTElement } from '@openmaic/dsl';

export interface WhiteboardState {
  open: boolean;
  elements: PPTElement[];
}

export const EMPTY_WHITEBOARD: WhiteboardState = { open: false, elements: [] };

const SHAPE_PATHS: Record<string, string> = {
  rectangle: 'M 0 0 L 1000 0 L 1000 1000 L 0 1000 Z',
  circle: 'M 500 0 A 500 500 0 1 1 499 0 Z',
  triangle: 'M 500 0 L 1000 1000 L 0 1000 Z',
};

const COMMON_LATEX_COMMAND =
  /\\(?:alpha|beta|cdot|delta|dfrac|frac|gamma|infty|int|lambda|left|lim|mu|neq|omega|pi|pm|prod|rightarrow|right|sigma|sqrt|sum|text|tfrac|theta|times)\b/;

function getDelimitedLatex(content: string): string | null {
  const t = content.trim();
  if (t.length > 4 && t.startsWith('$$') && t.endsWith('$$')) return t.slice(2, -2).trim();
  if (t.length > 2 && t.startsWith('$') && t.endsWith('$') && !t.startsWith('$$') && !t.endsWith('$$')) {
    return t.slice(1, -1).trim();
  }
  return null;
}

/** Plain whiteboard text that is really LaTeX is rendered as a formula. */
export function getLikelyLatexMath(content: string): string | null {
  const t = content.trim();
  if (!t || t.startsWith('<')) return null;
  const delimited = getDelimitedLatex(t);
  if (delimited !== null) return delimited;
  if (/^[A-Za-z]:\\/.test(t)) return null;
  if (COMMON_LATEX_COMMAND.test(t) || /[_^]\{/.test(t)) return t;
  const commands = t.match(/\\[A-Za-z]+/g) ?? [];
  if (commands.length === 0) return null;
  if (commands.length === 1) return /\\[A-Za-z]+\s*\{[^{}]*\}/.test(t) ? t : null;
  if (!/[=+\-*/^_{}]/.test(t)) return null;
  const chars = commands.reduce((n, c) => n + c.length, 0);
  return chars / t.length >= 0.15 ? t : null;
}

function renderLatex(latex: string): string {
  return katex.renderToString(latex, { throwOnError: false, displayMode: true, output: 'html' });
}

/** Deterministic element id: explicit id, else derived from the action id. */
function elementId(id: string | undefined, actionId: string): string {
  return id && id.length > 0 ? id : `wb_${actionId}`;
}

function add(state: WhiteboardState, el: PPTElement): WhiteboardState {
  const elements = state.elements.filter((e) => e.id !== el.id);
  return { open: true, elements: [...elements, el] };
}

/** Is this action one that changes the whiteboard? */
export function isWhiteboardAction(a: Action): boolean {
  return a.type.startsWith('wb_');
}

export function applyWhiteboardAction(state: WhiteboardState, a: Action): WhiteboardState {
  switch (a.type) {
    case 'wb_open':
      return { ...state, open: true };
    case 'wb_close':
      return { ...state, open: false };
    case 'wb_clear':
      return { ...state, elements: [] };
    case 'wb_delete':
      return { ...state, elements: state.elements.filter((e) => e.id !== a.elementId) };
    case 'wb_draw_text': {
      let html = a.content ?? '';
      if (!html) return state;
      const latex = getLikelyLatexMath(html);
      if (latex !== null) {
        return applyWhiteboardAction(state, { ...a, type: 'wb_draw_latex', latex });
      }
      const fontSize = a.fontSize ?? 18;
      if (!html.startsWith('<')) html = `<p style="font-size: ${fontSize}px;">${html}</p>`;
      return add(state, {
        id: elementId(a.elementId, a.id),
        type: 'text',
        content: html,
        left: a.x,
        top: a.y,
        width: a.width ?? 400,
        height: a.height ?? 100,
        rotate: 0,
        defaultFontName: 'Microsoft YaHei',
        defaultColor: a.color ?? '#333333',
      } as PPTElement);
    }
    case 'wb_draw_shape':
      return add(state, {
        id: elementId(a.elementId, a.id),
        type: 'shape',
        viewBox: [1000, 1000],
        path: SHAPE_PATHS[a.shape] ?? SHAPE_PATHS.rectangle,
        left: a.x,
        top: a.y,
        width: a.width,
        height: a.height,
        rotate: 0,
        fill: a.fillColor ?? '#5b9bd5',
        fixedRatio: false,
      } as PPTElement);
    case 'wb_draw_chart':
      return add(state, {
        id: elementId(a.elementId, a.id),
        type: 'chart',
        left: a.x,
        top: a.y,
        width: a.width,
        height: a.height,
        rotate: 0,
        chartType: a.chartType,
        data: a.data,
        themeColors: a.themeColors ?? ['#5b9bd5', '#ed7d31', '#a5a5a5', '#ffc000', '#4472c4'],
      } as unknown as PPTElement);
    case 'wb_draw_latex':
      return add(state, {
        id: elementId(a.elementId, a.id),
        type: 'latex',
        left: a.x,
        top: a.y,
        width: a.width ?? 400,
        height: a.height ?? 80,
        rotate: 0,
        latex: a.latex,
        html: renderLatex(a.latex),
        color: a.color ?? '#000000',
        fixedRatio: true,
      } as unknown as PPTElement);
    case 'wb_draw_table': {
      const rows = a.data.length;
      const cols = rows > 0 ? a.data[0].length : 0;
      if (rows === 0 || cols === 0) return state;
      let cellId = 0;
      return add(state, {
        id: elementId(a.elementId, a.id),
        type: 'table',
        left: a.x,
        top: a.y,
        width: a.width,
        height: a.height,
        rotate: 0,
        colWidths: Array(cols).fill(1 / cols),
        cellMinHeight: 36,
        data: a.data.map((row) =>
          row.map((text) => ({ id: `cell_${cellId++}`, colspan: 1, rowspan: 1, text })),
        ),
        outline: a.outline ?? { width: 2, style: 'solid', color: '#eeece1' },
        theme: a.theme
          ? { color: a.theme.color, rowHeader: true, rowFooter: false, colHeader: false, colFooter: false }
          : undefined,
      } as unknown as PPTElement);
    }
    case 'wb_draw_line': {
      const left = Math.min(a.startX, a.endX);
      const top = Math.min(a.startY, a.endY);
      return add(state, {
        id: elementId(a.elementId, a.id),
        type: 'line',
        left,
        top,
        width: a.width ?? 2,
        start: [a.startX - left, a.startY - top],
        end: [a.endX - left, a.endY - top],
        style: a.style ?? 'solid',
        color: a.color ?? '#333333',
        points: a.points ?? ['', ''],
      } as unknown as PPTElement);
    }
    case 'wb_draw_code':
      return add(state, {
        id: elementId(a.elementId, a.id),
        type: 'code',
        left: a.x,
        top: a.y,
        width: a.width ?? 500,
        height: a.height ?? 300,
        rotate: 0,
        language: a.language,
        lines: a.code.split('\n').map((content, i) => ({ id: `L${i + 1}`, content })),
        fileName: a.fileName,
      } as unknown as PPTElement);
    default:
      return state;
  }
}

/** Replay whiteboard actions from scratch. */
export function replayWhiteboard(actions: Action[]): WhiteboardState {
  return actions.reduce(
    (s, a) => (isWhiteboardAction(a) ? applyWhiteboardAction(s, a) : s),
    EMPTY_WHITEBOARD,
  );
}
