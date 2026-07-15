import type { Candle, ModuleResult } from '../../types/market';
import { classicPivotPoints, detectSupportResistance, fibonacciRetracement, nearestLevel } from '../indicators/levels';
import { clampScore, detail, scoreFromSignals, signalFromScore, type WeightedDirection } from './shared';

export function supportResistanceModule(candles: Candle[]): ModuleResult {
  const price = candles[candles.length - 1].close;
  const levels = detectSupportResistance(candles, 180, 0.015);
  const nearest = nearestLevel(price, levels);

  const prevDay = candles[candles.length - 2];
  const pivots = classicPivotPoints(prevDay);

  const last60 = candles.slice(-60);
  const swingHigh = Math.max(...last60.map((c) => c.high));
  const swingLow = Math.min(...last60.map((c) => c.low));
  const fib = fibonacciRetracement(swingHigh, swingLow);

  const signals: WeightedDirection[] = [];
  if (nearest) {
    const closeToLevel = nearest.distancePct < 1.5;
    if (closeToLevel) {
      signals.push({ dir: nearest.level.type === 'support' ? 0.8 : -0.8, weight: 1.5 });
    }
  }
  if (price > pivots.pivot) signals.push({ dir: 1, weight: 0.8 });
  else signals.push({ dir: -1, weight: 0.8 });

  const distToFib618 = Math.abs(price - fib.level618) / price;
  if (distToFib618 < 0.015) {
    signals.push({ dir: price > fib.level618 ? 0.6 : -0.4, weight: 1 });
  }

  const score = clampScore(scoreFromSignals(signals));
  const signal = signalFromScore(score);

  const reasonParts: string[] = [];
  if (nearest && nearest.distancePct < 5) {
    const typeLabel = nearest.level.type === 'support' ? 'supportu' : 'rezistence';
    reasonParts.push(
      `cena je ${nearest.distancePct.toFixed(1)}% od ${typeLabel} na ${nearest.level.price.toFixed(2)} (${nearest.level.strength}× testováno)`,
    );
  } else {
    reasonParts.push('cena je mimo hlavní S/R zóny, hlavním vodítkem je denní pivot');
  }
  reasonParts.push(price > pivots.pivot ? 'obchoduje se nad denním pivotem' : 'obchoduje se pod denním pivotem');

  return {
    id: 'supportResistance',
    label: 'Support/Rezistence',
    signal,
    score,
    reason: reasonParts.join('; '),
    details: [
      detail('Nejbližší úroveň', nearest ? `${nearest.level.type === 'support' ? 'support' : 'rezistence'} @ ${nearest.level.price.toFixed(2)} (${nearest.distancePct.toFixed(1)}% od ceny)` : 'n/a'),
      detail('Pivot / R1 / S1', `${pivots.pivot.toFixed(2)} / ${pivots.r1.toFixed(2)} / ${pivots.s1.toFixed(2)}`),
      detail('Fib 61,8 % / 50 %', `${fib.level618.toFixed(2)} / ${fib.level500.toFixed(2)}`),
      detail('60d swing high/low', `${swingHigh.toFixed(2)} / ${swingLow.toFixed(2)}`),
    ],
  };
}
