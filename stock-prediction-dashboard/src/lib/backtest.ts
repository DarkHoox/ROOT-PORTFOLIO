import type { ModuleWeights, StockProfile } from '../types/market';
import { computeDailyVerdicts } from './dailyVerdicts';

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
  const verdicts = computeDailyVerdicts(profile, weights, lookbackDays);
  const startIndex = verdicts.length > 0 ? verdicts[0].index : Math.max(220, daily.length - lookbackDays);
  const signals = verdicts.map((v) => ({ time: v.time, signal: v.signal, reason: v.reason }));

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

  const equityCurve = buildEquityCurve(daily, startIndex, trades);
  const stats = summarizeTrades(trades, equityCurve);

  return {
    trades,
    equityCurve,
    ...stats,
    failedTrades: trades.filter((t) => !t.win),
  };
}

export interface TradeLike {
  side: 'long' | 'short';
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  returnPct: number;
  win: boolean;
}

/**
 * Equity walk shared by both strategies. Trades must be non-overlapping and
 * chronologically ordered (each exit strictly before the next entry).
 * `realizedEquity` is the account value with no open position; while a trade
 * is open, the curve shows entry-time equity marked to the day's close.
 */
export function buildEquityCurve(daily: StockProfile['seriesDaily'], startIndex: number, trades: TradeLike[]): EquityPoint[] {
  const startPrice = daily[startIndex].close;
  let realizedEquity = 100;
  const equityCurve: EquityPoint[] = [];
  let tradeCursor = 0;
  let openPos: TradeLike | null = null;
  let entryEquity = 100;

  for (let i = startIndex; i < daily.length; i += 1) {
    const time = daily[i].time;

    // Realize a trade on its exit day, BEFORE marking, so the curve and the
    // final total return include it (also covers a force-close on the last bar).
    if (openPos && openPos.exitTime <= time) {
      realizedEquity = entryEquity * (1 + openPos.returnPct / 100);
      openPos = null;
    }
    if (!openPos && tradeCursor < trades.length && trades[tradeCursor].entryTime <= time) {
      openPos = trades[tradeCursor];
      entryEquity = realizedEquity;
      tradeCursor += 1;
    }

    let mark = realizedEquity;
    if (openPos) {
      const priceNow = daily[i].close;
      const unrealized =
        openPos.side === 'long'
          ? (priceNow - openPos.entryPrice) / openPos.entryPrice
          : (openPos.entryPrice - priceNow) / openPos.entryPrice;
      mark = entryEquity * (1 + unrealized);
    }

    equityCurve.push({ time, strategy: mark, buyHold: (daily[i].close / startPrice) * 100 });
  }

  return equityCurve;
}

export interface TradeStats {
  winRate: number;
  avgWinPct: number;
  avgLossPct: number;
  maxDrawdownPct: number;
  totalReturnPct: number;
  buyHoldReturnPct: number;
}

export function summarizeTrades(trades: { returnPct: number; win: boolean }[], equityCurve: EquityPoint[]): TradeStats {
  const wins = trades.filter((t) => t.win);
  const losses = trades.filter((t) => !t.win);

  let peak = -Infinity;
  let maxDrawdownPct = 0;
  for (const p of equityCurve) {
    peak = Math.max(peak, p.strategy);
    const dd = ((peak - p.strategy) / peak) * 100;
    maxDrawdownPct = Math.max(maxDrawdownPct, dd);
  }

  return {
    winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
    avgWinPct: wins.length > 0 ? wins.reduce((s, t) => s + t.returnPct, 0) / wins.length : 0,
    avgLossPct: losses.length > 0 ? losses.reduce((s, t) => s + t.returnPct, 0) / losses.length : 0,
    maxDrawdownPct,
    totalReturnPct: equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].strategy - 100 : 0,
    buyHoldReturnPct: equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].buyHold - 100 : 0,
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
