import { useMemo } from 'react';

function useGoldSummary(transactions) {
  function calculateTransactionResult(
    transaction
  ) {
    const quantity = Number(
      transaction.quantity_chi || 0
    );

    const buyPrice = Number(
      transaction.price_per_chi || 0
    );

    /*
     * Giá thu lại đã được lấy tại thời điểm
     * nhập giao dịch và lưu vào database.
     */
    const currentPrice = Number(
      transaction.sell_price_per_chi || 0
    );

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
    };
  }

  const summary = useMemo(() => {
    let totalGoldQuantity = 0;
    let totalBuyCost = 0;
    let totalCurrentValue = 0;

    for (
      const transaction of
      transactions || []
    ) {
      const quantity = Number(
        transaction.quantity_chi || 0
      );

      const result =
        calculateTransactionResult(
          transaction
        );

      if (
        transaction.transaction_type ===
        'BUY'
      ) {
        totalGoldQuantity += quantity;
        totalBuyCost +=
          result.originalValue;
        totalCurrentValue +=
          result.currentValue;
      } else if (
        transaction.transaction_type ===
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
  }, [transactions]);

  return {
    summary,
    calculateTransactionResult,
  };
}

export default useGoldSummary;