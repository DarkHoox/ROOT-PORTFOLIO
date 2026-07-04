import type { Candle, ModuleResult } from '../../types/market';
import { lastValid, sma } from '../indicators/movingAverages';
import { adx, detectCross, ichimoku } from '../indicators/trend';
import { clampScore, detail, fmt, scoreFromSignals, signalFromScore, type WeightedDirection } from './shared';

export function trendModule(candles: Candle[]): ModuleResult {
  const closes = candles.map((c) => c.close);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const price = closes[closes.length - 1];
  const s20 = lastValid(sma20);
  const s50 = lastValid(sma50);
  const s200 = lastValid(sma200);

  const signals: WeightedDirection[] = [];
  if (s20 !== null) signals.push({ dir: price > s20 ? 1 : -1, weight: 1 });
  if (s50 !== null) signals.push({ dir: price > s50 ? 1 : -1, weight: 1.2 });
  if (s200 !== null) signals.push({ dir: price > s200 ? 1 : -1, weight: 1.5 });

  const cross = detectCross(sma50, sma200, 15);
  if (cross === 'golden') signals.push({ dir: 1, weight: 2 });
  if (cross === 'death') signals.push({ dir: -1, weight: 2 });

  const adxSeries = adx(candles, 14);
  const adxVal = lastValid(adxSeries);
  const trending = adxVal !== null && adxVal > 25;
  if (trending && s50 !== null) {
    const idx = sma50.length - 11;
    const priorS50 = idx >= 0 ? sma50[idx] ?? s50 : s50;
    signals.push({ dir: s50 > priorS50 ? 1 : -1, weight: 1.3 });
  }

  const ich = ichimoku(candles);
  const i = candles.length - 1;
  const sA = ich.senkouA[i];
  const sB = ich.senkouB[i];
  let cloudPosition = 'n/a';
  if (sA !== null && sB !== null) {
    const cloudTop = Math.max(sA, sB);
    const cloudBottom = Math.min(sA, sB);
    if (price > cloudTop) {
      signals.push({ dir: 1, weight: 1.4 });
      cloudPosition = 'cena nad mrakem (bullish)';
    } else if (price < cloudBottom) {
      signals.push({ dir: -1, weight: 1.4 });
      cloudPosition = 'cena pod mrakem (bearish)';
    } else {
      signals.push({ dir: 0, weight: 1 });
      cloudPosition = 'cena uvnitř mraku (nerozhodnost)';
    }
  }

  const score = clampScore(scoreFromSignals(signals));
  const signal = signalFromScore(score);

  const reasonParts: string[] = [];
  if (cross === 'golden') reasonParts.push('golden cross (SMA50 protnula SMA200 shora)');
  else if (cross === 'death') reasonParts.push('death cross (SMA50 protnula SMA200 zdola)');
  else if (s200 !== null) reasonParts.push(price > s200 ? 'cena nad SMA200' : 'cena pod SMA200');
  reasonParts.push(trending ? `ADX ${adxVal!.toFixed(0)} potvrzuje trendující trh` : 'ADX ukazuje slabý, rozkolísaný trh bez trendu');

  return {
    id: 'trend',
    label: 'Trend',
    signal,
    score,
    reason: reasonParts.join('; '),
    details: [
      detail('SMA20', s20 !== null ? fmt(s20) : 'n/a'),
      detail('SMA50', s50 !== null ? fmt(s50) : 'n/a'),
      detail('SMA200', s200 !== null ? fmt(s200) : 'n/a'),
      detail('ADX (14)', adxVal !== null ? adxVal.toFixed(1) : 'n/a'),
      detail('Golden/Death Cross', cross === 'golden' ? 'golden cross' : cross === 'death' ? 'death cross' : 'žádný za posledních 15 dní'),
      detail('Ichimoku Cloud', cloudPosition),
    ],
  };
}
