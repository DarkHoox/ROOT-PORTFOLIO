import { useMemo } from 'react';
import { getSectorPerformance } from '../../data/mockData';
import { Card } from '../common/Card';

const MAX_ABS = 3; // %, scale clamp for color intensity

function cellStyle(changePct: number): React.CSSProperties {
  const t = Math.min(Math.abs(changePct) / MAX_ABS, 1);
  const lightness = 22 - t * 8; // darker surface -> more saturated as magnitude grows
  const hue = changePct >= 0 ? 152 : 356; // green / red
  const alpha = 0.15 + t * 0.55;
  return {
    backgroundColor: `hsl(${hue} 65% ${lightness}% / ${alpha})`,
    borderColor: `hsl(${hue} 55% 40% / ${0.3 + t * 0.4})`,
  };
}

export function SectorHeatmap() {
  const sectors = useMemo(() => getSectorPerformance(), []);
  const sorted = [...sectors].sort((a, b) => b.changePct - a.changePct);

  return (
    <Card title="Heatmapa sektorů" subtitle="Průměrná denní změna napříč akciemi v sektoru">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {sorted.map((s) => (
          <div
            key={s.sector}
            className="flex flex-col justify-between rounded-md border px-3 py-3"
            style={cellStyle(s.changePct)}
          >
            <span className="text-xs font-medium text-ink-secondary">{s.sector}</span>
            <span className={clsxTone(s.changePct)}>
              {s.changePct >= 0 ? '▲' : '▼'} {s.changePct >= 0 ? '+' : ''}
              {s.changePct.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function clsxTone(v: number) {
  return `tabular mt-2 text-sm font-semibold ${v >= 0 ? 'text-up' : 'text-down'}`;
}
