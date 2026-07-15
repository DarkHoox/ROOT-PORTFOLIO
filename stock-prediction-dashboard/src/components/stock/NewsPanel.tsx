import clsx from 'clsx';
import type { NewsItem } from '../../types/market';
import { Card } from '../common/Card';

const TONE_CONFIG: Record<NewsItem['tone'], { label: string; classes: string }> = {
  positive: { label: 'pozitivní', classes: 'bg-up-dim text-up' },
  negative: { label: 'negativní', classes: 'bg-down-dim text-down' },
  neutral: { label: 'neutrální', classes: 'bg-neutral-dim text-ink-secondary' },
};

/** Headlines the sentiment module scores — shown so its inputs are inspectable. */
export function NewsPanel({ news }: { news: NewsItem[] }) {
  return (
    <Card title="Zprávy a titulky" subtitle="Vstupní data modulu Sentiment — tón každého titulku">
      <div className="divide-y divide-border">
        {news.map((n) => (
          <div key={n.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className={clsx('mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', TONE_CONFIG[n.tone].classes)}>
              {TONE_CONFIG[n.tone].label}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink-primary">{n.headline}</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {n.source} · před {n.hoursAgo} h
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
