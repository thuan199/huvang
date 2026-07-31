import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  getGoldData,
} from '../services/goldDataService';

import { supabase } from '../supabaseClient';

const MARKET_SOURCES = [
  'PNJ',
  'SJC',
  'MI_HONG',
];

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

function getItemSourceCode(item) {
  const source =
    Array.isArray(item?.source)
      ? item.source[0]
      : item?.source;

  const joinedSource =
    Array.isArray(
      item?.gold_price_sources
    )
      ? item.gold_price_sources[0]
      : item?.gold_price_sources;

  return normalizeSourceCode(
    item?.source_code ??
    item?.sourceCode ??
    source?.code ??
    source?.source_code ??
    joinedSource?.code ??
    joinedSource?.source_code ??
    item?.source_name ??
    item?.source
  );
}

function createEmptySourceGroups() {
  return {
    PNJ: [],
    SJC: [],
    MI_HONG: [],
  };
}

function groupMarketRowsBySource(rows = []) {
  const groups =
    createEmptySourceGroups();

  if (!Array.isArray(rows)) {
    return groups;
  }

  rows.forEach((item) => {
    const sourceCode =
      getItemSourceCode(item);

    if (!sourceCode) {
      return;
    }

    if (!groups[sourceCode]) {
      groups[sourceCode] = [];
    }

    groups[sourceCode].push({
      ...item,
      source_code: sourceCode,
    });
  });

  return groups;
}

function normalizeMarketRows(rows = []) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((item) => {
    const sourceCode =
      getItemSourceCode(item);

    return {
      ...item,
      source_code:
        sourceCode ||
        item?.source_code ||
        '',
    };
  });
}

function mergeUniqueRows(...collections) {
  const result = [];
  const seen = new Set();

  collections.forEach((collection) => {
    if (!Array.isArray(collection)) {
      return;
    }

    collection.forEach((item, index) => {
      const sourceCode =
        getItemSourceCode(item);

      const key = String(
        item?.id ??
        [
          sourceCode,
          item?.product_id ??
            item?.source_product_id ??
            item?.gold_type_id ??
            '',
          item?.recorded_at ??
            item?.fetched_at ??
            item?.updated_at ??
            item?.created_at ??
            '',
          item?.buy_price ??
            item?.buy_price_per_chi ??
            item?.current_price_per_chi ??
            item?.price_per_chi ??
            '',
          item?.sell_price ??
            item?.sell_price_per_chi ??
            '',
          index,
        ].join('|')
      );

      if (seen.has(key)) {
        return;
      }

      seen.add(key);

      result.push({
        ...item,
        source_code: sourceCode,
      });
    });
  });

  return result;
}

function createEmptyGoldData() {
  return {
    transactions: [],

    /*
     * Giữ lại để tương thích với code cũ.
     * Nếu đã bỏ giá cá nhân thì hai mảng này
     * có thể luôn rỗng.
     */
    prices: [],
    priceHistory: [],
    personalPriceHistory: [],

    /*
     * Dữ liệu thị trường của PNJ, SJC, Mi Hồng.
     */
    marketCurrentPrices: [],
    marketPriceHistory: [],

    currentPricesBySource:
      createEmptySourceGroups(),

    priceHistoryBySource:
      createEmptySourceGroups(),

    /*
     * Giữ lại để tương thích với các component
     * cũ chỉ sử dụng PNJ.
     */
    pnjCurrentPrice: null,
    pnjPriceHistory: [],
  };
}

function buildNormalizedGoldData(result) {
  const safeResult =
    result ?? {};

  /*
   * Ưu tiên dữ liệu chung do goldDataService trả về.
   * Nếu service chỉ trả từng nguồn riêng lẻ thì gộp lại.
   */
  const currentRowsFromGroups =
    MARKET_SOURCES.flatMap(
      (sourceCode) =>
        safeResult
          ?.currentPricesBySource
          ?.[sourceCode] ?? []
    );

  const historyRowsFromGroups =
    MARKET_SOURCES.flatMap(
      (sourceCode) =>
        safeResult
          ?.priceHistoryBySource
          ?.[sourceCode] ?? []
    );

  const marketCurrentPrices =
    normalizeMarketRows(
      mergeUniqueRows(
        safeResult.marketCurrentPrices,
        currentRowsFromGroups,
        safeResult.pnjCurrentPrice
          ? [safeResult.pnjCurrentPrice]
          : []
      )
    );

  const marketPriceHistory =
    normalizeMarketRows(
      mergeUniqueRows(
        safeResult.marketPriceHistory,
        historyRowsFromGroups,
        safeResult.pnjPriceHistory
      )
    );

  const currentPricesBySource =
    groupMarketRowsBySource(
      marketCurrentPrices
    );

  const priceHistoryBySource =
    groupMarketRowsBySource(
      marketPriceHistory
    );

  return {
    transactions:
      safeResult.transactions ?? [],

    prices:
      safeResult.prices ?? [],

    priceHistory:
      safeResult.priceHistory ?? [],

    personalPriceHistory:
      safeResult.personalPriceHistory ??
      safeResult.priceHistory ??
      [],

    marketCurrentPrices,
    marketPriceHistory,
    currentPricesBySource,
    priceHistoryBySource,

    pnjCurrentPrice:
      safeResult.pnjCurrentPrice ??
      currentPricesBySource.PNJ?.[0] ??
      null,

    pnjPriceHistory:
      safeResult.pnjPriceHistory?.length
        ? normalizeMarketRows(
            safeResult.pnjPriceHistory
          )
        : priceHistoryBySource.PNJ ?? [],
  };
}

function useGoldData(userId) {
  const [goldData, setGoldData] =
    useState(createEmptyGoldData);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const requestIdRef =
    useRef(0);

  const resetGoldData =
    useCallback(() => {
      requestIdRef.current += 1;

      setGoldData(
        createEmptyGoldData()
      );

      setLoading(false);
      setError('');
    }, []);

  const loadGoldData =
    useCallback(
      async ({
        force = false,
      } = {}) => {
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

          const normalizedResult =
            buildNormalizedGoldData(
              result
            );

          /*
           * Nếu có request mới hơn thì không ghi đè
           * dữ liệu của request mới.
           */
          if (
            requestId !==
            requestIdRef.current
          ) {
            return normalizedResult;
          }

          setGoldData(
            normalizedResult
          );

          return normalizedResult;
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
      [
        userId,
        resetGoldData,
      ]
    );

  const reloadGoldData =
    useCallback(
      () =>
        loadGoldData({
          force: true,
        }),
      [loadGoldData]
    );

  useEffect(() => {
    loadGoldData().catch(
      () => {}
    );
  }, [
    userId,
    loadGoldData,
  ]);

  /*
   * Realtime cho dữ liệu cá nhân.
   */
  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    let reloadTimer;

    function scheduleReload() {
      window.clearTimeout(
        reloadTimer
      );

      reloadTimer =
        window.setTimeout(
          () => {
            reloadGoldData().catch(
              () => {}
            );
          },
          300
        );
    }

    const personalChannel =
      supabase
        .channel(
          `gold-personal-data-${userId}`
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table:
              'gold_transactions',
            filter:
              `user_id=eq.${userId}`,
          },
          scheduleReload
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table:
              'user_gold_preferences',
            filter:
              `user_id=eq.${userId}`,
          },
          scheduleReload
        )
        .subscribe();

    return () => {
      window.clearTimeout(
        reloadTimer
      );

      supabase.removeChannel(
        personalChannel
      );
    };
  }, [
    userId,
    reloadGoldData,
  ]);

  /*
   * Realtime cho dữ liệu thị trường của:
   * - PNJ
   * - SJC
   * - Mi Hồng
   */
  useEffect(() => {
    let reloadTimer;

    function scheduleMarketReload() {
      window.clearTimeout(
        reloadTimer
      );

      reloadTimer =
        window.setTimeout(
          () => {
            reloadGoldData().catch(
              () => {}
            );
          },
          300
        );
    }

    const marketChannel =
      supabase
        .channel(
          `shared-gold-market-data-${userId || 'guest'}`
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table:
              'gold_price_latest',
          },
          scheduleMarketReload
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table:
              'gold_price_history',
          },
          scheduleMarketReload
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table:
              'gold_source_products',
          },
          scheduleMarketReload
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table:
              'gold_price_sources',
          },
          scheduleMarketReload
        )
        .subscribe();

    return () => {
      window.clearTimeout(
        reloadTimer
      );

      supabase.removeChannel(
        marketChannel
      );
    };
  }, [
    userId,
    reloadGoldData,
  ]);

  /*
   * Tải lại dữ liệu khi người dùng quay lại tab.
   * Áp dụng cho cả khách để giá công khai luôn mới.
   */
  useEffect(() => {
    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        'visible'
      ) {
        reloadGoldData().catch(
          () => {}
        );
      }
    }

    function handleWindowFocus() {
      reloadGoldData().catch(
        () => {}
      );
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

  /*
   * Các object nhóm theo nguồn luôn có đủ:
   * PNJ, SJC, MI_HONG.
   */
  const currentPricesBySource =
    useMemo(
      () => ({
        ...createEmptySourceGroups(),
        ...goldData.currentPricesBySource,
      }),
      [
        goldData
          .currentPricesBySource,
      ]
    );

  const priceHistoryBySource =
    useMemo(
      () => ({
        ...createEmptySourceGroups(),
        ...goldData.priceHistoryBySource,
      }),
      [
        goldData
          .priceHistoryBySource,
      ]
    );

  return {
    transactions:
      goldData.transactions,

    prices:
      goldData.prices,

    priceHistory:
      goldData.priceHistory,

    personalPriceHistory:
      goldData.personalPriceHistory,

    marketCurrentPrices:
      goldData.marketCurrentPrices,

    marketPriceHistory:
      goldData.marketPriceHistory,

    currentPricesBySource,
    priceHistoryBySource,

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