import type { Sector, StockMeta } from '../types/market';

export const SECTORS: Sector[] = [
  'Technology',
  'Financials',
  'Healthcare',
  'Energy',
  'Industrials',
  'Consumer Discretionary',
  'Consumer Staples',
  'Utilities',
  'Materials',
  'Real Estate',
  'Communication Services',
];

// Base price + drift bias + volatility bias per symbol drive the mock series
// generator. bias > 0 skews the random walk upward over the 5y window.
export interface SymbolSeed {
  symbol: string;
  name: string;
  sector: Sector;
  exchange: string;
  currency: string;
  basePrice: number;
  drift: number; // annualized drift, e.g. 0.12 = +12%/yr trend bias
  vol: number; // annualized volatility, e.g. 0.35 = 35%
  marketCapB: number; // approximate real-world market cap in $B, for realistic screener/fundamentals scale
}

export const STOCK_UNIVERSE: SymbolSeed[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', exchange: 'NASDAQ', currency: 'USD', basePrice: 178, drift: 0.14, vol: 0.28, marketCapB: 2800 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', exchange: 'NASDAQ', currency: 'USD', basePrice: 372, drift: 0.18, vol: 0.26, marketCapB: 3100 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', exchange: 'NASDAQ', currency: 'USD', basePrice: 118, drift: 0.55, vol: 0.55, marketCapB: 2900 },
  { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Technology', exchange: 'NASDAQ', currency: 'USD', basePrice: 165, drift: 0.32, vol: 0.34, marketCapB: 720 },
  { symbol: 'ORCL', name: 'Oracle Corp.', sector: 'Technology', exchange: 'NYSE', currency: 'USD', basePrice: 142, drift: 0.2, vol: 0.3, marketCapB: 390 },
  { symbol: 'CRM', name: 'Salesforce Inc.', sector: 'Technology', exchange: 'NYSE', currency: 'USD', basePrice: 258, drift: 0.05, vol: 0.32, marketCapB: 250 },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', exchange: 'NASDAQ', currency: 'USD', basePrice: 122, drift: 0.15, vol: 0.48, marketCapB: 200 },
  { symbol: 'INTC', name: 'Intel Corp.', sector: 'Technology', exchange: 'NASDAQ', currency: 'USD', basePrice: 32, drift: -0.18, vol: 0.42, marketCapB: 135 },

  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', exchange: 'NYSE', currency: 'USD', basePrice: 195, drift: 0.13, vol: 0.24, marketCapB: 560 },
  { symbol: 'BAC', name: 'Bank of America', sector: 'Financials', exchange: 'NYSE', currency: 'USD', basePrice: 37, drift: 0.08, vol: 0.28, marketCapB: 290 },
  { symbol: 'GS', name: 'Goldman Sachs', sector: 'Financials', exchange: 'NYSE', currency: 'USD', basePrice: 418, drift: 0.16, vol: 0.27, marketCapB: 145 },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Financials', exchange: 'NYSE', currency: 'USD', basePrice: 268, drift: 0.14, vol: 0.2, marketCapB: 560 },
  { symbol: 'AXP', name: 'American Express', sector: 'Financials', exchange: 'NYSE', currency: 'USD', basePrice: 205, drift: 0.12, vol: 0.25, marketCapB: 175 },
  { symbol: 'MA', name: 'Mastercard Inc.', sector: 'Financials', exchange: 'NYSE', currency: 'USD', basePrice: 452, drift: 0.15, vol: 0.21, marketCapB: 430 },

  { symbol: 'LLY', name: 'Eli Lilly', sector: 'Healthcare', exchange: 'NYSE', currency: 'USD', basePrice: 612, drift: 0.28, vol: 0.3, marketCapB: 750 },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', exchange: 'NYSE', currency: 'USD', basePrice: 528, drift: -0.05, vol: 0.26, marketCapB: 480 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', exchange: 'NYSE', currency: 'USD', basePrice: 156, drift: 0.03, vol: 0.16, marketCapB: 380 },
  { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare', exchange: 'NYSE', currency: 'USD', basePrice: 28, drift: -0.15, vol: 0.28, marketCapB: 160 },
  { symbol: 'ABBV', name: 'AbbVie Inc.', sector: 'Healthcare', exchange: 'NYSE', currency: 'USD', basePrice: 172, drift: 0.11, vol: 0.22, marketCapB: 305 },
  { symbol: 'MRK', name: 'Merck & Co.', sector: 'Healthcare', exchange: 'NYSE', currency: 'USD', basePrice: 102, drift: -0.02, vol: 0.24, marketCapB: 260 },

  { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy', exchange: 'NYSE', currency: 'USD', basePrice: 118, drift: 0.1, vol: 0.27, marketCapB: 480 },
  { symbol: 'CVX', name: 'Chevron Corp.', sector: 'Energy', exchange: 'NYSE', currency: 'USD', basePrice: 158, drift: 0.06, vol: 0.25, marketCapB: 290 },
  { symbol: 'COP', name: 'ConocoPhillips', sector: 'Energy', exchange: 'NYSE', currency: 'USD', basePrice: 108, drift: 0.04, vol: 0.32, marketCapB: 130 },
  { symbol: 'SLB', name: 'Schlumberger', sector: 'Energy', exchange: 'NYSE', currency: 'USD', basePrice: 46, drift: -0.08, vol: 0.34, marketCapB: 55 },

  { symbol: 'CAT', name: 'Caterpillar Inc.', sector: 'Industrials', exchange: 'NYSE', currency: 'USD', basePrice: 342, drift: 0.19, vol: 0.26, marketCapB: 170 },
  { symbol: 'BA', name: 'Boeing Co.', sector: 'Industrials', exchange: 'NYSE', currency: 'USD', basePrice: 178, drift: -0.12, vol: 0.4, marketCapB: 110 },
  { symbol: 'HON', name: 'Honeywell Intl.', sector: 'Industrials', exchange: 'NASDAQ', currency: 'USD', basePrice: 205, drift: 0.05, vol: 0.2, marketCapB: 140 },
  { symbol: 'UPS', name: 'United Parcel Service', sector: 'Industrials', exchange: 'NYSE', currency: 'USD', basePrice: 132, drift: -0.1, vol: 0.24, marketCapB: 110 },
  { symbol: 'GE', name: 'General Electric', sector: 'Industrials', exchange: 'NYSE', currency: 'USD', basePrice: 168, drift: 0.35, vol: 0.3, marketCapB: 190 },

  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Discretionary', exchange: 'NASDAQ', currency: 'USD', basePrice: 178, drift: 0.22, vol: 0.32, marketCapB: 1900 },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Discretionary', exchange: 'NASDAQ', currency: 'USD', basePrice: 248, drift: 0.05, vol: 0.6, marketCapB: 800 },
  { symbol: 'HD', name: 'Home Depot Inc.', sector: 'Consumer Discretionary', exchange: 'NYSE', currency: 'USD', basePrice: 385, drift: 0.1, vol: 0.22, marketCapB: 400 },
  { symbol: 'MCD', name: "McDonald's Corp.", sector: 'Consumer Discretionary', exchange: 'NYSE', currency: 'USD', basePrice: 292, drift: 0.04, vol: 0.18, marketCapB: 210 },
  { symbol: 'NKE', name: 'Nike Inc.', sector: 'Consumer Discretionary', exchange: 'NYSE', currency: 'USD', basePrice: 76, drift: -0.2, vol: 0.32, marketCapB: 110 },

  { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumer Staples', exchange: 'NYSE', currency: 'USD', basePrice: 168, drift: 0.06, vol: 0.15, marketCapB: 380 },
  { symbol: 'KO', name: 'Coca-Cola Co.', sector: 'Consumer Staples', exchange: 'NYSE', currency: 'USD', basePrice: 62, drift: 0.07, vol: 0.14, marketCapB: 270 },
  { symbol: 'PEP', name: 'PepsiCo Inc.', sector: 'Consumer Staples', exchange: 'NASDAQ', currency: 'USD', basePrice: 172, drift: 0.02, vol: 0.15, marketCapB: 230 },
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Staples', exchange: 'NYSE', currency: 'USD', basePrice: 92, drift: 0.2, vol: 0.18, marketCapB: 550 },
  { symbol: 'COST', name: 'Costco Wholesale', sector: 'Consumer Staples', exchange: 'NASDAQ', currency: 'USD', basePrice: 895, drift: 0.24, vol: 0.19, marketCapB: 380 },

  { symbol: 'NEE', name: 'NextEra Energy', sector: 'Utilities', exchange: 'NYSE', currency: 'USD', basePrice: 72, drift: 0.02, vol: 0.19, marketCapB: 150 },
  { symbol: 'DUK', name: 'Duke Energy', sector: 'Utilities', exchange: 'NYSE', currency: 'USD', basePrice: 108, drift: 0.03, vol: 0.15, marketCapB: 80 },
  { symbol: 'SO', name: 'Southern Co.', sector: 'Utilities', exchange: 'NYSE', currency: 'USD', basePrice: 86, drift: 0.05, vol: 0.14, marketCapB: 90 },

  { symbol: 'LIN', name: 'Linde plc', sector: 'Materials', exchange: 'NASDAQ', currency: 'USD', basePrice: 452, drift: 0.14, vol: 0.18, marketCapB: 210 },
  { symbol: 'FCX', name: 'Freeport-McMoRan', sector: 'Materials', exchange: 'NYSE', currency: 'USD', basePrice: 44, drift: 0.06, vol: 0.4, marketCapB: 55 },
  { symbol: 'NEM', name: 'Newmont Corp.', sector: 'Materials', exchange: 'NYSE', currency: 'USD', basePrice: 42, drift: 0.1, vol: 0.35, marketCapB: 45 },

  { symbol: 'PLD', name: 'Prologis Inc.', sector: 'Real Estate', exchange: 'NYSE', currency: 'USD', basePrice: 118, drift: -0.03, vol: 0.24, marketCapB: 100 },
  { symbol: 'AMT', name: 'American Tower', sector: 'Real Estate', exchange: 'NYSE', currency: 'USD', basePrice: 198, drift: -0.02, vol: 0.22, marketCapB: 95 },
  { symbol: 'SPG', name: 'Simon Property Group', sector: 'Real Estate', exchange: 'NYSE', currency: 'USD', basePrice: 158, drift: 0.09, vol: 0.24, marketCapB: 55 },

  { symbol: 'META', name: 'Meta Platforms', sector: 'Communication Services', exchange: 'NASDAQ', currency: 'USD', basePrice: 512, drift: 0.35, vol: 0.36, marketCapB: 1300 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication Services', exchange: 'NASDAQ', currency: 'USD', basePrice: 168, drift: 0.2, vol: 0.26, marketCapB: 2100 },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Communication Services', exchange: 'NASDAQ', currency: 'USD', basePrice: 675, drift: 0.3, vol: 0.34, marketCapB: 300 },
  { symbol: 'DIS', name: 'Walt Disney Co.', sector: 'Communication Services', exchange: 'NYSE', currency: 'USD', basePrice: 112, drift: -0.05, vol: 0.28, marketCapB: 200 },
  { symbol: 'TMUS', name: 'T-Mobile US', sector: 'Communication Services', exchange: 'NASDAQ', currency: 'USD', basePrice: 178, drift: 0.16, vol: 0.2, marketCapB: 220 },
];

export interface IndexSeed {
  symbol: string;
  name: string;
  basePrice: number;
  drift: number;
  vol: number;
}

export const INDEX_UNIVERSE: IndexSeed[] = [
  { symbol: 'SPX', name: 'S&P 500', basePrice: 4780, drift: 0.13, vol: 0.15 },
  { symbol: 'IXIC', name: 'NASDAQ Composite', basePrice: 15100, drift: 0.19, vol: 0.19 },
  { symbol: 'DAX', name: 'DAX 40', basePrice: 16750, drift: 0.09, vol: 0.16 },
  { symbol: 'PX', name: 'PX Prague', basePrice: 1420, drift: 0.11, vol: 0.14 },
];

export function symbolMeta(seed: SymbolSeed): StockMeta {
  return {
    symbol: seed.symbol,
    name: seed.name,
    sector: seed.sector,
    exchange: seed.exchange,
    currency: seed.currency,
  };
}
