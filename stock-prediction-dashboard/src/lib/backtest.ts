import type { ModuleWeights, Signal, StockProfile } from '../types/market';
import { computeAllModules } from './modules';
import { computeVerdict } from './modules/aggregate';

export interface BacktestTrade {
  side: 'long' | 'short';
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  returnPct: number;
  win: boolean;
  holdingDays: number;
  entrySignalReason: string;
}

export interface EquityPoint {
  time: number;
  strategy: number;
  buyHold: number;
}

export interface BacktestResult {
  trades: BacktestTrade[];
  equityCurve: EquityPoint[];
  winRate: number;
  avgWinPct: number;
  avgLossPct: number;
  maxDrawdownPct: number;
  totalReturnPct: number;
  buyHoldReturnPct: number;
  failedTrades: BacktestTrade[];
}

/**
 * Walk-forward simulation: at each historical day, recompute the verdict using
 * only data available up to that day (no lookahead), then trade signal
 * transitions. Fundamentals/news are treated as static (point-in-time history
 * for those isn't modeled), so only the technical modules actually change
 * day-to-day in this demo — a known simplification, not a hidden one.
 */
export function runBacktest(profile: StockProfile, weights: ModuleWeights, lookbackDays = 252): BacktestResult {
  const daily = profile.seriesDaily;
  const startIndex = Math.max(220, daily.length - lookbackDays);
  const signals: { time: number; signal: Signal; reason: string }[] = [];

  for (let i = startIndex; i < daily.length; i += 1) {
    const truncated = daily.slice(0, i + 1);
    const tempProfile: StockProfile = { ...profile, seriesDaily: truncated };
    const modules = computeAllModules(tempProfile);
    const verdict = computeVerdict(modules, weights);
    signals.push({ time: daily[i].time, signal: verdict.signal, reason: verdict.topReason });
  }

  const trades: BacktestTrade[] = [];
  let position: { side: 'long' | 'short'; entryIndex: number; entryPrice: number; reason: string } | null = null;

  for (let i = 0; i < signals.length - 1; i += 1) {
    const sig = signals[i].signal;
    const nextBarIndex = startIndex + i + 1;
    const nextOpen = daily[nextBarIndex]?.open;
    if (nextOpen === undefined) continue;

    if (!position && sig === 'up') {
      position = { side: 'long', entryIndex: nextBarIndex, entryPrice: nextOpen, reason: signals[i].reason };
    } else if (!position && sig === 'down') {
      position = { side: 'short', entryIndex: nextBarIndex, entryPrice: nextOpen, reason: signals[i].reason };
    } else if (position && position.side === 'long' && sig !== 'up') {
      trades.push(closeTrade(position, nextBarIndex, nextOpen, daily));
      position = null;
    } else if (position && position.side === 'short' && sig !== 'down') {
      trades.push(closeTrade(position, nextBarIndex, nextOpen, daily));
      position = null;
    }
  }
  if (position) {
    const lastIndex = daily.length - 1;
    trades.push(closeTrade(position, lastIndex, daily[lastIndex].close, daily));
  }

  const wins = trades.filter((t) => t.win);
  const losses = trades.filter((t) => !t.win);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const avgWinPct = wins.length > 0 ? wins.reduce((s, t) => s + t.returnPct, 0) / wins.length : 0;
  const avgLossPct = losses.length > 0 ? losses.reduce((s, t) => s + t.returnPct, 0) / losses.length : 0;

  const startPrice = daily[startIndex].close;
  let strategyEquity = 100;
  let buyHoldEquity = 100;
  const equityCurve: EquityPoint[] = [];
  let tradeCursor = 0;
  let openPos: BacktestTrade | undefined;

  for (let i = startIndex; i < daily.length; i += 1) {
    while (tradeCursor < trades.length && trades[tradeCursor].exitTime <= daily[i].time && !openPos) {
      strategyEquity *= 1 + trades[tradeCursor].returnPct / 100;
      tradeCursor += 1;
    }
    if (!openPos) {
      const active = trades.find((t) => t.entryTime <= daily[i].time && t.exitTime >= daily[i].time);
      openPos = active;
    } else if (openPos.exitTime <= daily[i].time) {
      openPos = trades.find((t) => t.entryTime <= daily[i].time && t.exitTime >= daily[i].time);
    }

    let markToMarket = strategyEquity;
    if (openPos) {
      const priceNow = daily[i].close;
      const unrealized = openPos.side === 'long' ? (priceNow - openPos.entryPrice) / openPos.entryPrice : (openPos.entryPrice - priceNow) / openPos.entryPrice;
      markToMarket = strategyEquity * (1 + unrealized);
    }

    buyHoldEquity = (daily[i].close / startPrice) * 100;
    equityCurve.push({ time: daily[i].time, strategy: markToMarket, buyHold: buyHoldEquity });
  }

  let peak = -Infinity;
  let maxDrawdownPct = 0;
  for (const p of equityCurve) {
    peak = Math.max(peak, p.strategy);
    const dd = ((peak - p.strategy) / peak) * 100;
    maxDrawdownPct = Math.max(maxDrawdownPct, dd);
  }

  const totalReturnPct = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].strategy - 100 : 0;
  const buyHoldReturnPct = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].buyHold - 100 : 0;

  return {
    trades,
    equityCurve,
    winRate,
    avgWinPct,
    avgLossPct,
    maxDrawdownPct,
    totalReturnPct,
    buyHoldReturnPct,
    failedTrades: losses,
  };
}

function closeTrade(
  position: { side: 'long' | 'short'; entryIndex: number; entryPrice: number; reason: string },
  exitIndex: number,
  exitPrice: number,
  daily: StockProfile['seriesDaily'],
): BacktestTrade {
  const returnPct =
    position.side === 'long'
      ? ((exitPrice - position.entryPrice) / position.entryPrice) * 100
      : ((position.entryPrice - exitPrice) / position.entryPrice) * 100;
  return {
    side: position.side,
    entryTime: daily[position.entryIndex].time,
    entryPrice: position.entryPrice,
    exitTime: daily[exitIndex].time,
    exitPrice,
    returnPct,
    win: returnPct > 0,
    holdingDays: exitIndex - position.entryIndex,
    entrySignalReason: position.reason,
  };
}
