import type { Candle } from '../../types/market';

export function adx(candles: Candle[], period = 14): (number | null)[] {
  const len = candles.length;
  const plusDM: number[] = new Array(len).fill(0);
  const minusDM: number[] = new Array(len).fill(0);
  const tr: number[] = new Array(len).fill(0);

  for (let i = 1; i < len; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;
    tr[i] = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close),
    );
  }

  const smooth = (arr: number[]): number[] => {
    const out = new Array(len).fill(0);
    let sum = arr.slice(1, period + 1).reduce((a, b) => a + b, 0);
    out[period] = sum;
    for (let i = period + 1; i < len; i++) {
      sum = sum - sum / period + arr[i];
      out[i] = sum;
    }
    return out;
  };

  const trSmooth = smooth(tr);
  const plusDMSmooth = smooth(plusDM);
  const minusDMSmooth = smooth(minusDM);

  const out: (number | null)[] = new Array(len).fill(null);
  const dxSeries: number[] = new Array(len).fill(0);
  for (let i = period; i < len; i++) {
    const plusDI = trSmooth[i] === 0 ? 0 : (plusDMSmooth[i] / trSmooth[i]) * 100;
    const minusDI = trSmooth[i] === 0 ? 0 : (minusDMSmooth[i] / trSmooth[i]) * 100;
    const dx = plusDI + minusDI === 0 ? 0 : (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
    dxSeries[i] = dx;
  }
  let adxPrev: number | null = null;
  for (let i = period * 2; i < len; i++) {
    if (adxPrev === null) {
      adxPrev = dxSeries.slice(period, period * 2).reduce((a, b) => a + b, 0) / period;
    } else {
      adxPrev = (adxPrev * (period - 1) + dxSeries[i]) / period;
    }
    out[i] = adxPrev;
  }
  return out;
}

export interface IchimokuResult {
  tenkan: (number | null)[];
  kijun: (number | null)[];
  senkouA: (number | null)[];
  senkouB: (number | null)[];
  chikou: (number | null)[];
}

export function ichimoku(candles: Candle[]): IchimokuResult {
  const len = candles.length;
  const donchianMid = (period: number, i: number): number | null => {
    if (i < period - 1) return null;
    const window = candles.slice(i - period + 1, i + 1);
    const high = Math.max(...window.map((c) => c.high));
    const low = Math.min(...window.map((c) => c.low));
    return (high + low) / 2;
  };

  const tenkan = candles.map((_, i) => donchianMid(9, i));
  const kijun = candles.map((_, i) => donchianMid(26, i));
  const senkouA: (number | null)[] = new Array(len).fill(null);
  const senkouB: (number | null)[] = new Array(len).fill(null);
  for (let i = 0; i < len; i++) {
    if (tenkan[i] !== null && kijun[i] !== null) {
      const targetIdx = i + 26;
      if (targetIdx < len) senkouA[targetIdx] = ((tenkan[i] as number) + (kijun[i] as number)) / 2;
    }
    const b = donchianMid(52, i);
    const targetIdx = i + 26;
    if (b !== null && targetIdx < len) senkouB[targetIdx] = b;
  }
  const chikou: (number | null)[] = new Array(len).fill(null);
  for (let i = 26; i < len; i++) {
    chikou[i - 26] = candles[i].close;
  }
  return { tenkan, kijun, senkouA, senkouB, chikou };
}

/** Looks for a fast/slow MA crossover within the last `lookback` bars. */
export function detectCross(fast: (number | null)[], slow: (number | null)[], lookback = 10): 'golden' | 'death' | null {
  const n = fast.length;
  const start = Math.max(1, n - lookback);
  for (let i = n - 1; i >= start; i--) {
    const f0 = fast[i - 1];
    const s0 = slow[i - 1];
    const f1 = fast[i];
    const s1 = slow[i];
    if (f0 === null || s0 === null || f1 === null || s1 === null) continue;
    if (f0 <= s0 && f1 > s1) return 'golden';
    if (f0 >= s0 && f1 < s1) return 'death';
  }
  return null;
}
