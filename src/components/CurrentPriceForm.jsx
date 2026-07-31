import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CloudDownload,
  RefreshCcw,
  CheckCircle2,
  Info,
  AlertCircle,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
} from "lucide-react";

import {
  formatMoney,
} from "../utils/formatters";

import {
  syncAllGoldPrices,
} from "../services/goldDataService.js";

const PRICE_HISTORY_KEY =
  "huvang_current_price_history_v1";

const MAX_HISTORY_POINTS = 12;

function normalizeSourceCode(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Đ/g, "D")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^MIHONG$/, "MI_HONG");
}

function getSourceCode(item) {
  const nestedSource =
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
    nestedSource?.code ??
    nestedSource?.source_code ??
    joinedSource?.code ??
    joinedSource?.source_code ??
    item?.source_name ??
    item?.source
  );
}

function getSourceLabel(sourceCode) {
  switch (sourceCode) {
    case "PNJ":
      return "PNJ";

    case "MI_HONG":
      return "Mi Hồng";

    case "SJC":
      return "SJC";

    default:
      return (
        sourceCode ||
        "Không xác định"
      );
  }
}

function getProductName(item) {
  const sourceCode =
    getSourceCode(item);

  if (sourceCode === "SJC") {
    return (
      item?.gold_type_name ??
      item?.product_name ??
      item?.gold_type ??
      "Vàng miếng SJC"
    );
  }

  return (
    item?.gold_type_name ??
    item?.product_name ??
    item?.source_product_name ??
    item?.gold_type ??
    "Loại vàng"
  );
}

function getBuyPrice(item) {
  return Number(
    item?.buy_price ??
    item?.buy_price_per_chi ??
    item?.current_price_per_chi ??
    item?.price_per_chi ??
    0
  );
}

function getSellPrice(item) {
  return Number(
    item?.sell_price ??
    item?.sell_price_per_chi ??
    0
  );
}

function getUpdatedAt(item) {
  return (
    item?.updated_at ??
    item?.fetched_at ??
    item?.created_at ??
    null
  );
}

function formatUpdatedTime(value) {
  if (!value) {
    return "Chưa xác định";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Chưa xác định";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  ).format(date);
}

function formatRelativeTime(value) {
  if (!value) {
    return "Chưa xác định";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Chưa xác định";
  }

  const diffMs =
    Math.max(
      0,
      Date.now() - date.getTime()
    );

  const diffMinutes =
    Math.floor(
      diffMs / 60000
    );

  if (diffMinutes < 1) {
    return "Vừa cập nhật";
  }

  if (diffMinutes < 60) {
    return `Cập nhật ${diffMinutes} phút trước`;
  }

  const diffHours =
    Math.floor(
      diffMinutes / 60
    );

  if (diffHours < 24) {
    return `Cập nhật ${diffHours} giờ trước`;
  }

  const diffDays =
    Math.floor(
      diffHours / 24
    );

  if (diffDays < 7) {
    return `Cập nhật ${diffDays} ngày trước`;
  }

  return formatUpdatedTime(value);
}

function getHistoryKey(item) {
  return [
    item.normalizedSourceCode,
    item.normalizedProductName,
  ].join("::");
}

function readPriceHistory() {
  try {
    const rawValue =
      window.localStorage.getItem(
        PRICE_HISTORY_KEY
      );

    if (!rawValue) {
      return {};
    }

    const parsedValue =
      JSON.parse(rawValue);

    return (
      parsedValue &&
      typeof parsedValue === "object"
        ? parsedValue
        : {}
    );
  } catch (error) {
    console.warn(
      "Không thể đọc lịch sử giá:",
      error
    );

    return {};
  }
}

function writePriceHistory(history) {
  try {
    window.localStorage.setItem(
      PRICE_HISTORY_KEY,
      JSON.stringify(history)
    );
  } catch (error) {
    console.warn(
      "Không thể lưu lịch sử giá:",
      error
    );
  }
}

function getPreviousDistinctPoint(
  historyPoints,
  currentBuyPrice,
  currentSellPrice
) {
  if (
    !Array.isArray(historyPoints) ||
    historyPoints.length < 2
  ) {
    return null;
  }

  for (
    let index =
      historyPoints.length - 2;
    index >= 0;
    index -= 1
  ) {
    const point =
      historyPoints[index];

    if (
      Number(point.buy) !==
      Number(currentBuyPrice) ||
      Number(point.sell) !==
      Number(currentSellPrice)
    ) {
      return point;
    }
  }

  return null;
}

function AnimatedPrice({
  value,
  duration = 480,
}) {
  const [displayValue, setDisplayValue] =
    useState(Number(value) || 0);

  const previousValueRef =
    useRef(Number(value) || 0);

  useEffect(() => {
    const nextValue =
      Number(value) || 0;

    const startValue =
      previousValueRef.current;

    previousValueRef.current =
      nextValue;

    if (
      startValue === nextValue ||
      typeof window === "undefined"
    ) {
      setDisplayValue(nextValue);
      return undefined;
    }

    const startedAt =
      performance.now();

    let animationFrameId = null;

    function animate(currentTime) {
      const progress =
        Math.min(
          1,
          (currentTime - startedAt) /
          duration
        );

      const easedProgress =
        1 -
        Math.pow(
          1 - progress,
          3
        );

      const nextDisplayValue =
        Math.round(
          startValue +
          (
            nextValue -
            startValue
          ) *
          easedProgress
        );

      setDisplayValue(
        nextDisplayValue
      );

      if (progress < 1) {
        animationFrameId =
          window.requestAnimationFrame(
            animate
          );
      }
    }

    animationFrameId =
      window.requestAnimationFrame(
        animate
      );

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(
          animationFrameId
        );
      }
    };
  }, [value, duration]);

  return (
    <>
      {formatMoney(displayValue)}
    </>
  );
}

function PriceDelta({
  value,
}) {
  const numericValue =
    Number(value) || 0;

  if (numericValue > 0) {
    return (
      <span className="current-market-price-item__delta current-market-price-item__delta--up">
        <TrendingUp size={13} />
        +{formatMoney(
          numericValue
        )}
      </span>
    );
  }

  if (numericValue < 0) {
    return (
      <span className="current-market-price-item__delta current-market-price-item__delta--down">
        <TrendingDown size={13} />
        {formatMoney(
          numericValue
        )}
      </span>
    );
  }

  return (
    <span className="current-market-price-item__delta current-market-price-item__delta--flat">
      <Minus size={13} />
      Không đổi
    </span>
  );
}

function MiniSparkline({
  points = [],
}) {
  const values =
    points
      .map((point) => {
        const buy =
          Number(point.buy) || 0;

        const sell =
          Number(point.sell) || 0;

        if (
          buy > 0 &&
          sell > 0
        ) {
          return (
            buy + sell
          ) / 2;
        }

        return (
          buy ||
          sell ||
          0
        );
      })
      .filter(
        (value) => value > 0
      )
      .slice(
        -MAX_HISTORY_POINTS
      );

  if (values.length < 2) {
    return (
      <div className="current-market-price-item__sparkline-empty">
        Chưa đủ lịch sử giá
      </div>
    );
  }

  const width = 180;
  const height = 42;
  const padding = 3;

  const minimumValue =
    Math.min(...values);

  const maximumValue =
    Math.max(...values);

  const range =
    maximumValue -
      minimumValue || 1;

  const trend =
    values[
      values.length - 1
    ] -
    values[0];
}

function PriceCardSkeleton() {
  return (
    <article className="current-market-price-item current-market-price-item--skeleton">
      <div className="current-market-price-item__top">
        <div className="current-market-price-item__identity">
          <span className="skeleton-block skeleton-logo" />

          <div className="skeleton-copy">
            <span className="skeleton-block skeleton-line skeleton-line--medium" />
            <span className="skeleton-block skeleton-line skeleton-line--short" />
          </div>
        </div>

        <span className="skeleton-block skeleton-line skeleton-line--time" />
      </div>

      <div className="current-market-price-item__values">
        <div className="current-market-price-item__value-box">
          <span className="skeleton-block skeleton-line skeleton-line--short" />
          <span className="skeleton-block skeleton-line skeleton-line--price" />
        </div>

        <div className="current-market-price-item__value-box">
          <span className="skeleton-block skeleton-line skeleton-line--short" />
          <span className="skeleton-block skeleton-line skeleton-line--price" />
        </div>
      </div>

      <span className="skeleton-block skeleton-line skeleton-line--spark" />
    </article>
  );
}

function CurrentPriceForm({
  prices = [],
  onPriceUpdated,
}) {
  const [
    isLoadingCurrentPrices,
    setIsLoadingCurrentPrices,
  ] = useState(false);

  const [
    toast,
    setToast,
  ] = useState(null);

  const [
    updatedSourceCodes,
    setUpdatedSourceCodes,
  ] = useState([]);

  const [
    priceHistory,
    setPriceHistory,
  ] = useState(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return {};
    }

    return readPriceHistory();
  });

  const toastTimerRef =
    useRef(null);

  const updatedTimerRef =
    useRef(null);

  const normalizedPrices =
    useMemo(() => {
      return (
        Array.isArray(prices)
          ? prices
          : []
      )
        .map((item) => ({
          ...item,

          normalizedSourceCode:
            getSourceCode(item),

          normalizedProductName:
            getProductName(item),

          normalizedBuyPrice:
            getBuyPrice(item),

          normalizedSellPrice:
            getSellPrice(item),

          normalizedUpdatedAt:
            getUpdatedAt(item),
        }))
        .sort((first, second) => {
          const sourceOrder = {
            MI_HONG: 1,
            PNJ: 2,
            SJC: 3,
          };

          return (
            (
              sourceOrder[
                first
                  .normalizedSourceCode
              ] ?? 99
            ) -
            (
              sourceOrder[
                second
                  .normalizedSourceCode
              ] ?? 99
            )
          );
        });
    }, [prices]);

  const newestUpdatedTimestamp =
    useMemo(() => {
      const timestamps =
        normalizedPrices
          .map((item) =>
            new Date(
              item.normalizedUpdatedAt
            ).getTime()
          )
          .filter(
            (timestamp) =>
              Number.isFinite(
                timestamp
              )
          );

      return timestamps.length > 0
        ? Math.max(...timestamps)
        : null;
    }, [normalizedPrices]);

  useEffect(() => {
    if (
      normalizedPrices.length ===
      0
    ) {
      return;
    }

    setPriceHistory(
      (currentHistory) => {
        let hasChanged = false;

        const nextHistory = {
          ...currentHistory,
        };

        normalizedPrices.forEach(
          (item) => {
            const historyKey =
              getHistoryKey(item);

            const existingPoints =
              Array.isArray(
                currentHistory[
                  historyKey
                ]
              )
                ? currentHistory[
                    historyKey
                  ]
                : [];

            const latestPoint =
              existingPoints[
                existingPoints.length -
                  1
              ];

            const nextPoint = {
              buy:
                item.normalizedBuyPrice,
              sell:
                item.normalizedSellPrice,
              updatedAt:
                item.normalizedUpdatedAt ??
                new Date().toISOString(),
            };

            const isSamePoint =
              latestPoint &&
              Number(
                latestPoint.buy
              ) ===
                Number(
                  nextPoint.buy
                ) &&
              Number(
                latestPoint.sell
              ) ===
                Number(
                  nextPoint.sell
                );

            if (!isSamePoint) {
              nextHistory[
                historyKey
              ] = [
                ...existingPoints,
                nextPoint,
              ].slice(
                -MAX_HISTORY_POINTS
              );

              hasChanged = true;
            }
          }
        );

        if (!hasChanged) {
          return currentHistory;
        }

        writePriceHistory(
          nextHistory
        );

        return nextHistory;
      }
    );
  }, [normalizedPrices]);

  function hideToast() {
    if (
      toastTimerRef.current
    ) {
      window.clearTimeout(
        toastTimerRef.current
      );

      toastTimerRef.current =
        null;
    }

    setToast(null);
  }

  function showToast(
    message,
    type = "success"
  ) {
    if (
      toastTimerRef.current
    ) {
      window.clearTimeout(
        toastTimerRef.current
      );
    }

    setToast({
      message,
      type,
    });

    toastTimerRef.current =
      window.setTimeout(() => {
        setToast(null);

        toastTimerRef.current =
          null;
      }, 5000);
  }

  function highlightUpdatedSources(
    sourceCodes = []
  ) {
    if (
      updatedTimerRef.current
    ) {
      window.clearTimeout(
        updatedTimerRef.current
      );
    }

    setUpdatedSourceCodes(
      sourceCodes
    );

    updatedTimerRef.current =
      window.setTimeout(() => {
        setUpdatedSourceCodes([]);

        updatedTimerRef.current =
          null;
      }, 1400);
  }

  useEffect(() => {
    return () => {
      if (
        toastTimerRef.current
      ) {
        window.clearTimeout(
          toastTimerRef.current
        );
      }

      if (
        updatedTimerRef.current
      ) {
        window.clearTimeout(
          updatedTimerRef.current
        );
      }
    };
  }, []);

  function buildResultMessage(
    result
  ) {
    const updatedSources =
      result.changedResults.map(
        (item) => item.source
      );

    const unchangedSources =
      result.successResults
        .filter(
          (item) =>
            !item.changed
        )
        .map(
          (item) =>
            item.source
        );

    const failedSources =
      result.failedResults.map(
        (item) =>
          `${item.source}: ${item.message}`
      );

    const messages = [];

    if (
      updatedSources.length > 0
    ) {
      messages.push(
        `Đã cập nhật: ${updatedSources.join(
          ", "
        )}.`
      );
    }

    if (
      unchangedSources.length > 0
    ) {
      messages.push(
        `Không thay đổi: ${unchangedSources.join(
          ", "
        )}.`
      );
    }

    if (
      failedSources.length > 0
    ) {
      messages.push(
        `Lỗi: ${failedSources.join(
          " | "
        )}`
      );
    }

    return messages.join(" ");
  }

  async function handleGetCurrentPrices() {
    if (
      isLoadingCurrentPrices
    ) {
      return;
    }

    try {
      setIsLoadingCurrentPrices(
        true
      );

      const result =
        await syncAllGoldPrices();

      const changedSourceCodes =
        result.changedResults.map(
          (item) =>
            normalizeSourceCode(
              item.sourceCode ??
              item.source
            )
        );

      if (
        result.hasSuccess &&
        typeof onPriceUpdated ===
          "function"
      ) {
        await onPriceUpdated();
      }

      if (
        changedSourceCodes.length > 0
      ) {
        highlightUpdatedSources(
          changedSourceCodes
        );
      }

      const resultMessage =
        buildResultMessage(
          result
        );

      if (
        result.failedResults.length >
        0
      ) {
        showToast(
          resultMessage ||
            "Một số nguồn giá không thể cập nhật.",

          result.hasSuccess
            ? "info"
            : "error"
        );

        return;
      }

      if (!result.changed) {
        showToast(
          resultMessage ||
            "PNJ, Mi Hồng và SJC chưa có giá mới.",

          "info"
        );

        return;
      }

      showToast(
        resultMessage ||
          "Đã cập nhật giá vàng hiện tại.",

        "success"
      );
    } catch (error) {
      console.error(
        "Lỗi lấy giá hiện tại:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Không thể lấy giá hiện tại.",

        "error"
      );
    } finally {
      setIsLoadingCurrentPrices(
        false
      );
    }
  }

  function getToastIcon() {
    if (
      toast?.type ===
      "success"
    ) {
      return (
        <CheckCircle2
          size={20}
        />
      );
    }

    if (
      toast?.type ===
      "error"
    ) {
      return (
        <AlertCircle
          size={20}
        />
      );
    }

    return (
      <Info size={20} />
    );
  }

  return (
    <>
      {toast && (
        <div
          className={
            `app-toast ` +
            `app-toast-${toast.type}`
          }
          role="status"
          aria-live="polite"
        >
          <div className="app-toast-icon">
            {getToastIcon()}
          </div>

          <div className="app-toast-content">
            <strong className="app-toast-title">
              {toast.type ===
                "success"
                ? "Thành công"
                : toast.type ===
                    "error"
                  ? "Có lỗi xảy ra"
                  : "Thông tin"}
            </strong>

            <span className="app-toast-message">
              {toast.message}
            </span>
          </div>

          <button
            type="button"
            className="app-toast-close"
            onClick={hideToast}
            aria-label="Đóng thông báo"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <section className="card current-market-prices">
        <div className="current-market-prices__header">
          <div>
            <h2 className="section-title">
              <RefreshCcw
                size={20}
              />

              Giá vàng hiện tại
            </h2>

            <p className="small-text">
              Dữ liệu mới nhất từ
              PNJ, SJC và Mi Hồng.
            </p>
          </div>

          <button
            type="button"
            className={
              `pnj-button icon-button current-market-prices__refresh ` +
              `${isLoadingCurrentPrices ? "is-loading" : ""}`
            }
            onClick={
              handleGetCurrentPrices
            }
            disabled={
              isLoadingCurrentPrices
            }
            aria-busy={
              isLoadingCurrentPrices
            }
          >
            {isLoadingCurrentPrices ? (
              <RefreshCcw
                size={17}
                className="current-market-prices__spinner"
                aria-hidden="true"
              />
            ) : (
              <CloudDownload
                size={17}
                aria-hidden="true"
              />
            )}

            <span>
              {isLoadingCurrentPrices
                ? "Đang đồng bộ giá..."
                : "Click để lấy giá mới"}
            </span>
          </button>
        </div>

        {isLoadingCurrentPrices &&
        normalizedPrices.length === 0 ? (
          <div className="current-market-prices__list">
            {Array.from({
              length: 3,
            }).map((_, index) => (
              <PriceCardSkeleton
                key={index}
              />
            ))}
          </div>
        ) : normalizedPrices.length ===
          0 ? (
          <div className="current-market-prices__empty">
            Chưa có dữ liệu giá
            hiện tại.
          </div>
        ) : (
          <div
            className={
              `current-market-prices__list ` +
              `${isLoadingCurrentPrices ? "is-syncing" : ""}`
            }
          >
            {normalizedPrices.map(
              (item, index) => {
                const sourceLabel =
                  getSourceLabel(
                    item
                      .normalizedSourceCode
                  );

                const isSjc =
                  item
                    .normalizedSourceCode ===
                  "SJC";

                const historyKey =
                  getHistoryKey(item);

                const historyPoints =
                  priceHistory[
                    historyKey
                  ] ?? [];

                const previousPoint =
                  getPreviousDistinctPoint(
                    historyPoints,
                    item
                      .normalizedBuyPrice,
                    item
                      .normalizedSellPrice
                  );

                const buyDelta =
                  previousPoint
                    ? item
                        .normalizedBuyPrice -
                      Number(
                        previousPoint.buy
                      )
                    : 0;

                const sellDelta =
                  previousPoint
                    ? item
                        .normalizedSellPrice -
                      Number(
                        previousPoint.sell
                      )
                    : 0;

                const itemTimestamp =
                  new Date(
                    item
                      .normalizedUpdatedAt
                  ).getTime();

                const isNewestSource =
                  newestUpdatedTimestamp !==
                    null &&
                  Number.isFinite(
                    itemTimestamp
                  ) &&
                  itemTimestamp ===
                    newestUpdatedTimestamp;

                const isJustUpdated =
                  updatedSourceCodes.includes(
                    item
                      .normalizedSourceCode
                  );

                return (
                  <article
                    key={
                      item.id ??
                      `${item.normalizedSourceCode}-${item.normalizedProductName}-${index}`
                    }
                    className={
                      `current-market-price-item ` +
                      `${isJustUpdated ? "is-just-updated" : ""}`
                    }
                  >
                    <div className="current-market-price-item__top">
                      <div className="current-market-price-item__identity">
                        <div className="current-market-price-item__logo">
                          {item.normalizedSourceCode ===
                          "MI_HONG"
                            ? "MH"
                            : item.normalizedSourceCode}
                        </div>

                        <div>
                          <div className="current-market-price-item__source-row">
                            <strong className="current-market-price-item__source">
                              {sourceLabel}
                            </strong>

                            {isNewestSource && (
                              <span className="current-market-price-item__newest-badge">
                                <Zap
                                  size={12}
                                  fill="currentColor"
                                />
                                Mới nhất
                              </span>
                            )}
                          </div>

                          <p className="current-market-price-item__product">
                            {item.normalizedProductName}
                          </p>
                        </div>
                      </div>

                      <div className="current-market-price-item__status">
                        <time
                          className="current-market-price-item__time"
                          dateTime={
                            item.normalizedUpdatedAt ??
                            undefined
                          }
                          title={formatUpdatedTime(
                            item.normalizedUpdatedAt
                          )}
                        >
                          {formatRelativeTime(
                            item.normalizedUpdatedAt
                          )}
                        </time>

                        {isJustUpdated && (
                          <span className="current-market-price-item__updated-badge">
                            <CheckCircle2
                              size={13}
                            />
                            Đã cập nhật
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="current-market-price-item__values">
                      <div className="current-market-price-item__value-box current-market-price-item__value-box--buy">
                        <span>
                          Cửa hàng mua vào
                        </span>

                        {isLoadingCurrentPrices ? (
                          <span className="skeleton-block skeleton-line skeleton-line--price" />
                        ) : (
                          <>
                            <strong>
                              {item.normalizedBuyPrice >
                              0 ? (
                                <>
                                  <AnimatedPrice
                                    value={
                                      item.normalizedBuyPrice
                                    }
                                  />{" "}
                                  VND/chỉ
                                </>
                              ) : (
                                "Chưa có"
                              )}
                            </strong>

                            {previousPoint && (
                              <PriceDelta
                                value={
                                  buyDelta
                                }
                              />
                            )}
                          </>
                        )}
                      </div>

                      <div className="current-market-price-item__value-box current-market-price-item__value-box--sell">
                        <span>
                          Cửa hàng bán ra
                        </span>

                        {isLoadingCurrentPrices ? (
                          <span className="skeleton-block skeleton-line skeleton-line--price" />
                        ) : (
                          <>
                            <strong>
                              {item.normalizedSellPrice >
                              0 ? (
                                <>
                                  <AnimatedPrice
                                    value={
                                      item.normalizedSellPrice
                                    }
                                  />{" "}
                                  VND/chỉ
                                </>
                              ) : (
                                "Chưa có"
                              )}
                            </strong>

                            {previousPoint && (
                              <PriceDelta
                                value={
                                  sellDelta
                                }
                              />
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <MiniSparkline
                      points={
                        historyPoints
                      }
                    />

                    {isSjc && (
                      <p className="current-market-price-item__note">
                        Giá SJC đã được
                        quy đổi từ VND/lượng
                        sang VND/chỉ.
                      </p>
                    )}
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </>
  );
}

export default CurrentPriceForm;