import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AlertCircle,
  CheckCircle2,
  CloudDownload,
  Info,
  RefreshCcw,
  Store,
  X,
} from 'lucide-react';

import { formatMoney } from '../utils/formatters';
import { syncAllGoldPrices } from '../services/goldDataService.js';

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

function getSourceCode(item) {
  const nestedSource = Array.isArray(item?.source)
    ? item.source[0]
    : item?.source;
  const joinedSource = Array.isArray(item?.gold_price_sources)
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

function getSourceLabel(code) {
  return code === 'MI_HONG' ? 'Mi Hồng' : code || 'Không xác định';
}

function getProductName(item) {
  const sourceCode = getSourceCode(item);
  if (sourceCode === 'SJC') {
    return item?.gold_type_name ?? item?.product_name ?? item?.gold_type ?? 'Vàng miếng SJC 1 lượng';
  }

  return item?.gold_type_name ?? item?.product_name ?? item?.source_product_name ?? item?.gold_type ?? 'Loại vàng';
}

function getBuyPrice(item) {
  return Number(
    item?.buy_price ??
      item?.buy_price_per_chi ??
      item?.current_price_per_chi ??
      item?.price_per_chi ??
      0,
  );
}

function getSellPrice(item) {
  return Number(item?.sell_price ?? item?.sell_price_per_chi ?? 0);
}

function getUpdatedAt(item) {
  /*
   * Một số nguồn, đặc biệt Mi Hồng, có thể giữ
   * source_updated_at cũ dù bản ghi vừa được đồng bộ.
   * Vì vậy không lấy field đầu tiên có dữ liệu, mà chọn
   * thời gian hợp lệ mới nhất trong tất cả các field.
   */
  const candidates = [
    item?.source_updated_at,
    item?.price_updated_at,
    item?.last_updated_at,
    item?.recorded_at,
    item?.fetched_at,
    item?.updated_at,
    item?.created_at,
  ];

  let latestValue = null;
  let latestTime = 0;

  for (const value of candidates) {
    const time = getTime(value);

    if (time > latestTime) {
      latestTime = time;
      latestValue = value;
    }
  }

  return latestValue;
}

function getTime(value) {
  const time = new Date(value ?? 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function formatRelativeTime(value) {
  const time = getTime(value);
  if (!time) return 'Chưa xác định';

  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return 'Cập nhật vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Cập nhật ${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Cập nhật ${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `Cập nhật ${days} ngày trước`;
}

function CountUpNumber({ value, duration = 650 }) {
  const numericValue = Number(value ?? 0);
  const [displayValue, setDisplayValue] = useState(numericValue);
  const previousRef = useRef(numericValue);

  useEffect(() => {
    const from = previousRef.current;
    const to = numericValue;
    previousRef.current = to;

    if (!Number.isFinite(to) || from === to) {
      setDisplayValue(to);
      return undefined;
    }

    let frameId;
    const startedAt = performance.now();

    const animate = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(from + (to - from) * eased));
      if (progress < 1) frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [numericValue, duration]);

  return formatMoney(displayValue);
}

function PriceDelta({ change }) {
  if (change === null || change === undefined || !Number.isFinite(Number(change))) {
    return <div className="current-market-price-item__delta current-market-price-item__delta--flat">— Chưa có lần trước</div>;
  }

  const numeric = Number(change);
  const direction = numeric > 0 ? 'up' : numeric < 0 ? 'down' : 'flat';
  const arrow = numeric > 0 ? '↗' : numeric < 0 ? '↘' : '→';
  const sign = numeric > 0 ? '+' : '';

  return (
    <div className={`current-market-price-item__delta current-market-price-item__delta--${direction}`}>
      <span>{arrow}</span>
      <strong>{sign}{formatMoney(numeric)}</strong>
      <small>so với lần trước</small>
    </div>
  );
}

function PriceSkeleton() {
  return (
    <article className="current-market-price-item current-market-price-item--skeleton" aria-hidden="true">
      <div className="current-market-price-item__top">
        <div className="skeleton-block skeleton-line skeleton-line--medium" />
        <div className="skeleton-block skeleton-line skeleton-line--time" />
      </div>
      <div className="current-market-price-item__values">
        <div className="current-market-price-item__value-box"><div className="skeleton-block skeleton-line skeleton-line--price" /></div>
        <div className="current-market-price-item__value-box"><div className="skeleton-block skeleton-line skeleton-line--price" /></div>
      </div>
    </article>
  );
}

function CurrentPriceForm({
  user,
  prices = [],
  priceHistory = [],
  onPriceUpdated,
  onOpenPrivateGoldPrices,
}) {
  const [isLoadingCurrentPrices, setIsLoadingCurrentPrices] = useState(false);
  const [toast, setToast] = useState(null);
  const [flashingKeys, setFlashingKeys] = useState({});
  const toastTimerRef = useRef(null);
  const previousPriceRef = useRef(new Map());

  const normalizedHistory = useMemo(() => {
    const rows = Array.isArray(priceHistory) ? priceHistory : [];
    const byProduct = new Map();

    for (const row of rows) {
      const key = `${getSourceCode(row)}::${normalizeText(getProductName(row))}`;
      if (!byProduct.has(key)) byProduct.set(key, []);
      byProduct.get(key).push(row);
    }

    for (const group of byProduct.values()) {
      group.sort(
        (a, b) =>
          getTime(getUpdatedAt(b)) -
          getTime(getUpdatedAt(a)),
      );
    }

    return byProduct;
  }, [priceHistory]);

  const normalizedPrices = useMemo(() => {
    const sourceOrder = { MI_HONG: 1, PNJ: 2, SJC: 3 };

    return (Array.isArray(prices) ? prices : [])
      .map((item) => {
        const sourceCode = getSourceCode(item);
        const productName = getProductName(item);
        const historyKey = `${sourceCode}::${normalizeText(productName)}`;
        const historyRows = normalizedHistory.get(historyKey) ?? [];
        const latestHistory = historyRows[0];
        const previousHistory = historyRows[1];
        const buyPrice = getBuyPrice(item);
        const sellPrice = getSellPrice(item);

        const buyChange = latestHistory?.buyPriceChange ?? (
          previousHistory ? buyPrice - getBuyPrice(previousHistory) : null
        );
        const sellChange = latestHistory?.sellPriceChange ?? (
          previousHistory ? sellPrice - getSellPrice(previousHistory) : null
        );

        return {
          ...item,
          normalizedSourceCode: sourceCode,
          normalizedProductName: productName,
          normalizedBuyPrice: buyPrice,
          normalizedSellPrice: sellPrice,
          normalizedUpdatedAt: getUpdatedAt(item),
          buyChange,
          sellChange,
        };
      })
      .sort((a, b) => (sourceOrder[a.normalizedSourceCode] ?? 99) - (sourceOrder[b.normalizedSourceCode] ?? 99));
  }, [prices, normalizedHistory]);

  const fastestKey = useMemo(() => {
    let selected = null;
    let selectedTime = 0;
    normalizedPrices.forEach((item, index) => {
      const time = getTime(item.normalizedUpdatedAt);
      if (time > selectedTime) {
        selectedTime = time;
        selected = item.id ?? `${item.normalizedSourceCode}-${item.normalizedProductName}-${index}`;
      }
    });
    return selected;
  }, [normalizedPrices]);

  useEffect(() => {
    const nextMap = new Map();
    const changed = {};

    normalizedPrices.forEach((item, index) => {
      const key = item.id ?? `${item.normalizedSourceCode}-${item.normalizedProductName}-${index}`;
      const signature = `${item.normalizedBuyPrice}|${item.normalizedSellPrice}|${item.normalizedUpdatedAt ?? ''}`;
      const previous = previousPriceRef.current.get(key);
      nextMap.set(key, signature);
      if (previous && previous !== signature) {
        const delta = Number(item.buyChange ?? 0) + Number(item.sellChange ?? 0);
        changed[key] = delta < 0 ? 'down' : 'up';
      }
    });

    previousPriceRef.current = nextMap;

    if (Object.keys(changed).length > 0) {
      setFlashingKeys(changed);
      const timer = window.setTimeout(() => setFlashingKeys({}), 1400);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [normalizedPrices]);

  function hideToast() {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = null;
    setToast(null);
  }

  function showToast(message, type = 'success') {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 5000);
  }

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  function buildResultMessage(result) {
    const updated = result.changedResults.map((item) => item.source);
    const unchanged = result.successResults.filter((item) => !item.changed).map((item) => item.source);
    const failed = result.failedResults.map((item) => `${item.source}: ${item.message}`);
    return [
      updated.length ? `Đã cập nhật: ${updated.join(', ')}.` : '',
      unchanged.length ? `Không thay đổi: ${unchanged.join(', ')}.` : '',
      failed.length ? `Lỗi: ${failed.join(' | ')}` : '',
    ].filter(Boolean).join(' ');
  }

  async function handleGetCurrentPrices() {
    if (isLoadingCurrentPrices) return;

    try {
      setIsLoadingCurrentPrices(true);
      const result = await syncAllGoldPrices();
      if (result.hasSuccess && typeof onPriceUpdated === 'function') {
        await onPriceUpdated();
      }
      const message = buildResultMessage(result);
      if (result.failedResults.length > 0) {
        showToast(message || 'Một số nguồn giá không thể cập nhật.', result.hasSuccess ? 'info' : 'error');
      } else if (!result.changed) {
        showToast(message || 'PNJ, Mi Hồng và SJC chưa có giá mới.', 'info');
      } else {
        showToast(message || 'Đã cập nhật giá vàng hiện tại.', 'success');
      }
    } catch (error) {
      console.error('Lỗi lấy giá hiện tại:', error);
      showToast(error instanceof Error ? error.message : 'Không thể lấy giá hiện tại.', 'error');
    } finally {
      setIsLoadingCurrentPrices(false);
    }
  }

  const toastIcon = toast?.type === 'success'
    ? <CheckCircle2 size={20} />
    : toast?.type === 'error'
      ? <AlertCircle size={20} />
      : <Info size={20} />;

  return (
    <>
      {toast && (
        <div className={`app-toast app-toast-${toast.type}`} role="status" aria-live="polite">
          <div className="app-toast-icon">{toastIcon}</div>
          <div className="app-toast-content">
            <strong className="app-toast-title">{toast.type === 'success' ? 'Thành công' : toast.type === 'error' ? 'Có lỗi xảy ra' : 'Thông tin'}</strong>
            <span className="app-toast-message">{toast.message}</span>
          </div>
          <button type="button" className="app-toast-close" onClick={hideToast} aria-label="Đóng thông báo"><X size={17} /></button>
        </div>
      )}

      <section className="card current-market-prices">
        <div className="current-market-prices__header">
          <div className="current-market-prices__heading">
            <h2 className="section-title"><RefreshCcw size={20} /> Giá vàng hiện tại</h2>
            <p className="small-text">Giá tự động cập nhật định kỳ. Bạn có thể đồng bộ thủ công khi cần.</p>
          </div>

          <div className="current-market-prices__actions">
            {user && (
              <button type="button" className={`pnj-button icon-button current-market-prices__refresh ${isLoadingCurrentPrices ? 'is-loading' : ''}`} onClick={handleGetCurrentPrices} disabled={isLoadingCurrentPrices}>
                {isLoadingCurrentPrices ? <span className="current-market-prices__spinner" aria-hidden="true" /> : <CloudDownload size={17} />}
                {isLoadingCurrentPrices ? 'Đang đồng bộ giá...' : 'Click để lấy giá mới'}
              </button>
            )}

            {user && (
              <button type="button" className="private-price-open-button current-market-prices__private" onClick={onOpenPrivateGoldPrices}>
                <Store size={17} /> Giá tiệm vàng tư nhân
              </button>
            )}
          </div>
        </div>

        {isLoadingCurrentPrices ? (
          <div className="current-market-prices__list is-syncing">
            {[0, 1, 2].map((item) => <PriceSkeleton key={item} />)}
          </div>
        ) : normalizedPrices.length === 0 ? (
          <div className="current-market-prices__empty">Chưa có dữ liệu giá hiện tại.</div>
        ) : (
          <div className="current-market-prices__list">
            {normalizedPrices.map((item, index) => {
              const itemKey = item.id ?? `${item.normalizedSourceCode}-${item.normalizedProductName}-${index}`;
              const isSjc = item.normalizedSourceCode === 'SJC';
              const flashDirection = flashingKeys[itemKey];

              return (
                <article key={itemKey} className={`current-market-price-item ${flashDirection ? `is-price-flash is-price-flash--${flashDirection}` : ''}`}>
                  <div className="current-market-price-item__top">
                    <div className="current-market-price-item__identity">
                      <div className="current-market-price-item__logo">{item.normalizedSourceCode === 'MI_HONG' ? 'MH' : item.normalizedSourceCode}</div>
                      <div>
                        <div className="current-market-price-item__source-row">
                          <strong className="current-market-price-item__source">{getSourceLabel(item.normalizedSourceCode)}</strong>
                          {fastestKey === itemKey && <span className="current-market-price-item__newest-badge">⚡ Mới nhất</span>}
                        </div>
                        <p className="current-market-price-item__product">{item.normalizedProductName}</p>
                      </div>
                    </div>
                    <time title={new Date(item.normalizedUpdatedAt ?? 0).toLocaleString('vi-VN')}>{formatRelativeTime(item.normalizedUpdatedAt)}</time>
                  </div>

                  <div className="current-market-price-item__values">
                    <div className="current-market-price-item__value-box current-market-price-item__value-box--buy">
                      <span>Cửa hàng mua vào</span>
                      <strong>{item.normalizedBuyPrice > 0 ? <><CountUpNumber value={item.normalizedBuyPrice} /> VND/chỉ</> : 'Chưa có'}</strong>
                      <PriceDelta change={item.buyChange} />
                    </div>

                    <div className="current-market-price-item__value-box current-market-price-item__value-box--sell">
                      <span>Cửa hàng bán ra</span>
                      <strong>{item.normalizedSellPrice > 0 ? <><CountUpNumber value={item.normalizedSellPrice} /> VND/chỉ</> : 'Chưa có'}</strong>
                      <PriceDelta change={item.sellChange} />
                    </div>
                  </div>

                  {isSjc && <p className="current-market-price-item__note">Giá SJC đã được quy đổi từ VND/lượng sang VND/chỉ.</p>}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

export default CurrentPriceForm;