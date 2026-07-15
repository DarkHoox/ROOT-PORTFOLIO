import type { ReactNode } from 'react';
import clsx from 'clsx';

export function Card({
  title,
  subtitle,
  action,
  children,
  className,
  padded = true,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className={clsx('rounded-lg border border-border bg-surface', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            {title && <h3 className="text-sm font-semibold tracking-wide text-ink-primary">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={padded ? 'p-4' : ''}>{children}</div>
    </div>
  );
}
