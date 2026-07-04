import type { Candle } from '../types/market';
import { gaussian, seededRandom } from './rng';

const TRADING_DAYS_PER_YEAR = 252;
const YEARS = 5;
const TOTAL_DAYS = TRADING_DAYS_PER_YEAR * YEARS;

interface GenOptions {
  symbol: string;
  basePrice: number;
  drift: number; // annualized
  vol: number; // annualized
}

/**
 * Generates a 5y daily OHLCV series using GBM with a slow regime-cycle
 * modulation (so the walk isn't just noise around one trend line) and
 * quarterly earnings-style gap jumps. Deterministic per symbol.
 *
 * The walk starts at basePrice and the whole series is rescaled at the end
 * so the FINAL close equals basePrice — "basePrice" is the intended current
 * price, and history extends backwards from it.
 */
export function generateDailySeries({ symbol, basePrice, drift, vol }: GenOptions): Candle[] {
  const rand = seededRandom(`series:${symbol}`);
  const dt = 1 / TRADING_DAYS_PER_YEAR;
  const candles: Candle[] = [];

  let price = basePrice;

  const now = Math.floor(Date.now() / 1000);
  const daySeconds = 86400;
  let startTime = now - TOTAL_DAYS * daySeconds;
  // align to a Monday-ish cadence isn't critical for demo purposes

  const regimeCycles = 2 + Math.floor(rand() * 3);
  const regimePhase = rand() * Math.PI * 2;

  let baseVolume = 1_000_000 + rand() * 15_000_000;

  for (let i = 0; i < TOTAL_DAYS; i++) {
    const t = i / TOTAL_DAYS;
    const regimeMod = Math.sin(t * Math.PI * 2 * regimeCycles + regimePhase) * 0.6;
    const effectiveDrift = drift * (1 + regimeMod);

    const shock = gaussian(rand);
    let dailyReturn = (effectiveDrift - 0.5 * vol * vol) * dt + vol * Math.sqrt(dt) * shock;

    // Quarterly earnings-style gap (~every 63 trading days)
    const isEarningsDay = i > 0 && i % 63 === 0;
    if (isEarningsDay) {
      const surprise = gaussian(rand) * 0.04;
      dailyReturn += surprise;
    }

    const open = price;
    price = Math.max(price * (1 + dailyReturn), 0.5);
    const close = price;

    const intradayRange = Math.abs(gaussian(rand)) * vol * Math.sqrt(dt) * open * 0.8 + Math.abs(close - open) * 0.3;
    const high = Math.max(open, close) + intradayRange * rand();
    const low = Math.min(open, close) - intradayRange * rand();

    const volSpike = Math.abs(dailyReturn) > vol * Math.sqrt(dt) * 1.8 || isEarningsDay;
    const volumeNoise = 0.5 + rand();
    const volume = Math.round(baseVolume * volumeNoise * (volSpike ? 1.8 + rand() : 1));

    candles.push({
      time: startTime,
      open,
      high: Math.max(high, open, close),
      low: Math.max(Math.min(low, open, close), 0.1),
      close,
      volume,
    });

    startTime += daySeconds;
    // slow volume drift so more recent history isn't wildly different in scale
    baseVolume *= 1 + (rand() - 0.5) * 0.01;
  }

  // Rescale so the final close is exactly the intended current price. The
  // multiplicative walk is scale-invariant, so this preserves all returns,
  // patterns, and indicator relationships.
  const scale = basePrice / candles[candles.length - 1].close;
  for (const c of candles) {
    c.open = round2(c.open * scale);
    c.high = round2(c.high * scale);
    c.low = round2(Math.max(c.low * scale, 0.1));
    c.close = round2(c.close * scale);
  }

  return candles;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function resampleToWeekly(daily: Candle[]): Candle[] {
  return resample(daily, 5);
}

export function resampleToHourlyApprox(daily: Candle[]): Candle[] {
  // Demo-only intraday proxy: subdivide the most recent daily candles into
  // synthetic hourly bars via interpolation + noise (no true intraday feed).
  const recent = daily.slice(-10);
  const rand = seededRandom('hourly-proxy');
  const hours: Candle[] = [];
  for (const c of recent) {
    const steps = 7;
    let last = c.open;
    for (let h = 0; h < steps; h++) {
      const target = h === steps - 1 ? c.close : c.open + ((c.close - c.open) * (h + 1)) / steps;
      const noise = (rand() - 0.5) * (c.high - c.low) * 0.15;
      const open = last;
      const close = target + noise;
      const high = Math.max(open, close) + Math.abs(rand()) * (c.high - c.low) * 0.1;
      const low = Math.min(open, close) - Math.abs(rand()) * (c.high - c.low) * 0.1;
      hours.push({
        time: c.time + h * 3600,
        open: round2(open),
        high: round2(high),
        low: round2(Math.max(low, 0.1)),
        close: round2(close),
        volume: Math.round(c.volume / steps),
      });
      last = close;
    }
  }
  return hours;
}

function resample(daily: Candle[], groupSize: number): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < daily.length; i += groupSize) {
    const chunk = daily.slice(i, i + groupSize);
    if (chunk.length === 0) continue;
    out.push({
      time: chunk[0].time,
      open: chunk[0].open,
      high: Math.max(...chunk.map((c) => c.high)),
      low: Math.min(...chunk.map((c) => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((s, c) => s + c.volume, 0),
    });
  }
  return out;
}
