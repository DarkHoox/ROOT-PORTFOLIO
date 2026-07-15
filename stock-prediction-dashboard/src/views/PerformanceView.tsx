import { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { getStockProfile } from '../data/mockData';
import { STOCK_UNIVERSE } from '../data/symbols';
import { selectCandidates } from '../lib/recommendations';
import { assessSymbol, type SymbolAssessment } from '../lib/assessment';
import { useAppStore } from '../state/store';
import { Card } from '../components/common/Card';
import { StatTile } from '../components/common/StatTile';

interface PerfRow extends SymbolAssessment {
  symbol: string;
  name: string;
  price: number;
}

const ADVICE_BADGE: Record<string, { label: string; classes: string }> = {
  buy: { label: '▲ KOUPIT', classes: 'bg-up text-white' },
  hold: { label: '◆ DRŽET', classes: 'bg-accent text-plane' },
  sell: { label: '▼ PRODAT', classes: 'bg-down text-white' },
  'stay-out': { label: '● MIMO', classes: 'bg-surface-3 text-ink-secondary' },
};

export function PerformanceView() {
  const weights = useAppStore((s) => s.weights);
  const watchlist = useAppStore((s) => s.watchlist);
  const selectSymbol = useAppStore((s) => s.selectSymbol);

  const [rows, setRows] = useState<PerfRow[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanCurrent, setScanCurrent] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [lastRun, setLastRun] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const quickSet = useMemo(() => {
    const fromCandidates = selectCandidates(weights).map((c) => c.symbol);
    return Array.from(new Set([...watchlist, ...fromCandidates])).slice(0, 12);
  }, [watchlist, weights]);

  const runScan = async (symbols: string[]) => {
    cancelRef.current = false;
    setScanning(true);
    setRows([]);
    setProgress({ done: 0, total: symbols.length });
    const collected: PerfRow[] = [];
    for (let i = 0; i < symbols.length; i += 1) {
      if (cancelRef.current) break;
      const symbol = symbols[i];
      setScanCurrent(symbol);
      await new Promise((r) => setTimeout(r, 30)); // let the progress UI paint
      const profile = getStockProfile(symbol);
      const a = assessSymbol(profile, weights);
      collected.push({
        symbol,
        name: profile.meta.name,
        price: profile.seriesDaily[profile.seriesDaily.length - 1].close,
        ...a,
      });
      collected.sort((x, y) => (y.hitRatePct ?? 0) - (x.hitRatePct ?? 0));
      setRows([...collected]);
      setProgress({ done: i + 1, total: symbols.length });
    }
    setScanCurrent('');
    setScanning(false);
    setLastRun(new Date().toLocaleTimeString('cs-CZ'));
  };

  const withHitRate = rows.filter((r) => r.hitRatePct !== null);
  const avgHitRate = withHitRate.length > 0 ? Math.round(withHitRate.reduce((s, r) => s + (r.hitRatePct ?? 0), 0) / withHitRate.length) : null;
  const tradedRows = rows.filter((r) => r.engineTrades > 0);
  const avgWinRate = tradedRows.length > 0 ? Math.round(tradedRows.reduce((s, r) => s + r.engineWinRate, 0) / tradedRows.length) : null;
  const beatCount = rows.filter((r) => r.engineReturnPct > r.buyHoldReturnPct).length;
  const buySignals = rows.filter((r) => r.advice === 'buy' || r.advice === 'hold').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-ink-primary">Výkonnost predikcí</h1>
          <p className="text-xs text-ink-muted">
            Průběžné sledování, jak úspěšné naše predikce reálně jsou — směrová přesnost verdiktů (5denní horizont, 6 měsíců
            walk-forward) a výsledky signálního enginu proti buy & hold.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => runScan(quickSet)}
            disabled={scanning}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-plane disabled:opacity-40"
          >
            Rychlý sken ({quickSet.length})
          </button>
          <button
            onClick={() => runScan(STOCK_UNIVERSE.map((s) => s.symbol))}
            disabled={scanning}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary disabled:opacity-40"
          >
            Celý trh ({STOCK_UNIVERSE.length})
          </button>
          {scanning && (
            <button
              onClick={() => {
                cancelRef.current = true;
              }}
              className="rounded-md border border-down/40 px-3 py-1.5 text-xs font-semibold text-down"
            >
              Zastavit
            </button>
          )}
        </div>
      </div>

      {(scanning || rows.length > 0) && (
        <>
          {scanning && (
            <Card>
              <div className="flex items-center gap-3">
                <span className="pulse-dot h-2 w-2 rounded-full bg-accent" />
                <span className="text-sm text-ink-secondary">
                  Analyzuji <span className="tabular font-semibold text-accent">{scanCurrent}</span> — {progress.done}/{progress.total}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-300"
                    style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <StatTile
              label="Ø přesnost směru"
              value={avgHitRate !== null ? `${avgHitRate}%` : '—'}
              tone={avgHitRate !== null && avgHitRate > 50 ? 'up' : 'default'}
            />
            <StatTile label="Ø win rate engine" value={avgWinRate !== null ? `${avgWinRate}%` : '—'} />
            <StatTile label="Engine porazil B&H" value={rows.length > 0 ? `${beatCount}/${rows.length}` : '—'} />
            <StatTile label="Aktivní nákupní pokyny" value={rows.length > 0 ? `${buySignals}` : '—'} tone={buySignals > 0 ? 'up' : 'default'} />
          </div>

          <Card
            title="Úspěšnost podle akcie"
            subtitle={`Řazeno podle směrové přesnosti${lastRun ? ` · naposledy aktualizováno ${lastRun}` : ''}`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-ink-muted">
                    <th className="py-2 pr-3 font-medium">Symbol</th>
                    <th className="py-2 pr-3 font-medium">Cena</th>
                    <th className="py-2 pr-3 font-medium">Pokyn</th>
                    <th className="py-2 pr-3 font-medium">Přesnost směru</th>
                    <th className="py-2 pr-3 font-medium">Win rate</th>
                    <th className="py-2 pr-3 font-medium">Engine vs B&H (6m)</th>
                    <th className="py-2 pr-3 font-medium">Obchodů</th>
                    <th className="py-2 pr-3 font-medium">Skóre</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.symbol} className="hover:bg-surface-2">
                      <td className="py-2 pr-3">
                        <button onClick={() => selectSymbol(r.symbol)} className="font-semibold text-ink-primary hover:text-accent">
                          {r.symbol}
                        </button>
                        <div className="max-w-[140px] truncate text-xs text-ink-muted">{r.name}</div>
                      </td>
                      <td className="tabular py-2 pr-3">${r.price.toFixed(2)}</td>
                      <td className="py-2 pr-3">
                        <span className={clsx('rounded px-2 py-0.5 text-[10px] font-bold whitespace-nowrap', ADVICE_BADGE[r.advice].classes)}>
                          {ADVICE_BADGE[r.advice].label}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {r.hitRatePct !== null ? (
                          <div className="flex items-center gap-2">
                            <span className={clsx('tabular font-semibold', r.hitRatePct > 50 ? 'text-up' : 'text-down')}>
                              {r.hitRatePct}%
                            </span>
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-3">
                              <div
                                className={clsx('h-full', r.hitRatePct > 50 ? 'bg-up' : 'bg-down')}
                                style={{ width: `${r.hitRatePct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-muted">málo vzorků</span>
                        )}
                      </td>
                      <td className="tabular py-2 pr-3">{r.engineTrades > 0 ? `${r.engineWinRate.toFixed(0)}%` : '—'}</td>
                      <td className="tabular py-2 pr-3">
                        <span className={r.engineReturnPct >= 0 ? 'text-up' : 'text-down'}>
                          {r.engineReturnPct >= 0 ? '+' : ''}
                          {r.engineReturnPct.toFixed(1)}%
                        </span>{' '}
                        <span className="text-ink-muted">
                          / {r.buyHoldReturnPct >= 0 ? '+' : ''}
                          {r.buyHoldReturnPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="tabular py-2 pr-3">{r.engineTrades}</td>
                      <td className="tabular py-2 pr-3 font-semibold text-ink-primary">{r.composite}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {!scanning && rows.length === 0 && (
        <Card>
          <div className="py-10 text-center">
            <p className="text-sm text-ink-secondary">Spusťte sken a uvidíte, jak přesné naše predikce na jednotlivých akciích jsou.</p>
            <p className="mt-2 text-xs text-ink-muted">
              Rychlý sken projde watchlist + aktuální kandidáty doporučení; celý trh analyzuje všech {STOCK_UNIVERSE.length} akcií
              (~1 s na akcii, výsledky se objevují průběžně).
            </p>
          </div>
        </Card>
      )}

      <p className="text-xs text-ink-muted">
        Přesnost směru = podíl dní, kdy nenulový verdikt správně určil směr ceny o 5 obchodních dní později (poctivá metrika: náhodné
        hádání ≈ 50 %). Demo data jsou statická, proto se výsledky mezi skeny nemění — v ostrém nasazení by se zde odrážel živý trh.
      </p>
    </div>
  );
}
