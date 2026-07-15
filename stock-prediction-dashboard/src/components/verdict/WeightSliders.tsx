import type { ModuleId, ModuleWeights } from '../../types/market';
import { MODULE_ORDER } from '../../lib/modules/aggregate';

const MODULE_LABELS: Record<ModuleId, string> = {
  trend: 'Trend',
  momentum: 'Momentum',
  volatility: 'Volatilita',
  volume: 'Objem',
  supportResistance: 'Support/Rezistence',
  candlestick: 'Svíčkové formace',
  fundamentals: 'Fundamenty',
  sentiment: 'Sentiment',
  confluence: 'Konfluence',
};

export function WeightSliders({
  weights,
  onChange,
  onReset,
}: {
  weights: ModuleWeights;
  onChange: (id: ModuleId, value: number) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Váhy modulů</span>
        <button onClick={onReset} className="text-xs font-medium text-accent hover:underline">
          Reset na profil
        </button>
      </div>
      {MODULE_ORDER.map((id) => (
        <div key={id} className="grid grid-cols-[110px_1fr_32px] items-center gap-3">
          <span className="text-xs text-ink-secondary">{MODULE_LABELS[id]}</span>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={weights[id]}
            onChange={(e) => onChange(id, parseFloat(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-accent"
          />
          <span className="tabular text-right text-xs text-ink-muted">{weights[id].toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}
