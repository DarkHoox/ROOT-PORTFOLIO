export function ConfidenceRing({ value, size = 68, label }: { value: number; size?: number; label?: string }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 70 ? '#1fae5d' : value >= 55 ? '#f0a202' : '#9aa1ac';
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} role="img" aria-label={`${label ?? 'skóre'}: ${value} ze 100`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1c2029" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(c * value) / 100} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="#e9ebef" fontSize={size / 3.6} fontWeight="700">
          {value}
        </text>
      </svg>
      {label && <span className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</span>}
    </div>
  );
}
