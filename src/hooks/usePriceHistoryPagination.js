import { useEffect, useMemo, useState } from 'react';

/**
 * Quản lý:
 * - Tính mức tăng/giảm giá mua và giá bán.
 * - So sánh đúng theo từng loại vàng.
 * - Tính tổng số trang.
 * - Cắt dữ liệu theo trang.
 * - Tự điều chỉnh trang hiện tại khi dữ liệu bị xóa.
 */
function usePriceHistoryPagination(
  priceHistory,
  pageSize = 10
) {
  const [currentPage, setCurrentPage] = useState(1);

  /*
   * priceHistory được tải theo created_at giảm dần:
   *
   * index 0: dòng mới nhất
   * index 1: dòng cũ hơn
   *
   * Ta duyệt ngược từ dòng cũ nhất đến mới nhất để mỗi dòng
   * có thể so sánh với lần cập nhật trước đó của cùng loại vàng.
   */
  const historyWithChanges = useMemo(() => {
    const source = Array.isArray(priceHistory)
      ? priceHistory
      : [];

    const previousPriceByGoldType = new Map();
    const result = new Array(source.length);

    for (
      let index = source.length - 1;
      index >= 0;
      index -= 1
    ) {
      const item = source[index];

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

      result[index] = {
        ...item,

        buyPriceChange: previousItem
          ? currentBuyPrice -
            Number(previousItem.price_per_chi || 0)
          : null,

        sellPriceChange: previousItem
          ? currentSellPrice -
            Number(previousItem.sell_price_per_chi || 0)
          : null,
      };

      previousPriceByGoldType.set(
        goldTypeKey,
        item
      );
    }

    return result;
  }, [priceHistory]);

  const totalPages = Math.max(
    1,
    Math.ceil(historyWithChanges.length / pageSize)
  );

  /*
   * Nếu đang ở trang cuối rồi xóa dữ liệu khiến số trang giảm,
   * tự chuyển về trang cuối còn tồn tại.
   */
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  /*
   * Chỉ phân trang sau khi đã tính đầy đủ tăng/giảm
   * trên toàn bộ lịch sử.
   */
  const paginatedHistory = useMemo(() => {
    const startIndex =
      (currentPage - 1) * pageSize;

    return historyWithChanges.slice(
      startIndex,
      startIndex + pageSize
    );
  }, [
    historyWithChanges,
    currentPage,
    pageSize,
  ]);

  function goToPreviousPage() {
    setCurrentPage((page) =>
      Math.max(1, page - 1)
    );
  }

  function goToNextPage() {
    setCurrentPage((page) =>
      Math.min(totalPages, page + 1)
    );
  }

  function goToPage(page) {
    const normalizedPage = Number(page);

    if (!Number.isFinite(normalizedPage)) {
      return;
    }

    setCurrentPage(
      Math.min(
        totalPages,
        Math.max(1, Math.trunc(normalizedPage))
      )
    );
  }

  function resetPage() {
    setCurrentPage(1);
  }

  return {
    historyWithChanges,
    paginatedHistory,

    currentPage,
    totalPages,
    pageSize,

    setCurrentPage,
    goToPreviousPage,
    goToNextPage,
    goToPage,
    resetPage,
  };
}

export default usePriceHistoryPagination;