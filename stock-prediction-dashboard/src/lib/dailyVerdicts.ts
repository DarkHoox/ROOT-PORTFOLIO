import type { ModuleWeights, Signal, StockProfile } from '../types/market';
import { computeAllModules } from './modules';
import { computeVerdict } from './modules/aggregate';

export interface DailyVerdict {
  time: number;
  index: number; // index into profile.seriesDaily
  signal: Signal;
  confidence: number;
  reason: string;
}

// 450 trailing bars cover the longest indicator lookback (SMA200, Ichimoku
// senkou 52+26, S/R 180) while keeping a 252-day walk fast.
const MODULE_WINDOW = 450;

const cache = new Map<string, DailyVerdict[]>();

/**
 * Walk-forward daily verdicts: for each historical day, recompute all 9
 * modules using only data available up to that day (no lookahead).
 * Memoized per symbol + weights, since the 252-day walk costs ~2s.
 */
export function computeDailyVerdicts(profile: StockProfile, weights: ModuleWeights, lookbackDays = 252): DailyVerdict[] {
  const key = `${profile.meta.symbol}|${lookbackDays}|${JSON.stringify(weights)}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const daily = profile.seriesDaily;
  const startIndex = Math.max(220, daily.length - lookbackDays);
  const verdicts: DailyVerdict[] = [];

  for (let i = startIndex; i < daily.length; i += 1) {
    const truncated = daily.slice(Math.max(0, i + 1 - MODULE_WINDOW), i + 1);
    const tempProfile: StockProfile = { ...profile, seriesDaily: truncated };
    const modules = computeAllModules(tempProfile);
    const verdict = computeVerdict(modules, weights);
    verdicts.push({ time: daily[i].time, index: i, signal: verdict.signal, confidence: verdict.confidence, reason: verdict.topReason });
  }

  cache.set(key, verdicts);
  return verdicts;
}
