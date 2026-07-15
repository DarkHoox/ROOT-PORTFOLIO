import type { Candle, ModuleResult } from '../../types/market';
import { lastValid } from '../indicators/movingAverages';
import { macd, roc, rsi, stochasticOscillator, williamsR } from '../indicators/momentum';
import { clampScore, detail, scoreFromSignals, signalFromScore, type WeightedDirection } from './shared';

export function momentumModule(candles: Candle[]): ModuleResult {
  const closes = candles.map((c) => c.close);
  const rsiSeries = rsi(closes, 14);
  const rsiVal = lastValid(rsiSeries);
  const macdRes = macd(closes);
  const macdVal = lastValid(macdRes.macd);
  const signalVal = lastValid(macdRes.signal);
  const histVal = lastValid(macdRes.histogram);
  const stoch = stochasticOscillator(candles, 14, 3);
  const kVal = lastValid(stoch.k);
  const dVal = lastValid(stoch.d);
  const wr = lastValid(williamsR(candles, 14));
  const rocVal = lastValid(roc(closes, 12));

  const signals: WeightedDirection[] = [];
  if (rsiVal !== null) {
    if (rsiVal > 70) signals.push({ dir: -0.6, weight: 1 }); // overbought pullback risk
    else if (rsiVal < 30) signals.push({ dir: 0.6, weight: 1 }); // oversold bounce potential
    else signals.push({ dir: rsiVal > 50 ? 1 : -1, weight: 0.8 });
  }
  if (macdVal !== null && signalVal !== null) {
    signals.push({ dir: macdVal > signalVal ? 1 : -1, weight: 1.4 });
  }
  if (histVal !== null) {
    signals.push({ dir: histVal > 0 ? 1 : -1, weight: 0.8 });
  }
  if (kVal !== null && dVal !== null) {
    if (kVal > 80) signals.push({ dir: -0.5, weight: 0.8 });
    else if (kVal < 20) signals.push({ dir: 0.5, weight: 0.8 });
    else signals.push({ dir: kVal > dVal ? 1 : -1, weight: 0.7 });
  }
  if (wr !== null) {
    signals.push({ dir: wr > -20 ? -0.5 : wr < -80 ? 0.5 : wr > -50 ? 0.4 : -0.4, weight: 0.6 });
  }
  if (rocVal !== null) {
    signals.push({ dir: rocVal > 0 ? 1 : -1, weight: 0.9 });
  }

  const score = clampScore(scoreFromSignals(signals));
  const signal = signalFromScore(score);

  const reasonParts: string[] = [];
  if (rsiVal !== null) {
    if (rsiVal > 70) reasonParts.push(`RSI ${rsiVal.toFixed(0)} je v překoupené zóně`);
    else if (rsiVal < 30) reasonParts.push(`RSI ${rsiVal.toFixed(0)} je v přeprodané zóně`);
    else reasonParts.push(`RSI ${rsiVal.toFixed(0)} je neutrální`);
  }
  if (macdVal !== null && signalVal !== null) {
    reasonParts.push(macdVal > signalVal ? 'MACD nad signální linií' : 'MACD pod signální linií');
  }

  return {
    id: 'momentum',
    label: 'Momentum',
    signal,
    score,
    reason: reasonParts.join('; '),
    details: [
      detail('RSI (14)', rsiVal !== null ? rsiVal.toFixed(1) : 'n/a'),
      detail('MACD / Signal', macdVal !== null && signalVal !== null ? `${macdVal.toFixed(2)} / ${signalVal.toFixed(2)}` : 'n/a'),
      detail('Stochastic %K/%D', kVal !== null && dVal !== null ? `${kVal.toFixed(0)} / ${dVal.toFixed(0)}` : 'n/a'),
      detail("Williams %R", wr !== null ? wr.toFixed(0) : 'n/a'),
      detail('ROC (12)', rocVal !== null ? `${rocVal.toFixed(1)}%` : 'n/a'),
    ],
  };
}
