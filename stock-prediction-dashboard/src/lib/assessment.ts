import type { ModuleWeights, StockProfile } from '../types/market';
import { computeDailyVerdicts } from './dailyVerdicts';
import { runEngineBacktest, DEFAULT_ENGINE_CONFIG, type AdviceAction } from './signalEngine';

/** 6-month walk-forward window: half the cost of the full-year backtest, fresh enough to track the current regime. */
export const ASSESSMENT_LOOKBACK = 126;

export interface SymbolAssessment {
  /** Aggregated verdict confidence on the latest bar (0-100). */
  verdictConfidence: number;
  /** % of non-neutral daily verdicts whose direction was correct 5 trading days later; null if under 10 samples. */
  hitRatePct: number | null;
  /** What the signal engine says to do right now. */
  advice: AdviceAction;
  adviceReason: string;
  engineWinRate: number;
  engineReturnPct: number;
  buyHoldReturnPct: number;
  engineTrades: number;
  /**
   * Composite reliability score (0-100):
   * 40% current signal strength + 40% directional hit-rate + 20% engine edge vs buy & hold.
   * Every component is walk-forward (no lookahead) and shown to the user separately.
   */
  composite: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

const assessmentCache = new Map<string, SymbolAssessment>();

export function assessSymbol(profile: StockProfile, weights: ModuleWeights): SymbolAssessment {
  const key = `${profile.meta.symbol}|${JSON.stringify(weights)}`;
  const cached = assessmentCache.get(key);
  if (cached) return cached;

  const daily = profile.seriesDaily;
  const verdicts = computeDailyVerdicts(profile, weights, ASSESSMENT_LOOKBACK);

  // Directional accuracy: did price move the predicted way within 5 sessions?
  let samples = 0;
  let hits = 0;
  for (const v of verdicts) {
    if (v.signal === 'neutral') continue;
    const j = v.index + 5;
    if (j >= daily.length) continue;
    samples += 1;
    const wentUp = daily[j].close > daily[v.index].close;
    if ((v.signal === 'up') === wentUp) hits += 1;
  }
  const hitRatePct = samples >= 10 ? Math.round((hits / samples) * 100) : null;

  const bt = runEngineBacktest(profile, weights, DEFAULT_ENGINE_CONFIG, ASSESSMENT_LOOKBACK);
  const last = verdicts[verdicts.length - 1];
  const verdictConfidence = last?.confidence ?? 50;

  const engineEdgeScore = clamp(50 + 2 * (bt.totalReturnPct - bt.buyHoldReturnPct), 0, 100);
  const composite = clamp(
    Math.round(0.4 * verdictConfidence + 0.4 * (hitRatePct ?? 50) + 0.2 * engineEdgeScore),
    0,
    100,
  );

  const assessment: SymbolAssessment = {
    verdictConfidence,
    hitRatePct,
    advice: bt.result.advice.action,
    adviceReason: bt.result.advice.reason,
    engineWinRate: bt.winRate,
    engineReturnPct: bt.totalReturnPct,
    buyHoldReturnPct: bt.buyHoldReturnPct,
    engineTrades: bt.result.trades.length,
    composite,
  };
  assessmentCache.set(key, assessment);
  return assessment;
}
