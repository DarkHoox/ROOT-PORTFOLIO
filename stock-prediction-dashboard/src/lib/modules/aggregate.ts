import type { ModuleId, ModuleResult, ModuleWeights, Signal, TraderProfile, Verdict } from '../../types/market';
import { clampScore, signalFromScore } from './shared';

export const MODULE_ORDER: ModuleId[] = [
  'trend',
  'momentum',
  'volatility',
  'volume',
  'supportResistance',
  'candlestick',
  'fundamentals',
  'sentiment',
  'confluence',
];

export const DEFAULT_WEIGHTS: ModuleWeights = {
  trend: 1,
  momentum: 1,
  volatility: 1,
  volume: 1,
  supportResistance: 1,
  candlestick: 0.7,
  fundamentals: 1,
  sentiment: 0.7,
  confluence: 1.2,
};

export const PROFILE_WEIGHTS: Record<TraderProfile, ModuleWeights> = {
  shortterm: {
    trend: 0.8,
    momentum: 1.8,
    volatility: 1.3,
    volume: 1.6,
    supportResistance: 1.3,
    candlestick: 1.2,
    fundamentals: 0.3,
    sentiment: 0.9,
    confluence: 1.4,
  },
  longterm: {
    trend: 1.8,
    momentum: 0.7,
    volatility: 0.5,
    volume: 0.6,
    supportResistance: 0.8,
    candlestick: 0.3,
    fundamentals: 1.9,
    sentiment: 0.6,
    confluence: 0.9,
  },
};

const SIGNAL_LABEL: Record<Signal, string> = {
  up: 'růst',
  down: 'pokles',
  neutral: 'neutrální vývoj',
};

export function computeVerdict(modules: ModuleResult[], weights: ModuleWeights): Verdict {
  const totalWeight = modules.reduce((s, m) => s + (weights[m.id] ?? 0), 0) || 1;
  const weightedScore = modules.reduce((s, m) => s + m.score * (weights[m.id] ?? 0), 0) / totalWeight;
  const score = clampScore(weightedScore);
  const signal = signalFromScore(score, 4);

  const bullishCount = modules.filter((m) => m.signal === 'up').length;
  const bearishCount = modules.filter((m) => m.signal === 'down').length;
  const neutralCount = modules.filter((m) => m.signal === 'neutral').length;

  const alignedModules = modules.filter((m) => m.signal === signal && signal !== 'neutral');
  const candidatePool = alignedModules.length > 0 ? alignedModules : modules;
  const topModule = candidatePool.reduce((best, m) => {
    const conviction = Math.abs(m.score - 50) * (weights[m.id] ?? 0);
    const bestConviction = Math.abs(best.score - 50) * (weights[best.id] ?? 0);
    return conviction > bestConviction ? m : best;
  }, candidatePool[0]);

  const confidence = clampScore(Math.abs(score - 50) * 2);
  const majorityCount = signal === 'up' ? bullishCount : signal === 'down' ? bearishCount : neutralCount;

  const summary =
    signal === 'neutral'
      ? `Signály jsou rozdělené (${bullishCount} růst / ${bearishCount} pokles / ${neutralCount} neutrálně), celkově neutrální postoj. Klíčový faktor: ${topModule.reason}.`
      : `${majorityCount} z ${modules.length} modulů ukazuje ${SIGNAL_LABEL[signal]}, klíčový důvod: ${topModule.reason}.`;

  return {
    signal,
    confidence,
    summary,
    bullishCount,
    bearishCount,
    neutralCount,
    topReason: topModule.reason,
  };
}
