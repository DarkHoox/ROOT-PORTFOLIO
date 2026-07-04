import { useEffect, useState } from 'react';
import { getStockProfile } from '../data/mockData';
import { STOCK_UNIVERSE } from '../data/symbols';
import { runBacktest, type BacktestResult } from '../lib/backtest';
import { useAppStore } from '../state/store';
import { Card } from '../components/common/Card';
import { StatTile } from '../components/common/StatTile';
import { EquityCurveChart } from '../components/backtest/EquityCurveChart';
import { TradeLog } from '../components/backtest/TradeLog';

export function BacktestView() {
  const globalSymbol = useAppStore((s) => s.selectedSymbol);
  const weights = useAppStore((s) => s.weights);
  const [symbol, setSymbol] = useState(globalSymbol);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      const profile = getStockProfile(symbol);
      const res = runBacktest(profile, weights, 252);
      setResult(res);
      setLoading(false);
    }, 30);
    return () => clearTimeout(timeout);
  }, [symbol, weights]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold text-ink-primary">Backtesting</h1>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-sm font-semibold text-ink-primary"
        >
          {STOCK_UNIVERSE.map((s) => (
            <option key={s.symbol} value={s.symbol}>
              {s.symbol} — {s.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-ink-muted">Simulace agregovaného signálu za posledních 12 měsíců, aktuální nastavení vah</span>
      </div>

      {loading || !result ? (
        <Card>
          <div className="py-12 text-center text-sm text-ink-muted">Počítám walk-forward simulaci…</div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile label="Win rate" value={`${result.winRate.toFixed(0)}%`} tone={result.winRate >= 50 ? 'up' : 'down'} />
            <StatTile label="Průměrný zisk" value={`+${result.avgWinPct.toFixed(1)}%`} tone="up" />
            <StatTile label="Průměrná ztráta" value={`${result.avgLossPct.toFixed(1)}%`} tone="down" />
            <StatTile label="Max drawdown" value={`-${result.maxDrawdownPct.toFixed(1)}%`} tone="down" />
            <StatTile label="Výnos strategie" value={`${result.totalReturnPct >= 0 ? '+' : ''}${result.totalReturnPct.toFixed(1)}%`} tone={result.totalReturnPct >= 0 ? 'up' : 'down'} />
            <StatTile label="Buy & Hold" value={`${result.buyHoldReturnPct >= 0 ? '+' : ''}${result.buyHoldReturnPct.toFixed(1)}%`} />
          </div>

          <Card title="Equity křivka" subtitle="Strategie založená na signálech vs. buy & hold (indexováno na 100)">
            <EquityCurveChart equityCurve={result.equityCurve} />
          </Card>

          <Card title="Historie obchodů" subtitle={`${result.trades.length} obchodů za posledních 12 měsíců`}>
            <TradeLog trades={result.trades} />
          </Card>

          <Card title="Selhání systému — poctivě" subtitle="Případy, kdy signál vedl ke ztrátové pozici">
            {result.failedTrades.length === 0 ? (
              <p className="text-sm text-ink-muted">V tomto období nebyl zaznamenán žádný ztrátový obchod — nezaručuje to stejný výsledek v budoucnu.</p>
            ) : (
              <div className="space-y-2">
                {result.failedTrades.map((t, i) => (
                  <div key={i} className="rounded-md border border-down/20 bg-down-dim/30 p-3 text-xs text-ink-secondary">
                    <span className="font-semibold text-down">{t.returnPct.toFixed(2)}%</span> — vstup {t.side === 'long' ? 'long' : 'short'} @ $
                    {t.entryPrice.toFixed(2)} na základě: „{t.entrySignalReason}“, ale cena se pohnula opačně.
                  </div>
                ))}
              </div>
            )}
          </Card>

          <p className="text-xs text-ink-muted">
            Backtest je walk-forward (bez dopředného nahlížení), ale ignoruje transakční poplatky, skluz (slippage) a historické fundamenty/zprávy — ty
            jsou v tomto demu statické. Výsledky za minulost negarantují budoucí výkonnost.
          </p>
        </>
      )}
    </div>
  );
}
