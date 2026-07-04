import type { Candle } from '../../types/market';

export type PatternName = 'doji' | 'hammer' | 'shootingStar' | 'bullishEngulfing' | 'bearishEngulfing' | 'morningStar' | 'eveningStar';

export type PatternBias = 'up' | 'down' | 'neutral';

export interface DetectedPattern {
  name: PatternName;
  label: string;
  bias: PatternBias;
  index: number;
}

const body = (c: Candle) => Math.abs(c.close - c.open);
const range = (c: Candle) => Math.max(c.high - c.low, 1e-9);
const upperWick = (c: Candle) => c.high - Math.max(c.open, c.close);
const lowerWick = (c: Candle) => Math.min(c.open, c.close) - c.low;
const isBull = (c: Candle) => c.close > c.open;
const isBear = (c: Candle) => c.close < c.open;

// Single source of truth for each pattern: the same predicate drives both
// live detection and the historical success-rate scan, so the advertised
// "historical follow-through" is measured on exactly the pattern shown.
const PREDICATES: Record<PatternName, (candles: Candle[], i: number) => boolean> = {
  doji: (candles, i) => body(candles[i]) / range(candles[i]) < 0.1,
  hammer: (candles, i) => {
    const c = candles[i];
    return lowerWick(c) > body(c) * 2 && upperWick(c) < body(c) * 0.6 && body(c) / range(c) > 0.05;
  },
  shootingStar: (candles, i) => {
    const c = candles[i];
    return upperWick(c) > body(c) * 2 && lowerWick(c) < body(c) * 0.6 && body(c) / range(c) > 0.05;
  },
  bullishEngulfing: (candles, i) => {
    if (i < 1) return false;
    const prev = candles[i - 1];
    const cur = candles[i];
    return isBear(prev) && isBull(cur) && cur.open <= prev.close && cur.close >= prev.open;
  },
  bearishEngulfing: (candles, i) => {
    if (i < 1) return false;
    const prev = candles[i - 1];
    const cur = candles[i];
    return isBull(prev) && isBear(cur) && cur.open >= prev.close && cur.close <= prev.open;
  },
  // Morning star: bear candle, small-body candle, bull candle closing above the first body's midpoint
  morningStar: (candles, i) => {
    if (i < 2) return false;
    const [first, mid, last] = [candles[i - 2], candles[i - 1], candles[i]];
    return isBear(first) && body(mid) / range(mid) < 0.35 && isBull(last) && last.close > (first.open + first.close) / 2;
  },
  // Evening star: mirror of morning star
  eveningStar: (candles, i) => {
    if (i < 2) return false;
    const [first, mid, last] = [candles[i - 2], candles[i - 1], candles[i]];
    return isBull(first) && body(mid) / range(mid) < 0.35 && isBear(last) && last.close < (first.open + first.close) / 2;
  },
};

const PATTERN_BIAS: Record<PatternName, PatternBias> = {
  doji: 'neutral', // indecision — must not push the score in either direction
  hammer: 'up',
  shootingStar: 'down',
  bullishEngulfing: 'up',
  bearishEngulfing: 'down',
  morningStar: 'up',
  eveningStar: 'down',
};

const PATTERN_LABELS: Record<PatternName, string> = {
  doji: 'Doji',
  hammer: 'Hammer (kladivo)',
  shootingStar: 'Shooting Star (padající hvězda)',
  bullishEngulfing: 'Bullish Engulfing (býčí pohlcení)',
  bearishEngulfing: 'Bearish Engulfing (medvědí pohlcení)',
  morningStar: 'Morning Star (ranní hvězda)',
  eveningStar: 'Evening Star (večerní hvězda)',
};

const ALL_PATTERNS = Object.keys(PREDICATES) as PatternName[];

/** Scans the most recent bars (default: last 3) for recognized candlestick patterns. */
export function detectRecentPatterns(candles: Candle[], lookback = 3): DetectedPattern[] {
  const found: DetectedPattern[] = [];
  const n = candles.length;
  for (let i = Math.max(2, n - lookback); i < n; i++) {
    for (const name of ALL_PATTERNS) {
      if (PREDICATES[name](candles, i)) {
        found.push({ name, label: PATTERN_LABELS[name], bias: PATTERN_BIAS[name], index: i });
      }
    }
  }
  return found;
}

/**
 * Backward-looking heuristic "win rate" for a directional pattern: scans full
 * history for prior occurrences (using the SAME predicate as detection) and
 * checks whether price moved in the pattern's implied direction `horizon`
 * bars later. Purely descriptive of *this* series, not a universal statistic.
 * Returns null for neutral patterns (doji) and for fewer than 5 occurrences.
 */
export function patternHistoricalSuccessRate(candles: Candle[], pattern: PatternName, horizon = 5): number | null {
  const bias = PATTERN_BIAS[pattern];
  if (bias === 'neutral') return null;
  const predicate = PREDICATES[pattern];
  let occurrences = 0;
  let successes = 0;
  for (let i = 2; i < candles.length - horizon; i++) {
    if (!predicate(candles, i)) continue;
    occurrences += 1;
    const entry = candles[i].close;
    const exit = candles[i + horizon].close;
    const moved = bias === 'up' ? exit > entry : exit < entry;
    if (moved) successes += 1;
  }
  if (occurrences < 5) return null;
  return Math.round((successes / occurrences) * 100);
}
