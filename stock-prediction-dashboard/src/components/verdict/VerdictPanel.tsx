import { useState } from 'react';
import type { ModuleId, ModuleWeights, TraderProfile, Verdict } from '../../types/market';
import { Card } from '../common/Card';
import { SignalBadge } from '../common/SignalBadge';
import { ProfileToggle } from './ProfileToggle';
import { WeightSliders } from './WeightSliders';

export function VerdictPanel({
  verdict,
  traderProfile,
  onProfileChange,
  weights,
  onWeightChange,
  onResetWeights,
}: {
  verdict: Verdict;
  traderProfile: TraderProfile;
  onProfileChange: (p: TraderProfile) => void;
  weights: ModuleWeights;
  onWeightChange: (id: ModuleId, value: number) => void;
  onResetWeights: () => void;
}) {
  const [showWeights, setShowWeights] = useState(false);
  const total = verdict.bullishCount + verdict.bearishCount + verdict.neutralCount;

  return (
    <Card
      title="Agregovaný verdikt"
      subtitle="Vážený průměr všech 9 modulů"
      action={<ProfileToggle value={traderProfile} onChange={onProfileChange} />}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex flex-1 items-center gap-4">
          <SignalBadge signal={verdict.signal} size="lg" />
          <div>
            <div className="tabular text-2xl font-bold text-ink-primary">{verdict.confidence}%</div>
            <div className="text-xs text-ink-muted">skóre důvěry</div>
          </div>
        </div>
        <div className="flex-[2]">
          <p className="text-sm leading-relaxed text-ink-secondary">{verdict.summary}</p>
          <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-surface-3">
            <div className="bg-up" style={{ width: `${(verdict.bullishCount / total) * 100}%` }} />
            <div className="bg-neutral" style={{ width: `${(verdict.neutralCount / total) * 100}%` }} />
            <div className="bg-down" style={{ width: `${(verdict.bearishCount / total) * 100}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-ink-muted">
            <span>{verdict.bullishCount} růst</span>
            <span>{verdict.neutralCount} neutrálně</span>
            <span>{verdict.bearishCount} pokles</span>
          </div>
        </div>
      </div>
      <button onClick={() => setShowWeights((v) => !v)} className="mt-4 text-xs font-semibold text-accent hover:underline">
        {showWeights ? '▾ Skrýt nastavení vah' : '▸ Upravit váhy modulů ručně'}
      </button>
      {showWeights && (
        <div className="mt-3 border-t border-border pt-3">
          <WeightSliders weights={weights} onChange={onWeightChange} onReset={onResetWeights} />
        </div>
      )}
    </Card>
  );
}
