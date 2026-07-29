import {
  History,
  Trash2,
} from "lucide-react";

import {
  formatDateTime,
  formatMoney,
} from "../utils/formatters";

import PriceWithChange from "./PriceWithChange";

const PRICE_SOURCES = [
  {
    code: "SJC",
    label: "🥇 SJC",
  },
  {
    code: "MI_HONG",
    label: "🏪 Mi Hồng",
  },
  {
    code: "PNJ",
    label: "💍 PNJ",
  },
];

function PriceHistoryTable({
  activeSource = "PNJ",
  onSourceChange,

  priceHistory = [],
  paginatedPriceHistory = [],

  historyPage = 1,
  historyTotalPages = 1,

  onPreviousPage,
  onNextPage,
  onDelete,
}) {
  const canDelete =
    typeof onDelete === "function";

  const handleSourceChange = (
    sourceCode
  ) => {
    if (
      typeof onSourceChange ===
      "function"
    ) {
      onSourceChange(sourceCode);
    }
  };

  return (
    <div className="card">
      <div className="price-history-header">
        <h2 className="section-title">
          <History size={20} />
          Lịch sử cập nhật giá cửa hàng
        </h2>

        <div
          className="price-history-tabs"
          role="tablist"
          aria-label="Nguồn giá vàng"
        >
          {PRICE_SOURCES.map(
            (source) => {
              const isActive =
                activeSource ===
                source.code;

              return (
                <button
                  key={source.code}
                  type="button"
                  role="tab"
                  aria-selected={
                    isActive
                  }
                  className={`price-history-tab ${isActive
                    ? "price-history-tab--active"
                    : ""
                    }`}
                  onClick={() =>
                    handleSourceChange(
                      source.code
                    )
                  }
                >
                  {source.label}
                </button>
              );
            }
          )}
        </div>
      </div>

      {priceHistory.length === 0 ? (
        <p className="small-text">
          Chưa có lịch sử cập nhật giá
          của{" "}
          {PRICE_SOURCES.find(
            (source) =>
              source.code ===
              activeSource
          )?.label || activeSource}
          .
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ngày cập nhật</th>
                <th>Loại vàng</th>
                <th>Giá mua</th>
                <th>Giá bán</th>
                <th>Chênh lệch</th>
                <th>Ghi chú</th>

                {canDelete && (
                  <th>Thao tác</th>
                )}
              </tr>
            </thead>

            <tbody>
              {paginatedPriceHistory.map(
                (item) => {
                  const updatedAt =
                    item.source_updated_at ??
                    item.updated_at ??
                    item.created_at ??
                    item.fetched_at;

                  const buyPrice =
                    Number(
                      item.buy_price ??
                      item.price_per_chi ??
                      item.new_buy_price_per_chi ??
                      item.buy_price_per_chi ??
                      0
                    );

                  const sellPrice =
                    Number(
                      item.sell_price ??
                      item.sell_price_per_chi ??
                      item.new_sell_price_per_chi ??
                      0
                    );

                  const sourceCode = String(
                    item.source_code ??
                    item.source ??
                    activeSource ??
                    ""
                  )
                    .trim()
                    .toUpperCase();

                  const isSjc =
                    sourceCode === "SJC";

                  const goldType =
                    isSjc
                      ? "Vàng miếng SJC"
                      : item.product_name ??
                      item.gold_type_name ??
                      item.gold_type ??
                      item.source_product_name ??
                      "-";

                  const note =
                    item.note ??
                    item.source_name ??
                    "-";

                  return (
                    <tr key={item.id}>
                      <td>
                        {formatDateTime(
                          updatedAt
                        )}
                      </td>

                      <td>
                        <div className="gold-type-cell">
                          <strong>
                            {goldType}
                          </strong>

                          {isSjc && (
                            <>
                              <small className="sjc-conversion-unit">
                                Giá quy đổi: VND/chỉ
                              </small>

                              <small
                                className="sjc-conversion-note"
                                title="Hệ thống tự quy đổi 1 lượng = 10 chỉ."
                              >
                                Hệ thống tự quy đổi 1 lượng = 10 chỉ.
                              </small>
                            </>
                          )}
                        </div>
                      </td>

                      <td>
                        <PriceWithChange
                          price={buyPrice}
                          change={
                            item.buyPriceChange
                          }
                        />
                      </td>

                      <td>
                        <PriceWithChange
                          price={
                            sellPrice
                          }
                          change={
                            item.sellPriceChange
                          }
                        />
                      </td>

                      <td>
                        {formatMoney(
                          sellPrice -
                          buyPrice
                        )}{" "}
                        VND/chỉ
                      </td>

                      <td>
                        {note}
                      </td>

                      {canDelete && (
                        <td>
                          <button
                            type="button"
                            className="danger-button icon-button table-icon-button"
                            onClick={(
                              event
                            ) => {
                              event.preventDefault();
                              event.stopPropagation();

                              onDelete(item);
                            }}
                          >
                            <Trash2
                              size={15}
                            />
                            Xóa
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>

          {historyTotalPages >
            1 && (
              <div className="pagination">
                <button
                  type="button"
                  disabled={
                    historyPage <= 1
                  }
                  onClick={
                    onPreviousPage
                  }
                >
                  Trang trước
                </button>

                <span>
                  Trang {historyPage} /{" "}
                  {historyTotalPages}
                </span>

                <button
                  type="button"
                  disabled={
                    historyPage >=
                    historyTotalPages
                  }
                  onClick={
                    onNextPage
                  }
                >
                  Trang sau
                </button>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

export default PriceHistoryTable;