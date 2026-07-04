import { useMemo } from 'react';
import { getAllProfiles } from '../../data/mockData';
import { Card } from '../common/Card';
import { useAppStore } from '../../state/store';
import clsx from 'clsx';

export function TopMovers() {
  const selectSymbol = useAppStore((s) => s.selectSymbol);

  const { gainers, losers } = useMemo(() => {
    const profiles = getAllProfiles();
    const withChange = profiles.map((p) => {
      const c = p.seriesDaily;
      const last = c[c.length - 1].close;
      const prev = c[c.length - 2].close;
      return { symbol: p.meta.symbol, name: p.meta.name, price: last, changePct: ((last - prev) / prev) * 100 };
    });
    const sorted = [...withChange].sort((a, b) => b.changePct - a.changePct);
    return { gainers: sorted.slice(0, 6), losers: sorted.slice(-6).reverse() };
  }, []);

  const Row = ({ item }: { item: { symbol: string; name: string; price: number; changePct: number } }) => (
    <button
      onClick={() => selectSymbol(item.symbol)}
      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-surface-2"
    >
      <div>
        <div className="text-sm font-semibold text-ink-primary">{item.symbol}</div>
        <div className="truncate text-xs text-ink-muted max-w-[140px]">{item.name}</div>
      </div>
      <div className="text-right">
        <div className="tabular text-sm text-ink-secondary">${item.price.toFixed(2)}</div>
        <div className={clsx('tabular text-xs font-semibold', item.changePct >= 0 ? 'text-up' : 'text-down')}>
          {item.changePct >= 0 ? '+' : ''}
          {item.changePct.toFixed(2)}%
        </div>
      </div>
    </button>
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card title="Top Gainers">
        <div className="space-y-0.5">
          {gainers.map((g) => (
            <Row key={g.symbol} item={g} />
          ))}
        </div>
      </Card>
      <Card title="Top Losers">
        <div className="space-y-0.5">
          {losers.map((l) => (
            <Row key={l.symbol} item={l} />
          ))}
        </div>
      </Card>
    </div>
  );
}
