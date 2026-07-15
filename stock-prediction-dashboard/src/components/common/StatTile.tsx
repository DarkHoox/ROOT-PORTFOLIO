import clsx from 'clsx';

export function StatTile({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'up' | 'down' }) {
  return (
    <div className="rounded-md border border-border bg-surface-2 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</div>
      <div
        className={clsx(
          'tabular mt-0.5 text-sm font-semibold',
          tone === 'up' && 'text-up',
          tone === 'down' && 'text-down',
          tone === 'default' && 'text-ink-primary',
        )}
      >
        {value}
      </div>
    </div>
  );
}
