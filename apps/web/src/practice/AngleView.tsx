import type { AngleSpec } from '@xuexi/practice';

/** An angle with a protractor laid over it (outer scale 0→180 counter-clockwise from the right, inner scale from the left). */
export function AngleView({ spec }: { spec: AngleSpec }) {
  const cx = 220;
  const cy = 210;
  const r = 180;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const pt = (deg: number, radius: number) => [cx + radius * Math.cos(rad(deg)), cy - radius * Math.sin(rad(deg))] as const;
  // Ray 1 lies on the baseline; ray 2 is `degrees` away from it.
  const ray1 = spec.opensLeft ? 180 : 0;
  const ray2 = spec.opensLeft ? 180 - spec.degrees : spec.degrees;
  const ticks = [];
  for (let d = 0; d <= 180; d += 1) {
    const len = d % 10 === 0 ? 16 : d % 5 === 0 ? 11 : 6;
    const [x1, y1] = pt(d, r);
    const [x2, y2] = pt(d, r - len);
    ticks.push(<line key={d} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#475569" strokeWidth={d % 10 === 0 ? 1.4 : 0.7} />);
  }
  const labels = [];
  for (let d = 0; d <= 180; d += 10) {
    const [ox, oy] = pt(d, r - 28);
    const [ix, iy] = pt(d, r - 50);
    labels.push(
      <text key={`o${d}`} x={ox} y={oy} fontSize="12" textAnchor="middle" dominantBaseline="middle" fill="#0f172a">
        {d}
      </text>,
      <text key={`i${d}`} x={ix} y={iy} fontSize="11" textAnchor="middle" dominantBaseline="middle" fill="#0369a1">
        {180 - d}
      </text>,
    );
  }
  const [x1, y1] = pt(ray1, r + 30);
  const [x2, y2] = pt(ray2, r + 30);
  // Only rays exceeding 180° would need a reflex drawing; generators keep measure questions ≤ 180°.
  return (
    <svg viewBox="0 0 440 250" className="mx-auto w-full max-w-lg" style={{ transform: `rotate(${-spec.baseRotation}deg)` }}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z`} fill="#e0f2fe" fillOpacity="0.55" stroke="#0284c7" />
      {ticks}
      {labels}
      <line x1={cx} y1={cy} x2={x1} y2={y1} stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4" fill="#0f172a" />
    </svg>
  );
}
