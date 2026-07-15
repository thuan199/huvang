import {
  BarChart3,
  Globe2,
} from 'lucide-react';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

import { formatMoney } from '../utils/formatters';
import TradingViewGoldChart from './TradingViewGoldChart';

function PriceChangeLabel({
  x,
  y,
  payload,
  changeKey,
  offsetY = -14,
}) {
  const change = payload?.[changeKey];

  if (
    change === null ||
    change === undefined ||
    Number(change) === 0
  ) {
    return null;
  }

  const number = Number(change);
  const isIncrease = number > 0;

  const formattedValue = Math.abs(number).toLocaleString(
    'vi-VN'
  );

  const text = isIncrease
    ? `▲ +${formattedValue}`
    : `▼ -${formattedValue}`;

  return (
    <text
      x={x}
      y={y + offsetY}
      textAnchor="middle"
      className={
        isIncrease
          ? 'chart-change-label chart-change-label-positive'
          : 'chart-change-label chart-change-label-negative'
      }
    >
      {text}
    </text>
  );
}

function LocalGoldChart({
  activeGoldTab,
  setActiveGoldTab,
  chartRange,
  setChartRange,
  priceChartData,
  theme,
}) {
  const chartRanges = [
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

  return (
    <div className="card">
      <div className="gold-chart-tabs">
        <button
          type="button"
          className={
            activeGoldTab === 'local'
              ? 'active'
              : ''
          }
          onClick={() =>
            setActiveGoldTab('local')
          }
        >
          <BarChart3 size={17} />
          Lịch sử giá PNJ
        </button>

        <button
          type="button"
          className={
            activeGoldTab === 'world'
              ? 'active'
              : ''
          }
          onClick={() =>
            setActiveGoldTab('world')
          }
        >
          <Globe2 size={17} />
          Biểu đồ XAU/USD
        </button>
      </div>

      {activeGoldTab === 'local' && (
        <>
          <h2 className="section-title">
            <BarChart3 size={20} />
            Biểu đồ lịch sử giá
          </h2>

          <div className="chart-range-buttons">
            {chartRanges.map((range) => (
              <button
                key={range.value}
                type="button"
                className={
                  chartRange === range.value
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setChartRange(range.value)
                }
              >
                {range.label}
              </button>
            ))}
          </div>

          {priceChartData.length === 0 ? (
            <p className="small-text">
              Chưa có lịch sử giá để vẽ biểu đồ.
            </p>
          ) : (
            <>
              <p className="chart-swipe-hint">
                Vuốt sang trái hoặc phải để xem thêm dữ liệu
              </p>

              <div className="chart-scroll">
                <div className="chart-scroll-content">
                  <ResponsiveContainer
                    width="100%"
                    height={320}
                  >
                    <LineChart
                      data={priceChartData}
                      margin={{
                        top: 34,
                        right: 24,
                        left: 10,
                        bottom: 12,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="time"
                        minTickGap={24}
                      />

                      <YAxis
                        tickFormatter={(value) =>
                          formatMoney(value)
                        }
                        domain={[
                          'dataMin - 50000',
                          'dataMax + 50000',
                        ]}
                        width={90}
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
                            .payload.fullTime;
                        }}
                      />

                      <Line
                        type="stepAfter"
                        dataKey="price"
                        name="Giá mua"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      >
                        <LabelList
                          content={(props) => (
                            <PriceChangeLabel
                              {...props}
                              changeKey="buyPriceChange"
                              offsetY={-16}
                            />
                          )}
                        />
                      </Line>

                      <Line
                        type="stepAfter"
                        dataKey="sellPrice"
                        name="Giá bán"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      >
                        <LabelList
                          content={(props) => (
                            <PriceChangeLabel
                              {...props}
                              changeKey="sellPriceChange"
                              offsetY={18}
                            />
                          )}
                        />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {activeGoldTab === 'world' && (
        <>
          <h2 className="section-title">
            <Globe2 size={20} />
            Biểu đồ vàng thế giới XAU/USD
          </h2>

          <p className="small-text">
            Biểu đồ tương tác từ TradingView, mã OANDA:XAUUSD.
          </p>

          <div className="world-chart-box">
            <TradingViewGoldChart
              theme={theme}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default LocalGoldChart;