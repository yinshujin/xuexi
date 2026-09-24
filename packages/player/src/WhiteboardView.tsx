import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SlideCanvas } from '@openmaic/renderer';
import type { PPTElement, Slide } from '@openmaic/dsl';

/**
 * The teacher's whiteboard, drawn as plain HTML instead of a scaled 16:9
 * canvas: items flow top to bottom (in the order of their position), text is
 * sized for the space available — phones in portrait get a tall board under
 * the slide — and each new item is "written" in with a short wipe animation.
 * Boards with shapes, charts or code (possible in OpenMAIC-generated lessons)
 * fall back to the canvas renderer.
 */

interface TextEl {
  id: string;
  type: 'text';
  content: string;
  left: number;
  top: number;
  defaultColor?: string;
}
interface LatexEl {
  id: string;
  type: 'latex';
  html: string;
  left: number;
  top: number;
}
interface TableEl {
  id: string;
  type: 'table';
  left: number;
  top: number;
  data: Array<Array<{ id: string; text: string }>>;
  theme?: { rowHeader?: boolean };
}
interface LineEl {
  id: string;
  type: 'line';
  left: number;
  top: number;
  start: [number, number];
  end: [number, number];
  color?: string;
}
type FlowEl = TextEl | LatexEl | TableEl | LineEl;

const FLOW_TYPES = new Set(['text', 'latex', 'table', 'line']);

const STYLE = `
@keyframes xuexi-wb-write { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
.xuexi-wb-item { animation: xuexi-wb-write 0.7s ease-out both; }
.xuexi-wb-text p, .xuexi-wb-text span, .xuexi-wb-text div { font-size: inherit !important; line-height: inherit !important; margin: 0; }
.xuexi-wb-table td { border: 2px solid #e2dccb; padding: 0.15em 0.5em; text-align: center; min-width: 1.6em; }
.xuexi-wb-table tr:first-child td.xuexi-wb-head { background: #fdf3d6; }
`;

/** Font size in px for a board of this width (clamped for small phones and big tablets). */
function fontFor(width: number): number {
  return Math.round(Math.max(18, Math.min(34, width * 0.045)));
}

function useWidth<T extends HTMLElement>(): [(el: T | null) => void, number] {
  const [el, setEl] = useState<T | null>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, w];
}

function Item({ el, font }: { el: FlowEl; font: number }) {
  switch (el.type) {
    case 'text':
      return (
        <div
          className="xuexi-wb-text whitespace-pre-wrap break-words"
          style={{ color: el.defaultColor ?? '#333333', fontSize: font, lineHeight: 1.45 }}
          dangerouslySetInnerHTML={{ __html: el.content }}
        />
      );
    case 'latex':
      return <div style={{ fontSize: font * 0.9 }} dangerouslySetInnerHTML={{ __html: el.html }} />;
    case 'table': {
      const digitGrid = el.data.every((row) => row.every((c) => [...c.text].length <= 4));
      return (
        <div className="max-w-full overflow-x-auto">
          <table
            className="xuexi-wb-table border-collapse"
            style={{ fontSize: digitGrid ? font * 1.1 : font * 0.85, lineHeight: 1.4 }}
          >
            <tbody>
              {el.data.map((row, r) => (
                <tr key={r}>
                  {row.map((c) => (
                    <td key={c.id} className={r === 0 && el.theme?.rowHeader ? 'xuexi-wb-head' : undefined}>
                      {c.text}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case 'line': {
      const len = Math.hypot(el.end[0] - el.start[0], el.end[1] - el.start[1]);
      return (
        <div
          className="my-1 rounded"
          style={{ height: 3, width: `${Math.min(100, (len / 840) * 100)}%`, background: el.color ?? '#333333' }}
        />
      );
    }
  }
}

export function WhiteboardView({
  elements,
  theme,
}: {
  elements: PPTElement[];
  /** Used by the canvas fallback. */
  theme?: Slide['theme'];
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const flow = elements.every((e) => FLOW_TYPES.has(e.type));
  const ordered = (elements as unknown as FlowEl[])
    .map((e, i) => ({ e, i }))
    .sort((a, b) => a.e.top - b.e.top || a.e.left - b.e.left || a.i - b.i)
    .map(({ e }) => e);

  // Keep the newest line in view when the board fills up.
  const lastId = elements.at(-1)?.id;
  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [lastId, elements.length]);

  if (!flow) {
    const slide: Slide = {
      id: 'whiteboard',
      viewportSize: 1000,
      viewportRatio: 0.5625,
      theme: theme ?? { backgroundColor: '#ffffff', themeColors: ['#5b9bd5'], fontColor: '#333333', fontName: 'Microsoft YaHei' },
      elements,
      background: { type: 'solid', color: '#fffdf5' },
    };
    return (
      <div className="flex h-full w-full items-center">
        <div className="aspect-video w-full">
          <SlideCanvas slide={slide} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    );
  }

  const font = fontFor(width || 360);
  return (
    <div ref={ref} className="h-full w-full overflow-y-auto px-[5%] py-[4%] text-slate-800">
      <style>{STYLE}</style>
      <div className="flex flex-col items-start gap-[0.35em]" style={{ fontSize: font }}>
        {ordered.map((el) => (
          <div key={el.id} className="xuexi-wb-item max-w-full" style={{ marginLeft: `${Math.max(0, Math.min(40, (el.left - 80) / 10))}%` }}>
            <Item el={el} font={font} />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
