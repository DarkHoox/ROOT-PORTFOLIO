import type { ModuleDetail, Signal } from '../../types/market';

export interface WeightedDirection {
  dir: number; // -1, 0, +1 (or fractional for partial conviction)
  weight: number;
}

export function scoreFromSignals(signals: WeightedDirection[]): number {
  const totalWeight = signals.reduce((s, x) => s + x.weight, 0) || 1;
  const weighted = signals.reduce((s, x) => s + x.dir * x.weight, 0) / totalWeight;
  return clampScore(50 + weighted * 50);
}

export function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function signalFromScore(score: number, band = 6): Signal {
  if (score >= 50 + band) return 'up';
  if (score <= 50 - band) return 'down';
  return 'neutral';
}

export function detail(label: string, value: string): ModuleDetail {
  return { label, value };
}

export function fmt(v: number): string {
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}
