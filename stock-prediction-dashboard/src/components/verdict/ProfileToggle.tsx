import clsx from 'clsx';
import type { TraderProfile } from '../../types/market';

export function ProfileToggle({ value, onChange }: { value: TraderProfile; onChange: (p: TraderProfile) => void }) {
  return (
    <div className="flex rounded-md border border-border bg-surface-2 p-0.5 text-xs font-semibold">
      <button
        onClick={() => onChange('shortterm')}
        className={clsx('rounded px-3 py-1.5 transition-colors', value === 'shortterm' ? 'bg-accent text-plane' : 'text-ink-secondary hover:text-ink-primary')}
      >
        Krátkodobý trader
      </button>
      <button
        onClick={() => onChange('longterm')}
        className={clsx('rounded px-3 py-1.5 transition-colors', value === 'longterm' ? 'bg-accent text-plane' : 'text-ink-secondary hover:text-ink-primary')}
      >
        Dlouhodobý investor
      </button>
    </div>
  );
}
