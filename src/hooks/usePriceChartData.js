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

function getItemDate(item) {
  return (
    item?.source_updated_at ||
    item?.fetched_at ||
    item?.updated_at ||
    item?.created_at ||
    null
  );
}

function getBuyPrice(item) {
  return Number(
    item?.buy_price ??
    item?.buy_price_per_chi ??
    item?.price_per_chi ??
    item?.current_price_per_chi ??
    0
  );
}

function getSellPrice(item) {
  return Number(
    item?.sell_price ??
    item?.sell_price_per_chi ??
    0
  );
}

function getGoldTypeKey(item) {
  return String(
    item?.gold_type_code ??
    item?.gold_type_name ??
    item?.gold_type ??
    item?.product_code ??
    item?.product_name ??
    ''
  )
    .trim()
    .toLowerCase();
}

function getGoldTypeName(item) {
  return (
    item?.gold_type_name ||
    item?.gold_type ||
    item?.product_name ||
    item?.product_code ||
    'Không xác định'
  );
}

function usePriceChartData(
  priceHistory,
  chartRange
) {
  const priceChartData = useMemo(() => {
    const source = Array.isArray(priceHistory)
      ? priceHistory
      : [];

    const validHistory = source.filter((item) => {
      const itemDate = getItemDate(item);

      return (
        itemDate &&
        !Number.isNaN(
          new Date(itemDate).getTime()
        )
      );
    });

    const sortedHistory = [
      ...validHistory,
    ].sort((firstItem, secondItem) => {
      return (
        new Date(
          getItemDate(firstItem)
        ).getTime() -
        new Date(
          getItemDate(secondItem)
        ).getTime()
      );
    });

    if (sortedHistory.length === 0) {
      return [];
    }

    const startDate =
      getChartStartDate(chartRange);

    const historyInRange =
      sortedHistory.filter((item) => {
        const itemDate = new Date(
          getItemDate(item)
        );

        return itemDate >= startDate;
      });

    const historyBeforeRange =
      sortedHistory.filter((item) => {
        const itemDate = new Date(
          getItemDate(item)
        );

        return itemDate < startDate;
      });

    const chartData = [];

    /*
     * Lưu giá gần nhất của từng loại vàng
     * trước khoảng thời gian đang xem.
     */
    const previousPriceByGoldType =
      new Map();

    for (const item of historyBeforeRange) {
      const goldTypeKey =
        getGoldTypeKey(item);

      previousPriceByGoldType.set(
        goldTypeKey,
        item
      );
    }

    /*
     * Thêm điểm đầu khoảng cho từng loại vàng.
     */
    for (const [
      goldTypeKey,
      previousItem,
    ] of previousPriceByGoldType.entries()) {
      chartData.push({
        time:
          chartRange === '1d'
            ? 'Đầu ngày'
            : startDate.toLocaleDateString(
              'vi-VN',
              {
                day: '2-digit',
                month: '2-digit',
              }
            ),

        fullTime: `${startDate.toLocaleDateString(
          'vi-VN'
        )} 00:00`,

        goldType:
          getGoldTypeName(previousItem),

        goldTypeKey,

        source:
          previousItem.source_code ||
          previousItem.source ||
          '',

        price:
          getBuyPrice(previousItem),

        sellPrice:
          getSellPrice(previousItem),

        buyPriceChange: null,
        sellPriceChange: null,

        note:
          previousItem.note ?? '',

        isCarriedForward: true,
      });
    }

    /*
     * Thêm các lần cập nhật thật
     * trong khoảng thời gian đang xem.
     */
    for (const item of historyInRange) {
      const goldTypeKey =
        getGoldTypeKey(item);

      const previousItem =
        previousPriceByGoldType.get(
          goldTypeKey
        );

      const currentBuyPrice =
        getBuyPrice(item);

      const currentSellPrice =
        getSellPrice(item);

      const previousBuyPrice =
        previousItem
          ? getBuyPrice(previousItem)
          : null;

      const previousSellPrice =
        previousItem
          ? getSellPrice(previousItem)
          : null;

      const buyPriceChange =
        previousBuyPrice !== null
          ? currentBuyPrice -
            previousBuyPrice
          : null;

      const sellPriceChange =
        previousSellPrice !== null
          ? currentSellPrice -
            previousSellPrice
          : null;

      const itemDate =
        getItemDate(item);

      chartData.push({
        time: new Date(
          itemDate
        ).toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),

        fullTime:
          formatDateTime(itemDate),

        goldType:
          getGoldTypeName(item),

        goldTypeKey,

        source:
          item.source_code ||
          item.source ||
          '',

        price:
          currentBuyPrice,

        sellPrice:
          currentSellPrice,

        buyPriceChange,
        sellPriceChange,

        note:
          item.note ?? '',

        isCarriedForward: false,
      });

      previousPriceByGoldType.set(
        goldTypeKey,
        item
      );
    }

    /*
     * Nếu khoảng thời gian không có dữ liệu
     * và cũng không có điểm chuyển tiếp,
     * hiển thị dòng giá gần nhất.
     */
    if (
      chartData.length === 0 &&
      sortedHistory.length > 0
    ) {
      const latestPrice =
        sortedHistory[
          sortedHistory.length - 1
        ];

      const latestDate =
        getItemDate(latestPrice);

      chartData.push({
        time: 'Giá gần nhất',

        fullTime:
          formatDateTime(latestDate),

        goldType:
          getGoldTypeName(latestPrice),

        goldTypeKey:
          getGoldTypeKey(latestPrice),

        source:
          latestPrice.source_code ||
          latestPrice.source ||
          '',

        price:
          getBuyPrice(latestPrice),

        sellPrice:
          getSellPrice(latestPrice),

        buyPriceChange: null,
        sellPriceChange: null,

        note:
          latestPrice.note ?? '',

        isCarriedForward: true,
      });
    }

    return chartData;
  }, [priceHistory, chartRange]);

  return priceChartData;
}

export default usePriceChartData;