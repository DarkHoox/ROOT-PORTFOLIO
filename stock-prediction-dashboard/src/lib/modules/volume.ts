import type { Candle, ModuleResult } from '../../types/market';
import { accumulationDistribution, obv, volumeSpike, vwap } from '../indicators/volume';
import { clampScore, detail, scoreFromSignals, signalFromScore, type WeightedDirection } from './shared';

export function volumeModule(candles: Candle[]): ModuleResult {
  const price = candles[candles.length - 1].close;
  const obvSeries = obv(candles);
  const obvVal = obvSeries[obvSeries.length - 1];
  const obvPrior = obvSeries[Math.max(0, obvSeries.length - 11)];
  const obvRising = obvVal > obvPrior;

  const vwapSeries = vwap(candles, 20);
  const vwapVal = vwapSeries[vwapSeries.length - 1];

  const spike = volumeSpike(candles, 20, 1.8);
  const adLine = accumulationDistribution(candles);
  const adVal = adLine[adLine.length - 1];
  const adPrior = adLine[Math.max(0, adLine.length - 11)];
  const adRising = adVal > adPrior;

  const lastCandle = candles[candles.length - 1];
  const priceUpOnSpike = spike && lastCandle.close > lastCandle.open;
  const priceDownOnSpike = spike && lastCandle.close < lastCandle.open;

  const signals: WeightedDirection[] = [
    { dir: obvRising ? 1 : -1, weight: 1.2 },
    { dir: adRising ? 1 : -1, weight: 1 },
  ];
  if (vwapVal !== null) signals.push({ dir: price > vwapVal ? 1 : -1, weight: 0.9 });
  if (priceUpOnSpike) signals.push({ dir: 1, weight: 1.3 });
  if (priceDownOnSpike) signals.push({ dir: -1, weight: 1.3 });

  const score = clampScore(scoreFromSignals(signals));
  const signal = signalFromScore(score);

  const reasonParts: string[] = [];
  reasonParts.push(obvRising ? 'OBV roste (akumulace)' : 'OBV klesá (distribuce)');
  if (spike) reasonParts.push(priceUpOnSpike ? 'objemový spike v rostoucí den potvrzuje nákupní tlak' : priceDownOnSpike ? 'objemový spike v klesající den potvrzuje prodejní tlak' : 'zjištěn zvýšený objem');

  return {
    id: 'volume',
    label: 'Objem',
    signal,
    score,
    reason: reasonParts.join('; '),
    details: [
      detail('Trend OBV (10d)', obvRising ? 'roste' : 'klesá'),
      detail('VWAP (20d)', vwapVal !== null ? vwapVal.toFixed(2) : 'n/a'),
      detail('Objemový spike', spike ? 'ano, nad 1,8x průměru' : 'ne'),
      detail('Akumulace/distribuce', adRising ? 'akumulace (nákupy)' : 'distribuce (prodeje)'),
    ],
  };
}
