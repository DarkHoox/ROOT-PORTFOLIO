import type { Candle, ModuleResult, Signal } from '../../types/market';
import { resampleToHourlyApprox, resampleToWeekly } from '../../data/generateSeries';
import { momentumModule } from './momentum';
import { trendModule } from './trend';
import { clampScore, detail, signalFromScore } from './shared';

interface TimeframeBias {
  label: string;
  signal: Signal;
  score: number;
}

function timeframeBias(label: string, candles: Candle[]): TimeframeBias {
  if (candles.length < 20) return { label, signal: 'neutral', score: 50 };
  const t = trendModule(candles);
  const m = momentumModule(candles);
  const score = clampScore((t.score + m.score) / 2);
  return { label, signal: signalFromScore(score), score };
}

/** Compares the same directional read across daily, weekly, and hourly (proxy) timeframes. */
export function confluenceModule(daily: Candle[]): ModuleResult {
  const weekly = resampleToWeekly(daily);
  const hourly = resampleToHourlyApprox(daily);

  const dailyBias = timeframeBias('Denní', daily);
  const weeklyBias = timeframeBias('Týdenní', weekly);
  const hourlyBias = timeframeBias('Hodinový', hourly.length >= 20 ? hourly : daily.slice(-40));

  const biases = [dailyBias, weeklyBias, hourlyBias];
  const upCount = biases.filter((b) => b.signal === 'up').length;
  const downCount = biases.filter((b) => b.signal === 'down').length;

  let signal: Signal = 'neutral';
  let score = 50;
  if (upCount >= 2) {
    signal = 'up';
    score = clampScore(50 + upCount * 12 + (upCount === 3 ? 10 : 0));
  } else if (downCount >= 2) {
    signal = 'down';
    score = clampScore(50 - downCount * 12 - (downCount === 3 ? 10 : 0));
  } else {
    score = clampScore((dailyBias.score + weeklyBias.score + hourlyBias.score) / 3);
    signal = signalFromScore(score, 4);
  }

  const agreementLabel = upCount === 3 || downCount === 3 ? 'plná shoda napříč timeframy' : upCount >= 2 || downCount >= 2 ? 'většinová shoda' : 'žádná shoda — timeframy se rozcházejí';
  const sigLabel = (s: Signal) => (s === 'up' ? 'růst' : s === 'down' ? 'pokles' : 'neutrálně');

  return {
    id: 'confluence',
    label: 'Multi-timeframe konfluence',
    signal,
    score,
    reason: `${agreementLabel}: denní ${sigLabel(dailyBias.signal)}, týdenní ${sigLabel(weeklyBias.signal)}, hodinový ${sigLabel(hourlyBias.signal)}`,
    details: biases.map((b) => detail(b.label, `${sigLabel(b.signal)} (skóre ${b.score})`)),
  };
}
