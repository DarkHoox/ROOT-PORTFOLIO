import { useMemo } from 'react';
import { getEconCalendar } from '../../data/mockData';
import { Card } from '../common/Card';
import clsx from 'clsx';

const IMPORTANCE_LABEL: Record<string, string> = { high: 'Vysoká', medium: 'Střední', low: 'Nízká' };
const CATEGORY_ICON: Record<string, string> = { fed: '🏛', inflation: '📈', earnings: '💼', jobs: '👷', other: '🗓' };

export function EconCalendar() {
  const events = useMemo(() => getEconCalendar(), []);

  return (
    <Card title="Ekonomický kalendář" subtitle="Dnešní události — Fed, inflace, earnings">
      <div className="divide-y divide-border">
        {events.map((e, i) => (
          <div key={i} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
            <span className="tabular w-20 shrink-0 text-xs text-ink-muted">{e.time}</span>
            <span aria-hidden>{CATEGORY_ICON[e.category]}</span>
            <span className="flex-1 text-sm text-ink-primary">{e.title}</span>
            <span
              className={clsx(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                e.importance === 'high' && 'bg-down-dim text-down',
                e.importance === 'medium' && 'bg-accent-dim/30 text-accent',
                e.importance === 'low' && 'bg-neutral-dim text-ink-muted',
              )}
            >
              {IMPORTANCE_LABEL[e.importance]}
            </span>
            {e.forecast && <span className="tabular hidden w-32 text-right text-xs text-ink-secondary sm:block">odh. {e.forecast}</span>}
          </div>
        ))}
      </div>
    </Card>
  );
}
