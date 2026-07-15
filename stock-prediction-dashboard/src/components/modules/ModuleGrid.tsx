import type { ModuleResult } from '../../types/market';
import { ModuleCard } from './ModuleCard';

export function ModuleGrid({ modules }: { modules: ModuleResult[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {modules.map((m) => (
        <ModuleCard key={m.id} module={m} />
      ))}
    </div>
  );
}
