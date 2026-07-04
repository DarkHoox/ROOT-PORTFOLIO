import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { buildScreenerRows, matchesMarketCap, matchesVolatility, type MarketCapBucket, type VolatilityBucket } from '../lib/screener';
import { SECTORS } from '../data/symbols';
import { useAppStore } from '../state/store';
import { Card } from '../components/common/Card';
import { SignalBadge } from '../components/common/SignalBadge';

export function ScreenerView() {
  const weights = useAppStore((s) => s.weights);
  const selectSymbol = useAppStore((s) => s.selectSymbol);
  const toggleWatchlist = useAppStore((s) => s.toggleWatchlist);
  const watchlist = useAppStore((s) => s.watchlist);

  const [minBullish, setMinBullish] = useState(6);
  const [sector, setSector] = useState<'all' | (typeof SECTORS)[number]>('all');
  const [capBucket, setCapBucket] = useState<MarketCapBucket>('all');
  const [volBucket, setVolBucket] = useState<VolatilityBucket>('all');

  const rows = useMemo(() => buildScreenerRows(weights), [weights]);

  const filtered = rows
    .filter((r) => r.bullishCount >= minBullish)
    .filter((r) => sector === 'all' || r.sector === sector)
    .filter((r) => matchesMarketCap(r, capBucket))
    .filter((r) => matchesVolatility(r, volBucket))
    .sort((a, b) => b.bullishCount - a.bullishCount);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-ink-primary">Screener</h1>

      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs text-ink-muted">Min. počet modulů s růstovým signálem: {minBullish}/9</label>
            <input
              type="range"
              min={0}
              max={9}
              value={minBullish}
              onChange={(e) => setMinBullish(Number(e.target.value))}
              className="mt-2 h-1.5 w-full cursor-pointer accent-accent"
            />
          </div>
          <div>
            <label className="text-xs text-ink-muted">Sektor</label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value as typeof sector)}
              className="mt-1.5 w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink-primary"
            >
              <option value="all">Všechny sektory</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-ink-muted">Market cap</label>
            <select
              value={capBucket}
              onChange={(e) => setCapBucket(e.target.value as MarketCapBucket)}
              className="mt-1.5 w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink-primary"
            >
              <option value="all">Vše</option>
              <option value="small">Small cap (&lt;$10B)</option>
              <option value="mid">Mid cap ($10-50B)</option>
              <option value="large">Large cap ($50-300B)</option>
              <option value="mega">Mega cap (&gt;$300B)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-ink-muted">Volatilita (beta)</label>
            <select
              value={volBucket}
              onChange={(e) => setVolBucket(e.target.value as VolatilityBucket)}
              className="mt-1.5 w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink-primary"
            >
              <option value="all">Vše</option>
              <option value="low">Nízká (beta &lt; 0,9)</option>
              <option value="medium">Střední (0,9-1,4)</option>
              <option value="high">Vysoká (beta &gt; 1,4)</option>
            </select>
          </div>
        </div>
      </Card>

      <Card title={`Výsledky (${filtered.length})`} subtitle="Řazeno podle počtu modulů s růstovým signálem">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-ink-muted">
                <th className="py-2 pr-3 font-medium">Symbol</th>
                <th className="py-2 pr-3 font-medium">Sektor</th>
                <th className="py-2 pr-3 font-medium">Cena</th>
                <th className="py-2 pr-3 font-medium">Změna</th>
                <th className="py-2 pr-3 font-medium">Moduly (růst/pokles)</th>
                <th className="py-2 pr-3 font-medium">Verdikt</th>
                <th className="py-2 pr-3 font-medium">Market Cap</th>
                <th className="py-2 pr-3 font-medium">Beta</th>
                <th className="py-2 pr-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr key={r.symbol} className="hover:bg-surface-2">
                  <td className="py-2 pr-3">
                    <button onClick={() => selectSymbol(r.symbol)} className="font-semibold text-ink-primary hover:text-accent">
                      {r.symbol}
                    </button>
                    <div className="text-xs text-ink-muted">{r.name}</div>
                  </td>
                  <td className="py-2 pr-3 text-xs text-ink-secondary">{r.sector}</td>
                  <td className="tabular py-2 pr-3">${r.price.toFixed(2)}</td>
                  <td className={clsx('tabular py-2 pr-3 font-medium', r.changePct >= 0 ? 'text-up' : 'text-down')}>
                    {r.changePct >= 0 ? '+' : ''}
                    {r.changePct.toFixed(2)}%
                  </td>
                  <td className="tabular py-2 pr-3">
                    <span className="text-up">{r.bullishCount}▲</span> / <span className="text-down">{r.bearishCount}▼</span>
                  </td>
                  <td className="py-2 pr-3">
                    <SignalBadge signal={r.verdictSignal} size="sm" />
                  </td>
                  <td className="tabular py-2 pr-3">${r.marketCapB.toFixed(1)}B</td>
                  <td className="tabular py-2 pr-3">{r.beta.toFixed(2)}</td>
                  <td className="py-2 pr-3">
                    <button
                      onClick={() => toggleWatchlist(r.symbol)}
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      {watchlist.includes(r.symbol) ? '★' : '+ watchlist'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-ink-muted">
                    Žádná akcie neodpovídá zadaným filtrům.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
