import type { Candle } from '../../types/market';

export interface PivotLevels {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export function classicPivotPoints(prevDay: Candle): PivotLevels {
  const { high, low, close } = prevDay;
  const pivot = (high + low + close) / 3;
  return {
    pivot,
    r1: 2 * pivot - low,
    s1: 2 * pivot - high,
    r2: pivot + (high - low),
    s2: pivot - (high - low),
    r3: high + 2 * (pivot - low),
    s3: low - 2 * (high - pivot),
  };
}

export function fibonacciRetracement(swingHigh: number, swingLow: number) {
  const range = swingHigh - swingLow;
  return {
    level0: swingHigh,
    level236: swingHigh - range * 0.236,
    level382: swingHigh - range * 0.382,
    level500: swingHigh - range * 0.5,
    level618: swingHigh - range * 0.618,
    level786: swingHigh - range * 0.786,
    level100: swingLow,
  };
}

export interface SwingLevel {
  price: number;
  strength: number; // number of touches near this level
  type: 'support' | 'resistance';
}

/**
 * Detects swing highs/lows over the lookback window, then clusters nearby
 * pivots (within `tolerancePct`) to approximate support/resistance zones,
 * ranked by number of touches.
 */
export function detectSupportResistance(candles: Candle[], lookback = 180, tolerancePct = 0.015): SwingLevel[] {
  const window = candles.slice(-lookback);
  const pivots: { price: number; type: 'support' | 'resistance' }[] = [];
  const swingSpan = 5;

  for (let i = swingSpan; i < window.length - swingSpan; i++) {
    const slice = window.slice(i - swingSpan, i + swingSpan + 1);
    const c = window[i];
    if (c.high === Math.max(...slice.map((s) => s.high))) {
      pivots.push({ price: c.high, type: 'resistance' });
    }
    if (c.low === Math.min(...slice.map((s) => s.low))) {
      pivots.push({ price: c.low, type: 'support' });
    }
  }

  const clusters: SwingLevel[] = [];
  for (const p of pivots) {
    const existing = clusters.find((c) => c.type === p.type && Math.abs(c.price - p.price) / p.price < tolerancePct);
    if (existing) {
      existing.strength += 1;
      existing.price = (existing.price * (existing.strength - 1) + p.price) / existing.strength;
    } else {
      clusters.push({ price: p.price, strength: 1, type: p.type });
    }
  }

  return clusters.sort((a, b) => b.strength - a.strength).slice(0, 8);
}

export function nearestLevel(price: number, levels: SwingLevel[]): { level: SwingLevel; distancePct: number } | null {
  if (levels.length === 0) return null;
  let best: SwingLevel | null = null;
  let bestDist = Infinity;
  for (const l of levels) {
    const dist = Math.abs(l.price - price) / price;
    if (dist < bestDist) {
      bestDist = dist;
      best = l;
    }
  }
  return best ? { level: best, distancePct: bestDist * 100 } : null;
}
