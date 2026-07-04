import type { StockProfile } from '../../types/market';
import { StatTile } from '../common/StatTile';

export function KeyStats({ profile }: { profile: StockProfile }) {
  const last = profile.seriesDaily[profile.seriesDaily.length - 1];
  const f = profile.fundamentals;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
      <StatTile label="Market Cap" value={`$${f.marketCapB.toFixed(1)}B`} />
      <StatTile label="P/E" value={`${f.peRatio}`} />
      <StatTile label="Div. výnos" value={`${f.dividendYield}%`} />
      <StatTile label="Beta" value={`${f.beta}`} />
      <StatTile label="52T High" value={`$${profile.week52High.toFixed(2)}`} />
      <StatTile label="52T Low" value={`$${profile.week52Low.toFixed(2)}`} />
      <StatTile label="Objem (denní)" value={last.volume.toLocaleString('en-US')} />
      <StatTile label="EPS" value={`$${f.eps}`} />
    </div>
  );
}
