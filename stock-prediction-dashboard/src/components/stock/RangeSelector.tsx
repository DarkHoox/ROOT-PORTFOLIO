import clsx from 'clsx';

export type RangeId = '1D' | '1T' | '1M' | '1R' | '5R';
export const RANGES: RangeId[] = ['1D', '1T', '1M', '1R', '5R'];

export function RangeSelector({ value, onChange }: { value: RangeId; onChange: (r: RangeId) => void }) {
  return (
    <div className="flex gap-1 rounded-md border border-border bg-surface-2 p-0.5">
      {RANGES.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={clsx(
            'rounded px-2.5 py-1 text-xs font-semibold transition-colors',
            value === r ? 'bg-accent text-plane' : 'text-ink-secondary hover:text-ink-primary',
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
