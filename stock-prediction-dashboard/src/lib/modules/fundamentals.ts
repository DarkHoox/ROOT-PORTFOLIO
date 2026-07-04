import type { Fundamentals, ModuleResult } from '../../types/market';
import { clampScore, detail, scoreFromSignals, signalFromScore, type WeightedDirection } from './shared';

export function fundamentalsModule(f: Fundamentals): ModuleResult {
  const signals: WeightedDirection[] = [];

  const peRelative = f.peRatio / f.sectorAvgPE;
  signals.push({ dir: peRelative < 0.9 ? 1 : peRelative > 1.3 ? -1 : 0, weight: 1.2 });
  signals.push({ dir: f.revenueGrowthYoY > 8 ? 1 : f.revenueGrowthYoY < 0 ? -1 : 0.2, weight: 1.3 });
  signals.push({ dir: f.debtToEquity < 0.5 ? 0.6 : f.debtToEquity > 1.5 ? -0.8 : 0, weight: 0.8 });
  signals.push({ dir: f.roe > 15 ? 1 : f.roe < 5 ? -0.7 : 0, weight: 1 });
  signals.push({ dir: f.freeCashFlowM > 0 ? 0.6 : -0.6, weight: 0.9 });

  const score = clampScore(scoreFromSignals(signals));
  const signal = signalFromScore(score);

  const reasonParts: string[] = [];
  reasonParts.push(
    peRelative < 0.9
      ? `P/E ${f.peRatio} je pod sektorovým průměrem (${f.sectorAvgPE}), což naznačuje relativní hodnotu`
      : peRelative > 1.3
        ? `P/E ${f.peRatio} je výrazně nad sektorovým průměrem (${f.sectorAvgPE}), což naznačuje prémiové ocenění`
        : `P/E ${f.peRatio} je zhruba v souladu se sektorovým průměrem (${f.sectorAvgPE})`,
  );
  reasonParts.push(f.revenueGrowthYoY > 8 ? `silný růst tržeb ${f.revenueGrowthYoY}% meziročně` : f.revenueGrowthYoY < 0 ? `tržby meziročně poklesly o ${Math.abs(f.revenueGrowthYoY)}%` : `mírný růst tržeb ${f.revenueGrowthYoY}% meziročně`);

  return {
    id: 'fundamentals',
    label: 'Fundamenty',
    signal,
    score,
    reason: reasonParts.join('; '),
    details: [
      detail('P/E vs sektorový průměr', `${f.peRatio} vs ${f.sectorAvgPE}`),
      detail('Růst tržeb meziročně', `${f.revenueGrowthYoY}%`),
      detail('Zadluženost (D/E)', `${f.debtToEquity}`),
      detail('ROE', `${f.roe}%`),
      detail('Volný peněžní tok (FCF)', `$${f.freeCashFlowM.toLocaleString()}M`),
    ],
  };
}
