import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  BarChart3,
  BrainCircuit,
  CircleAlert,
  Globe2,
  Inbox,
  Lightbulb,
  LockKeyhole,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
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
import EmptyState from './EmptyState';
import './LocalGoldChart.css';

const CHART_SOURCES = [
  { value: 'PNJ', label: 'PNJ' },
  { value: 'SJC', label: 'SJC' },
  { value: 'MI_HONG', label: 'Mi Hồng' },
];

const CHART_RANGES = [
  { value: '1d', label: 'Hôm nay' },
  { value: '1w', label: '1 tuần' },
  { value: '1m', label: '1 tháng' },
  { value: '3m', label: '3 tháng' },
  { value: '6m', label: '6 tháng' },
  { value: '12m', label: '12 tháng' },
];

function normalizeSourceCode(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/^MIHONG$/, 'MI_HONG');
}

function getSourceLabel(transaction) {
  const sourceCode = normalizeSourceCode(
    transaction?.source_code ??
      transaction?.market_source_code,
  );

  if (sourceCode === 'MI_HONG') return 'Mi Hồng';

  if (sourceCode === 'PRIVATE') {
    return (
      transaction?.shop_name ??
      transaction?.seller_name ??
      transaction?.location ??
      'Tư nhân'
    );
  }

  return sourceCode || 'Khác';
}

function getTransactionName(transaction) {
  const source = getSourceLabel(transaction);
  const goldName =
    transaction?.gold_type ??
    transaction?.gold_name ??
    transaction?.gold_type_name ??
    'Vàng';

  return `${source} · ${goldName}`;
}

function getTransactionDate(transaction) {
  const value =
    transaction?.transaction_date ??
    transaction?.created_at ??
    null;

  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function formatSignedMoney(value) {
  const number = Number(value || 0);
  return `${number > 0 ? '+' : ''}${formatMoney(number)} VND`;
}

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
  const formattedValue = Math.abs(number).toLocaleString('vi-VN');
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
  transactions = [],
  summary = {},
  calculateTransactionResult,
  user,
  onLoginRequired,
}) {
  const chartContainerRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    const element = chartContainerRef.current;
    if (!element) return undefined;

    function updateChartWidth() {
      const nextWidth = Math.floor(
        element.getBoundingClientRect().width,
      );

      if (nextWidth > 0) setChartWidth(nextWidth);
    }

    updateChartWidth();
    const resizeObserver = new ResizeObserver(updateChartWidth);
    resizeObserver.observe(element);
    window.addEventListener('resize', updateChartWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateChartWidth);
    };
  }, [activeGoldTab, activeHistorySource, chartRange]);

  const activeSourceLabel =
    CHART_SOURCES.find(
      (source) => source.value === activeHistorySource,
    )?.label ?? 'PNJ';

  const hasChartData =
    Array.isArray(priceChartData) && priceChartData.length > 0;

  const analysis = useMemo(() => {
    const buyTransactions = (transactions ?? []).filter(
      (transaction) => transaction?.transaction_type === 'BUY',
    );

    const valuedRows = [];
    const sourceMap = new Map();
    let totalBoughtQuantity = 0;
    let totalBoughtCost = 0;

    for (const transaction of buyTransactions) {
      const quantity = Number(transaction?.quantity_chi || 0);
      const unitPrice = Number(
        transaction?.price_per_chi ??
          transaction?.unit_price ??
          0,
      );
      const originalValue = quantity * unitPrice;
      const result = calculateTransactionResult?.(transaction);
      const sourceLabel = getSourceLabel(transaction);

      totalBoughtQuantity += quantity;
      totalBoughtCost += originalValue;

      if (!sourceMap.has(sourceLabel)) {
        sourceMap.set(sourceLabel, {
          source: sourceLabel,
          invested: 0,
          currentValue: 0,
          profit: 0,
          quantity: 0,
        });
      }

      const sourceRow = sourceMap.get(sourceLabel);
      sourceRow.invested += originalValue;
      sourceRow.quantity += quantity;

      if (result?.hasMarketPrice) {
        sourceRow.currentValue += Number(result.currentValue || 0);
        sourceRow.profit += Number(result.profit || 0);

        valuedRows.push({
          transaction,
          result,
          name: getTransactionName(transaction),
        });
      }
    }

    const sortedByProfit = [...valuedRows].sort(
      (first, second) =>
        Number(second.result?.profit || 0) -
        Number(first.result?.profit || 0),
    );

    const profitableCount = valuedRows.filter(
      (row) => Number(row.result?.profit || 0) > 0,
    ).length;
    const losingCount = valuedRows.filter(
      (row) => Number(row.result?.profit || 0) < 0,
    ).length;
    const winRate = valuedRows.length > 0
      ? (profitableCount / valuedRows.length) * 100
      : 0;

    const transactionDates = buyTransactions
      .map(getTransactionDate)
      .filter(Boolean)
      .sort((first, second) => first - second);

    const holdingDays = transactionDates.length > 0
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - transactionDates[0].getTime()) /
              86400000,
          ),
        )
      : 0;

    const sourceRows = Array.from(sourceMap.values())
      .filter((item) => item.currentValue > 0)
      .sort(
        (first, second) =>
          second.currentValue - first.currentValue,
      );

    const totalSourceValue = sourceRows.reduce(
      (total, item) => total + item.currentValue,
      0,
    );

    const sourceAllocation = sourceRows.map((item) => ({
      ...item,
      percent: totalSourceValue > 0
        ? (item.currentValue / totalSourceValue) * 100
        : 0,
    }));

    const maxAllocation = sourceAllocation[0] ?? null;
    const profitPercent = Number(summary?.profitPercent || 0);
    const unpricedCount = Number(
      summary?.unpricedTransactionCount || 0,
    );

    /*
     * Gold Portfolio Score - tối đa 100 điểm.
     * 1. Hiệu suất: 35 điểm
     * 2. Tỷ lệ giao dịch có lãi: 20 điểm
     * 3. Đa dạng nguồn vàng: 15 điểm
     * 4. Quản trị rủi ro: 15 điểm
     * 5. Kỷ luật dữ liệu: 15 điểm
     */
    let performanceScore = 0;

    if (profitPercent > 30) {
      performanceScore = 35;
    } else if (profitPercent >= 15) {
      performanceScore = 32;
    } else if (profitPercent >= 5) {
      performanceScore = 25;
    } else if (profitPercent >= 0) {
      performanceScore = 15;
    } else if (profitPercent >= -5) {
      performanceScore = 8;
    }

    const winRateScore = valuedRows.length > 0
      ? Math.round((winRate / 100) * 20)
      : 0;

    const concentrationPercent = Number(
      maxAllocation?.percent || 0,
    );

    let diversificationScore = 0;

    if (sourceAllocation.length >= 4 && concentrationPercent < 60) {
      diversificationScore = 15;
    } else if (sourceAllocation.length >= 3 && concentrationPercent < 70) {
      diversificationScore = 12;
    } else if (sourceAllocation.length >= 2 && concentrationPercent < 85) {
      diversificationScore = 9;
    } else if (sourceAllocation.length >= 2) {
      diversificationScore = 6;
    } else if (sourceAllocation.length === 1) {
      diversificationScore = 3;
    }

    const worstProfitPercent = Number(
      sortedByProfit[sortedByProfit.length - 1]
        ?.result?.profitPercent || 0,
    );

    let riskScore = 15;

    if (worstProfitPercent <= -30) {
      riskScore = 2;
    } else if (worstProfitPercent <= -20) {
      riskScore = 5;
    } else if (worstProfitPercent <= -10) {
      riskScore = 9;
    } else if (worstProfitPercent < 0) {
      riskScore = 12;
    }

    const transactionsWithNote = buyTransactions.filter(
      (transaction) => String(transaction?.note ?? '').trim() !== '',
    ).length;

    const noteCoverage = buyTransactions.length > 0
      ? transactionsWithNote / buyTransactions.length
      : 0;

    const pricedCoverage = buyTransactions.length > 0
      ? valuedRows.length / buyTransactions.length
      : 0;

    const disciplineScore = Math.round(
      noteCoverage * 6 + pricedCoverage * 9,
    );

    const scoreBreakdown = [
      {
        key: 'performance',
        label: 'Hiệu suất',
        score: performanceScore,
        max: 35,
      },
      {
        key: 'win-rate',
        label: 'Tỷ lệ có lãi',
        score: winRateScore,
        max: 20,
      },
      {
        key: 'diversification',
        label: 'Đa dạng',
        score: diversificationScore,
        max: 15,
      },
      {
        key: 'risk',
        label: 'Rủi ro',
        score: riskScore,
        max: 15,
      },
      {
        key: 'discipline',
        label: 'Kỷ luật dữ liệu',
        score: disciplineScore,
        max: 15,
      },
    ];

    const score = scoreBreakdown.reduce(
      (total, item) => total + item.score,
      0,
    );

    const scoreLabel = score >= 95
      ? 'Chuyên nghiệp'
      : score >= 85
        ? 'Xuất sắc'
        : score >= 70
          ? 'Tốt'
          : score >= 50
            ? 'Ổn định'
            : score >= 30
              ? 'Cần cải thiện'
              : 'Rủi ro cao';

    const scoreStrengths = [];
    const scoreImprovements = [];

    if (performanceScore >= 25) {
      scoreStrengths.push('Hiệu suất đầu tư đang tích cực.');
    } else if (performanceScore < 15) {
      scoreImprovements.push('Hiệu suất danh mục còn thấp.');
    }

    if (winRateScore >= 15) {
      scoreStrengths.push(`Tỷ lệ giao dịch có lãi đạt ${winRate.toFixed(0)}%.`);
    } else if (valuedRows.length > 0) {
      scoreImprovements.push('Tỷ lệ giao dịch có lãi chưa cao.');
    }

    if (diversificationScore >= 12) {
      scoreStrengths.push('Danh mục được phân bổ khá đa dạng.');
    } else if (concentrationPercent >= 70) {
      scoreImprovements.push(
        `${maxAllocation?.source || 'Một nguồn'} đang chiếm ${concentrationPercent.toFixed(0)}% danh mục.`,
      );
    }

    if (riskScore >= 12) {
      scoreStrengths.push('Không có khoản lỗ quá lớn.');
    } else {
      scoreImprovements.push(
        `Khoản lỗ lớn nhất đang ở mức ${Math.abs(worstProfitPercent).toFixed(2)}%.`,
      );
    }

    if (disciplineScore < 10) {
      scoreImprovements.push(
        'Nên bổ sung ghi chú và cập nhật giá hiện tại đầy đủ hơn.',
      );
    }

    const targetProfit = Math.max(
      5000000,
      Math.ceil(Math.max(Number(summary?.profit || 0), 1) / 5000000) * 5000000,
    );
    const targetProgress = Math.max(
      0,
      Math.min(
        100,
        (Number(summary?.profit || 0) / targetProfit) * 100,
      ),
    );

    const insights = [];

    if (profitPercent > 0) {
      insights.push(
        `Danh mục đang có lợi nhuận ${profitPercent.toFixed(2)}%.`,
      );
    } else if (profitPercent < 0) {
      insights.push(
        `Danh mục đang giảm ${Math.abs(profitPercent).toFixed(2)}%.`,
      );
    } else {
      insights.push('Danh mục hiện đang ở mức hòa vốn.');
    }

    if (maxAllocation?.percent >= 70) {
      insights.push(
        `${maxAllocation.source} đang chiếm ${maxAllocation.percent.toFixed(0)}% giá trị danh mục.`,
      );
    } else if (sourceAllocation.length >= 2) {
      insights.push('Danh mục đã được phân bổ ở nhiều nguồn vàng.');
    }

    if (unpricedCount > 0) {
      insights.push(
        `Có ${unpricedCount} giao dịch chưa có giá thu lại hiện tại.`,
      );
    } else if (buyTransactions.length > 0) {
      insights.push('Toàn bộ giao dịch mua đã có giá hiện tại.');
    }

    return {
      averageBuyPrice:
        totalBoughtQuantity > 0
          ? totalBoughtCost / totalBoughtQuantity
          : 0,
      best: sortedByProfit[0] ?? null,
      worst:
        sortedByProfit.length > 0
          ? sortedByProfit[sortedByProfit.length - 1]
          : null,
      sourceAllocation,
      profitableCount,
      losingCount,
      valuedCount: valuedRows.length,
      winRate,
      holdingDays,
      score,
      scoreLabel,
      scoreBreakdown,
      scoreStrengths,
      scoreImprovements,
      targetProfit,
      targetProgress,
      insights,
      maxAllocation,
    };
  }, [transactions, calculateTransactionResult, summary]);

  const profit = Number(summary?.profit || 0);
  const profitPercent = Number(summary?.profitPercent || 0);
  const isPositive = profit >= 0;

  return (
    <section className="card local-gold-chart analysis-dashboard">
      <div className="local-gold-chart__tabs analysis-dashboard__tabs">
        <button
          type="button"
          className={activeGoldTab === 'local' ? 'is-active' : ''}
          onClick={() => setActiveGoldTab('local')}
        >
          <BarChart3 size={17} />
          <span>Giá cửa hàng</span>
        </button>

        <button
          type="button"
          className={activeGoldTab === 'overview' ? 'is-active' : ''}
          onClick={() => setActiveGoldTab('overview')}
        >
          <BrainCircuit size={17} />
          <span>Phân tích</span>
        </button>

        <button
          type="button"
          className={activeGoldTab === 'world' ? 'is-active' : ''}
          onClick={() => setActiveGoldTab('world')}
        >
          <Globe2 size={17} />
          <span>XAU/USD</span>
        </button>
      </div>

      {activeGoldTab === 'overview' && (
        user && transactions.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Chưa đủ dữ liệu phân tích"
            description="Hãy thêm giao dịch đầu tiên và cập nhật giá hiện tại để hệ thống đánh giá danh mục."
          />
        ) : (
        <div className={`smart-analysis ${!user ? 'smart-analysis--locked' : ''}`}>
          <div className="smart-analysis__content smart-analysis__content--compact">
            <div className="smart-analysis__hero smart-analysis__hero--compact">
              <div className="smart-analysis__hero-copy">
                <span className="smart-analysis__eyebrow">
                  <Sparkles size={15} />
                  Insight chính
                </span>

                <h2>
                  {isPositive
                    ? 'Danh mục đang vận hành tích cực'
                    : 'Danh mục đang cần được theo dõi thêm'}
                </h2>

                <p>
                  {analysis.insights[0]}
                  {' '}
                  {analysis.insights[1]}
                </p>

                <div className="smart-analysis__hero-tags">
                  <span>
                    <TrendingUp size={15} />
                    {formatSignedMoney(profit)}
                  </span>

                  <span>
                    <ShieldCheck size={15} />
                    {analysis.valuedCount} giao dịch đã định giá
                  </span>
                </div>
              </div>

              <div
                className={`investment-score investment-score--${
                  analysis.score >= 70 ? 'good' : 'warning'
                }`}
              >
                <span>Gold Health</span>
                <strong>{analysis.score}</strong>
                <small>/100 · {analysis.scoreLabel}</small>

                <div className="investment-score__breakdown">
                  {analysis.scoreBreakdown.map((item) => (
                    <div
                      key={item.key}
                      className="investment-score__criterion"
                      title={`${item.label}: ${item.score}/${item.max} điểm`}
                    >
                      <div>
                        <span>{item.label}</span>
                        <strong>{item.score}/{item.max}</strong>
                      </div>

                      <div className="investment-score__track">
                        <span
                          style={{
                            width: `${Math.min(
                              100,
                              (item.score / item.max) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="portfolio-score-explanation portfolio-score-explanation--compact">
              <div className="portfolio-score-explanation__column">
                <span className="portfolio-score-explanation__title">
                  <ShieldCheck size={17} />
                  Điểm mạnh
                </span>

                <ul>
                  {(analysis.scoreStrengths.length > 0
                    ? analysis.scoreStrengths
                    : ['Chưa có đủ dữ liệu để xác định điểm mạnh.']
                  ).slice(0, 2).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="portfolio-score-explanation__column portfolio-score-explanation__column--warning">
                <span className="portfolio-score-explanation__title">
                  <CircleAlert size={17} />
                  Cần cải thiện
                </span>

                <ul>
                  {(analysis.scoreImprovements.length > 0
                    ? analysis.scoreImprovements
                    : ['Hiện chưa có cảnh báo đáng chú ý.']
                  ).slice(0, 2).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="smart-analysis__two-column smart-analysis__two-column--compact">
              <section className="smart-analysis-panel smart-analysis-panel--allocation">
                <div className="smart-analysis-panel__heading">
                  <div>
                    <span className="smart-analysis-panel__kicker">
                      Danh mục
                    </span>
                    <h3>Phân bổ theo nguồn vàng</h3>
                  </div>

                  <Scale size={20} />
                </div>

                {analysis.sourceAllocation.length === 0 ? (
                  <p className="small-text">
                    Chưa có dữ liệu để phân bổ.
                  </p>
                ) : (
                  <div className="allocation-list">
                    {analysis.sourceAllocation.map((item) => (
                      <div className="allocation-row" key={item.source}>
                        <div className="allocation-row__top">
                          <strong>{item.source}</strong>
                          <span>{item.percent.toFixed(0)}%</span>
                        </div>

                        <div className="allocation-row__track">
                          <span
                            style={{
                              width: `${Math.max(3, item.percent)}%`,
                            }}
                          />
                        </div>

                        <div className="allocation-row__meta">
                          <span>
                            {formatMoney(item.currentValue)} VND
                          </span>

                          <span
                            className={
                              item.profit >= 0 ? 'profit' : 'loss'
                            }
                          >
                            {formatSignedMoney(item.profit)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="smart-analysis-panel smart-analysis-panel--recommendation">
                <div className="smart-analysis-panel__heading">
                  <div>
                    <span className="smart-analysis-panel__kicker">
                      Gợi ý ưu tiên
                    </span>
                    <h3>2 việc nên chú ý</h3>
                  </div>

                  <Lightbulb size={20} />
                </div>

                <div className="recommendation-summary">
                  {analysis.insights.slice(0, 2).map((insight, index) => (
                    <div
                      className="recommendation-summary__item"
                      key={`${insight}-${index}`}
                    >
                      <span>{index + 1}</span>
                      <p>{insight}</p>
                    </div>
                  ))}

                  {analysis.maxAllocation?.percent >= 70 && (
                    <div className="recommendation-summary__alert">
                      <CircleAlert size={17} />

                      <p>
                        Danh mục đang tập trung nhiều ở một nguồn vàng.
                        Có thể cân nhắc đa dạng thêm nếu muốn giảm rủi ro.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          {!user && (
            <button
              type="button"
              className="smart-analysis__login-overlay"
              onClick={onLoginRequired}
            >
              <LockKeyhole size={24} />
              <strong>Đăng nhập để xem phân tích cá nhân</strong>
              <span>Dữ liệu mẫu phía sau sẽ được thay bằng danh mục của bạn.</span>
            </button>
          )}
        </div>
        )
      )}

      {activeGoldTab === 'local' && (
        <>
          <h2 className="section-title">
            <BarChart3 size={20} />
            Biểu đồ lịch sử giá {activeSourceLabel}
          </h2>

          <div className="local-gold-chart__source-buttons">
            {CHART_SOURCES.map((source) => (
              <button
                key={source.value}
                type="button"
                className={
                  activeHistorySource === source.value
                    ? 'is-active'
                    : ''
                }
                onClick={() => setActiveHistorySource(source.value)}
              >
                {source.label}
              </button>
            ))}
          </div>

          <div className="local-gold-chart__range-buttons">
            {CHART_RANGES.map((range) => (
              <button
                key={range.value}
                type="button"
                className={chartRange === range.value ? 'is-active' : ''}
                onClick={() => setChartRange(range.value)}
              >
                {range.label}
              </button>
            ))}
          </div>

          {!hasChartData ? (
            <EmptyState
              icon={BarChart3}
              title="Chưa có dữ liệu biểu đồ"
              description={`Cần ít nhất một lần cập nhật giá ${activeSourceLabel} để bắt đầu hiển thị biểu đồ.`}
              compact
            />
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
                  margin={{ top: 34, right: 10, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" minTickGap={18} tickMargin={8} />
                  <YAxis
                    tickFormatter={(value) => formatMoney(value)}
                    domain={['dataMin - 50000', 'dataMax + 50000']}
                    width={72}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      `${formatMoney(value)} VND`,
                      name,
                    ]}
                    labelFormatter={(_, payload) => {
                      if (!payload || payload.length === 0) return '';
                      return payload[0].payload.fullTime;
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
                      fill: '#ffffff',
                      stroke: '#2563eb',
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  >
                    <LabelList
                      content={(props) => (
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
                      fill: '#ffffff',
                      stroke: '#d97706',
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
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
              )}
            </div>
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

          <div className="local-gold-chart__world-chart">
            <TradingViewGoldChart theme={theme} />
          </div>
        </>
      )}
    </section>
  );
}

export default LocalGoldChart;