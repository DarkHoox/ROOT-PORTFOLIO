import type { Candle } from '../../types/market';

export function obv(candles: Candle[]): number[] {
  const out: number[] = new Array(candles.length).fill(0);
  for (let i = 1; i < candles.length; i++) {
    const prev = out[i - 1];
    if (candles[i].close > candles[i - 1].close) out[i] = prev + candles[i].volume;
    else if (candles[i].close < candles[i - 1].close) out[i] = prev - candles[i].volume;
    else out[i] = prev;
  }
  return out;
}

/** Session-anchored VWAP re-computed over the trailing window (demo proxy for intraday VWAP). */
export function vwap(candles: Candle[], window = 20): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = 0; i < candles.length; i++) {
    const start = Math.max(0, i - window + 1);
    let pvSum = 0;
    let vSum = 0;
    for (let j = start; j <= i; j++) {
      const typical = (candles[j].high + candles[j].low + candles[j].close) / 3;
      pvSum += typical * candles[j].volume;
      vSum += candles[j].volume;
    }
    out[i] = vSum > 0 ? pvSum / vSum : null;
  }
  return out;
}

export function volumeSpike(candles: Candle[], lookback = 20, threshold = 1.8): boolean {
  if (candles.length < lookback + 1) return false;
  const recent = candles.slice(-lookback - 1, -1);
  const avgVol = recent.reduce((a, c) => a + c.volume, 0) / recent.length;
  const last = candles[candles.length - 1].volume;
  return avgVol > 0 && last / avgVol >= threshold;
}

/** Accumulation/Distribution line — money-flow-weighted running total. */
export function accumulationDistribution(candles: Candle[]): number[] {
  const out: number[] = new Array(candles.length).fill(0);
  let cum = 0;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const range = c.high - c.low;
    const mfMultiplier = range === 0 ? 0 : ((c.close - c.low) - (c.high - c.close)) / range;
    cum += mfMultiplier * c.volume;
    out[i] = cum;
  }
  return out;
}
