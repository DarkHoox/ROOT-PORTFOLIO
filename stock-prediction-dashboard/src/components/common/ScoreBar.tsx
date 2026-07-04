import clsx from 'clsx';

/** 0-100 score bar, diverging from a neutral midpoint at 50. */
export function ScoreBar({ score, className }: { score: number; className?: string }) {
  const color = score >= 55 ? 'bg-up' : score <= 45 ? 'bg-down' : 'bg-neutral';
  return (
    <div className={clsx('relative h-1.5 w-full rounded-full bg-surface-3', className)}>
      <div className="absolute inset-y-0 left-1/2 w-px bg-border-strong" aria-hidden />
      <div
        className={clsx('absolute inset-y-0 rounded-full transition-all', color)}
        style={
          score >= 50
            ? { left: '50%', width: `${(score - 50) / 100 * 100}%` }
            : { right: '50%', width: `${(50 - score) / 100 * 100}%` }
        }
      />
    </div>
  );
}
