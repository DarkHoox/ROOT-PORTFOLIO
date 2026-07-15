/** Tiny inline SVG sparkline — no chart library needed at this size. */
export function Sparkline({ values, width = 96, height = 28 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (width - pad * 2);
      const y = pad + (1 - (v - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const rising = values[values.length - 1] >= values[0];
  return (
    <svg width={width} height={height} aria-hidden className="shrink-0">
      <polyline points={points} fill="none" stroke={rising ? '#1fae5d' : '#e5484d'} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
