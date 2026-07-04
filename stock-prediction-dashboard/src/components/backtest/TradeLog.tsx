import clsx from 'clsx';
import type { BacktestTrade } from '../../lib/backtest';

function fmtDate(t: number): string {
  return new Date(t * 1000).toLocaleDateString('cs-CZ');
}

export function TradeLog({ trades }: { trades: BacktestTrade[] }) {
  if (trades.length === 0) {
    return <p className="text-sm text-ink-muted">Za dané období nevznikl žádný obchod.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-border text-ink-muted">
            <th className="py-2 pr-3 font-medium">Vstup</th>
            <th className="py-2 pr-3 font-medium">Výstup</th>
            <th className="py-2 pr-3 font-medium">Směr</th>
            <th className="py-2 pr-3 font-medium">Vstupní cena</th>
            <th className="py-2 pr-3 font-medium">Výstupní cena</th>
            <th className="py-2 pr-3 font-medium">Dní</th>
            <th className="py-2 pr-3 font-medium">Výsledek</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {trades.map((t, i) => (
            <tr key={i}>
              <td className="tabular py-1.5 pr-3 text-ink-secondary">{fmtDate(t.entryTime)}</td>
              <td className="tabular py-1.5 pr-3 text-ink-secondary">{fmtDate(t.exitTime)}</td>
              <td className="py-1.5 pr-3 text-ink-secondary">{t.side === 'long' ? 'Long' : 'Short'}</td>
              <td className="tabular py-1.5 pr-3 text-ink-secondary">${t.entryPrice.toFixed(2)}</td>
              <td className="tabular py-1.5 pr-3 text-ink-secondary">${t.exitPrice.toFixed(2)}</td>
              <td className="tabular py-1.5 pr-3 text-ink-secondary">{t.holdingDays}</td>
              <td className={clsx('tabular py-1.5 pr-3 font-semibold', t.win ? 'text-up' : 'text-down')}>
                {t.returnPct >= 0 ? '+' : ''}
                {t.returnPct.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
