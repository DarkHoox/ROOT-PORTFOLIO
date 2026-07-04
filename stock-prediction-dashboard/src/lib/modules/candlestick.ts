import type { Candle, ModuleResult } from '../../types/market';
import { detectRecentPatterns, patternHistoricalSuccessRate } from '../indicators/candlePatterns';
import { clampScore, detail, scoreFromSignals, signalFromScore, type WeightedDirection } from './shared';

export function candlestickModule(candles: Candle[]): ModuleResult {
  const patterns = detectRecentPatterns(candles, 3);
  const mostRecent = patterns.length > 0 ? patterns[patterns.length - 1] : null;

  const signals: WeightedDirection[] = [];
  const enriched = patterns.map((p) => {
    const successRate = patternHistoricalSuccessRate(candles, p.name, p.bias, 5);
    const recencyWeight = p.index === candles.length - 1 ? 1.3 : 0.7;
    const conviction = successRate !== null ? (successRate - 50) / 50 : 0.3;
    signals.push({ dir: (p.bias === 'up' ? 1 : -1) * Math.max(0.3, Math.abs(conviction) + 0.3), weight: recencyWeight });
    return { ...p, successRate };
  });

  const score = signals.length > 0 ? clampScore(scoreFromSignals(signals)) : 50;
  const signal = signals.length > 0 ? signalFromScore(score) : 'neutral';

  const bias = mostRecent?.bias === 'up' ? 'růst' : 'pokles';
  const reason =
    enriched.length === 0
      ? 'v posledních 3 seancích nebyla nalezena žádná výrazná svíčková formace'
      : `zjištěna formace ${mostRecent!.label}` +
        (mostRecent && enriched.find((e) => e.name === mostRecent.name)?.successRate != null
          ? ` (historicky následoval pohyb směrem ${bias} v ${enriched.find((e) => e.name === mostRecent.name)!.successRate}% případů)`
          : '');

  return {
    id: 'candlestick',
    label: 'Svíčkové formace',
    signal,
    score,
    reason,
    details:
      enriched.length > 0
        ? enriched.map((e) => detail(e.label, `${e.bias === 'up' ? 'býčí' : 'medvědí'} bias${e.successRate !== null ? `, ${e.successRate}% historická úspěšnost` : ', nedostatek historie'}`))
        : [detail('Nalezené formace', 'žádné za poslední 3 seance')],
  };
}
