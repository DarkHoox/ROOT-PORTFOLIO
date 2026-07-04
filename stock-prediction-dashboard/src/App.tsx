import { Suspense, lazy } from 'react';
import { DisclaimerBanner } from './components/layout/DisclaimerBanner';
import { Header } from './components/layout/Header';
import { useAppStore } from './state/store';
import { DashboardView } from './views/DashboardView';

const StockDetailView = lazy(() => import('./views/StockDetailView').then((m) => ({ default: m.StockDetailView })));
const ScreenerView = lazy(() => import('./views/ScreenerView').then((m) => ({ default: m.ScreenerView })));
const WatchlistView = lazy(() => import('./views/WatchlistView').then((m) => ({ default: m.WatchlistView })));
const BacktestView = lazy(() => import('./views/BacktestView').then((m) => ({ default: m.BacktestView })));
const PaperTradingView = lazy(() => import('./views/PaperTradingView').then((m) => ({ default: m.PaperTradingView })));

function ViewFallback() {
  return <div className="py-16 text-center text-sm text-ink-muted">Načítám…</div>;
}

function App() {
  const activeView = useAppStore((s) => s.activeView);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <DisclaimerBanner />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5">
        <Suspense fallback={<ViewFallback />}>
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'stock' && <StockDetailView />}
          {activeView === 'screener' && <ScreenerView />}
          {activeView === 'watchlist' && <WatchlistView />}
          {activeView === 'backtest' && <BacktestView />}
          {activeView === 'papertrading' && <PaperTradingView />}
        </Suspense>
      </main>
    </div>
  );
}

export default App;
