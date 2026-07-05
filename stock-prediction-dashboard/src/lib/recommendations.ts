import { getAllProfiles } from '../data/mockData';
import { computeAllModules } from './modules';
import { computeVerdict } from './modules/aggregate';
import { atr } from './indicators/volatility';
import { lastValid } from './indicators/movingAverages';
import type { ModuleWeights, Sector } from '../types/market';

export interface InvestmentPick {
  symbol: string;
  name: string;
  sector: Sector;
  price: number;
  confidence: number;
  bullishCount: number;
  reason: string;
  beta: number;
  allocationPct: number;
  amount: number;
  shares: number;
  stopLoss: number;
  target: number;
  spark: number[];
  earningsDaysAway: number;
}

export interface AvoidItem {
  symbol: string;
  name: string;
  sector: Sector;
  price: number;
  confidence: number;
  bearishCount: number;
  reason: string;
}

export interface InvestmentPlan {
  picks: InvestmentPick[];
  avoid: AvoidItem[];
  cashPct: number; // unallocated remainder kept as cash
}

const MAX_PICKS = 6;
const MAX_PER_SECTOR = 2; // diversification guard — never all-in on one sector
const MAX_SINGLE_ALLOCATION_PCT = 35;

/**
 * Ranks the whole universe by the aggregated verdict under the current
 * weights, keeps only bullish names, enforces a sector cap, and sizes
 * positions by risk-adjusted conviction (confidence / beta). Anything the
 * cap leaves unallocated stays as cash — the plan never forces 100% equity.
 */
export function buildInvestmentPlan(weights: ModuleWeights, capital: number): InvestmentPlan {
  const scored = getAllProfiles().map((profile) => {
    const modules = computeAllModules(profile);
    const verdict = computeVerdict(modules, weights);
    const price = profile.seriesDaily[profile.seriesDaily.length - 1].close;
    return { profile, verdict, price };
  });

  const bullish = scored
    .filter((s) => s.verdict.signal === 'up')
    .sort((a, b) => b.verdict.confidence - a.verdict.confidence);

  const selected: typeof bullish = [];
  const perSector = new Map<string, number>();
  for (const s of bullish) {
    if (selected.length >= MAX_PICKS) break;
    const sectorCount = perSector.get(s.profile.meta.sector) ?? 0;
    if (sectorCount >= MAX_PER_SECTOR) continue;
    perSector.set(s.profile.meta.sector, sectorCount + 1);
    selected.push(s);
  }

  const rawWeights = selected.map((s) => s.verdict.confidence / Math.max(s.profile.fundamentals.beta, 0.5));
  const totalRaw = rawWeights.reduce((a, b) => a + b, 0) || 1;

  const picks: InvestmentPick[] = selected.map((s, i) => {
    const allocationPct = Math.min(MAX_SINGLE_ALLOCATION_PCT, Math.round((rawWeights[i] / totalRaw) * 100));
    const amount = (capital * allocationPct) / 100;
    const atrVal = lastValid(atr(s.profile.seriesDaily, 14)) ?? s.price * 0.02;
    return {
      symbol: s.profile.meta.symbol,
      name: s.profile.meta.name,
      sector: s.profile.meta.sector,
      price: s.price,
      confidence: s.verdict.confidence,
      bullishCount: s.verdict.bullishCount,
      reason: s.verdict.topReason,
      beta: s.profile.fundamentals.beta,
      allocationPct,
      amount,
      shares: Math.floor(amount / s.price),
      stopLoss: s.price - 2 * atrVal,
      target: s.price + 4 * atrVal,
      spark: s.profile.seriesDaily.slice(-30).map((c) => c.close),
      earningsDaysAway: s.profile.earnings.nextEarningsDaysAway,
    };
  });

  const allocated = picks.reduce((sum, p) => sum + p.allocationPct, 0);

  const avoid: AvoidItem[] = scored
    .filter((s) => s.verdict.signal === 'down')
    .sort((a, b) => b.verdict.confidence - a.verdict.confidence)
    .slice(0, 5)
    .map((s) => ({
      symbol: s.profile.meta.symbol,
      name: s.profile.meta.name,
      sector: s.profile.meta.sector,
      price: s.price,
      confidence: s.verdict.confidence,
      bearishCount: s.verdict.bearishCount,
      reason: s.verdict.topReason,
    }));

  return { picks, avoid, cashPct: Math.max(0, 100 - allocated) };
}
