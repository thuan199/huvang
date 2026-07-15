import { useMemo } from 'react';

function useGoldSummary(transactions, priceHistory) {
  const priceMap = useMemo(() => {
    const map = {};

    for (const item of priceHistory || []) {
      if (!map[item.gold_type]) {
        map[item.gold_type] = Number(
          item.price_per_chi || 0
        );
      }
    }

    return map;
  }, [priceHistory]);

  function calculateTransactionResult(transaction) {
    const quantity = Number(
      transaction.quantity_chi || 0
    );

    const buyPrice = Number(
      transaction.price_per_chi || 0
    );

    const latestBuybackPrice = Number(
      priceMap[transaction.gold_type] || 0
    );

    const currentPrice = Number(
      latestBuybackPrice ||
      transaction.sell_price_per_chi ||
      buyPrice
    );

    const originalValue = quantity * buyPrice;
    const currentValue = quantity * currentPrice;
    const profit = currentValue - originalValue;

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
    };
  }

  const summary = useMemo(() => {
    let totalGoldQuantity = 0;
    let totalBuyCost = 0;
    let totalCurrentValue = 0;

    for (const transaction of transactions || []) {
      const quantity = Number(
        transaction.quantity_chi || 0
      );

      if (transaction.transaction_type === 'BUY') {
        totalGoldQuantity += quantity;
      } else if (
        transaction.transaction_type === 'SELL'
      ) {
        totalGoldQuantity -= quantity;
      }

      const result =
        calculateTransactionResult(transaction);

      totalBuyCost += result.originalValue;
      totalCurrentValue += result.currentValue;
    }

    const profit =
      totalCurrentValue - totalBuyCost;

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
  }, [transactions, priceMap]);

  return {
    priceMap,
    summary,
    calculateTransactionResult,
  };
}

export default useGoldSummary;