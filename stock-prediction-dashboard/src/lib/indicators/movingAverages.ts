export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i === period - 1) {
      const seed = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
      prev = seed;
      out[i] = seed;
    } else if (i >= period) {
      prev = values[i] * k + (prev as number) * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

export function lastValid(series: (number | null)[]): number | null {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] !== null) return series[i];
  }
  return null;
}
