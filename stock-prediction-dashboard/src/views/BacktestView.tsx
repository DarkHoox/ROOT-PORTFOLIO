import { useEffect, useState } from 'react';
import { getStockProfile } from '../data/mockData';
import { STOCK_UNIVERSE } from '../data/symbols';
import { runBacktest, type BacktestResult, type BacktestTrade } from '../lib/backtest';
import { runEngineBacktest, type EngineBacktest, type EngineTrade } from '../lib/signalEngine';
import { useAppStore } from '../state/store';
import { Card } from '../components/common/Card';
import { StatTile } from '../components/common/StatTile';
import { EquityCurveChart, type ComparisonPoint } from '../components/backtest/EquityCurveChart';
import { TradeLog } from '../components/backtest/TradeLog';

function exportTradesCsv(symbol: string, trades: EngineTrade[]) {
  const header = 'entry_date,exit_date,entry_price,exit_price,holding_days,return_pct,win,entry_reason,exit_reason';
  const fmtDate = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);
  const esc = (s: string) => '"' + s.replace(/"/g, '""') + '"';
  const rows = trades.map((t) =>
    [
      fmtDate(t.entryTime),
      fmtDate(t.exitTime),
      t.entryPrice.toFixed(2),
      t.exitPrice.toFixed(2),
      t.holdingDays,
      t.returnPct.toFixed(2),
      t.win ? 1 : 0,
      esc(t.entryReason),
      esc(t.exitReason),
    ].join(','),
  );
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backtest-${symbol}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function BacktestView() {
  const globalSymbol = useAppStore((s) => s.selectedSymbol);
  const weights = useAppStore((s) => s.weights);
  const [symbol, setSymbol] = useState(globalSymbol);
  const [engineBt, setEngineBt] = useState<EngineBacktest | null>(null);
  const [naiveBt, setNaiveBt] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      const profile = getStockProfile(symbol);
      // Both strategies share the cached walk-forward verdicts, so the second run is cheap.
      setNaiveBt(runBacktest(profile, weights, 252));
      setEngineBt(runEngineBacktest(profile, weights));
      setLoading(false);
    }, 30);
    return () => clearTimeout(timeout);
  }, [symbol, weights]);

  const comparison: ComparisonPoint[] =
    engineBt && naiveBt
      ? engineBt.equityCurve.map((p, i) => ({
          time: p.time,
          engine: p.strategy,
          naive: naiveBt.equityCurve[i]?.strategy ?? 100,
          buyHold: p.buyHold,
        }))
      : [];

  const tradeLogRows: BacktestTrade[] = engineBt
    ? engineBt.result.trades.map((t) => ({
        side: 'long' as const,
        entryTime: t.entryTime,
        entryPrice: t.entryPrice,
        exitTime: t.exitTime,
        exitPrice: t.exitPrice,
        returnPct: t.returnPct,
        win: t.win,
        holdingDays: t.holdingDays,
        entrySignalReason: t.entryReason,
      }))
    : [];

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
        <span className="text-xs text-ink-muted">
          Signální engine (potvrzení + trend filtr + formace + trailing stop) vs. naivní obchodování každého flipu vs. buy & hold — 12 měsíců
        </span>
      </div>

      {loading || !engineBt || !naiveBt ? (
        <Card>
          <div className="py-12 text-center text-sm text-ink-muted">Počítám walk-forward simulaci…</div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile label="Win rate" value={`${engineBt.winRate.toFixed(0)}%`} tone={engineBt.winRate >= 50 ? 'up' : 'down'} />
            <StatTile label="Průměrný zisk" value={`+${engineBt.avgWinPct.toFixed(1)}%`} tone="up" />
            <StatTile label="Průměrná ztráta" value={`${engineBt.avgLossPct.toFixed(1)}%`} tone="down" />
            <StatTile label="Max drawdown" value={`-${engineBt.maxDrawdownPct.toFixed(1)}%`} tone="down" />
            <StatTile
              label="Výnos engine"
              value={`${engineBt.totalReturnPct >= 0 ? '+' : ''}${engineBt.totalReturnPct.toFixed(1)}%`}
              tone={engineBt.totalReturnPct >= 0 ? 'up' : 'down'}
            />
            <StatTile label="Buy & Hold" value={`${engineBt.buyHoldReturnPct >= 0 ? '+' : ''}${engineBt.buyHoldReturnPct.toFixed(1)}%`} />
          </div>

          <div className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-ink-secondary">
            Pro srovnání — naivní strategie (obchoduje každou změnu verdiktu, {naiveBt.trades.length} obchodů):{' '}
            <span className={naiveBt.totalReturnPct >= 0 ? 'text-up' : 'text-down'}>
              {naiveBt.totalReturnPct >= 0 ? '+' : ''}
              {naiveBt.totalReturnPct.toFixed(1)}%
            </span>{' '}
            při max drawdownu -{naiveBt.maxDrawdownPct.toFixed(1)}%. Engine obchoduje {engineBt.result.trades.length}× a filtruje slabé
            signály.
          </div>

          <Card title="Equity křivky" subtitle="Signální engine vs. naivní flip strategie vs. buy & hold (indexováno na 100)">
            <EquityCurveChart data={comparison} />
          </Card>

          <Card
            title="Historie obchodů — signální engine"
            subtitle={`${engineBt.result.trades.length} obchodů za posledních 12 měsíců`}
            action={
              engineBt.result.trades.length > 0 && (
                <button
                  onClick={() => exportTradesCsv(symbol, engineBt.result.trades)}
                  className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-ink-secondary hover:text-accent"
                >
                  ⬇ Export CSV
                </button>
              )
            }
          >
            <TradeLog trades={tradeLogRows} />
          </Card>

          <Card title="Selhání systému — poctivě" subtitle="Ztrátové obchody engine, včetně důvodu vstupu i výstupu">
            {engineBt.failedTrades.length === 0 ? (
              <p className="text-sm text-ink-muted">
                V tomto období nebyl zaznamenán žádný ztrátový obchod — nezaručuje to stejný výsledek v budoucnu.
              </p>
            ) : (
              <div className="space-y-2">
                {engineBt.failedTrades.map((t, i) => (
                  <div key={i} className="rounded-md border border-down/20 bg-down-dim/30 p-3 text-xs text-ink-secondary">
                    <span className="font-semibold text-down">{t.returnPct.toFixed(2)}%</span> — nákup @ ${t.entryPrice.toFixed(2)}{' '}
                    ({t.entryReason}). Výstup: {t.exitReason}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <p className="text-xs text-ink-muted">
            Backtest je walk-forward (bez dopředného nahlížení): rozhodnutí padá na závěru dne, exekuce na otevření dne následujícího.
            Ignoruje transakční poplatky a skluz; fundamenty/zprávy jsou v demu statické. Výsledky za minulost negarantují budoucí
            výkonnost.
          </p>
        </>
      )}
    </div>
  );
}
