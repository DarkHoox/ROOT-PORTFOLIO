import { useEffect, useRef } from 'react';
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle } from '../../types/market';
import { bollingerBands } from '../../lib/indicators/volatility';
import { ema, sma } from '../../lib/indicators/movingAverages';

export interface IndicatorToggles {
  sma20: boolean;
  sma50: boolean;
  sma200: boolean;
  ema20: boolean;
  bollinger: boolean;
}

export function CandlestickChart({
  candles,
  indicators,
  indicatorSource,
}: {
  candles: Candle[];
  indicators: IndicatorToggles;
  /** Full-history series (same granularity, of which `candles` is the trailing slice) used to seed
   * moving-average lookbacks — without this, a short display window can't render an SMA200. */
  indicatorSource?: Candle[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const overlaySeriesRef = useRef<Record<string, ISeriesApi<'Line'>>>({});

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9aa1ac',
        fontFamily: 'ui-monospace, monospace',
      },
      grid: {
        vertLines: { color: '#1c2029' },
        horzLines: { color: '#1c2029' },
      },
      rightPriceScale: { borderColor: '#2c2c2a' },
      timeScale: { borderColor: '#2c2c2a', timeVisible: true },
      crosshair: { mode: 0 },
      autoSize: true,
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#1fae5d',
      downColor: '#e5484d',
      borderVisible: false,
      wickUpColor: '#1fae5d',
      wickDownColor: '#e5484d',
      priceScaleId: 'right',
    });
    candleSeries.priceScale().applyOptions({ scaleMargins: { top: 0.05, bottom: 0.28 } });
    candleSeriesRef.current = candleSeries;

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
    volumeSeriesRef.current = volumeSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      overlaySeriesRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    const candleData = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(31,174,93,0.5)' : 'rgba(229,72,77,0.5)',
      })),
    );
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const source = indicatorSource && indicatorSource.length >= candles.length ? indicatorSource : candles;
    const closes = source.map((c) => c.close);
    // `candles` is assumed to be the trailing slice of `source` at matching granularity,
    // so indicator series computed on `source` align by taking the same trailing slice.
    const align = (values: (number | null)[]) => values.slice(values.length - candles.length);

    const syncLine = (key: string, enabled: boolean, values: (number | null)[], color: string) => {
      const aligned = align(values);
      if (enabled) {
        let series = overlaySeriesRef.current[key];
        if (!series) {
          series = chart.addSeries(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
          overlaySeriesRef.current[key] = series;
        }
        series.setData(
          candles
            .map((c, i) => ({ time: c.time as UTCTimestamp, value: aligned[i] }))
            .filter((d): d is { time: UTCTimestamp; value: number } => d.value !== null),
        );
      } else if (overlaySeriesRef.current[key]) {
        chart.removeSeries(overlaySeriesRef.current[key]);
        delete overlaySeriesRef.current[key];
      }
    };

    syncLine('sma20', indicators.sma20, sma(closes, 20), '#3987e5');
    syncLine('sma50', indicators.sma50, sma(closes, 50), '#f0a202');
    syncLine('sma200', indicators.sma200, sma(closes, 200), '#d55181');
    syncLine('ema20', indicators.ema20, ema(closes, 20), '#9085e9');

    if (indicators.bollinger) {
      const bb = bollingerBands(closes, 20, 2);
      syncLine('bbUpper', true, bb.upper, 'rgba(154,161,172,0.7)');
      syncLine('bbLower', true, bb.lower, 'rgba(154,161,172,0.7)');
    } else {
      ['bbUpper', 'bbLower'].forEach((key) => {
        if (overlaySeriesRef.current[key]) {
          chart.removeSeries(overlaySeriesRef.current[key]);
          delete overlaySeriesRef.current[key];
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, indicators, indicatorSource]);

  return <div ref={containerRef} className="h-[420px] w-full" />;
}
