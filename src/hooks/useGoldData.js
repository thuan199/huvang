import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { getGoldData } from '../services/goldDataService';
import { supabase } from '../supabaseClient';

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

  useEffect(() => {
    if (!userId) {
      requestIdRef.current += 1;
      setGoldData(EMPTY_GOLD_DATA);
      setLoading(false);
      setError('');

      return;
    }

    loadGoldData().catch(() => {});
  }, [userId, loadGoldData]);

  const reloadGoldData = useCallback(
    async () => {
      return loadGoldData({
        force: true,
      });
    },
    [loadGoldData]
  );

  /*
   * Tự động tải lại dữ liệu khi Supabase phát hiện:
   * - thêm
   * - sửa
   * - xóa
   *
   * từ thiết bị hoặc tab khác.
   */
  useEffect(() => {
    if (!userId) return;

    let reloadTimer;

    function scheduleReload() {
      clearTimeout(reloadTimer);

      /*
       * Gom các sự kiện xảy ra gần nhau thành một lần reload.
       * Ví dụ cập nhật giá có thể thay đổi nhiều bảng cùng lúc.
       */
      reloadTimer = setTimeout(() => {
        reloadGoldData().catch(() => {});
      }, 300);
    }

    const channel = supabase
      .channel(`gold-data-${userId}`)

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gold_transactions',
          filter: `user_id=eq.${userId}`,
        },
        scheduleReload
      )

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gold_prices',
          filter: `user_id=eq.${userId}`,
        },
        scheduleReload
      )

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gold_price_history',
          filter: `user_id=eq.${userId}`,
        },
        scheduleReload
      )

      .subscribe();

    return () => {
      clearTimeout(reloadTimer);
      supabase.removeChannel(channel);
    };
  }, [
    userId,
    reloadGoldData,
  ]);

  /*
   * Khi quay lại tab desktop, tải lại một lần để chắc chắn
   * dữ liệu không bị cũ nếu Realtime từng bị mất kết nối.
   */
  useEffect(() => {
    if (!userId) return;

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        reloadGoldData().catch(() => {});
      }
    }

    function handleWindowFocus() {
      reloadGoldData().catch(() => {});
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );

    window.addEventListener(
      'focus',
      handleWindowFocus
    );

    return () => {
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );

      window.removeEventListener(
        'focus',
        handleWindowFocus
      );
    };
  }, [
    userId,
    reloadGoldData,
  ]);

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