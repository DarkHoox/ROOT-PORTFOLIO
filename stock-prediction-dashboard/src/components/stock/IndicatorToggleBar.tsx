import clsx from 'clsx';
import type { IndicatorToggles } from './CandlestickChart';

const LABELS: { key: keyof IndicatorToggles; label: string; color: string }[] = [
  { key: 'sma20', label: 'SMA 20', color: '#3987e5' },
  { key: 'sma50', label: 'SMA 50', color: '#f0a202' },
  { key: 'sma200', label: 'SMA 200', color: '#d55181' },
  { key: 'ema20', label: 'EMA 20', color: '#9085e9' },
  { key: 'bollinger', label: 'Bollinger Bands', color: '#9aa1ac' },
  { key: 'levels', label: 'Úrovně S/R', color: '#1fae5d' },
  { key: 'rsi', label: 'RSI panel', color: '#9085e9' },
];

export function IndicatorToggleBar({ value, onChange }: { value: IndicatorToggles; onChange: (v: IndicatorToggles) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {LABELS.map((item) => {
        const active = value[item.key];
        return (
          <button
            key={item.key}
            onClick={() => onChange({ ...value, [item.key]: !active })}
            className={clsx(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              active ? 'border-border-strong bg-surface-3 text-ink-primary' : 'border-border text-ink-muted hover:text-ink-secondary',
            )}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? item.color : '#5b6270' }} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
