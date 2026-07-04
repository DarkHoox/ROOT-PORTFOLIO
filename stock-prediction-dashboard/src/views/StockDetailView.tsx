import { useMemo, useState } from 'react';
import { getStockProfile } from '../data/mockData';
import { resampleToHourlyApprox, resampleToWeekly } from '../data/generateSeries';
import { STOCK_UNIVERSE } from '../data/symbols';
import { candlesForRange } from '../lib/rangeUtils';
import { computeAllModules } from '../lib/modules';
import { computeVerdict } from '../lib/modules/aggregate';
import { useAppStore } from '../state/store';
import { CandlestickChart, type IndicatorToggles } from '../components/stock/CandlestickChart';
import { RangeSelector, type RangeId } from '../components/stock/RangeSelector';
import { IndicatorToggleBar } from '../components/stock/IndicatorToggleBar';
import { KeyStats } from '../components/stock/KeyStats';
import { ModuleGrid } from '../components/modules/ModuleGrid';
import { VerdictPanel } from '../components/verdict/VerdictPanel';
import { RiskPanel } from '../components/risk/RiskPanel';
import { Card } from '../components/common/Card';

const DEFAULT_INDICATORS: IndicatorToggles = { sma20: true, sma50: true, sma200: false, ema20: false, bollinger: false };

export function StockDetailView() {
  const selectedSymbol = useAppStore((s) => s.selectedSymbol);
  const selectSymbol = useAppStore((s) => s.selectSymbol);
  const watchlist = useAppStore((s) => s.watchlist);
  const toggleWatchlist = useAppStore((s) => s.toggleWatchlist);
  const traderProfile = useAppStore((s) => s.traderProfile);
  const setTraderProfile = useAppStore((s) => s.setTraderProfile);
  const weights = useAppStore((s) => s.weights);
  const setWeight = useAppStore((s) => s.setWeight);
  const resetWeightsToProfile = useAppStore((s) => s.resetWeightsToProfile);

  const [range, setRange] = useState<RangeId>('1R');
  const [indicators, setIndicators] = useState<IndicatorToggles>(DEFAULT_INDICATORS);

  const profile = useMemo(() => getStockProfile(selectedSymbol), [selectedSymbol]);
  const displayCandles = useMemo(() => candlesForRange(profile.seriesDaily, range), [profile, range]);
  const indicatorSource = useMemo(() => {
    if (range === '1D' || range === '1T') return resampleToHourlyApprox(profile.seriesDaily);
    if (range === '5R') return resampleToWeekly(profile.seriesDaily);
    return profile.seriesDaily;
  }, [profile, range]);

  const modules = useMemo(() => computeAllModules(profile), [profile]);
  const verdict = useMemo(() => computeVerdict(modules, weights), [modules, weights]);

  const last = profile.seriesDaily[profile.seriesDaily.length - 1];
  const prev = profile.seriesDaily[profile.seriesDaily.length - 2];
  const changePct = ((last.close - prev.close) / prev.close) * 100;
  const isWatched = watchlist.includes(selectedSymbol);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedSymbol}
          onChange={(e) => selectSymbol(e.target.value)}
          className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-sm font-semibold text-ink-primary"
        >
          {STOCK_UNIVERSE.map((s) => (
            <option key={s.symbol} value={s.symbol}>
              {s.symbol} — {s.name}
            </option>
          ))}
        </select>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="tabular text-2xl font-bold text-ink-primary">${last.close.toFixed(2)}</span>
            <span className={`tabular text-sm font-semibold ${changePct >= 0 ? 'text-up' : 'text-down'}`}>
              {changePct >= 0 ? '+' : ''}
              {changePct.toFixed(2)}%
            </span>
          </div>
          <div className="text-xs text-ink-muted">
            {profile.meta.name} · {profile.meta.sector} · {profile.meta.exchange}
          </div>
        </div>
        <button
          onClick={() => toggleWatchlist(selectedSymbol)}
          className={`ml-auto rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
            isWatched ? 'border-accent-dim bg-accent-dim/20 text-accent' : 'border-border text-ink-secondary hover:text-ink-primary'
          }`}
        >
          {isWatched ? '★ Ve watchlistu' : '☆ Přidat na watchlist'}
        </button>
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <IndicatorToggleBar value={indicators} onChange={setIndicators} />
          <RangeSelector value={range} onChange={setRange} />
        </div>
        <CandlestickChart candles={displayCandles} indicators={indicators} indicatorSource={indicatorSource} />
      </Card>

      <KeyStats profile={profile} />

      <VerdictPanel
        verdict={verdict}
        traderProfile={traderProfile}
        onProfileChange={setTraderProfile}
        weights={weights}
        onWeightChange={setWeight}
        onResetWeights={resetWeightsToProfile}
      />

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">9 predikčních modulů</h2>
        <ModuleGrid modules={modules} />
      </div>

      <RiskPanel profile={profile} />
    </div>
  );
}
