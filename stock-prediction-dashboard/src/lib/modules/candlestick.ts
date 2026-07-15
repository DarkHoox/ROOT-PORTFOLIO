import type { Candle, ModuleResult, Signal } from '../../types/market';
import { detectRecentPatterns, patternHistoricalSuccessRate } from '../indicators/candlePatterns';
import { clampScore, detail, scoreFromSignals, signalFromScore, type WeightedDirection } from './shared';

export function candlestickModule(candles: Candle[]): ModuleResult {
  const patterns = detectRecentPatterns(candles, 3);
  const mostRecent = patterns.length > 0 ? patterns[patterns.length - 1] : null;

  const signals: WeightedDirection[] = [];
  const enriched = patterns.map((p) => {
    const successRate = patternHistoricalSuccessRate(candles, p.name, 5);
    const recencyWeight = p.index === candles.length - 1 ? 1.3 : 0.7;
    if (p.bias === 'neutral') {
      // Indecision pattern: pulls the score toward neutral instead of picking a side.
      signals.push({ dir: 0, weight: recencyWeight * 0.5 });
    } else {
      const conviction = successRate !== null ? (successRate - 50) / 50 : 0.3;
      signals.push({ dir: (p.bias === 'up' ? 1 : -1) * Math.max(0.3, Math.abs(conviction) + 0.3), weight: recencyWeight });
    }
    return { ...p, successRate };
  });

  const score = signals.length > 0 ? clampScore(scoreFromSignals(signals)) : 50;
  const signal: Signal = signals.length > 0 ? signalFromScore(score) : 'neutral';

  const biasLabel = (b: 'up' | 'down' | 'neutral') => (b === 'up' ? 'růst' : b === 'down' ? 'pokles' : 'nerozhodnost');
  const mostRecentEnriched = mostRecent ? enriched.find((e) => e.name === mostRecent.name && e.index === mostRecent.index) : null;
  const reason =
    !mostRecent
      ? 'v posledních 3 seancích nebyla nalezena žádná výrazná svíčková formace'
      : mostRecent.bias === 'neutral'
        ? `zjištěna formace ${mostRecent.label} — signál nerozhodnosti trhu`
        : `zjištěna formace ${mostRecent.label}` +
          (mostRecentEnriched?.successRate != null
            ? ` (historicky následoval pohyb směrem ${biasLabel(mostRecent.bias)} v ${mostRecentEnriched.successRate}% případů)`
            : '');

  return {
    id: 'candlestick',
    label: 'Svíčkové formace',
    signal,
    score,
    reason,
    details:
      enriched.length > 0
        ? enriched.map((e) =>
            detail(
              e.label,
              e.bias === 'neutral'
                ? 'neutrální (nerozhodnost)'
                : `${e.bias === 'up' ? 'býčí' : 'medvědí'} bias${e.successRate !== null ? `, ${e.successRate}% historická úspěšnost` : ', nedostatek historie'}`,
            ),
          )
        : [detail('Nalezené formace', 'žádné za poslední 3 seance')],
  };
}
