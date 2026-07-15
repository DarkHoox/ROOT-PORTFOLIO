import type { ModuleWeights, StockProfile } from '../types/market';
import { computeDailyVerdicts, type DailyVerdict } from './dailyVerdicts';
import { buildEquityCurve, summarizeTrades, type EquityPoint, type TradeStats } from './backtest';
import { atr } from './indicators/volatility';
import { sma } from './indicators/movingAverages';
import { detectRecentPatterns, patternHistoricalSuccessRate } from './indicators/candlePatterns';

export interface EngineConfig {
  /** Verdict must point the same way this many consecutive days before acting. */
  confirmDays: number;
  /** Minimum aggregated confidence (0-100) to open a position. */
  minConfidence: number;
  /** Trailing stop distance in ATR multiples. */
  atrStopMult: number;
  /** Fixed take-profit in ATR multiples, or null to let winners run on the trailing stop. */
  atrTargetMult: number | null;
  /** Only buy when price is above SMA200 (classic regime filter against whipsaws). */
  useTrendFilter: boolean;
  /** Candlestick confirmation: a fresh bearish pattern with proven follow-through vetoes entry;
   *  a proven bullish pattern relaxes the confidence threshold. */
  usePatterns: boolean;
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  confirmDays: 2,
  minConfidence: 15,
  atrStopMult: 2.5,
  atrTargetMult: null,
  useTrendFilter: true,
  usePatterns: true,
};

export interface SignalEvent {
  time: number;
  price: number;
  type: 'buy' | 'sell';
  reason: string;
}

export interface EngineTrade {
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  returnPct: number;
  win: boolean;
  holdingDays: number;
  entryReason: string;
  exitReason: string;
}

export type AdviceAction = 'buy' | 'hold' | 'sell' | 'stay-out';

export interface EngineAdvice {
  action: AdviceAction;
  reason: string;
  stopLoss: number | null;
  entryPrice: number | null;
}

export interface EngineResult {
  events: SignalEvent[];
  trades: EngineTrade[];
  advice: EngineAdvice;
  /** True while a position is still open on the last bar (its force-closed trade is included in `trades`). */
  openAtEnd: boolean;
  startIndex: number;
}

const PATTERN_MIN_SUCCESS = 55; // % historical follow-through required before a pattern is trusted

interface PatternRead {
  bullish: string | null;
  bearish: string | null;
}

function readPatterns(daily: StockProfile['seriesDaily'], uptoIndex: number): PatternRead {
  const window = daily.slice(0, uptoIndex + 1);
  const found = detectRecentPatterns(window, 3);
  let bullish: string | null = null;
  let bearish: string | null = null;
  for (const p of found) {
    if (p.bias === 'neutral') continue;
    const success = patternHistoricalSuccessRate(window, p.name, 5);
    if (success === null || success < PATTERN_MIN_SUCCESS) continue;
    const label = `${p.label} (${success}% úspěšnost)`;
    if (p.bias === 'up') bullish = label;
    else bearish = label;
  }
  return { bullish, bearish };
}

/**
 * Long-only walk-forward signal engine. Decisions are made on each day's
 * close using only past data; orders execute at the NEXT day's open, so
 * there is no lookahead. Exits happen three ways: the trailing ATR stop is
 * hit, the optional take-profit is hit, or the aggregated verdict turns
 * bearish for `confirmDays` in a row.
 */
export function runSignalEngine(
  profile: StockProfile,
  weights: ModuleWeights,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG,
  lookbackDays = 252,
): EngineResult {
  const daily = profile.seriesDaily;
  const verdicts = computeDailyVerdicts(profile, weights, lookbackDays);
  const startIndex = verdicts.length > 0 ? verdicts[0].index : daily.length;
  const atrSeries = atr(daily, 14);
  const sma200 = sma(daily.map((c) => c.close), 200);

  const events: SignalEvent[] = [];
  const trades: EngineTrade[] = [];

  let position: { entryIndex: number; entryPrice: number; stop: number; target: number | null; entryReason: string } | null = null;
  let upStreak = 0;
  let downStreak = 0;

  const closeTrade = (exitIndex: number, exitPrice: number, exitReason: string) => {
    if (!position) return;
    const returnPct = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;
    trades.push({
      entryTime: daily[position.entryIndex].time,
      entryPrice: position.entryPrice,
      exitTime: daily[exitIndex].time,
      exitPrice,
      returnPct,
      win: returnPct > 0,
      holdingDays: exitIndex - position.entryIndex,
      entryReason: position.entryReason,
      exitReason,
    });
    events.push({ time: daily[exitIndex].time, price: exitPrice, type: 'sell', reason: exitReason });
    position = null;
  };

  // Entry gate evaluated on day i's close; returns reason or null when blocked.
  const entryDecision = (v: DailyVerdict, i: number): { ok: boolean; reason: string } => {
    if (v.signal !== 'up' || upStreak < config.confirmDays) {
      return { ok: false, reason: `signál růstu zatím nepotvrzen (${upStreak}/${config.confirmDays} dní)` };
    }
    const patterns = config.usePatterns ? readPatterns(daily, i) : { bullish: null, bearish: null };
    if (patterns.bearish) {
      return { ok: false, reason: `vstup blokuje medvědí formace: ${patterns.bearish}` };
    }
    const required = patterns.bullish ? Math.max(5, config.minConfidence - 10) : config.minConfidence;
    if (v.confidence < required) {
      return { ok: false, reason: `důvěra ${v.confidence}% je pod prahem ${required}%` };
    }
    if (config.useTrendFilter) {
      const ma = sma200[i];
      if (ma !== null && daily[i].close < ma) {
        return { ok: false, reason: 'cena je pod SMA200 — trend filtr blokuje nákupy v klesajícím trhu' };
      }
    }
    const base = `${v.confidence}% důvěra, ${v.reason}`;
    return { ok: true, reason: patterns.bullish ? `${base}; potvrzeno formací ${patterns.bullish}` : base };
  };

  for (let k = 0; k < verdicts.length; k += 1) {
    const v = verdicts[k];
    const i = v.index;

    // 1) Manage an open position intrabar on day i (stop/target act on today's range).
    if (position && i > position.entryIndex) {
      const bar = daily[i];
      if (bar.open <= position.stop) {
        closeTrade(i, bar.open, `gap pod stop-loss — prodáno na otevření ($${bar.open.toFixed(2)})`);
      } else if (bar.low <= position.stop) {
        closeTrade(i, position.stop, `zasažen trailing stop-loss ($${position.stop.toFixed(2)})`);
      } else if (position.target !== null && bar.high >= position.target) {
        closeTrade(i, position.target, `dosažen cílový výnos ($${position.target.toFixed(2)})`);
      } else {
        // Ratchet the trailing stop up as price rises; never loosen it.
        const atrVal = atrSeries[i];
        if (atrVal !== null) {
          position.stop = Math.max(position.stop, bar.close - config.atrStopMult * atrVal);
        }
      }
    }

    // 2) Update verdict streaks from day i's close.
    if (v.signal === 'up') {
      upStreak += 1;
      downStreak = 0;
    } else if (v.signal === 'down') {
      downStreak += 1;
      upStreak = 0;
    } else {
      upStreak = 0;
      downStreak = 0;
    }

    const nextBar = daily[i + 1];

    // 3) Signal-based exit: verdict turned bearish for confirmDays → sell at next open.
    if (position && downStreak >= config.confirmDays && nextBar) {
      closeTrade(i + 1, nextBar.open, `signál se otočil na pokles (${downStreak} dní po sobě) — prodáno na otevření`);
      continue;
    }

    // 4) Entry: all gates pass → buy at next open.
    if (!position && nextBar) {
      const decision = entryDecision(v, i);
      if (decision.ok) {
        const atrVal = atrSeries[i] ?? daily[i].close * 0.02;
        const entryPrice = nextBar.open;
        position = {
          entryIndex: i + 1,
          entryPrice,
          stop: entryPrice - config.atrStopMult * atrVal,
          target: config.atrTargetMult !== null ? entryPrice + config.atrTargetMult * atrVal : null,
          entryReason: decision.reason,
        };
        events.push({ time: nextBar.time, price: entryPrice, type: 'buy', reason: decision.reason });
      }
    }
  }

  // Live advice from the state at the last bar.
  const last = verdicts[verdicts.length - 1];
  const openAtEnd = position !== null;
  let advice: EngineAdvice;
  if (position !== null) {
    const pos = position as { entryIndex: number; entryPrice: number; stop: number; target: number | null; entryReason: string };
    if (last && last.signal === 'down') {
      advice = {
        action: 'sell',
        reason: `pozice je otevřená, ale verdikt se otáčí na pokles (${downStreak}/${config.confirmDays} dní) — připravte se na prodej, stop-loss je na $${pos.stop.toFixed(2)}`,
        stopLoss: pos.stop,
        entryPrice: pos.entryPrice,
      };
    } else {
      advice = {
        action: 'hold',
        reason: `držet — nakoupeno za $${pos.entryPrice.toFixed(2)}, trailing stop-loss aktuálně na $${pos.stop.toFixed(2)}${last ? `, verdikt: ${last.reason}` : ''}`,
        stopLoss: pos.stop,
        entryPrice: pos.entryPrice,
      };
    }
    // For statistics, close the open position at the last close.
    const lastIndex = daily.length - 1;
    closeTrade(lastIndex, daily[lastIndex].close, 'otevřená pozice — oceněno poslední cenou (pouze pro statistiku)');
    // Force-close is bookkeeping only, not a real sell signal event.
    events.pop();
  } else if (last) {
    const decision = entryDecision(last, last.index);
    advice = decision.ok
      ? { action: 'buy', reason: `podmínky pro nákup splněny: ${decision.reason}`, stopLoss: null, entryPrice: null }
      : { action: 'stay-out', reason: `mimo trh — ${decision.reason}`, stopLoss: null, entryPrice: null };
  } else {
    advice = { action: 'stay-out', reason: 'nedostatek dat', stopLoss: null, entryPrice: null };
  }

  return { events, trades, advice, openAtEnd, startIndex };
}

export interface EngineBacktest extends TradeStats {
  result: EngineResult;
  equityCurve: EquityPoint[];
  failedTrades: EngineTrade[];
}

/** Engine trades run through the same verified equity/stats math as the naive backtest. */
export function runEngineBacktest(
  profile: StockProfile,
  weights: ModuleWeights,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG,
  lookbackDays = 252,
): EngineBacktest {
  const result = runSignalEngine(profile, weights, config, lookbackDays);
  const tradeLikes = result.trades.map((t) => ({ ...t, side: 'long' as const }));
  const equityCurve = buildEquityCurve(profile.seriesDaily, result.startIndex, tradeLikes);
  const stats = summarizeTrades(result.trades, equityCurve);
  return { result, equityCurve, failedTrades: result.trades.filter((t) => !t.win), ...stats };
}
