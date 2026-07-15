import { useState } from 'react';
import type { ModuleResult } from '../../types/market';
import { SignalBadge } from '../common/SignalBadge';
import { ScoreBar } from '../common/ScoreBar';
import { Modal } from '../common/Modal';

export function ModuleCard({ module }: { module: ModuleResult }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full flex-col gap-2 rounded-lg border border-border bg-surface p-3.5 text-left transition-colors hover:border-border-strong hover:bg-surface-2"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold text-ink-primary">{module.label}</span>
          <SignalBadge signal={module.signal} size="sm" />
        </div>
        <ScoreBar score={module.score} />
        <p className="line-clamp-2 text-xs text-ink-secondary">{module.reason}</p>
        <span className="text-[11px] font-medium text-accent">Zobrazit proč →</span>
      </button>
      {open && (
        <Modal title={module.label} onClose={() => setOpen(false)}>
          <div className="mb-4 flex items-center gap-3">
            <SignalBadge signal={module.signal} />
            <span className="tabular text-sm text-ink-secondary">Skóre: {module.score}/100</span>
          </div>
          <p className="mb-4 text-sm text-ink-secondary">{module.reason}</p>
          <div className="space-y-2">
            {module.details.map((d, i) => (
              <div key={i} className="flex items-center justify-between border-b border-border py-1.5 text-sm last:border-0">
                <span className="text-ink-muted">{d.label}</span>
                <span className="tabular font-medium text-ink-primary">{d.value}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
