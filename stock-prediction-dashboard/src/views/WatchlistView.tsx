import { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { getStockProfile } from '../data/mockData';
import { STOCK_UNIVERSE } from '../data/symbols';
import { computeAllModules } from '../lib/modules';
import { computeVerdict } from '../lib/modules/aggregate';
import { detectSupportResistance, nearestLevel } from '../lib/indicators/levels';
import { useAppStore } from '../state/store';
import { Card } from '../components/common/Card';
import { SignalBadge } from '../components/common/SignalBadge';
import { AlertsList } from '../components/watchlist/AlertsList';

export function WatchlistView() {
  const watchlist = useAppStore((s) => s.watchlist);
  const toggleWatchlist = useAppStore((s) => s.toggleWatchlist);
  const alerts = useAppStore((s) => s.alerts);
  const dismissAlert = useAppStore((s) => s.dismissAlert);
  const markAllAlertsRead = useAppStore((s) => s.markAllAlertsRead);
  const pushAlert = useAppStore((s) => s.pushAlert);
  const weights = useAppStore((s) => s.weights);
  const selectSymbol = useAppStore((s) => s.selectSymbol);

  const [addSymbol, setAddSymbol] = useState('');
  const prevSignals = useRef<Record<string, string>>({});

  const rows = useMemo(
    () =>
      watchlist.map((symbol) => {
        const profile = getStockProfile(symbol);
        const modules = computeAllModules(profile);
        const verdict = computeVerdict(modules, weights);
        const c = profile.seriesDaily;
        const last = c[c.length - 1].close;
        const prev = c[c.length - 2].close;
        return { symbol, profile, verdict, price: last, changePct: ((last - prev) / prev) * 100 };
      }),
    [watchlist, weights],
  );

  const runAlertScan = () => {
    for (const row of rows) {
      const { symbol, profile, verdict } = row;

      const prevSignal = prevSignals.current[symbol];
      if (prevSignal && prevSignal !== verdict.signal) {
        pushAlert({ symbol, type: 'signal-change', message: `Agregovaný signál se změnil na „${verdict.signal}“` });
      }
      prevSignals.current[symbol] = verdict.signal;

      if (profile.earnings.nextEarningsDaysAway <= 5) {
        pushAlert({ symbol, type: 'earnings-soon', message: `Earnings za ${profile.earnings.nextEarningsDaysAway} dní — očekávejte zvýšenou volatilitu` });
      }

      const levels = detectSupportResistance(profile.seriesDaily, 180, 0.015);
      const nearest = nearestLevel(row.price, levels);
      if (nearest && nearest.distancePct < 1) {
        pushAlert({
          symbol,
          type: 'level-breakout',
          message: `Cena je ${nearest.distancePct.toFixed(1)}% od klíčové ${nearest.level.type === 'support' ? 'supportu' : 'rezistence'} (${nearest.level.price.toFixed(2)})`,
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-ink-primary">Watchlist</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card
            title="Sledované akcie"
            action={
              <div className="flex items-center gap-2">
                <select
                  value={addSymbol}
                  onChange={(e) => {
                    const sym = e.target.value;
                    if (sym && !watchlist.includes(sym)) toggleWatchlist(sym);
                    setAddSymbol('');
                  }}
                  className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-ink-primary"
                >
                  <option value="">+ Přidat symbol…</option>
                  {STOCK_UNIVERSE.filter((s) => !watchlist.includes(s.symbol)).map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.symbol}
                    </option>
                  ))}
                </select>
                <button onClick={runAlertScan} className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-plane">
                  Zkontrolovat alerty
                </button>
              </div>
            }
          >
            {rows.length === 0 ? (
              <p className="text-sm text-ink-muted">Watchlist je prázdný. Přidejte akcie tlačítkem výše nebo z detailu akcie.</p>
            ) : (
              <div className="divide-y divide-border">
                {rows.map((r) => (
                  <div key={r.symbol} className="flex items-center gap-3 py-2.5">
                    <button onClick={() => selectSymbol(r.symbol)} className="flex-1 text-left">
                      <div className="text-sm font-semibold text-ink-primary">{r.symbol}</div>
                      <div className="text-xs text-ink-muted">{r.profile.meta.name}</div>
                    </button>
                    <div className="tabular text-right text-sm text-ink-secondary">${r.price.toFixed(2)}</div>
                    <div className={clsx('tabular w-16 text-right text-sm font-medium', r.changePct >= 0 ? 'text-up' : 'text-down')}>
                      {r.changePct >= 0 ? '+' : ''}
                      {r.changePct.toFixed(2)}%
                    </div>
                    <SignalBadge signal={r.verdict.signal} size="sm" />
                    <button onClick={() => toggleWatchlist(r.symbol)} className="text-xs text-ink-muted hover:text-down">
                      Odebrat
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card
          title="Alerty"
          subtitle="Změna signálu, průraz úrovně, blížící se earnings"
          action={
            alerts.length > 0 && (
              <button onClick={markAllAlertsRead} className="text-xs font-medium text-accent hover:underline">
                Označit vše jako přečtené
              </button>
            )
          }
        >
          <AlertsList alerts={alerts} onDismiss={dismissAlert} />
        </Card>
      </div>
    </div>
  );
}
