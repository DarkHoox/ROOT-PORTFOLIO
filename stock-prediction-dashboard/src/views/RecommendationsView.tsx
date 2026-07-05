import { useMemo, useState } from 'react';
import { buildInvestmentPlan } from '../lib/recommendations';
import { useAppStore } from '../state/store';
import { Card } from '../components/common/Card';
import { Sparkline } from '../components/common/Sparkline';
import { ProfileToggle } from '../components/verdict/ProfileToggle';

export function RecommendationsView() {
  const weights = useAppStore((s) => s.weights);
  const traderProfile = useAppStore((s) => s.traderProfile);
  const setTraderProfile = useAppStore((s) => s.setTraderProfile);
  const selectSymbol = useAppStore((s) => s.selectSymbol);
  const paperBuy = useAppStore((s) => s.paperBuy);
  const paperCash = useAppStore((s) => s.paperCash);

  const [capital, setCapital] = useState(10000);
  const [executed, setExecuted] = useState<string | null>(null);

  const plan = useMemo(() => buildInvestmentPlan(weights, capital), [weights, capital]);

  const executeInPaperTrading = () => {
    let opened = 0;
    for (const pick of plan.picks) {
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
            Návrh portfolia z akcií s růstovým agregovaným signálem — řazeno podle skóre důvěry, max. 2 tituly na sektor, váha podle
            důvěry dělené betou (rizikovější tituly dostanou méně).
          </p>
        </div>
        <ProfileToggle value={traderProfile} onChange={setTraderProfile} />
      </div>

      <div className="rounded-md border border-accent-dim/40 bg-accent-dim/10 p-3 text-xs leading-relaxed text-accent">
        ⚠ Toto NENÍ investiční doporučení. Jde o výstup technické analýzy nad demonstračními daty pro vzdělávací účely. Systém se
        prokazatelně mýlí — ověřte si jeho úspěšnost na dané akcii v záložce Backtesting, než jakémukoli signálu uvěříte.
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-xs text-ink-muted">
            Investovaný kapitál ($)
            <input
              type="number"
              min={100}
              value={capital}
              onChange={(e) => setCapital(Math.max(100, Number(e.target.value)))}
              className="mt-1 block w-40 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink-primary"
            />
          </label>
          <div className="flex-1 text-xs text-ink-secondary">
            {plan.picks.length > 0 ? (
              <>
                Navrženo <span className="font-semibold text-ink-primary">{plan.picks.length} pozic</span> ·{' '}
                {100 - plan.cashPct}% kapitálu · <span className="font-semibold text-ink-primary">{plan.cashPct}%</span> zůstává
                jako hotovostní rezerva
              </>
            ) : (
              'Aktuálně žádná akcie nemá dostatečně silný růstový signál — systém nedoporučuje nic kupovat.'
            )}
          </div>
          {plan.picks.length > 0 && (
            <button
              onClick={executeInPaperTrading}
              disabled={paperCash <= 0}
              className="rounded-md border border-accent-dim bg-accent-dim/20 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent-dim/40 disabled:opacity-40"
            >
              Vyzkoušet celé portfolio v paper tradingu
            </button>
          )}
        </div>
        {executed && <p className="mt-2 text-xs text-up">✓ {executed}</p>}
      </Card>

      <div className="space-y-3">
        {plan.picks.map((pick, rank) => (
          <Card key={pick.symbol} className="hover:border-border-strong">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex min-w-[180px] items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-sm font-bold text-accent">
                  {rank + 1}
                </span>
                <div>
                  <button onClick={() => selectSymbol(pick.symbol)} className="text-sm font-bold text-ink-primary hover:text-accent">
                    {pick.symbol}
                  </button>
                  <div className="text-xs text-ink-muted">
                    {pick.name} · {pick.sector}
                  </div>
                </div>
              </div>

              <Sparkline values={pick.spark} />

              <div className="min-w-[90px]">
                <div className="text-[11px] uppercase tracking-wide text-ink-muted">Důvěra</div>
                <div className="tabular text-sm font-semibold text-up">
                  {pick.confidence}% <span className="font-normal text-ink-muted">({pick.bullishCount}/9 ▲)</span>
                </div>
              </div>

              <div className="min-w-[130px]">
                <div className="text-[11px] uppercase tracking-wide text-ink-muted">Alokace</div>
                <div className="tabular text-sm font-semibold text-ink-primary">
                  {pick.allocationPct}% · ${pick.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  {pick.shares > 0 ? ` · ${pick.shares} ks` : ' · pod cenu 1 ks'}
                </div>
              </div>

              <div className="min-w-[210px]">
                <div className="text-[11px] uppercase tracking-wide text-ink-muted">Vstup / Stop-loss / Cíl (2×ATR / 4×ATR)</div>
                <div className="tabular text-sm">
                  <span className="text-ink-primary">${pick.price.toFixed(2)}</span>
                  {' / '}
                  <span className="text-down">${pick.stopLoss.toFixed(2)}</span>
                  {' / '}
                  <span className="text-up">${pick.target.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <p className="mt-2 border-t border-border pt-2 text-xs text-ink-secondary">
              <span className="font-semibold text-ink-primary">Proč:</span> {pick.reason}
              {pick.earningsDaysAway <= 7 && (
                <span className="ml-2 text-down">⚠ earnings za {pick.earningsDaysAway} dní — zvýšená volatilita</span>
              )}
            </p>
          </Card>
        ))}
      </div>

      {plan.avoid.length > 0 && (
        <Card title="Čemu se teď vyhnout" subtitle="Nejsilnější prodejní signály — pro poctivost ukazujeme i druhou stranu">
          <div className="divide-y divide-border">
            {plan.avoid.map((a) => (
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
        Jak výběr funguje: každá akcie projde všemi 9 moduly, vážený verdikt se řídí vaším profilem ({traderProfile === 'shortterm' ? 'krátkodobý trader — důraz na momentum a objem' : 'dlouhodobý investor — důraz na trend a fundamenty'}) a případně ručně upravenými vahami z detailu akcie. Do výběru jdou jen tituly se signálem růstu, max. dva na sektor, jedna pozice max. 35 % kapitálu.
      </p>
    </div>
  );
}
