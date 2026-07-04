import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { getStockProfile } from '../data/mockData';
import { STOCK_UNIVERSE } from '../data/symbols';
import { useAppStore } from '../state/store';
import { Card } from '../components/common/Card';
import { StatTile } from '../components/common/StatTile';

export function PaperTradingView() {
  const paperCash = useAppStore((s) => s.paperCash);
  const paperPositions = useAppStore((s) => s.paperPositions);
  const paperTrades = useAppStore((s) => s.paperTrades);
  const paperBuy = useAppStore((s) => s.paperBuy);
  const paperSell = useAppStore((s) => s.paperSell);
  const resetPaperAccount = useAppStore((s) => s.resetPaperAccount);

  const [symbol, setSymbol] = useState('AAPL');
  const [qty, setQty] = useState(10);

  const price = useMemo(() => {
    const p = getStockProfile(symbol);
    return p.seriesDaily[p.seriesDaily.length - 1].close;
  }, [symbol]);

  const positionsWithPrice = Object.values(paperPositions).map((pos) => {
    const p = getStockProfile(pos.symbol);
    const currentPrice = p.seriesDaily[p.seriesDaily.length - 1].close;
    const marketValue = pos.qty * currentPrice;
    const unrealizedPnl = (currentPrice - pos.avgPrice) * pos.qty;
    const unrealizedPnlPct = ((currentPrice - pos.avgPrice) / pos.avgPrice) * 100;
    return { ...pos, currentPrice, marketValue, unrealizedPnl, unrealizedPnlPct };
  });

  const positionsValue = positionsWithPrice.reduce((s, p) => s + p.marketValue, 0);
  const totalEquity = paperCash + positionsValue;
  const totalUnrealizedPnl = positionsWithPrice.reduce((s, p) => s + p.unrealizedPnl, 0);
  const realizedPnl = paperTrades.filter((t) => t.side === 'sell').reduce((s, t) => s + (t.realizedPnl ?? 0), 0);
  const startingCash = 100_000;
  const totalReturnPct = ((totalEquity - startingCash) / startingCash) * 100;

  const ownedQty = paperPositions[symbol]?.qty ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink-primary">Paper Trading</h1>
        <button onClick={resetPaperAccount} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-down">
          Resetovat účet
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Hotovost" value={`$${paperCash.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} />
        <StatTile label="Hodnota pozic" value={`$${positionsValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} />
        <StatTile label="Celková bilance" value={`$${totalEquity.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} />
        <StatTile label="Nerealizovaný P&L" value={`${totalUnrealizedPnl >= 0 ? '+' : ''}$${totalUnrealizedPnl.toFixed(0)}`} tone={totalUnrealizedPnl >= 0 ? 'up' : 'down'} />
        <StatTile label="Realizovaný P&L" value={`${realizedPnl >= 0 ? '+' : ''}$${realizedPnl.toFixed(0)}`} tone={realizedPnl >= 0 ? 'up' : 'down'} />
        <StatTile label="Celkový výnos" value={`${totalReturnPct >= 0 ? '+' : ''}${totalReturnPct.toFixed(2)}%`} tone={totalReturnPct >= 0 ? 'up' : 'down'} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Nový pokyn" subtitle="Simulace s virtuálními penězi — žádné reálné riziko">
          <div className="space-y-3">
            <label className="block text-xs text-ink-muted">
              Symbol
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink-primary"
              >
                {STOCK_UNIVERSE.map((s) => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.symbol} — {s.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="tabular text-sm text-ink-secondary">Aktuální cena: ${price.toFixed(2)}</div>
            <label className="block text-xs text-ink-muted">
              Počet kusů
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                className="mt-1 w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink-primary"
              />
            </label>
            <div className="text-xs text-ink-muted">Vlastníte: {ownedQty} ks · Hodnota pokynu: ${(qty * price).toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
            <div className="flex gap-2">
              <button
                onClick={() => paperBuy(symbol, qty, price)}
                disabled={qty * price > paperCash}
                className="flex-1 rounded-md bg-up py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Koupit
              </button>
              <button
                onClick={() => paperSell(symbol, qty, price)}
                disabled={ownedQty < qty}
                className="flex-1 rounded-md bg-down py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prodat
              </button>
            </div>
          </div>
        </Card>

        <Card title="Otevřené pozice" className="lg:col-span-2">
          {positionsWithPrice.length === 0 ? (
            <p className="text-sm text-ink-muted">Zatím žádné otevřené pozice.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-ink-muted">
                    <th className="py-1.5 pr-3 font-medium">Symbol</th>
                    <th className="py-1.5 pr-3 font-medium">Ks</th>
                    <th className="py-1.5 pr-3 font-medium">Prům. cena</th>
                    <th className="py-1.5 pr-3 font-medium">Aktuální cena</th>
                    <th className="py-1.5 pr-3 font-medium">Hodnota</th>
                    <th className="py-1.5 pr-3 font-medium">Nerealizovaný P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {positionsWithPrice.map((p) => (
                    <tr key={p.symbol}>
                      <td className="py-1.5 pr-3 font-semibold text-ink-primary">{p.symbol}</td>
                      <td className="tabular py-1.5 pr-3">{p.qty}</td>
                      <td className="tabular py-1.5 pr-3">${p.avgPrice.toFixed(2)}</td>
                      <td className="tabular py-1.5 pr-3">${p.currentPrice.toFixed(2)}</td>
                      <td className="tabular py-1.5 pr-3">${p.marketValue.toFixed(0)}</td>
                      <td className={clsx('tabular py-1.5 pr-3 font-medium', p.unrealizedPnl >= 0 ? 'text-up' : 'text-down')}>
                        {p.unrealizedPnl >= 0 ? '+' : ''}
                        ${p.unrealizedPnl.toFixed(0)} ({p.unrealizedPnlPct >= 0 ? '+' : ''}
                        {p.unrealizedPnlPct.toFixed(1)}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card title="Historie obchodů" subtitle={`${paperTrades.length} obchodů`}>
        {paperTrades.length === 0 ? (
          <p className="text-sm text-ink-muted">Zatím žádné obchody.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-ink-muted">
                  <th className="py-1.5 pr-3 font-medium">Čas</th>
                  <th className="py-1.5 pr-3 font-medium">Symbol</th>
                  <th className="py-1.5 pr-3 font-medium">Strana</th>
                  <th className="py-1.5 pr-3 font-medium">Ks</th>
                  <th className="py-1.5 pr-3 font-medium">Cena</th>
                  <th className="py-1.5 pr-3 font-medium">Realizovaný P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paperTrades.map((t) => (
                  <tr key={t.id}>
                    <td className="py-1.5 pr-3 text-xs text-ink-muted">{t.time}</td>
                    <td className="py-1.5 pr-3 font-semibold text-ink-primary">{t.symbol}</td>
                    <td className={clsx('py-1.5 pr-3 font-medium', t.side === 'buy' ? 'text-up' : 'text-down')}>{t.side === 'buy' ? 'Nákup' : 'Prodej'}</td>
                    <td className="tabular py-1.5 pr-3">{t.qty}</td>
                    <td className="tabular py-1.5 pr-3">${t.price.toFixed(2)}</td>
                    <td className={clsx('tabular py-1.5 pr-3', t.realizedPnl !== undefined ? (t.realizedPnl >= 0 ? 'text-up' : 'text-down') : 'text-ink-muted')}>
                      {t.realizedPnl !== undefined ? `${t.realizedPnl >= 0 ? '+' : ''}$${t.realizedPnl.toFixed(0)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
