export type Signal = 'up' | 'down' | 'neutral';

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Sector =
  | 'Technology'
  | 'Financials'
  | 'Healthcare'
  | 'Energy'
  | 'Industrials'
  | 'Consumer Discretionary'
  | 'Consumer Staples'
  | 'Utilities'
  | 'Materials'
  | 'Real Estate'
  | 'Communication Services';

export interface Fundamentals {
  peRatio: number;
  sectorAvgPE: number;
  revenueGrowthYoY: number; // %
  debtToEquity: number;
  roe: number; // %
  freeCashFlowM: number; // millions
  dividendYield: number; // %
  beta: number;
  marketCapB: number; // billions
  eps: number;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  hoursAgo: number;
  tone: 'positive' | 'negative' | 'neutral';
}

export interface EarningsInfo {
  nextEarningsDaysAway: number;
  lastEpsSurprise: number; // %
}

export interface StockMeta {
  symbol: string;
  name: string;
  sector: Sector;
  exchange: string;
  currency: string;
}

export interface StockProfile {
  meta: StockMeta;
  fundamentals: Fundamentals;
  earnings: EarningsInfo;
  news: NewsItem[];
  shortInterestPct: number;
  insiderNetBuysM: number; // millions, positive = net buying
  week52High: number;
  week52Low: number;
  seriesDaily: Candle[]; // ~5y of daily candles
}

export interface IndexQuote {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
}

export interface EconEvent {
  time: string; // HH:mm
  title: string;
  importance: 'low' | 'medium' | 'high';
  category: 'fed' | 'inflation' | 'earnings' | 'jobs' | 'other';
  actual?: string;
  forecast?: string;
  previous?: string;
}

export type TraderProfile = 'shortterm' | 'longterm';

export interface ModuleResult {
  id: ModuleId;
  label: string;
  signal: Signal;
  score: number; // 0-100, 50 = neutral, distance from 50 = conviction
  reason: string;
  details: ModuleDetail[];
}

export interface ModuleDetail {
  label: string;
  value: string;
}

export type ModuleId =
  | 'trend'
  | 'momentum'
  | 'volatility'
  | 'volume'
  | 'supportResistance'
  | 'candlestick'
  | 'fundamentals'
  | 'sentiment'
  | 'confluence';

export interface Verdict {
  signal: Signal;
  confidence: number; // 0-100
  summary: string;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  topReason: string;
}

export interface ModuleWeights {
  trend: number;
  momentum: number;
  volatility: number;
  volume: number;
  supportResistance: number;
  candlestick: number;
  fundamentals: number;
  sentiment: number;
  confluence: number;
}

export interface WatchlistAlert {
  id: string;
  symbol: string;
  type: 'signal-change' | 'level-breakout' | 'earnings-soon';
  message: string;
  time: string;
  read: boolean;
}

export interface PaperPosition {
  symbol: string;
  qty: number;
  avgPrice: number;
}

export interface PaperTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  qty: number;
  price: number;
  time: string;
  realizedPnl?: number;
}
