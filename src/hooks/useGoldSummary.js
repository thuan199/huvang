import { useCallback, useMemo } from 'react';

function normalizeText(value) {
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

function normalizeSourceCode(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/^MIHONG$/, 'MI_HONG');
}

function getMarketPrice(marketCurrentPrices, transaction) {
  const sourceCode = normalizeSourceCode(
    transaction?.source_code ?? transaction?.market_source_code,
  );
  const goldType = normalizeText(
    transaction?.gold_type ?? transaction?.gold_name,
  );

  const rows = (marketCurrentPrices ?? []).filter((item) =>
    normalizeSourceCode(item?.source_code ?? item?.source) === sourceCode,
  );

  const exact = rows.find((item) =>
    normalizeText(
      item?.product_name ?? item?.gold_type_name ?? item?.gold_type,
    ) === goldType,
  );

  const selected = exact ?? rows.find((item) => Number(
    item?.buy_price ?? item?.buy_price_per_chi ?? item?.current_price_per_chi ?? 0,
  ) > 0);

  return Number(
    selected?.buy_price ?? selected?.buy_price_per_chi ?? selected?.current_price_per_chi ?? 0,
  );
}

function getPrivatePrice(privateCurrentPrices, transaction) {
  const transactionShopId = String(
    transaction?.private_shop_id ??
    transaction?.shop_id ??
    '',
  ).trim();

  const transactionShopName = normalizeText(
    transaction?.location ??
    transaction?.seller_name ??
    transaction?.shop_name ??
    transaction?.private_shop?.shop_name ??
    transaction?.private_gold_shops?.shop_name,
  );

  const transactionGoldType = normalizeText(
    transaction?.gold_type ??
    transaction?.gold_name ??
    transaction?.gold_type_name,
  );

  const rows = (privateCurrentPrices ?? []).map((item) => ({
    item,
    shopId: String(
      item?.shop_id ??
      item?.private_shop_id ??
      item?.shop?.id ??
      '',
    ).trim(),
    shopName: normalizeText(
      item?.shop_name ??
      item?.shop?.shop_name ??
      item?.private_gold_shops?.shop_name,
    ),
    goldType: normalizeText(
      item?.gold_type_name ??
      item?.gold_type ??
      item?.gold_name,
    ),
  }));

  const rowsOfSameShop = rows.filter((row) => {
    const sameShopId =
      transactionShopId !== '' &&
      row.shopId !== '' &&
      row.shopId === transactionShopId;

    const sameShopName =
      transactionShopName !== '' &&
      row.shopName !== '' &&
      row.shopName === transactionShopName;

    return sameShopId || sameShopName;
  });

  /*
   * Ưu tiên 1: khớp chính xác tiệm + loại vàng.
   */
  let matchedRow = rowsOfSameShop.find(
    (row) =>
      transactionGoldType !== '' &&
      row.goldType !== '' &&
      row.goldType === transactionGoldType,
  );

  /*
   * Ưu tiên 2: tên loại vàng có quan hệ bao hàm.
   * Ví dụ:
   * - Giao dịch: "Nhẫn"
   * - Giá hiện tại: "Nhẫn 9999"
   */
  if (!matchedRow && transactionGoldType) {
    matchedRow = rowsOfSameShop.find((row) => {
      if (!row.goldType) return false;

      return (
        row.goldType.includes(transactionGoldType) ||
        transactionGoldType.includes(row.goldType)
      );
    });
  }

  /*
   * Ưu tiên 3: nếu tiệm chỉ có đúng một loại giá,
   * dùng mức giá duy nhất đó cho giao dịch của tiệm.
   */
  if (!matchedRow && rowsOfSameShop.length === 1) {
    matchedRow = rowsOfSameShop[0];
  }

  const matched = matchedRow?.item ?? null;

  return {
    price: Number(
      matched?.buy_price_per_chi ??
      matched?.buy_price ??
      0,
    ),
    priceDate:
      matched?.price_date ??
      matched?.updated_at ??
      matched?.created_at ??
      null,
    priceId: matched?.id ?? null,
  };
}

export default function useGoldSummary(
  transactions = [],
  marketCurrentPrices = [],
  privateCurrentPrices = [],
) {
  const calculateTransactionResult = useCallback((transaction) => {
    const quantity = Number(transaction?.quantity_chi || 0);
    const buyPrice = Number(
      transaction?.price_per_chi ?? transaction?.unit_price ?? 0,
    );
    const sourceCode = normalizeSourceCode(
      transaction?.source_code ?? transaction?.market_source_code,
    );

    let currentPrice = 0;
    let priceDate = null;
    let priceSource = 'none';

    if (sourceCode === 'PRIVATE') {
      const privatePrice = getPrivatePrice(privateCurrentPrices, transaction);
      currentPrice = privatePrice.price;
      priceDate = privatePrice.priceDate;
      priceSource = currentPrice > 0 ? 'private-latest' : 'none';
    } else {
      currentPrice = getMarketPrice(marketCurrentPrices, transaction);
      priceSource = currentPrice > 0 ? 'market-live' : 'none';
    }

    const originalValue = quantity * buyPrice;
    const currentValue = quantity * currentPrice;
    const profit = currentValue - originalValue;
    const profitPercent = originalValue > 0 && currentPrice > 0
      ? (profit / originalValue) * 100
      : 0;

    return {
      originalValue,
      currentValue,
      currentPrice,
      profit,
      profitPercent,
      hasMarketPrice: currentPrice > 0,
      isLiveMarketPrice: priceSource === 'market-live',
      priceSource,
      priceDate,
    };
  }, [marketCurrentPrices, privateCurrentPrices]);

  const summary = useMemo(() => {
    let totalGoldQuantity = 0;
    let totalBuyCost = 0;
    let valuedBuyCost = 0;
    let totalCurrentValue = 0;
    let unpricedTransactionCount = 0;
    let unpricedGoldQuantity = 0;

    for (const transaction of transactions ?? []) {
      const quantity = Number(transaction?.quantity_chi || 0);
      const result = calculateTransactionResult(transaction);

      if (transaction?.transaction_type === 'BUY') {
        totalGoldQuantity += quantity;
        totalBuyCost += result.originalValue;

        if (result.hasMarketPrice) {
          valuedBuyCost += result.originalValue;
          totalCurrentValue += result.currentValue;
        } else {
          unpricedTransactionCount += 1;
          unpricedGoldQuantity += quantity;
        }
      } else if (transaction?.transaction_type === 'SELL') {
        totalGoldQuantity -= quantity;
      }
    }

    const profit = totalCurrentValue - valuedBuyCost;
    const profitPercent = valuedBuyCost > 0 ? (profit / valuedBuyCost) * 100 : 0;

    return {
      totalGoldQuantity,
      totalBuyCost,
      totalCurrentValue,
      valuedBuyCost,
      profit,
      profitPercent,
      unpricedTransactionCount,
      unpricedGoldQuantity,
    };
  }, [transactions, calculateTransactionResult]);

  return { summary, calculateTransactionResult };
}