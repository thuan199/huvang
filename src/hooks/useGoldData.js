import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { getGoldData } from '../services/goldDataService';
import { supabase } from '../supabaseClient';

const EMPTY_GOLD_DATA = {
  // Dữ liệu cá nhân
  transactions: [],
  prices: [],
  priceHistory: [],
  personalPriceHistory: [],

  // Dữ liệu PNJ dùng chung
  pnjCurrentPrice: null,
  pnjPriceHistory: [],
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

      requestIdRef.current =
        requestId;

      setLoading(true);
      setError('');

      try {
        const result =
          await getGoldData(
            userId,
            { force }
          );

        /*
         * Nếu trong lúc request đang chạy đã có request mới hơn
         * thì không ghi đè state bằng dữ liệu cũ.
         */
        if (
          requestId !==
          requestIdRef.current
        ) {
          return result;
        }

        setGoldData({
          transactions:
            result?.transactions ?? [],

          prices:
            result?.prices ?? [],

          /*
           * Lịch sử cá nhân.
           *
           * Giữ priceHistory để tương thích
           * với code cũ.
           */
          priceHistory:
            result?.priceHistory ?? [],

          personalPriceHistory:
            result?.personalPriceHistory ??
            result?.priceHistory ??
            [],

          /*
           * Dữ liệu PNJ dùng chung.
           */
          pnjCurrentPrice:
            result?.pnjCurrentPrice ?? null,

          pnjPriceHistory:
            result?.pnjPriceHistory ?? [],
        });

        return result;
      } catch (loadError) {
        if (
          requestId ===
          requestIdRef.current
        ) {
          setError(
            loadError?.message ||
              'Không thể tải dữ liệu.'
          );
        }

        throw loadError;
      } finally {
        if (
          requestId ===
          requestIdRef.current
        ) {
          setLoading(false);
        }
      }
    },
    [userId]
  );

  /*
   * Tải dữ liệu khi user thay đổi.
   */
  useEffect(() => {
    if (!userId) {
      requestIdRef.current += 1;

      setGoldData(EMPTY_GOLD_DATA);
      setLoading(false);
      setError('');

      return;
    }

    loadGoldData().catch(() => {});
  }, [
    userId,
    loadGoldData,
  ]);

  /*
   * Ép tải lại toàn bộ dữ liệu.
   */
  const reloadGoldData = useCallback(
    async () => {
      return loadGoldData({
        force: true,
      });
    },
    [loadGoldData]
  );

  /*
   * Tự động tải lại khi dữ liệu cá nhân thay đổi.
   */
  useEffect(() => {
    if (!userId) return;

    let reloadTimer;

    function scheduleReload() {
      clearTimeout(reloadTimer);

      reloadTimer = setTimeout(() => {
        reloadGoldData().catch(() => {});
      }, 300);
    }

    const personalChannel = supabase
      .channel(
        `gold-personal-data-${userId}`
      )

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

      supabase.removeChannel(
        personalChannel
      );
    };
  }, [
    userId,
    reloadGoldData,
  ]);

  /*
   * Tự động tải lại khi giá PNJ dùng chung thay đổi.
   *
   * Không dùng filter user_id vì đây là dữ liệu chung.
   */
  useEffect(() => {
    if (!userId) return;

    let reloadTimer;

    function schedulePnjReload() {
      clearTimeout(reloadTimer);

      reloadTimer = setTimeout(() => {
        reloadGoldData().catch(() => {});
      }, 300);
    }

    const pnjChannel = supabase
      .channel('shared-pnj-data')

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pnj_current_price',
        },
        schedulePnjReload
      )

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pnj_price_history',
        },
        schedulePnjReload
      )

      .subscribe();

    return () => {
      clearTimeout(reloadTimer);

      supabase.removeChannel(
        pnjChannel
      );
    };
  }, [
    userId,
    reloadGoldData,
  ]);

  /*
   * Khi quay lại tab hoặc cửa sổ được focus,
   * tải lại để tránh dữ liệu cũ.
   */
  useEffect(() => {
    if (!userId) return;

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        'visible'
      ) {
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
    // Dữ liệu cá nhân
    transactions:
      goldData.transactions,

    prices:
      goldData.prices,

    priceHistory:
      goldData.priceHistory,

    personalPriceHistory:
      goldData.personalPriceHistory,

    // Dữ liệu PNJ dùng chung
    pnjCurrentPrice:
      goldData.pnjCurrentPrice,

    pnjPriceHistory:
      goldData.pnjPriceHistory,

    loading,
    error,

    reloadGoldData,
  };
}

export default useGoldData;