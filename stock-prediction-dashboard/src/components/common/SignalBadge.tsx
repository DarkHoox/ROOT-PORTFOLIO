import type { Signal } from '../../types/market';
import clsx from 'clsx';

const CONFIG: Record<Signal, { label: string; icon: string; classes: string }> = {
  up: { label: 'Růst', icon: '▲', classes: 'bg-up-dim text-up border-up/30' },
  down: { label: 'Pokles', icon: '▼', classes: 'bg-down-dim text-down border-down/30' },
  neutral: { label: 'Neutrálně', icon: '●', classes: 'bg-neutral-dim text-ink-secondary border-border-strong' },
};

export function SignalBadge({ signal, size = 'md' }: { signal: Signal; size?: 'sm' | 'md' | 'lg' }) {
  const cfg = CONFIG[signal];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap',
        cfg.classes,
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-sm',
        size === 'lg' && 'px-4 py-1.5 text-base',
      )}
    >
      <span aria-hidden>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}
