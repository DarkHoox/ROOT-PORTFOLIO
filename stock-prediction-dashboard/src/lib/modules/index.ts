import type { ModuleResult, StockProfile } from '../../types/market';
import { candlestickModule } from './candlestick';
import { confluenceModule } from './confluence';
import { fundamentalsModule } from './fundamentals';
import { momentumModule } from './momentum';
import { sentimentModule } from './sentiment';
import { supportResistanceModule } from './supportResistance';
import { trendModule } from './trend';
import { volatilityModule } from './volatility';
import { volumeModule } from './volume';

export function computeAllModules(profile: StockProfile): ModuleResult[] {
  const candles = profile.seriesDaily;
  return [
    trendModule(candles),
    momentumModule(candles),
    volatilityModule(candles),
    volumeModule(candles),
    supportResistanceModule(candles),
    candlestickModule(candles),
    fundamentalsModule(profile.fundamentals),
    sentimentModule(profile.news, profile.shortInterestPct, profile.insiderNetBuysM),
    confluenceModule(candles),
  ];
}

export * from './aggregate';
