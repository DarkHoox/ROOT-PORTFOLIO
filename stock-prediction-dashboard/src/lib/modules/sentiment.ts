import type { ModuleResult, NewsItem } from '../../types/market';
import { clampScore, detail, scoreFromSignals, signalFromScore, type WeightedDirection } from './shared';

export function sentimentModule(news: NewsItem[], shortInterestPct: number, insiderNetBuysM: number): ModuleResult {
  const toneScore = news.reduce((acc, n) => acc + (n.tone === 'positive' ? 1 : n.tone === 'negative' ? -1 : 0), 0);
  const toneAvg = news.length > 0 ? toneScore / news.length : 0;

  const signals: WeightedDirection[] = [
    { dir: toneAvg, weight: 1.4 },
    { dir: shortInterestPct > 10 ? -0.5 : shortInterestPct < 3 ? 0.3 : 0, weight: 0.8 },
    { dir: insiderNetBuysM > 0 ? 0.8 : -0.8, weight: 1 },
  ];

  const score = clampScore(scoreFromSignals(signals));
  const signal = signalFromScore(score);

  const posCount = news.filter((n) => n.tone === 'positive').length;
  const negCount = news.filter((n) => n.tone === 'negative').length;

  const reasonParts: string[] = [
    `tón zpráv: ${posCount} pozitivních / ${negCount} negativních titulků nedávno`,
    shortInterestPct > 10 ? `zvýšený short interest (${shortInterestPct}%) naznačuje medvědí pozicování` : `short interest ${shortInterestPct}% je bez výraznějšího signálu`,
    insiderNetBuysM > 0 ? `insideři čistě nakoupili za $${insiderNetBuysM}M` : `insideři čistě prodali za $${Math.abs(insiderNetBuysM)}M`,
  ];

  return {
    id: 'sentiment',
    label: 'Sentiment',
    signal,
    score,
    reason: reasonParts.join('; '),
    details: [
      detail('Tón zpráv', `${posCount} pozitivních, ${negCount} negativních, ${news.length - posCount - negCount} neutrálních`),
      detail('Short interest', `${shortInterestPct}% free floatu`),
      detail('Insider aktivita (netto)', `${insiderNetBuysM >= 0 ? '+' : ''}$${insiderNetBuysM}M`),
    ],
  };
}
