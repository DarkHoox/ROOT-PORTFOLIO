import { getAllProfiles } from '../data/mockData';
import { computeAllModules } from './modules';
import { computeVerdict } from './modules/aggregate';
import type { ModuleWeights, Sector, Signal } from '../types/market';

export interface ScreenerRow {
  symbol: string;
  name: string;
  sector: Sector;
  price: number;
  changePct: number;
  bullishCount: number;
  bearishCount: number;
  verdictSignal: Signal;
  confidence: number;
  marketCapB: number;
  beta: number;
}

export function buildScreenerRows(weights: ModuleWeights): ScreenerRow[] {
  const profiles = getAllProfiles();
  return profiles.map((p) => {
    const modules = computeAllModules(p);
    const verdict = computeVerdict(modules, weights);
    const c = p.seriesDaily;
    const last = c[c.length - 1].close;
    const prev = c[c.length - 2].close;
    return {
      symbol: p.meta.symbol,
      name: p.meta.name,
      sector: p.meta.sector,
      price: last,
      changePct: ((last - prev) / prev) * 100,
      bullishCount: verdict.bullishCount,
      bearishCount: verdict.bearishCount,
      verdictSignal: verdict.signal,
      confidence: verdict.confidence,
      marketCapB: p.fundamentals.marketCapB,
      beta: p.fundamentals.beta,
    };
  });
}

export type MarketCapBucket = 'all' | 'small' | 'mid' | 'large' | 'mega';
export type VolatilityBucket = 'all' | 'low' | 'medium' | 'high';

export function matchesMarketCap(row: ScreenerRow, bucket: MarketCapBucket): boolean {
  if (bucket === 'all') return true;
  if (bucket === 'small') return row.marketCapB < 10;
  if (bucket === 'mid') return row.marketCapB >= 10 && row.marketCapB < 50;
  if (bucket === 'large') return row.marketCapB >= 50 && row.marketCapB < 300;
  return row.marketCapB >= 300; // mega
}

export function matchesVolatility(row: ScreenerRow, bucket: VolatilityBucket): boolean {
  if (bucket === 'all') return true;
  if (bucket === 'low') return row.beta < 0.9;
  if (bucket === 'medium') return row.beta >= 0.9 && row.beta < 1.4;
  return row.beta >= 1.4; // high
}
