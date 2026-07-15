import { useMemo } from 'react';
import { formatDateTime } from '../utils/formatters';

function getChartStartDate(range) {
  const date = new Date();

  if (range === '1d') {
    date.setHours(0, 0, 0, 0);
    return date;
  }

  if (range === '1w') {
    date.setDate(date.getDate() - 7);
  }

  if (range === '1m') {
    date.setMonth(date.getMonth() - 1);
  }

  if (range === '3m') {
    date.setMonth(date.getMonth() - 3);
  }

  if (range === '6m') {
    date.setMonth(date.getMonth() - 6);
  }

  if (range === '12m') {
    date.setMonth(date.getMonth() - 12);
  }

  date.setHours(0, 0, 0, 0);

  return date;
}

function usePriceChartData(priceHistory, chartRange) {
  const priceChartData = useMemo(() => {
    const source = Array.isArray(priceHistory)
      ? priceHistory
      : [];

    const sortedHistory = [...source].sort(
      (firstItem, secondItem) =>
        new Date(firstItem.created_at) -
        new Date(secondItem.created_at)
    );

    if (sortedHistory.length === 0) {
      return [];
    }

    const startDate = getChartStartDate(chartRange);
    startDate.setHours(0, 0, 0, 0);

    /*
     * Những lần cập nhật nằm trong khoảng thời gian đang xem.
     */
    const historyInRange = sortedHistory.filter(
      (item) =>
        new Date(item.created_at) >= startDate
    );

    /*
     * Những lần cập nhật xảy ra trước khoảng thời gian đang xem.
     */
    const historyBeforeRange = sortedHistory.filter(
      (item) =>
        new Date(item.created_at) < startDate
    );

    /*
     * Lấy giá cuối cùng trước thời điểm bắt đầu.
     *
     * Ví dụ:
     * Hôm nay chưa cập nhật giá thì biểu đồ vẫn bắt đầu
     * bằng giá cuối cùng của ngày hôm qua.
     */
    const latestPreviousPrice =
      historyBeforeRange.length > 0
        ? historyBeforeRange[
        historyBeforeRange.length - 1
        ]
        : null;

    const chartData = [];

    if (latestPreviousPrice) {
      chartData.push({
        time:
          chartRange === '1d'
            ? 'Đầu ngày'
            : startDate.toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
            }),

        fullTime: `${startDate.toLocaleDateString(
          'vi-VN'
        )} 00:00`,

        price: Number(
          latestPreviousPrice.price_per_chi || 0
        ),

        sellPrice: Number(
          latestPreviousPrice.sell_price_per_chi || 0
        ),

        buyPriceChange: null,
        sellPriceChange: null,
        isCarriedForward: true,
      });
    }

    /*
     * Thêm các lần cập nhật thật trong khoảng thời gian đang xem.
     */
    const previousPriceByGoldType = new Map();

    /*
     * Lưu giá gần nhất trước khoảng đang xem
     * để lần cập nhật đầu tiên vẫn tính được tăng/giảm.
     */
    for (const item of historyBeforeRange) {
      const goldTypeKey = String(item.gold_type || '')
        .trim()
        .toLowerCase();

      previousPriceByGoldType.set(goldTypeKey, item);
    }

    /*
     * Thêm các lần cập nhật thật trong khoảng thời gian đang xem.
     */
    for (const item of historyInRange) {
      const goldTypeKey = String(item.gold_type || '')
        .trim()
        .toLowerCase();

      const previousItem =
        previousPriceByGoldType.get(goldTypeKey);

      const currentBuyPrice = Number(
        item.price_per_chi || 0
      );

      const currentSellPrice = Number(
        item.sell_price_per_chi || 0
      );

      const buyPriceChange = previousItem
        ? currentBuyPrice -
        Number(previousItem.price_per_chi || 0)
        : null;

      const sellPriceChange = previousItem
        ? currentSellPrice -
        Number(previousItem.sell_price_per_chi || 0)
        : null;

      chartData.push({
        time: new Date(item.created_at).toLocaleString(
          'vi-VN',
          {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }
        ),

        fullTime: formatDateTime(item.created_at),

        goldType: item.gold_type,

        price: currentBuyPrice,
        sellPrice: currentSellPrice,

        buyPriceChange,
        sellPriceChange,

        isCarriedForward: false,
      });

      previousPriceByGoldType.set(
        goldTypeKey,
        item
      );
    }

    /*
     * Nếu không có giá cũ trước khoảng xem
     * nhưng vẫn có lịch sử, lấy dòng gần nhất.
     */
    if (
      chartData.length === 0 &&
      sortedHistory.length > 0
    ) {
      const latestPrice =
        sortedHistory[
        sortedHistory.length - 1
        ];

      chartData.push({
        time: 'Giá gần nhất',
        fullTime: formatDateTime(
          latestPrice.created_at
        ),
        price: Number(
          latestPrice.price_per_chi || 0
        ),
        sellPrice: Number(
          latestPrice.sell_price_per_chi || 0
        ),
        buyPriceChange,
        sellPriceChange,
        isCarriedForward: true,
      });
    }

    return chartData;
  }, [priceHistory, chartRange]);

  return priceChartData;
}

export default usePriceChartData;