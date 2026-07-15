import type { Candle, ModuleResult } from '../../types/market';
import { lastValid } from '../indicators/movingAverages';
import { atr, bollingerBands, detectSqueeze, keltnerChannels } from '../indicators/volatility';
import { clampScore, detail, scoreFromSignals, signalFromScore, type WeightedDirection } from './shared';

export function volatilityModule(candles: Candle[]): ModuleResult {
  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  const bb = bollingerBands(closes, 20, 2);
  const upperBB = lastValid(bb.upper);
  const lowerBB = lastValid(bb.lower);
  const bandwidth = lastValid(bb.bandwidth);
  const atrSeries = atr(candles, 14);
  const atrVal = lastValid(atrSeries);
  const kc = keltnerChannels(candles, 20, 2);
  const upperKC = lastValid(kc.upper);
  const lowerKC = lastValid(kc.lower);
  const squeeze = detectSqueeze(candles);

  const signals: WeightedDirection[] = [];
  let bbNote = 'cena uvnitř Bollingerových pásem';
  if (upperBB !== null && price > upperBB) {
    signals.push({ dir: -0.6, weight: 1.2 });
    bbNote = 'cena nad horním pásmem (přetažená, riziko návratu k průměru)';
  } else if (lowerBB !== null && price < lowerBB) {
    signals.push({ dir: 0.6, weight: 1.2 });
    bbNote = 'cena pod spodním pásmem (přetažená, potenciál odrazu)';
  }

  if (upperKC !== null && price > upperKC) {
    signals.push({ dir: 1, weight: 1 });
  } else if (lowerKC !== null && price < lowerKC) {
    signals.push({ dir: -1, weight: 1 });
  }

  const recent5 = closes.slice(-6);
  const shortTermChange = recent5.length === 6 ? (recent5[5] - recent5[0]) / recent5[0] : 0;
  if (atrVal !== null) {
    signals.push({ dir: shortTermChange > 0 ? 0.5 : -0.5, weight: 0.5 });
  }

  const score = clampScore(scoreFromSignals(signals));
  const signal = signalFromScore(score);

  const reasonParts: string[] = [bbNote];
  reasonParts.push(squeeze ? 'squeeze (Bollinger uvnitř Keltnera) — komprese volatility, blíží se výrazný pohyb' : 'squeeze nedetekován');

  return {
    id: 'volatility',
    label: 'Volatilita',
    signal,
    score,
    reason: reasonParts.join('; '),
    details: [
      detail('Bollinger horní/spodní', upperBB !== null && lowerBB !== null ? `${upperBB.toFixed(2)} / ${lowerBB.toFixed(2)}` : 'n/a'),
      detail('Šířka pásma', bandwidth !== null ? `${(bandwidth * 100).toFixed(1)}%` : 'n/a'),
      detail('ATR (14)', atrVal !== null ? atrVal.toFixed(2) : 'n/a'),
      detail('Keltner horní/spodní', upperKC !== null && lowerKC !== null ? `${upperKC.toFixed(2)} / ${lowerKC.toFixed(2)}` : 'n/a'),
      detail('Squeeze', squeeze ? 'aktivní (nízká volatilita)' : 'neaktivní'),
    ],
  };
}
