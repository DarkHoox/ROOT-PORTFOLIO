import clsx from 'clsx';
import type { EngineResult, AdviceAction } from '../../lib/signalEngine';
import { Card } from '../common/Card';

const ACTION_CONFIG: Record<AdviceAction, { label: string; icon: string; classes: string }> = {
  buy: { label: 'KOUPIT', icon: '▲', classes: 'bg-up text-white' },
  hold: { label: 'DRŽET', icon: '◆', classes: 'bg-accent text-plane' },
  sell: { label: 'PRODAT', icon: '▼', classes: 'bg-down text-white' },
  'stay-out': { label: 'MIMO TRH', icon: '●', classes: 'bg-surface-3 text-ink-secondary' },
};

function fmtDate(t: number): string {
  return new Date(t * 1000).toLocaleDateString('cs-CZ');
}

export function TradeSignalCard({ engine, loading }: { engine: EngineResult | null; loading: boolean }) {
  if (loading || !engine) {
    return (
      <Card title="Obchodní pokyn" subtitle="Signální engine — kdy koupit a kdy prodat">
        <div className="py-6 text-center text-sm text-ink-muted">Počítám walk-forward signály za posledních 12 měsíců…</div>
      </Card>
    );
  }

  const cfg = ACTION_CONFIG[engine.advice.action];
  const recentEvents = [...engine.events].slice(-4).reverse();

  return (
    <Card
      title="Obchodní pokyn"
      subtitle="Signální engine — potvrzený verdikt + trend filtr + svíčkové formace + trailing stop (2,5×ATR)"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex shrink-0 flex-col items-start gap-2">
          <span className={clsx('inline-flex items-center gap-2 rounded-md px-4 py-2 text-base font-bold', cfg.classes)}>
            <span aria-hidden>{cfg.icon}</span>
            {cfg.label}
          </span>
          {engine.advice.stopLoss !== null && (
            <div className="tabular text-xs text-ink-secondary">
              stop-loss: <span className="font-semibold text-down">${engine.advice.stopLoss.toFixed(2)}</span>
            </div>
          )}
        </div>
        <p className="flex-1 text-sm leading-relaxed text-ink-secondary">{engine.advice.reason}</p>
      </div>

      {recentEvents.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Poslední signály (zobrazené i jako šipky v grafu)
          </div>
          <div className="space-y-1.5">
            {recentEvents.map((e, i) => (
              <div key={i} className="flex items-baseline gap-2 text-xs">
                <span className={clsx('w-14 shrink-0 font-bold', e.type === 'buy' ? 'text-up' : 'text-down')}>
                  {e.type === 'buy' ? '▲ NÁKUP' : '▼ PRODEJ'}
                </span>
                <span className="tabular w-20 shrink-0 text-ink-muted">{fmtDate(e.time)}</span>
                <span className="tabular w-16 shrink-0 text-ink-secondary">${e.price.toFixed(2)}</span>
                <span className="min-w-0 flex-1 truncate text-ink-muted" title={e.reason}>
                  {e.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
