import clsx from 'clsx';
import { useAppStore, type ViewId } from '../../state/store';

const NAV: { id: ViewId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'stock', label: 'Detail akcie' },
  { id: 'screener', label: 'Screener' },
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'backtest', label: 'Backtesting' },
  { id: 'papertrading', label: 'Paper Trading' },
];

export function Header() {
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const selectedSymbol = useAppStore((s) => s.selectedSymbol);
  const alerts = useAppStore((s) => s.alerts);
  const unreadAlerts = alerts.filter((a) => !a.read).length;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-plane/95 backdrop-blur">
      <div className="flex items-center gap-6 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-accent text-xs font-bold text-plane">Q</span>
          <span className="font-mono text-sm font-bold tracking-widest text-ink-primary">QUANTERM</span>
        </div>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={clsx(
                'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                activeView === item.id ? 'bg-surface-3 text-accent' : 'text-ink-secondary hover:bg-surface-2 hover:text-ink-primary',
              )}
            >
              {item.label}
              {item.id === 'watchlist' && unreadAlerts > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-down px-1 text-[10px] font-bold text-white">
                  {unreadAlerts}
                </span>
              )}
            </button>
          ))}
        </nav>
        {activeView === 'stock' && (
          <div className="hidden items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-1 sm:flex">
            <span className="tabular text-sm font-semibold text-accent">{selectedSymbol}</span>
          </div>
        )}
      </div>
    </header>
  );
}
