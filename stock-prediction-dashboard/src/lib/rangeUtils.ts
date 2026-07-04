import type { Candle } from '../types/market';
import { resampleToHourlyApprox, resampleToWeekly } from '../data/generateSeries';
import type { RangeId } from '../components/stock/RangeSelector';

export function candlesForRange(daily: Candle[], range: RangeId): Candle[] {
  switch (range) {
    case '1D': {
      const hourly = resampleToHourlyApprox(daily);
      return hourly.slice(-7);
    }
    case '1T': {
      const hourly = resampleToHourlyApprox(daily);
      return hourly.slice(-35);
    }
    case '1M':
      return daily.slice(-21);
    case '1R':
      return daily.slice(-252);
    case '5R':
      return resampleToWeekly(daily);
    default:
      return daily;
  }
}
