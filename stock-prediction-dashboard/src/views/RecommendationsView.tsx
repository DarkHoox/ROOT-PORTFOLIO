import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { getStockProfile } from '../data/mockData';
import { allocatePortfolio, buildAvoidList, selectCandidates } from '../lib/recommendations';
import { assessSymbol, type SymbolAssessment } from '../lib/assessment';
import { useAppStore } from '../state/store';
import { Card } from '../components/common/Card';
import { ConfidenceRing } from '../components/common/ConfidenceRing';
import { Sparkline } from '../components/common/Sparkline';
import { ProfileToggle } from '../components/verdict/ProfileToggle';

const ADVICE_BADGE: Record<string, { label: string; classes: string }> = {
  buy: { label: '▲ KOUPIT', classes: 'bg-up text-white' },
  hold: { label: '◆ DRŽET', classes: 'bg-accent text-plane' },
  sell: { label: '▼ PRODAT', classes: 'bg-down text-white' },
  'stay-out': { label: '● MIMO TRH', classes: 'bg-surface-3 text-ink-secondary' },
};

export function RecommendationsView() {
  const weights = useAppStore((s) => s.weights);
  const traderProfile = useAppStore((s) => s.traderProfile);
  const setTraderProfile = useAppStore((s) => s.setTraderProfile);
  const selectSymbol = useAppStore((s) => s.selectSymbol);
  const paperBuy = useAppStore((s) => s.paperBuy);

  const [capital, setCapital] = useState(10000);
  const [executed, setExecuted] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<Record<string, SymbolAssessment>>({});
  const [scanning, setScanning] = useState(true);
  const [scanCurrent, setScanCurrent] = useState('');

  const candidates = useMemo(() => selectCandidates(weights), [weights]);
  const avoid = useMemo(() => buildAvoidList(weights), [weights]);

  // Progressive deep scan: each candidate gets a walk-forward engine validation
  // (~1s first time, cached after). Cards fill in one by one.
  useEffect(() => {
    let cancelled = false;
    setAssessments({});
    setExecuted(null);
    setScanning(true);
    (async () => {
      for (const c of candidates) {
        if (cancelled) return;
        setScanCurrent(c.symbol);
        await new Promise((r) => setTimeout(r, 30)); // let the progress UI paint
        const a = assessSymbol(getStockProfile(c.symbol), weights);
        if (cancelled) return;
        setAssessments((prev) => ({ ...prev, [c.symbol]: a }));
      }
      if (!cancelled) {
        setScanCurrent('');
        setScanning(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [candidates, weights]);

  const doneCount = Object.keys(assessments).length;
  const { picks, cashPct } = useMemo(
    () => allocatePortfolio(candidates, assessments, capital),
    [candidates, assessments, capital],
  );
  const rejected = candidates.filter((c) => {
    const a = assessments[c.symbol];
    return a && !(a.advice === 'buy' || a.advice === 'hold');
  });
  const avgComposite = picks.length > 0 ? Math.round(picks.reduce((s, p) => s + p.assessment.composite, 0) / picks.length) : 0;

  const executeInPaperTrading = () => {
    let opened = 0;
    for (const pick of picks) {
      if (pick.shares > 0 && pick.shares * pick.price <= useAppStore.getState().paperCash) {
        paperBuy(pick.symbol, pick.shares, pick.price);
        opened += 1;
      }
    }
    setExecuted(`Otevřeno ${opened} pozic ve virtuálním portfoliu — sledujte je v záložce Paper Trading.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-ink-primary">Do čeho investovat</h1>
          <p className="text-xs text-ink-muted">
            Dvoustupňový výběr: snapshot 9 modulů přes celý trh → každý kandidát pak projde walk-forward validací signálního
            enginu. Doporučeny jsou jen tituly, které engine potvrdil.
          </p>
        </div>
        <ProfileToggle value={traderProfile} onChange={setTraderProfile} />
      </div>

      <div className="rounded-md border border-accent-dim/40 bg-accent-dim/10 p-3 text-xs leading-relaxed text-accent">
        ⚠ Toto NENÍ investiční doporučení — technická analýza nad demo daty pro vzdělávací účely. Skóre spolehlivosti je měřené
        walk-forward (bez dopředného nahlížení), přesto minulá úspěšnost nezaručuje budoucí výsledky.
      </div>

      {/* Scan status + summary strip */}
      <Card>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-4">
            <ConfidenceRing value={avgComposite} label="Ø skóre výběru" />
            <div className="text-xs text-ink-secondary">
              <div className="text-sm font-semibold text-ink-primary">
                {scanning ? 'Skenuji trh…' : `${picks.length} potvrzených doporučení`}
              </div>
              {scanning ? (
                <div className="mt-1">
                  analyzuji <span className="tabular font-semibold text-accent">{scanCurrent}</span> ({doneCount}/{candidates.length})
                </div>
              ) : (
                <div className="mt-1">
                  {rejected.length} kandidátů vyřazeno enginem · {cashPct}% kapitálu zůstává v hotovosti
                </div>
              )}
              <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-surface-3">
                <div
                  className={clsx('h-full rounded-full transition-all duration-300', scanning ? 'bg-accent pulse-dot' : 'bg-up')}
                  style={{ width: `${candidates.length > 0 ? (doneCount / candidates.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
          <label className="text-xs text-ink-muted">
            Investovaný kapitál ($)
            <input
              type="number"
              min={100}
              value={capital}
              onChange={(e) => setCapital(Math.max(100, Number(e.target.value)))}
              className="mt-1 block w-36 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink-primary"
            />
          </label>
          {!scanning && picks.length > 0 && (
            <button
              onClick={executeInPaperTrading}
              className="ml-auto rounded-md border border-accent-dim bg-accent-dim/20 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent-dim/40"
            >
              Vyzkoušet portfolio v paper tradingu
            </button>
          )}
        </div>
        {executed && <p className="mt-2 text-xs text-up">✓ {executed}</p>}
      </Card>

      {/* Confirmed picks */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {picks.map((pick, rank) => (
          <Card key={pick.symbol} className="hover:border-border-strong">
            <div className="flex items-start gap-4">
              <ConfidenceRing value={pick.assessment.composite} label="skóre" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-3 text-[11px] font-bold text-accent">
                    {rank + 1}
                  </span>
                  <button onClick={() => selectSymbol(pick.symbol)} className="text-sm font-bold text-ink-primary hover:text-accent">
                    {pick.symbol}
                  </button>
                  <span className={clsx('rounded px-2 py-0.5 text-[10px] font-bold', ADVICE_BADGE[pick.assessment.advice].classes)}>
                    {ADVICE_BADGE[pick.assessment.advice].label}
                  </span>
                  <span className="text-xs text-ink-muted">{pick.name} · {pick.sector}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-ink-secondary">
                    signál {pick.assessment.verdictConfidence}%
                  </span>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-ink-secondary">
                    přesnost směru {pick.assessment.hitRatePct !== null ? `${pick.assessment.hitRatePct}%` : 'n/a'}
                  </span>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-ink-secondary">
                    engine {pick.assessment.engineReturnPct >= 0 ? '+' : ''}
                    {pick.assessment.engineReturnPct.toFixed(1)}% / B&H {pick.assessment.buyHoldReturnPct >= 0 ? '+' : ''}
                    {pick.assessment.buyHoldReturnPct.toFixed(1)}%
                  </span>
                </div>
                <div className="tabular mt-2 text-xs text-ink-secondary">
                  <span className="font-semibold text-ink-primary">{pick.allocationPct}%</span> · $
                  {pick.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  {pick.shares > 0 ? ` · ${pick.shares} ks` : ''} @ ${pick.price.toFixed(2)} · SL{' '}
                  <span className="text-down">${pick.stopLoss.toFixed(2)}</span> · cíl{' '}
                  <span className="text-up">${pick.target.toFixed(2)}</span>
                </div>
                <p className="mt-1.5 truncate text-xs text-ink-muted" title={pick.reason}>
                  {pick.reason}
                  {pick.earningsDaysAway <= 7 && <span className="ml-1 text-down">⚠ earnings za {pick.earningsDaysAway} d</span>}
                </p>
              </div>
              <div className="hidden sm:block">
                <Sparkline values={pick.spark} width={80} height={26} />
              </div>
            </div>
          </Card>
        ))}
        {/* Pending skeletons while scanning */}
        {scanning &&
          candidates
            .filter((c) => !assessments[c.symbol])
            .map((c) => (
              <Card key={c.symbol} className="opacity-50">
                <div className="flex items-center gap-4">
                  <div className="h-[68px] w-[68px] animate-pulse rounded-full border-4 border-surface-3" />
                  <div>
                    <div className="text-sm font-bold text-ink-primary">{c.symbol}</div>
                    <div className="text-xs text-ink-muted">{c.name} · čeká na validaci enginem…</div>
                  </div>
                </div>
              </Card>
            ))}
      </div>

      {!scanning && picks.length === 0 && (
        <Card>
          <p className="py-6 text-center text-sm text-ink-muted">
            Žádný kandidát neprošel validací signálního enginu — systém aktuálně nedoporučuje nic kupovat. I to je informace.
          </p>
        </Card>
      )}

      {/* Engine-rejected candidates — shown for honesty */}
      {rejected.length > 0 && (
        <Card
          title="Vyřazeno hloubkovou validací"
          subtitle="Snapshot vypadal růstově, ale walk-forward engine nákup nepotvrdil — přesně tyhle falešné signály filtr odstraňuje"
        >
          <div className="divide-y divide-border">
            {rejected.map((c) => {
              const a = assessments[c.symbol];
              return (
                <div key={c.symbol} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 first:pt-0 last:pb-0">
                  <button onClick={() => selectSymbol(c.symbol)} className="w-14 text-sm font-bold text-ink-primary hover:text-accent">
                    {c.symbol}
                  </button>
                  <span className={clsx('rounded px-2 py-0.5 text-[10px] font-bold', ADVICE_BADGE[a.advice].classes)}>
                    {ADVICE_BADGE[a.advice].label}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-ink-muted" title={a.adviceReason}>
                    {a.adviceReason}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {avoid.length > 0 && (
        <Card title="Čemu se teď vyhnout" subtitle="Nejsilnější prodejní signály — pro poctivost ukazujeme i druhou stranu">
          <div className="divide-y divide-border">
            {avoid.map((a) => (
              <div key={a.symbol} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 first:pt-0 last:pb-0">
                <button onClick={() => selectSymbol(a.symbol)} className="w-14 text-sm font-bold text-ink-primary hover:text-accent">
                  {a.symbol}
                </button>
                <span className="tabular text-sm text-down">
                  {a.confidence}% ({a.bearishCount}/9 ▼)
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-ink-secondary" title={a.reason}>
                  {a.reason}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <p className="text-xs text-ink-muted">
        Skóre spolehlivosti = 40 % aktuální síla signálu + 40 % směrová přesnost predikcí za posledních 6 měsíců (verdikt vs. skutečný
        pohyb o 5 dní později) + 20 % náskok signálního enginu proti buy & hold. Profil: {traderProfile === 'shortterm' ? 'krátkodobý trader' : 'dlouhodobý investor'}. Průběžnou úspěšnost celého systému sledujte v záložce Výkonnost.
      </p>
    </div>
  );
}
