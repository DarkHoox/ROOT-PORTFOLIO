import { useEffect, useRef } from 'react';
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle } from '../../types/market';
import { bollingerBands } from '../../lib/indicators/volatility';
import { ema, sma } from '../../lib/indicators/movingAverages';
import { rsi } from '../../lib/indicators/momentum';

export interface IndicatorToggles {
  sma20: boolean;
  sma50: boolean;
  sma200: boolean;
  ema20: boolean;
  bollinger: boolean;
  levels: boolean;
  rsi: boolean;
}

export interface PriceLevel {
  price: number;
  kind: 'support' | 'resistance' | 'pivot';
  label: string;
}

export interface TradeMarker {
  time: number;
  type: 'buy' | 'sell';
}

export function CandlestickChart({
  candles,
  indicators,
  indicatorSource,
  priceLevels = [],
  tradeMarkers = [],
}: {
  candles: Candle[];
  indicators: IndicatorToggles;
  /** Full-history series (same granularity, of which `candles` is the trailing slice) used to seed
   * moving-average lookbacks — without this, a short display window can't render an SMA200. */
  indicatorSource?: Candle[];
  /** Detected S/R + pivot levels drawn as horizontal price lines when the toggle is on. */
  priceLevels?: PriceLevel[];
  /** Signal-engine buy/sell events shown as arrows on matching bars. */
  tradeMarkers?: TradeMarker[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const overlaySeriesRef = useRef<Record<string, ISeriesApi<'Line'>>>({});
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

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
      priceLinesRef.current = [];
      rsiSeriesRef.current = null;
      markersPluginRef.current = null;
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

  // Horizontal S/R + pivot price lines on the main pane.
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;
    for (const line of priceLinesRef.current) series.removePriceLine(line);
    priceLinesRef.current = [];
    if (!indicators.levels) return;

    const colorFor = (kind: PriceLevel['kind']) =>
      kind === 'support' ? '#1fae5d' : kind === 'resistance' ? '#e5484d' : '#f0a202';
    for (const level of priceLevels) {
      priceLinesRef.current.push(
        series.createPriceLine({
          price: level.price,
          color: colorFor(level.kind),
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: level.label,
        }),
      );
    }
  }, [indicators.levels, priceLevels, candles]);

  // RSI(14) oscillator in a second pane.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (indicators.rsi) {
      const source = indicatorSource && indicatorSource.length >= candles.length ? indicatorSource : candles;
      const values = rsi(source.map((c) => c.close), 14);
      const aligned = values.slice(values.length - candles.length);
      if (!rsiSeriesRef.current) {
        rsiSeriesRef.current = chart.addSeries(
          LineSeries,
          { color: '#9085e9', lineWidth: 2, priceLineVisible: false, lastValueVisible: true },
          1,
        );
        rsiSeriesRef.current.createPriceLine({ price: 70, color: '#5b6270', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' });
        rsiSeriesRef.current.createPriceLine({ price: 30, color: '#5b6270', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' });
      }
      rsiSeriesRef.current.setData(
        candles
          .map((c, i) => ({ time: c.time as UTCTimestamp, value: aligned[i] }))
          .filter((d): d is { time: UTCTimestamp; value: number } => d.value !== null),
      );
    } else if (rsiSeriesRef.current) {
      chart.removeSeries(rsiSeriesRef.current);
      rsiSeriesRef.current = null;
    }
  }, [indicators.rsi, candles, indicatorSource]);

  // Buy/sell arrows from the signal engine, drawn only on bars present in the
  // displayed series (times from other granularities would misplace).
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;
    const candleTimes = new Set(candles.map((c) => c.time));
    const markers = tradeMarkers
      .filter((m) => candleTimes.has(m.time))
      .sort((a, b) => a.time - b.time)
      .map((m) =>
        m.type === 'buy'
          ? {
              time: m.time as UTCTimestamp,
              position: 'belowBar' as const,
              color: '#1fae5d',
              shape: 'arrowUp' as const,
              text: 'BUY',
            }
          : {
              time: m.time as UTCTimestamp,
              position: 'aboveBar' as const,
              color: '#e5484d',
              shape: 'arrowDown' as const,
              text: 'SELL',
            },
      );
    if (!markersPluginRef.current) {
      markersPluginRef.current = createSeriesMarkers(series, markers);
    } else {
      markersPluginRef.current.setMarkers(markers);
    }
  }, [tradeMarkers, candles]);

  return <div ref={containerRef} className={indicators.rsi ? 'h-[540px] w-full' : 'h-[420px] w-full'} />;
}
