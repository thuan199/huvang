import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { getGoldData } from '../services/goldDataService';

const EMPTY_GOLD_DATA = {
  transactions: [],
  prices: [],
  priceHistory: [],
};

function useGoldData(userId) {
  const [goldData, setGoldData] =
    useState(EMPTY_GOLD_DATA);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  /*
   * Mỗi lần tải sẽ có một ID.
   * Chỉ request mới nhất được quyền cập nhật state.
   */
  const requestIdRef = useRef(0);

  const loadGoldData = useCallback(
    async ({ force = false } = {}) => {
      if (!userId) {
        requestIdRef.current += 1;
        setGoldData(EMPTY_GOLD_DATA);
        setLoading(false);
        setError('');

        return EMPTY_GOLD_DATA;
      }

      const requestId =
        requestIdRef.current + 1;

      requestIdRef.current = requestId;

      setLoading(true);
      setError('');

      try {
        const result = await getGoldData(
          userId,
          { force }
        );

        /*
         * Nếu trong lúc chờ đã có request mới hơn,
         * không dùng kết quả cũ này nữa.
         */
        if (
          requestId !== requestIdRef.current
        ) {
          return result;
        }

        setGoldData(result);

        return result;
      } catch (loadError) {
        if (
          requestId === requestIdRef.current
        ) {
          setError(
            loadError?.message ||
              'Không thể tải dữ liệu.'
          );
        }

        throw loadError;
      } finally {
        if (
          requestId === requestIdRef.current
        ) {
          setLoading(false);
        }
      }
    },
    [userId]
  );

  /*
   * Tự tải khi đăng nhập hoặc đổi tài khoản.
   */
  useEffect(() => {
    if (!userId) {
      requestIdRef.current += 1;
      setGoldData(EMPTY_GOLD_DATA);
      setLoading(false);
      setError('');

      return;
    }

    loadGoldData().catch(() => {
      /*
       * Lỗi đã được lưu vào state error.
       * Không cần throw tiếp trong useEffect.
       */
    });
  }, [userId, loadGoldData]);

  /*
   * Dùng sau khi thêm, sửa hoặc xóa.
   * force = true để chắc chắn lấy dữ liệu mới.
   */
  const reloadGoldData = useCallback(
    async () => {
      return loadGoldData({
        force: true,
      });
    },
    [loadGoldData]
  );

  return {
    transactions: goldData.transactions,
    prices: goldData.prices,
    priceHistory: goldData.priceHistory,

    loading,
    error,

    reloadGoldData,
  };
}

export default useGoldData;