import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  BarChart3,
  Globe2,
} from 'lucide-react';

import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatMoney } from '../utils/formatters';
import TradingViewGoldChart from './TradingViewGoldChart';
import './LocalGoldChart.css';

const CHART_SOURCES = [
  {
    value: 'PNJ',
    label: 'PNJ',
  },
  {
    value: 'SJC',
    label: 'SJC',
  },
  {
    value: 'MI_HONG',
    label: 'Mi Hồng',
  },
];

const CHART_RANGES = [
  {
    value: '1d',
    label: 'Hôm nay',
  },
  {
    value: '1w',
    label: '1 tuần',
  },
  {
    value: '1m',
    label: '1 tháng',
  },
  {
    value: '3m',
    label: '3 tháng',
  },
  {
    value: '6m',
    label: '6 tháng',
  },
  {
    value: '12m',
    label: '12 tháng',
  },
];

function PriceChangeLabel({
  x,
  y,
  payload,
  changeKey,
  offsetY = -14,
}) {
  const change =
    payload?.[changeKey];

  if (
    change === null ||
    change === undefined ||
    Number(change) === 0
  ) {
    return null;
  }

  const number =
    Number(change);

  const isIncrease =
    number > 0;

  const formattedValue =
    Math.abs(number)
      .toLocaleString('vi-VN');

  const text =
    isIncrease
      ? `▲ +${formattedValue}`
      : `▼ -${formattedValue}`;

  return (
    <text
      x={x}
      y={y + offsetY}
      textAnchor="middle"
      className={
        isIncrease
          ? 'local-gold-chart__change-label local-gold-chart__change-label--positive'
          : 'local-gold-chart__change-label local-gold-chart__change-label--negative'
      }
    >
      {text}
    </text>
  );
}

function LocalGoldChart({
  activeGoldTab,
  setActiveGoldTab,

  activeHistorySource,
  setActiveHistorySource,

  chartRange,
  setChartRange,
  priceChartData,
  theme,
}) {
  const chartContainerRef =
    useRef(null);

  const [
    chartWidth,
    setChartWidth,
  ] = useState(0);

  useEffect(() => {
    const element =
      chartContainerRef.current;

    if (!element) {
      return undefined;
    }

    function updateChartWidth() {
      const nextWidth =
        Math.floor(
          element.getBoundingClientRect().width
        );

      if (nextWidth > 0) {
        setChartWidth(nextWidth);
      }
    }

    updateChartWidth();

    const resizeObserver =
      new ResizeObserver(
        updateChartWidth
      );

    resizeObserver.observe(
      element
    );

    window.addEventListener(
      'resize',
      updateChartWidth
    );

    return () => {
      resizeObserver.disconnect();

      window.removeEventListener(
        'resize',
        updateChartWidth
      );
    };
  }, [
    activeGoldTab,
    activeHistorySource,
    chartRange,
  ]);

  const activeSourceLabel =
    CHART_SOURCES.find(
      (source) =>
        source.value ===
        activeHistorySource
    )?.label ?? 'PNJ';

  const hasChartData =
    Array.isArray(priceChartData) &&
    priceChartData.length > 0;

  return (
    <section className="card local-gold-chart">
      <div className="local-gold-chart__tabs">
        <button
          type="button"
          className={
            activeGoldTab === 'local'
              ? 'is-active'
              : ''
          }
          onClick={() =>
            setActiveGoldTab('local')
          }
        >
          <BarChart3 size={17} />
          <span>
            Lịch sử giá {activeSourceLabel}
          </span>
        </button>

        <button
          type="button"
          className={
            activeGoldTab === 'world'
              ? 'is-active'
              : ''
          }
          onClick={() =>
            setActiveGoldTab('world')
          }
        >
          <Globe2 size={17} />
          <span>
            Biểu đồ XAU/USD
          </span>
        </button>
      </div>

      {activeGoldTab === 'local' && (
        <>
          <h2 className="section-title">
            <BarChart3 size={20} />
            Biểu đồ lịch sử giá{' '}
            {activeSourceLabel}
          </h2>

          <div className="local-gold-chart__source-buttons">
            {CHART_SOURCES.map(
              (source) => (
                <button
                  key={source.value}
                  type="button"
                  className={
                    activeHistorySource ===
                    source.value
                      ? 'is-active'
                      : ''
                  }
                  onClick={() =>
                    setActiveHistorySource(
                      source.value
                    )
                  }
                >
                  {source.label}
                </button>
              )
            )}
          </div>

          <div className="local-gold-chart__range-buttons">
            {CHART_RANGES.map(
              (range) => (
                <button
                  key={range.value}
                  type="button"
                  className={
                    chartRange ===
                    range.value
                      ? 'is-active'
                      : ''
                  }
                  onClick={() =>
                    setChartRange(
                      range.value
                    )
                  }
                >
                  {range.label}
                </button>
              )
            )}
          </div>

          {!hasChartData ? (
            <p className="small-text">
              Chưa có lịch sử giá{' '}
              {activeSourceLabel} để vẽ
              biểu đồ.
            </p>
          ) : (
            <div
              ref={chartContainerRef}
              className="local-gold-chart__canvas"
            >
              {chartWidth > 0 && (
                <LineChart
                  width={chartWidth}
                  height={300}
                  data={priceChartData}
                  margin={{
                    top: 34,
                    right: 10,
                    left: 0,
                    bottom: 8,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="time"
                    minTickGap={18}
                    tickMargin={8}
                  />

                  <YAxis
                    tickFormatter={(
                      value
                    ) =>
                      formatMoney(
                        value
                      )
                    }
                    domain={[
                      'dataMin - 50000',
                      'dataMax + 50000',
                    ]}
                    width={72}
                  />

                  <Tooltip
                    formatter={(
                      value,
                      name
                    ) => [
                      `${formatMoney(
                        value
                      )} VND`,
                      name,
                    ]}
                    labelFormatter={(
                      _,
                      payload
                    ) => {
                      if (
                        !payload ||
                        payload.length === 0
                      ) {
                        return '';
                      }

                      return payload[0]
                        .payload
                        .fullTime;
                    }}
                  />

                  <Line
                    type="stepAfter"
                    dataKey="price"
                    name={`Giá mua ${activeSourceLabel}`}
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{
                      r: 3,
                      fill: "#ffffff",
                      stroke: "#2563eb",
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  >
                    <LabelList
                      content={(
                        props
                      ) => (
                        <PriceChangeLabel
                          {...props}
                          changeKey="buyPriceChange"
                          offsetY={-15}
                        />
                      )}
                    />
                  </Line>

                  <Line
                    type="stepAfter"
                    dataKey="sellPrice"
                    name={`Giá bán ${activeSourceLabel}`}
                    stroke="#d97706"
                    strokeWidth={3}
                    dot={{
                      r: 3,
                      fill: "#ffffff",
                      stroke: "#d97706",
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  >
                    <LabelList
                      content={(
                        props
                      ) => (
                        <PriceChangeLabel
                          {...props}
                          changeKey="sellPriceChange"
                          offsetY={18}
                        />
                      )}
                    />
                  </Line>
                </LineChart>
              )}
            </div>
          )}
        </>
      )}

      {activeGoldTab === 'world' && (
        <>
          <h2 className="section-title">
            <Globe2 size={20} />
            Biểu đồ vàng thế giới
            XAU/USD
          </h2>

          <p className="small-text">
            Biểu đồ tương tác từ
            TradingView, mã
            OANDA:XAUUSD.
          </p>

          <div className="local-gold-chart__world-chart">
            <TradingViewGoldChart
              theme={theme}
            />
          </div>
        </>
      )}
    </section>
  );
}

export default LocalGoldChart;