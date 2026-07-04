import { useMemo } from 'react';
import { getFearGreedIndex } from '../../data/mockData';
import { Card } from '../common/Card';

function gaugeColor(score: number): string {
  if (score >= 75) return '#1fae5d';
  if (score >= 55) return '#5fbf7a';
  if (score >= 45) return '#9aa1ac';
  if (score >= 25) return '#e08a4d';
  return '#e5484d';
}

export function FearGreedGauge() {
  const fg = useMemo(() => getFearGreedIndex(), []);
  const angle = (fg.score / 100) * 180 - 90; // -90..90 deg
  const color = gaugeColor(fg.score);

  return (
    <Card title="Fear & Greed Index" subtitle="Kompozitní ukazatel nálady trhu">
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 200 110" className="w-full max-w-[220px]">
          <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke="#2c2c2a" strokeWidth="14" strokeLinecap="round" />
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${(fg.score / 100) * 283} 283`}
          />
          <g transform={`rotate(${angle} 100 100)`}>
            <line x1="100" y1="100" x2="100" y2="25" stroke="#e9ebef" strokeWidth="3" strokeLinecap="round" />
          </g>
          <circle cx="100" cy="100" r="6" fill="#e9ebef" />
        </svg>
        <div className="-mt-2 text-center">
          <div className="tabular text-3xl font-bold" style={{ color }}>
            {fg.score}
          </div>
          <div className="text-sm font-medium text-ink-secondary">{translateLabel(fg.label)}</div>
        </div>
        <div className="mt-4 w-full space-y-2">
          {fg.components.map((c) => (
            <div key={c.label} className="flex items-center justify-between text-xs">
              <span className="text-ink-muted">{c.label}</span>
              <span className="tabular font-medium text-ink-secondary">{c.score}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function translateLabel(label: string): string {
  const map: Record<string, string> = {
    'Extreme Greed': 'Extrémní chamtivost',
    Greed: 'Chamtivost',
    Neutral: 'Neutrální',
    Fear: 'Strach',
    'Extreme Fear': 'Extrémní strach',
  };
  return map[label] ?? label;
}
