import type { Candle } from '../../types/market';

export type PatternName = 'doji' | 'hammer' | 'shootingStar' | 'bullishEngulfing' | 'bearishEngulfing' | 'morningStar' | 'eveningStar';

export interface DetectedPattern {
  name: PatternName;
  label: string;
  bias: 'up' | 'down';
  index: number;
}

const body = (c: Candle) => Math.abs(c.close - c.open);
const range = (c: Candle) => Math.max(c.high - c.low, 1e-9);
const upperWick = (c: Candle) => c.high - Math.max(c.open, c.close);
const lowerWick = (c: Candle) => Math.min(c.open, c.close) - c.low;
const isBull = (c: Candle) => c.close > c.open;
const isBear = (c: Candle) => c.close < c.open;

function isDoji(c: Candle): boolean {
  return body(c) / range(c) < 0.1;
}

function isHammer(c: Candle): boolean {
  return lowerWick(c) > body(c) * 2 && upperWick(c) < body(c) * 0.6 && body(c) / range(c) > 0.05;
}

function isShootingStar(c: Candle): boolean {
  return upperWick(c) > body(c) * 2 && lowerWick(c) < body(c) * 0.6 && body(c) / range(c) > 0.05;
}

function isBullishEngulfing(prev: Candle, cur: Candle): boolean {
  return isBear(prev) && isBull(cur) && cur.open <= prev.close && cur.close >= prev.open;
}

function isBearishEngulfing(prev: Candle, cur: Candle): boolean {
  return isBull(prev) && isBear(cur) && cur.open >= prev.close && cur.close <= prev.open;
}

const PATTERN_LABELS: Record<PatternName, string> = {
  doji: 'Doji',
  hammer: 'Hammer (kladivo)',
  shootingStar: 'Shooting Star (padající hvězda)',
  bullishEngulfing: 'Bullish Engulfing (býčí pohlcení)',
  bearishEngulfing: 'Bearish Engulfing (medvědí pohlcení)',
  morningStar: 'Morning Star (ranní hvězda)',
  eveningStar: 'Evening Star (večerní hvězda)',
};

/** Scans the most recent bars (default: last 3) for a recognized candlestick pattern. */
export function detectRecentPatterns(candles: Candle[], lookback = 3): DetectedPattern[] {
  const found: DetectedPattern[] = [];
  const n = candles.length;
  for (let i = n - lookback; i < n; i++) {
    if (i < 2) continue;
    const c = candles[i];
    const prev = candles[i - 1];
    const prev2 = candles[i - 2];

    if (isDoji(c)) found.push(mk('doji', 'up', i));
    if (isHammer(c)) found.push(mk('hammer', isBull(c) ? 'up' : 'up', i));
    if (isShootingStar(c)) found.push(mk('shootingStar', 'down', i));
    if (isBullishEngulfing(prev, c)) found.push(mk('bullishEngulfing', 'up', i));
    if (isBearishEngulfing(prev, c)) found.push(mk('bearishEngulfing', 'down', i));

    // Morning star: bear candle, small-body candle gapping down, bull candle closing into first body
    if (
      isBear(prev2) &&
      body(prev) / range(prev) < 0.35 &&
      isBull(c) &&
      c.close > (prev2.open + prev2.close) / 2
    ) {
      found.push(mk('morningStar', 'up', i));
    }
    // Evening star: mirror of morning star
    if (
      isBull(prev2) &&
      body(prev) / range(prev) < 0.35 &&
      isBear(c) &&
      c.close < (prev2.open + prev2.close) / 2
    ) {
      found.push(mk('eveningStar', 'down', i));
    }
  }
  return found;
}

function mk(name: PatternName, bias: 'up' | 'down', index: number): DetectedPattern {
  return { name, label: PATTERN_LABELS[name], bias, index };
}

/**
 * Backward-looking heuristic "win rate" for a pattern: scans full history for
 * prior occurrences and checks whether price moved in the pattern's implied
 * direction `horizon` bars later. Purely descriptive of *this* series, not a
 * universal statistic.
 */
export function patternHistoricalSuccessRate(candles: Candle[], pattern: PatternName, bias: 'up' | 'down', horizon = 5): number | null {
  const detectorMap: Record<PatternName, (i: number) => boolean> = {
    doji: (i) => isDoji(candles[i]),
    hammer: (i) => isHammer(candles[i]),
    shootingStar: (i) => isShootingStar(candles[i]),
    bullishEngulfing: (i) => i >= 1 && isBullishEngulfing(candles[i - 1], candles[i]),
    bearishEngulfing: (i) => i >= 1 && isBearishEngulfing(candles[i - 1], candles[i]),
    morningStar: (i) => i >= 2 && isBear(candles[i - 2]) && isBull(candles[i]),
    eveningStar: (i) => i >= 2 && isBull(candles[i - 2]) && isBear(candles[i]),
  };
  const detector = detectorMap[pattern];
  let occurrences = 0;
  let successes = 0;
  for (let i = 2; i < candles.length - horizon; i++) {
    if (!detector(i)) continue;
    occurrences += 1;
    const entry = candles[i].close;
    const exit = candles[i + horizon].close;
    const moved = bias === 'up' ? exit > entry : exit < entry;
    if (moved) successes += 1;
  }
  if (occurrences < 5) return null;
  return Math.round((successes / occurrences) * 100);
}
