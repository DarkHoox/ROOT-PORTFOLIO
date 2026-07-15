import { IndicesStrip } from '../components/dashboard/IndicesStrip';
import { SectorHeatmap } from '../components/dashboard/SectorHeatmap';
import { FearGreedGauge } from '../components/dashboard/FearGreedGauge';
import { TopMovers } from '../components/dashboard/TopMovers';
import { EconCalendar } from '../components/dashboard/EconCalendar';

export function DashboardView() {
  return (
    <div className="space-y-4">
      <IndicesStrip />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectorHeatmap />
          <TopMovers />
          <EconCalendar />
        </div>
        <div>
          <FearGreedGauge />
        </div>
      </div>
    </div>
  );
}
