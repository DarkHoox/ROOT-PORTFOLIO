import type { Candle } from '../../types/market';
import { ema } from './movingAverages';

export function rsi(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    if (i <= period) {
      avgGain += gain / period;
      avgLoss += loss / period;
      if (i === period) {
        out[i] = rsiFromAvg(avgGain, avgLoss);
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      out[i] = rsiFromAvg(avgGain, avgLoss);
    }
  }
  return out;
}

function rsiFromAvg(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export interface MACDResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

export function macd(closes: number[], fast = 12, slow = 26, signalPeriod = 9): MACDResult {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine: (number | null)[] = closes.map((_, i) => {
    const f = emaFast[i];
    const s = emaSlow[i];
    return f !== null && s !== null ? f - s : null;
  });
  const macdValuesOnly = macdLine.map((v) => v ?? 0);
  const firstValidIdx = macdLine.findIndex((v) => v !== null);
  const signalRaw = ema(macdValuesOnly.slice(firstValidIdx), signalPeriod);
  const signalLine: (number | null)[] = new Array(closes.length).fill(null);
  signalRaw.forEach((v, i) => {
    signalLine[i + firstValidIdx] = v;
  });
  const histogram = macdLine.map((v, i) => (v !== null && signalLine[i] !== null ? v - (signalLine[i] as number) : null));
  return { macd: macdLine, signal: signalLine, histogram };
}

export function stochasticOscillator(candles: Candle[], period = 14, smoothK = 3): { k: (number | null)[]; d: (number | null)[] } {
  const rawK: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = period - 1; i < candles.length; i++) {
    const window = candles.slice(i - period + 1, i + 1);
    const high = Math.max(...window.map((c) => c.high));
    const low = Math.min(...window.map((c) => c.low));
    const close = candles[i].close;
    rawK[i] = high === low ? 50 : ((close - low) / (high - low)) * 100;
  }
  const k = smoothSeries(rawK, smoothK);
  const d = smoothSeries(k, smoothK);
  return { k, d };
}

function smoothSeries(series: (number | null)[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(series.length).fill(null);
  for (let i = 0; i < series.length; i++) {
    const window = series.slice(Math.max(0, i - period + 1), i + 1).filter((v): v is number => v !== null);
    if (window.length === period) out[i] = window.reduce((a, b) => a + b, 0) / period;
  }
  return out;
}

export function williamsR(candles: Candle[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = period - 1; i < candles.length; i++) {
    const window = candles.slice(i - period + 1, i + 1);
    const high = Math.max(...window.map((c) => c.high));
    const low = Math.min(...window.map((c) => c.low));
    const close = candles[i].close;
    out[i] = high === low ? -50 : ((high - close) / (high - low)) * -100;
  }
  return out;
}

export function roc(closes: number[], period = 12): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  for (let i = period; i < closes.length; i++) {
    out[i] = ((closes[i] - closes[i - period]) / closes[i - period]) * 100;
  }
  return out;
}
