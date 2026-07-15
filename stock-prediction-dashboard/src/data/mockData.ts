import type {
  EconEvent,
  Fundamentals,
  IndexQuote,
  NewsItem,
  StockProfile,
} from '../types/market';
import { generateDailySeries } from './generateSeries';
import { seededRandom } from './rng';
import { INDEX_UNIVERSE, STOCK_UNIVERSE, symbolMeta, type SymbolSeed } from './symbols';

const SECTOR_AVG_PE: Record<string, number> = {
  Technology: 31,
  Financials: 14,
  Healthcare: 19,
  Energy: 11,
  Industrials: 20,
  'Consumer Discretionary': 24,
  'Consumer Staples': 21,
  Utilities: 17,
  Materials: 16,
  'Real Estate': 18,
  'Communication Services': 22,
};

const POSITIVE_HEADLINES = [
  '{name} beats quarterly earnings estimates, raises guidance',
  'Analysts upgrade {name} price target after strong margins',
  '{name} announces expanded buyback program',
  '{name} unveils new product line, investors cheer',
  '{name} signs major multi-year supply agreement',
  '{name} reports record free cash flow for the quarter',
];

const NEGATIVE_HEADLINES = [
  '{name} misses revenue estimates, shares under pressure',
  'Regulators open inquiry into {name} business practices',
  '{name} cuts full-year guidance citing demand softness',
  'Analysts downgrade {name} on margin concerns',
  '{name} faces supply chain disruption warning',
  'Executive departure raises questions at {name}',
];

const NEUTRAL_HEADLINES = [
  '{name} to present at upcoming industry conference',
  '{name} reaffirms full-year outlook',
  '{name} announces board appointment',
  'What to expect from {name} next earnings call',
  '{name} trading volume elevated amid sector rotation',
];

const NEWS_SOURCES = ['Reuters', 'Bloomberg', 'CNBC', 'MarketWatch', 'Yahoo Finance', 'Barron\'s'];

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function buildFundamentals(seed: SymbolSeed, rand: () => number): Fundamentals {
  const sectorAvgPE = SECTOR_AVG_PE[seed.sector] ?? 20;
  const peSkew = seed.drift > 0.2 ? 1.3 : seed.drift < 0 ? 0.75 : 1;
  const peRatio = Math.max(4, sectorAvgPE * peSkew * (0.7 + rand() * 0.6));
  const revenueGrowthYoY = seed.drift * 60 + (rand() - 0.5) * 8;
  const debtToEquity = Math.max(0.05, 0.3 + (rand() - 0.4) * 1.4);
  const roe = 8 + seed.drift * 40 + (rand() - 0.5) * 10;
  const marketCapB = seed.marketCapB;
  const eps = seed.basePrice / peRatio;
  return {
    peRatio: round1(peRatio),
    sectorAvgPE: round1(sectorAvgPE),
    revenueGrowthYoY: round1(revenueGrowthYoY),
    debtToEquity: round1(debtToEquity),
    roe: round1(roe),
    freeCashFlowM: round1(marketCapB * 1000 * (0.02 + rand() * 0.05)),
    dividendYield: round1(Math.max(0, (seed.sector === 'Technology' ? 0.3 : 1.8) + rand() * 2 - (seed.drift > 0.3 ? 1 : 0))),
    beta: round1(0.6 + seed.vol * 1.6 + (rand() - 0.5) * 0.2),
    marketCapB: round1(marketCapB),
    eps: round1(eps),
  };
}

function buildNews(seed: SymbolSeed, rand: () => number): NewsItem[] {
  const count = 4 + Math.floor(rand() * 3);
  const items: NewsItem[] = [];
  const bias = seed.drift; // more positive drift -> more positive news bias
  for (let i = 0; i < count; i++) {
    const r = rand();
    const posProb = 0.33 + Math.max(-0.2, Math.min(0.25, bias * 0.4));
    const tone: NewsItem['tone'] = r < posProb ? 'positive' : r < posProb + 0.33 ? 'negative' : 'neutral';
    const bank = tone === 'positive' ? POSITIVE_HEADLINES : tone === 'negative' ? NEGATIVE_HEADLINES : NEUTRAL_HEADLINES;
    const headline = pick(bank, rand).replace('{name}', seed.name);
    items.push({
      id: `${seed.symbol}-news-${i}`,
      headline,
      source: pick(NEWS_SOURCES, rand),
      hoursAgo: Math.round(1 + rand() * 71),
      tone,
    });
  }
  return items.sort((a, b) => a.hoursAgo - b.hoursAgo);
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

const profileCache = new Map<string, StockProfile>();

export function getStockProfile(symbolOrSeed: string | SymbolSeed): StockProfile {
  const seed = typeof symbolOrSeed === 'string'
    ? STOCK_UNIVERSE.find((s) => s.symbol === symbolOrSeed)
    : symbolOrSeed;
  if (!seed) throw new Error(`Unknown symbol: ${symbolOrSeed}`);

  const cached = profileCache.get(seed.symbol);
  if (cached) return cached;

  const rand = seededRandom(`profile:${seed.symbol}`);
  const seriesDaily = generateDailySeries(seed);
  const week52 = seriesDaily.slice(-252);

  const profile: StockProfile = {
    meta: symbolMeta(seed),
    fundamentals: buildFundamentals(seed, rand),
    earnings: {
      nextEarningsDaysAway: Math.floor(1 + rand() * 60),
      lastEpsSurprise: round1((rand() - 0.4) * 12),
    },
    news: buildNews(seed, rand),
    shortInterestPct: round1(1 + rand() * (seed.drift < 0 ? 14 : 6)),
    insiderNetBuysM: round1((rand() - (seed.drift > 0.15 ? 0.35 : 0.55)) * 20),
    week52High: Math.max(...week52.map((c) => c.high)),
    week52Low: Math.min(...week52.map((c) => c.low)),
    seriesDaily,
  };

  profileCache.set(seed.symbol, profile);
  return profile;
}

export function getAllProfiles(): StockProfile[] {
  return STOCK_UNIVERSE.map((s) => getStockProfile(s));
}

let indexQuotesCache: IndexQuote[] | null = null;

export function getIndexQuotes(): IndexQuote[] {
  if (indexQuotesCache) return indexQuotesCache;
  indexQuotesCache = INDEX_UNIVERSE.map((idx) => {
    const series = generateDailySeries({ symbol: idx.symbol, basePrice: idx.basePrice, drift: idx.drift, vol: idx.vol });
    const last = series[series.length - 1];
    const prev = series[series.length - 2];
    return {
      symbol: idx.symbol,
      name: idx.name,
      price: last.close,
      changePct: round1(((last.close - prev.close) / prev.close) * 100),
    };
  });
  return indexQuotesCache;
}

export function getSectorPerformance(): { sector: string; changePct: number }[] {
  const profiles = getAllProfiles();
  const bySector = new Map<string, number[]>();
  for (const p of profiles) {
    const series = p.seriesDaily;
    const last = series[series.length - 1];
    const prev = series[series.length - 2];
    const chg = ((last.close - prev.close) / prev.close) * 100;
    const arr = bySector.get(p.meta.sector) ?? [];
    arr.push(chg);
    bySector.set(p.meta.sector, arr);
  }
  return Array.from(bySector.entries()).map(([sector, arr]) => ({
    sector,
    changePct: round1(arr.reduce((a, b) => a + b, 0) / arr.length),
  }));
}

export function getFearGreedIndex(): { score: number; label: string; components: { label: string; score: number }[] } {
  const profiles = getAllProfiles();
  let momentumSum = 0;
  let volSum = 0;
  let breadthUp = 0;
  for (const p of profiles) {
    const c = p.seriesDaily;
    const last = c[c.length - 1].close;
    const prior = c[c.length - 21].close;
    const chg = (last - prior) / prior;
    momentumSum += chg;
    if (chg > 0) breadthUp += 1;
    const recentRange = c.slice(-21);
    const rets = recentRange.slice(1).map((d, i) => (d.close - recentRange[i].close) / recentRange[i].close);
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
    volSum += Math.sqrt(variance);
  }
  const n = profiles.length;
  const avgMomentum = momentumSum / n;
  const avgVol = volSum / n;
  const breadthPct = (breadthUp / n) * 100;

  const momentumScore = clamp(50 + avgMomentum * 400, 0, 100);
  const volScore = clamp(70 - avgVol * 1200, 0, 100);
  const breadthScore = breadthPct;

  const score = Math.round(momentumScore * 0.4 + volScore * 0.3 + breadthScore * 0.3);
  const label = score >= 75 ? 'Extreme Greed' : score >= 55 ? 'Greed' : score >= 45 ? 'Neutral' : score >= 25 ? 'Fear' : 'Extreme Fear';

  return {
    score,
    label,
    components: [
      { label: 'Price Momentum', score: Math.round(momentumScore) },
      { label: 'Market Volatility', score: Math.round(volScore) },
      { label: 'Breadth (adv/decl)', score: Math.round(breadthScore) },
    ],
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function getEconCalendar(): EconEvent[] {
  return [
    { time: '08:30', title: 'Initial Jobless Claims', importance: 'medium', category: 'jobs', forecast: '215K', previous: '212K' },
    { time: '08:30', title: 'CPI m/m', importance: 'high', category: 'inflation', forecast: '0.2%', previous: '0.3%' },
    { time: '10:00', title: 'Fed Chair Press Conference', importance: 'high', category: 'fed' },
    { time: '14:00', title: 'FOMC Rate Decision', importance: 'high', category: 'fed', forecast: '5.25-5.50%', previous: '5.25-5.50%' },
    { time: 'After Close', title: 'NVDA Earnings Release', importance: 'high', category: 'earnings' },
    { time: 'Before Open', title: 'JPM Earnings Release', importance: 'medium', category: 'earnings' },
    { time: '10:00', title: 'Existing Home Sales', importance: 'low', category: 'other', forecast: '4.2M', previous: '4.15M' },
  ];
}
