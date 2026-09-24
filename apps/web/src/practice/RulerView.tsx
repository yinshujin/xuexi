import type { RulerSpec } from '@xuexi/practice';

const U = 38; // pixels per centimetre
const PAD = 26;
const OBJ_Y = 22;
const RULER_Y = 74;
const RULER_H = 58;

/** An object lying above a centimetre ruler (possibly a broken ruler that does not start at 0). */
export function RulerView({ spec }: { spec: RulerSpec }) {
  const span = spec.rulerTo - spec.rulerFrom;
  const width = span * U + PAD * 2;
  const x = (cm: number) => PAD + (cm - spec.rulerFrom) * U;
  const broken = spec.rulerFrom > 0;

  const ticks = [];
  for (let mm = 0; mm <= span * 10; mm++) {
    const len = mm % 10 === 0 ? 20 : mm % 5 === 0 ? 14 : 8;
    const tx = PAD + (mm * U) / 10;
    ticks.push(
      <line key={mm} x1={tx} y1={RULER_Y} x2={tx} y2={RULER_Y + len} stroke="#334155" strokeWidth={mm % 10 === 0 ? 1.4 : 0.7} />,
    );
  }
  const labels = [];
  for (let cm = spec.rulerFrom; cm <= spec.rulerTo; cm++) {
    labels.push(
      <text key={cm} x={x(cm)} y={RULER_Y + 38} fontSize="15" textAnchor="middle" fill="#0f172a">
        {cm}
      </text>,
    );
  }

  // A broken ruler gets a zig-zag left edge.
  const left = PAD - 14;
  const right = x(spec.rulerTo) + 14;
  const bottom = RULER_Y + RULER_H;
  const zig = broken
    ? `L ${left + 7} ${RULER_Y + RULER_H * 0.75} L ${left - 3} ${RULER_Y + RULER_H * 0.5} L ${left + 7} ${RULER_Y + RULER_H * 0.25}`
    : '';
  const rulerPath = `M ${left} ${RULER_Y} L ${right} ${RULER_Y} L ${right} ${bottom} L ${left} ${bottom} ${zig} Z`;

  const x1 = x(spec.from);
  const x2 = x(spec.to);
  const h = 22;
  let object: React.ReactNode;
  switch (spec.item) {
    case '铅笔':
    case '蜡笔': {
      const tip = Math.min(26, (x2 - x1) / 3);
      const body = spec.item === '铅笔' ? '#facc15' : '#f472b6';
      object = (
        <g>
          <rect x={x1} y={OBJ_Y} width={x2 - x1 - tip} height={h} rx={spec.item === '蜡笔' ? 6 : 2} fill={body} stroke="#92400e" />
          <path d={`M ${x2 - tip} ${OBJ_Y} L ${x2} ${OBJ_Y + h / 2} L ${x2 - tip} ${OBJ_Y + h} Z`} fill="#fde68a" stroke="#92400e" />
          {spec.item === '铅笔' && <path d={`M ${x2 - tip / 3} ${OBJ_Y + h / 3} L ${x2} ${OBJ_Y + h / 2} L ${x2 - tip / 3} ${OBJ_Y + (2 * h) / 3} Z`} fill="#1f2937" />}
        </g>
      );
      break;
    }
    case '线段':
      object = (
        <g stroke="#dc2626" strokeWidth="3" strokeLinecap="round">
          <line x1={x1} y1={OBJ_Y + h / 2} x2={x2} y2={OBJ_Y + h / 2} />
          <line x1={x1} y1={OBJ_Y + 3} x2={x1} y2={OBJ_Y + h - 3} />
          <line x1={x2} y1={OBJ_Y + 3} x2={x2} y2={OBJ_Y + h - 3} />
        </g>
      );
      break;
    case '小棒':
      object = <rect x={x1} y={OBJ_Y + 5} width={x2 - x1} height={12} rx={3} fill="#fb923c" stroke="#9a3412" />;
      break;
    default:
      object = <rect x={x1} y={OBJ_Y + 2} width={x2 - x1} height={h - 4} rx={2} fill="#38bdf8" stroke="#0369a1" />;
  }

  return (
    <svg viewBox={`0 0 ${width} ${RULER_Y + RULER_H + 8}`} className="mx-auto w-full max-w-2xl" role="img" aria-label={`刻度尺上的${spec.item}`}>
      <path d={rulerPath} fill="#fef9c3" stroke="#a16207" strokeWidth="1.5" />
      {ticks}
      {labels}
      <line x1={x1} y1={OBJ_Y + h} x2={x1} y2={RULER_Y} stroke="#64748b" strokeDasharray="3 3" />
      <line x1={x2} y1={OBJ_Y + h} x2={x2} y2={RULER_Y} stroke="#64748b" strokeDasharray="3 3" />
      {object}
    </svg>
  );
}
