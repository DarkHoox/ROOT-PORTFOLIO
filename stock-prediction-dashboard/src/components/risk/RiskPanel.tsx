import { useMemo, useState } from 'react';
import type { StockProfile } from '../../types/market';
import { atr } from '../../lib/indicators/volatility';
import { lastValid } from '../../lib/indicators/movingAverages';
import { Card } from '../common/Card';
import { StatTile } from '../common/StatTile';

export function RiskPanel({ profile }: { profile: StockProfile }) {
  const [capital, setCapital] = useState(10000);
  const [maxRiskPct, setMaxRiskPct] = useState(1);
  const [atrMultiplier, setAtrMultiplier] = useState(2);
  const [rrMultiple, setRrMultiple] = useState(2);

  const entry = profile.seriesDaily[profile.seriesDaily.length - 1].close;
  const atrVal = useMemo(() => lastValid(atr(profile.seriesDaily, 14)) ?? entry * 0.02, [profile, entry]);

  const riskPerShare = atrMultiplier * atrVal;
  const stopLoss = entry - riskPerShare;
  const target = entry + riskPerShare * rrMultiple;
  const riskAmount = capital * (maxRiskPct / 100);
  const shares = riskPerShare > 0 ? Math.floor(riskAmount / riskPerShare) : 0;
  const positionValue = shares * entry;
  const positionPctOfCapital = capital > 0 ? (positionValue / capital) * 100 : 0;

  const atrRelative = (atrVal / entry) * 100;
  const highVol = atrRelative > 4;
  const earningsSoon = profile.earnings.nextEarningsDaysAway <= 7;

  return (
    <Card title="Risk Management" subtitle="Návrh stop-lossu, poměr risk/reward a velikost pozice podle ATR">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <label className="block text-xs text-ink-muted">
            Kapitál ($)
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink-primary"
            />
          </label>
          <label className="block text-xs text-ink-muted">
            Max. riziko na obchod (%)
            <input
              type="number"
              step={0.1}
              value={maxRiskPct}
              onChange={(e) => setMaxRiskPct(Math.max(0.1, Number(e.target.value)))}
              className="mt-1 w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink-primary"
            />
          </label>
          <label className="block text-xs text-ink-muted">
            ATR násobitel pro stop-loss
            <input
              type="number"
              step={0.5}
              value={atrMultiplier}
              onChange={(e) => setAtrMultiplier(Math.max(0.5, Number(e.target.value)))}
              className="mt-1 w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink-primary"
            />
          </label>
          <label className="block text-xs text-ink-muted">
            Cílový poměr risk/reward (1:X)
            <input
              type="number"
              step={0.5}
              value={rrMultiple}
              onChange={(e) => setRrMultiple(Math.max(0.5, Number(e.target.value)))}
              className="mt-1 w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink-primary"
            />
          </label>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Vstupní cena" value={`$${entry.toFixed(2)}`} />
            <StatTile label="Navržený stop-loss" value={`$${stopLoss.toFixed(2)}`} tone="down" />
            <StatTile label={`Cílová cena (1:${rrMultiple})`} value={`$${target.toFixed(2)}`} tone="up" />
            <StatTile label="Risk/Reward" value={`1 : ${rrMultiple.toFixed(1)}`} />
            <StatTile label="Velikost pozice" value={`${shares} ks`} />
            <StatTile label="Hodnota pozice" value={`$${positionValue.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${positionPctOfCapital.toFixed(0)}%)`} />
          </div>

          {(highVol || earningsSoon) && (
            <div className="space-y-1.5 rounded-md border border-down/30 bg-down-dim/40 p-3 text-xs text-ink-secondary">
              {highVol && <div>⚠ ATR je {atrRelative.toFixed(1)}% ceny — nadprůměrně volatilní titul, zvažte menší pozici.</div>}
              {earningsSoon && (
                <div>⚠ Earnings za {profile.earnings.nextEarningsDaysAway} dní — očekávejte zvýšenou volatilitu kolem zveřejnění.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
