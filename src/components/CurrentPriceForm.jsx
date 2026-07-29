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
} from "lucide-react";

import {
  formatMoney,
} from "../utils/formatters";

import {
  syncAllGoldPrices,
} from "../services/goldDataService.js";

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

    case "SJC":
      return "SJC";

    case "MI_HONG":
      return "Mi Hồng";

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

  const toastTimerRef =
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
            PNJ: 1,
            SJC: 2,
            MI_HONG: 3,
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

  useEffect(() => {
    return () => {
      if (
        toastTimerRef.current
      ) {
        window.clearTimeout(
          toastTimerRef.current
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

      if (
        result.hasSuccess &&
        typeof onPriceUpdated ===
          "function"
      ) {
        await onPriceUpdated();
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
            className="pnj-button icon-button current-market-prices__refresh"
            onClick={
              handleGetCurrentPrices
            }
            disabled={
              isLoadingCurrentPrices
            }
          >
            <CloudDownload
              size={17}
            />

            {isLoadingCurrentPrices
              ? "Đang cập nhật..."
              : "Làm mới giá"}
          </button>
        </div>

        {normalizedPrices.length ===
        0 ? (
          <div className="current-market-prices__empty">
            Chưa có dữ liệu giá
            hiện tại.
          </div>
        ) : (
          <div className="current-market-prices__list">
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

                return (
                  <article
                    key={
                      item.id ??
                      `${item.normalizedSourceCode}-${item.normalizedProductName}-${index}`
                    }
                    className="current-market-price-item"
                  >
                    <div className="current-market-price-item__top">
                      <div>
                        <strong>
                          {sourceLabel}
                        </strong>

                        <p>
                          {
                            item.normalizedProductName
                          }
                        </p>
                      </div>

                      <time
                        dateTime={
                          item.normalizedUpdatedAt ??
                          undefined
                        }
                        title={formatUpdatedTime(
                          item.normalizedUpdatedAt
                        )}
                      >
                        {formatUpdatedTime(
                          item.normalizedUpdatedAt
                        )}
                      </time>
                    </div>

                    <div className="current-market-price-item__values">
                      <div>
                        <span>
                          Cửa hàng mua vào
                        </span>

                        <strong>
                          {item.normalizedBuyPrice >
                          0
                            ? `${formatMoney(
                                item.normalizedBuyPrice
                              )} VND/chỉ`
                            : "Chưa có"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Cửa hàng bán ra
                        </span>

                        <strong>
                          {item.normalizedSellPrice >
                          0
                            ? `${formatMoney(
                                item.normalizedSellPrice
                              )} VND/chỉ`
                            : "Chưa có"}
                        </strong>
                      </div>
                    </div>

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