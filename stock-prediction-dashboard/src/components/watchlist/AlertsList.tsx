import type { WatchlistAlert } from '../../types/market';

const TYPE_ICON: Record<WatchlistAlert['type'], string> = {
  'signal-change': '🔄',
  'level-breakout': '⚡',
  'earnings-soon': '📅',
};

export function AlertsList({ alerts, onDismiss }: { alerts: WatchlistAlert[]; onDismiss: (id: string) => void }) {
  if (alerts.length === 0) {
    return <p className="text-sm text-ink-muted">Žádné aktivní alerty.</p>;
  }
  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 rounded-md border border-border bg-surface-2 p-3"
        >
          <span aria-hidden className="text-lg">
            {TYPE_ICON[a.type]}
          </span>
          <div className="flex-1">
            <div className="text-sm font-medium text-ink-primary">
              {a.symbol} <span className="font-normal text-ink-secondary">— {a.message}</span>
            </div>
            <div className="mt-0.5 text-xs text-ink-muted">{a.time}</div>
          </div>
          <button onClick={() => onDismiss(a.id)} className="text-xs text-ink-muted hover:text-ink-primary">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
