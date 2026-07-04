import type { Candle } from '../../types/market';
import { ema, sma } from './movingAverages';

export interface BollingerResult {
  middle: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
  bandwidth: (number | null)[];
}

export function bollingerBands(closes: number[], period = 20, stdDevMult = 2): BollingerResult {
  const middle = sma(closes, period);
  const upper: (number | null)[] = new Array(closes.length).fill(null);
  const lower: (number | null)[] = new Array(closes.length).fill(null);
  const bandwidth: (number | null)[] = new Array(closes.length).fill(null);
  for (let i = period - 1; i < closes.length; i++) {
    const window = closes.slice(i - period + 1, i + 1);
    const mean = middle[i] as number;
    const variance = window.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    upper[i] = mean + std * stdDevMult;
    lower[i] = mean - std * stdDevMult;
    bandwidth[i] = mean !== 0 ? ((upper[i] as number) - (lower[i] as number)) / mean : null;
  }
  return { middle, upper, lower, bandwidth };
}

export function atr(candles: Candle[], period = 14): (number | null)[] {
  const trueRanges: number[] = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prevClose = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
  });
  const out: (number | null)[] = new Array(candles.length).fill(null);
  let prevATR: number | null = null;
  for (let i = 0; i < candles.length; i++) {
    if (i === period - 1) {
      prevATR = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
      out[i] = prevATR;
    } else if (i >= period) {
      prevATR = ((prevATR as number) * (period - 1) + trueRanges[i]) / period;
      out[i] = prevATR;
    }
  }
  return out;
}

export interface KeltnerResult {
  middle: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
}

export function keltnerChannels(candles: Candle[], period = 20, atrMult = 2): KeltnerResult {
  const closes = candles.map((c) => c.close);
  const middle = ema(closes, period);
  const atrSeries = atr(candles, period);
  const upper = middle.map((m, i) => (m !== null && atrSeries[i] !== null ? m + (atrSeries[i] as number) * atrMult : null));
  const lower = middle.map((m, i) => (m !== null && atrSeries[i] !== null ? m - (atrSeries[i] as number) * atrMult : null));
  return { middle, upper, lower };
}

/** TTM-squeeze style: Bollinger Bands inside Keltner Channels = low-vol compression. */
export function detectSqueeze(candles: Candle[]): boolean {
  const closes = candles.map((c) => c.close);
  const bb = bollingerBands(closes, 20, 2);
  const kc = keltnerChannels(candles, 20, 1.5);
  const i = candles.length - 1;
  if (bb.upper[i] === null || kc.upper[i] === null) return false;
  return (bb.upper[i] as number) < (kc.upper[i] as number) && (bb.lower[i] as number) > (kc.lower[i] as number);
}
