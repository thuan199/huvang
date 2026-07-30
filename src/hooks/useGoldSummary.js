import { useCallback, useMemo } from 'react';

function normalizeSourceCode(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^MIHONG$/, 'MI_HONG');
}

function normalizeProductName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getItemSourceCode(item) {
  const nestedSource =
    Array.isArray(item?.source)
      ? item.source[0]
      : item?.source;

  const joinedSource =
    Array.isArray(item?.gold_price_sources)
      ? item.gold_price_sources[0]
      : item?.gold_price_sources;

  return normalizeSourceCode(
    item?.source_code ??
      item?.sourceCode ??
      nestedSource?.code ??
      nestedSource?.source_code ??
      joinedSource?.code ??
      joinedSource?.source_code ??
      item?.source_name ??
      item?.source,
  );
}

function getItemProductName(item) {
  const nestedProduct =
    Array.isArray(item?.source_product)
      ? item.source_product[0]
      : item?.source_product;

  const joinedProduct =
    Array.isArray(item?.gold_source_products)
      ? item.gold_source_products[0]
      : item?.gold_source_products;

  return (
    item?.product_name ??
    item?.gold_type_name ??
    item?.source_product_name ??
    nestedProduct?.product_name ??
    nestedProduct?.name ??
    joinedProduct?.product_name ??
    joinedProduct?.name ??
    item?.gold_type ??
    ''
  );
}

function getMarketBuybackPrice(
  marketCurrentPrices,
  transaction,
) {
  const sourceCode =
    normalizeSourceCode(
      transaction?.source_code ??
      transaction?.market_source_code,
    );

  const productName =
    normalizeProductName(
      transaction?.gold_type ??
      transaction?.gold_name,
    );

  const sourceRows =
    (Array.isArray(marketCurrentPrices)
      ? marketCurrentPrices
      : []
    ).filter(
      (item) =>
        getItemSourceCode(item) ===
        sourceCode,
    );

  const exactMatch =
    sourceRows.find(
      (item) =>
        normalizeProductName(
          getItemProductName(item),
        ) === productName,
    );

  const aliasesBySource = {
    PNJ: [
      'nhan 9999',
      'nhan tron 9999',
      'vang nhan 9999',
    ],
    MI_HONG: [
      'vang 999',
      'vang 999 9',
      'vang nhan 999',
    ],
    SJC: [
      'nhan sjc',
      'vang nhan sjc',
      'vang mieng sjc',
    ],
  };

  const aliases =
    aliasesBySource[sourceCode] ?? [];

  const aliasMatch =
    sourceRows.find((item) => {
      const normalizedName =
        normalizeProductName(
          getItemProductName(item),
        );

      return aliases.some((alias) =>
        normalizedName.includes(alias),
      );
    });

  const matchedPrice =
    exactMatch ??
    aliasMatch ??
    sourceRows.find(
      (item) =>
        Number(
          item?.buy_price ??
          item?.buy_price_per_chi ??
          item?.current_price_per_chi ??
          item?.price_per_chi ??
          0,
        ) > 0,
    );

  return Number(
    matchedPrice?.buy_price ??
    matchedPrice?.buy_price_per_chi ??
    matchedPrice?.current_price_per_chi ??
    matchedPrice?.price_per_chi ??
    0,
  );
}

function useGoldSummary(
  transactions = [],
  marketCurrentPrices = [],
) {
  const calculateTransactionResult =
    useCallback(
      (transaction) => {
        const quantity = Number(
          transaction?.quantity_chi || 0,
        );

        const buyPrice = Number(
          transaction?.price_per_chi || 0,
        );

        /*
         * Ưu tiên giá mua vào hiện tại vừa đồng bộ
         * từ cửa hàng. Nếu chưa có giá hiện tại,
         * mới dùng giá đã lưu cùng giao dịch.
         */
        const liveMarketPrice =
          getMarketBuybackPrice(
            marketCurrentPrices,
            transaction,
          );

        const storedPrice = Number(
          transaction?.sell_price_per_chi || 0,
        );

        const currentPrice =
          liveMarketPrice > 0
            ? liveMarketPrice
            : storedPrice;

        const originalValue =
          quantity * buyPrice;

        const currentValue =
          quantity * currentPrice;

        const profit =
          currentValue - originalValue;

        const profitPercent =
          originalValue > 0
            ? (profit / originalValue) * 100
            : 0;

        return {
          originalValue,
          currentValue,
          currentPrice,
          profit,
          profitPercent,
          hasMarketPrice:
            currentPrice > 0,
          isLiveMarketPrice:
            liveMarketPrice > 0,
        };
      },
      [marketCurrentPrices],
    );

  const summary = useMemo(() => {
    let totalGoldQuantity = 0;
    let totalBuyCost = 0;
    let totalCurrentValue = 0;

    for (
      const transaction of
      transactions || []
    ) {
      const quantity = Number(
        transaction?.quantity_chi || 0,
      );

      const result =
        calculateTransactionResult(
          transaction,
        );

      if (
        transaction?.transaction_type ===
        'BUY'
      ) {
        totalGoldQuantity += quantity;
        totalBuyCost +=
          result.originalValue;
        totalCurrentValue +=
          result.currentValue;
      } else if (
        transaction?.transaction_type ===
        'SELL'
      ) {
        totalGoldQuantity -= quantity;
      }
    }

    const profit =
      totalCurrentValue -
      totalBuyCost;

    const profitPercent =
      totalBuyCost > 0
        ? (profit / totalBuyCost) * 100
        : 0;

    return {
      totalGoldQuantity,
      totalBuyCost,
      totalCurrentValue,
      profit,
      profitPercent,
    };
  }, [
    transactions,
    calculateTransactionResult,
  ]);

  return {
    summary,
    calculateTransactionResult,
  };
}

export default useGoldSummary;