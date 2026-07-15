import { useMemo } from 'react';
import { getIndexQuotes } from '../../data/mockData';
import clsx from 'clsx';

export function IndicesStrip() {
  const indices = useMemo(() => getIndexQuotes(), []);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {indices.map((idx) => (
        <div key={idx.symbol} className="rounded-lg border border-border bg-surface px-4 py-3">
          <div className="text-xs text-ink-muted">{idx.name}</div>
          <div className="tabular mt-1 text-lg font-semibold text-ink-primary">
            {idx.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </div>
          <div className={clsx('tabular text-sm font-medium', idx.changePct >= 0 ? 'text-up' : 'text-down')}>
            {idx.changePct >= 0 ? '▲' : '▼'} {idx.changePct >= 0 ? '+' : ''}
            {idx.changePct.toFixed(2)}%
          </div>
        </div>
      ))}
    </div>
  );
}
