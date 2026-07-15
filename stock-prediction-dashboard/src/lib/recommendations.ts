import { getAllProfiles } from '../data/mockData';
import { computeAllModules } from './modules';
import { computeVerdict } from './modules/aggregate';
import { atr } from './indicators/volatility';
import { lastValid } from './indicators/movingAverages';
import type { ModuleWeights, Sector } from '../types/market';
import type { SymbolAssessment } from './assessment';

export interface Candidate {
  symbol: string;
  name: string;
  sector: Sector;
  price: number;
  confidence: number;
  bullishCount: number;
  reason: string;
  beta: number;
  stopLoss: number;
  target: number;
  spark: number[];
  earningsDaysAway: number;
}

export interface AvoidItem {
  symbol: string;
  name: string;
  sector: Sector;
  confidence: number;
  bearishCount: number;
  reason: string;
}

const MAX_CANDIDATES = 8;
const MAX_PER_SECTOR = 2; // diversification guard — never all-in on one sector
const MAX_SINGLE_ALLOCATION_PCT = 35;

/** Fast snapshot pass: bullish verdicts across the universe, sector-capped, ranked by confidence. */
export function selectCandidates(weights: ModuleWeights, maxCandidates = MAX_CANDIDATES): Candidate[] {
  const scored = getAllProfiles().map((profile) => {
    const verdict = computeVerdict(computeAllModules(profile), weights);
    return { profile, verdict };
  });

  const bullish = scored
    .filter((s) => s.verdict.signal === 'up')
    .sort((a, b) => b.verdict.confidence - a.verdict.confidence);

  const candidates: Candidate[] = [];
  const perSector = new Map<string, number>();
  for (const s of bullish) {
    if (candidates.length >= maxCandidates) break;
    const sectorCount = perSector.get(s.profile.meta.sector) ?? 0;
    if (sectorCount >= MAX_PER_SECTOR) continue;
    perSector.set(s.profile.meta.sector, sectorCount + 1);

    const daily = s.profile.seriesDaily;
    const price = daily[daily.length - 1].close;
    const atrVal = lastValid(atr(daily, 14)) ?? price * 0.02;
    candidates.push({
      symbol: s.profile.meta.symbol,
      name: s.profile.meta.name,
      sector: s.profile.meta.sector,
      price,
      confidence: s.verdict.confidence,
      bullishCount: s.verdict.bullishCount,
      reason: s.verdict.topReason,
      beta: s.profile.fundamentals.beta,
      stopLoss: price - 2.5 * atrVal,
      target: price + 4 * atrVal,
      spark: daily.slice(-30).map((c) => c.close),
      earningsDaysAway: s.profile.earnings.nextEarningsDaysAway,
    });
  }
  return candidates;
}

export interface AllocatedPick extends Candidate {
  assessment: SymbolAssessment;
  allocationPct: number;
  amount: number;
  shares: number;
}

/**
 * Position sizing over ENGINE-CONFIRMED picks only (advice buy/hold), weighted
 * by composite reliability / beta with a per-position cap. The unallocated
 * remainder stays as cash — the plan never forces 100% equity.
 */
export function allocatePortfolio(
  candidates: Candidate[],
  assessments: Record<string, SymbolAssessment>,
  capital: number,
): { picks: AllocatedPick[]; cashPct: number } {
  const confirmed = candidates.filter((c) => {
    const a = assessments[c.symbol];
    return a && (a.advice === 'buy' || a.advice === 'hold');
  });

  const rawWeights = confirmed.map((c) => assessments[c.symbol].composite / Math.max(c.beta, 0.5));
  const totalRaw = rawWeights.reduce((a, b) => a + b, 0) || 1;

  const picks: AllocatedPick[] = confirmed
    .map((c, i) => {
      const allocationPct = Math.min(MAX_SINGLE_ALLOCATION_PCT, Math.round((rawWeights[i] / totalRaw) * 100));
      const amount = (capital * allocationPct) / 100;
      return {
        ...c,
        assessment: assessments[c.symbol],
        allocationPct,
        amount,
        shares: Math.floor(amount / c.price),
      };
    })
    .sort((a, b) => b.assessment.composite - a.assessment.composite);

  const allocated = picks.reduce((s, p) => s + p.allocationPct, 0);
  return { picks, cashPct: Math.max(0, 100 - allocated) };
}

export function buildAvoidList(weights: ModuleWeights, max = 5): AvoidItem[] {
  return getAllProfiles()
    .map((profile) => ({ profile, verdict: computeVerdict(computeAllModules(profile), weights) }))
    .filter((s) => s.verdict.signal === 'down')
    .sort((a, b) => b.verdict.confidence - a.verdict.confidence)
    .slice(0, max)
    .map((s) => ({
      symbol: s.profile.meta.symbol,
      name: s.profile.meta.name,
      sector: s.profile.meta.sector,
      confidence: s.verdict.confidence,
      bearishCount: s.verdict.bearishCount,
      reason: s.verdict.topReason,
    }));
}
