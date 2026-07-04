import { create } from 'zustand';
import { PROFILE_WEIGHTS } from '../lib/modules/aggregate';
import type { ModuleWeights, PaperPosition, PaperTrade, TraderProfile, WatchlistAlert } from '../types/market';

export type ViewId = 'dashboard' | 'stock' | 'screener' | 'watchlist' | 'backtest' | 'papertrading';

const STARTING_CASH = 100_000;

interface AppState {
  activeView: ViewId;
  selectedSymbol: string;
  traderProfile: TraderProfile;
  weights: ModuleWeights;
  watchlist: string[];
  alerts: WatchlistAlert[];
  paperCash: number;
  paperPositions: Record<string, PaperPosition>;
  paperTrades: PaperTrade[];

  setActiveView: (view: ViewId) => void;
  selectSymbol: (symbol: string) => void;
  setTraderProfile: (profile: TraderProfile) => void;
  setWeight: (moduleId: keyof ModuleWeights, value: number) => void;
  resetWeightsToProfile: () => void;
  toggleWatchlist: (symbol: string) => void;
  pushAlert: (alert: Omit<WatchlistAlert, 'id' | 'time' | 'read'>) => void;
  dismissAlert: (id: string) => void;
  markAllAlertsRead: () => void;
  paperBuy: (symbol: string, qty: number, price: number) => void;
  paperSell: (symbol: string, qty: number, price: number) => void;
  resetPaperAccount: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'dashboard',
  selectedSymbol: 'AAPL',
  traderProfile: 'shortterm',
  weights: { ...PROFILE_WEIGHTS.shortterm },
  watchlist: ['AAPL', 'NVDA', 'TSLA'],
  alerts: [
    {
      id: 'seed-1',
      symbol: 'NVDA',
      type: 'signal-change',
      message: 'Agregovaný signál se změnil z neutrálního na růstový',
      time: 'před 2 h',
      read: false,
    },
    {
      id: 'seed-2',
      symbol: 'TSLA',
      type: 'earnings-soon',
      message: 'Earnings za 3 dny — očekávejte zvýšenou volatilitu',
      time: 'před 5 h',
      read: false,
    },
  ],
  paperCash: STARTING_CASH,
  paperPositions: {},
  paperTrades: [],

  setActiveView: (view) => set({ activeView: view }),
  selectSymbol: (symbol) => set({ selectedSymbol: symbol, activeView: 'stock' }),
  setTraderProfile: (profile) => set({ traderProfile: profile, weights: { ...PROFILE_WEIGHTS[profile] } }),
  setWeight: (moduleId, value) => set((s) => ({ weights: { ...s.weights, [moduleId]: value } })),
  resetWeightsToProfile: () => set((s) => ({ weights: { ...PROFILE_WEIGHTS[s.traderProfile] } })),

  toggleWatchlist: (symbol) =>
    set((s) => ({
      watchlist: s.watchlist.includes(symbol) ? s.watchlist.filter((sym) => sym !== symbol) : [...s.watchlist, symbol],
    })),

  pushAlert: (alert) =>
    set((s) => ({
      alerts: [{ ...alert, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, time: 'právě teď', read: false }, ...s.alerts],
    })),
  dismissAlert: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
  markAllAlertsRead: () => set((s) => ({ alerts: s.alerts.map((a) => ({ ...a, read: true })) })),

  paperBuy: (symbol, qty, price) =>
    set((s) => {
      const cost = qty * price;
      if (cost > s.paperCash) return s;
      const existing = s.paperPositions[symbol];
      const newQty = (existing?.qty ?? 0) + qty;
      const newAvg = existing ? (existing.avgPrice * existing.qty + cost) / newQty : price;
      const trade: PaperTrade = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        symbol,
        side: 'buy',
        qty,
        price,
        time: new Date().toLocaleString('cs-CZ'),
      };
      return {
        paperCash: s.paperCash - cost,
        paperPositions: { ...s.paperPositions, [symbol]: { symbol, qty: newQty, avgPrice: newAvg } },
        paperTrades: [trade, ...s.paperTrades],
      };
    }),

  paperSell: (symbol, qty, price) =>
    set((s) => {
      const existing = s.paperPositions[symbol];
      if (!existing || existing.qty < qty) return s;
      const proceeds = qty * price;
      const realizedPnl = (price - existing.avgPrice) * qty;
      const remainingQty = existing.qty - qty;
      const positions = { ...s.paperPositions };
      if (remainingQty <= 0) delete positions[symbol];
      else positions[symbol] = { ...existing, qty: remainingQty };
      const trade: PaperTrade = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        symbol,
        side: 'sell',
        qty,
        price,
        time: new Date().toLocaleString('cs-CZ'),
        realizedPnl,
      };
      return {
        paperCash: s.paperCash + proceeds,
        paperPositions: positions,
        paperTrades: [trade, ...s.paperTrades],
      };
    }),

  resetPaperAccount: () => set({ paperCash: STARTING_CASH, paperPositions: {}, paperTrades: [] }),
}));

export function getState() {
  return useAppStore.getState();
}
