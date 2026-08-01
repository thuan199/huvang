import {
  useMemo,
} from 'react';

import {
  History,
  HistoryIcon,
  Trash2,
} from 'lucide-react';

import {
  formatDateTime,
  formatMoney,
} from '../utils/formatters';

import PriceWithChange from './PriceWithChange';
import EmptyState from './EmptyState';

const DEFAULT_SOURCES = [
  {
    code: 'SJC',
    label: '🥇 SJC',
  },
  {
    code: 'MI_HONG',
    label: '🏪 Mi Hồng',
  },
  {
    code: 'PNJ',
    label: '💍 PNJ',
  },
];

function getTimestamp(value) {
  if (!value) {
    return 0;
  }

  const timestamp =
    new Date(value).getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
}

function getLatestUpdatedAt(item) {
  const candidates = [
    item?.source_updated_at,
    item?.price_date,
    item?.price_updated_at,
    item?.last_updated_at,
    item?.recorded_at,
    item?.fetched_at,
    item?.updated_at,
    item?.created_at,
  ];

  let latestValue = null;
  let latestTimestamp = 0;

  for (const value of candidates) {
    const timestamp =
      getTimestamp(value);

    if (
      timestamp >
      latestTimestamp
    ) {
      latestTimestamp =
        timestamp;

      latestValue =
        value;
    }
  }

  return latestValue;
}

function getBuyPrice(item) {
  return Number(
    item?.buy_price ??
      item?.price_per_chi ??
      item?.new_buy_price_per_chi ??
      item?.buy_price_per_chi ??
      0,
  );
}

function getSellPrice(item) {
  return Number(
    item?.sell_price ??
      item?.sell_price_per_chi ??
      item?.new_sell_price_per_chi ??
      0,
  );
}

function PriceHistoryTable({
  activeSource = 'PNJ',
  onSourceChange,
  sources = DEFAULT_SOURCES,
  priceHistory = [],
  paginatedPriceHistory = [],
  historyPage = 1,
  historyTotalPages = 1,
  onPreviousPage,
  onNextPage,
  onDelete,
}) {
  const canDelete =
    typeof onDelete ===
    'function';

  const sourceOptions =
    sources?.length
      ? sources
      : DEFAULT_SOURCES;

  const activeLabel =
    sourceOptions.find(
      (source) =>
        source.code ===
        activeSource,
    )?.label ??
    activeSource;

  /*
   * Sắp xếp mới nhất trước và tính lại mức tăng/giảm
   * so với bản ghi liền trước về thời gian.
   *
   * Ví dụ:
   * - Dòng 01/08 so với dòng 31/07
   * - Dòng 31/07 so với dòng 30/07
   */
  const displayRows =
    useMemo(() => {
      const sortedRows = [
        ...(paginatedPriceHistory ?? []),
      ].sort(
        (first, second) =>
          getTimestamp(
            getLatestUpdatedAt(
              second,
            ),
          ) -
          getTimestamp(
            getLatestUpdatedAt(
              first,
            ),
          ),
      );

      return sortedRows.map(
        (item, index) => {
          const olderItem =
            sortedRows[index + 1] ??
            null;

          const buyPrice =
            getBuyPrice(item);

          const sellPrice =
            getSellPrice(item);

          const olderBuyPrice =
            olderItem
              ? getBuyPrice(
                  olderItem,
                )
              : null;

          const olderSellPrice =
            olderItem
              ? getSellPrice(
                  olderItem,
                )
              : null;

          return {
            ...item,

            buyPriceChange:
              olderItem
                ? buyPrice -
                  olderBuyPrice
                : null,

            sellPriceChange:
              olderItem
                ? sellPrice -
                  olderSellPrice
                : null,
          };
        },
      );
    }, [
      paginatedPriceHistory,
    ]);

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
          {sourceOptions.map(
            (source) => {
              const isActive =
                activeSource ===
                source.code;

              return (
                <button
                  key={
                    source.code
                  }
                  type="button"
                  role="tab"
                  aria-selected={
                    isActive
                  }
                  className={`price-history-tab ${
                    isActive
                      ? 'price-history-tab--active'
                      : ''
                  } ${
                    source.isPrivate
                      ? 'price-history-tab--private'
                      : ''
                  }`}
                  onClick={() =>
                    onSourceChange?.(
                      source.code,
                    )
                  }
                  title={
                    source.isPrivate
                      ? `Lịch sử giá do bạn cập nhật cho ${source.shopName}`
                      : undefined
                  }
                >
                  {source.label}
                </button>
              );
            },
          )}
        </div>
      </div>

      {priceHistory.length ===
      0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="Chưa có lịch sử giá"
          description={`Giá ${activeLabel} sau mỗi lần cập nhật sẽ được lưu và hiển thị tại đây.`}
          compact
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  Ngày cập nhật
                </th>

                <th>
                  Loại vàng
                </th>

                <th>
                  Giá mua
                </th>

                <th>
                  Giá bán
                </th>

                <th>
                  Chênh lệch
                </th>

                <th>
                  Ghi chú
                </th>

                {canDelete && (
                  <th>
                    Thao tác
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {displayRows.map(
                (
                  item,
                  index,
                ) => {
                  const updatedAt =
                    getLatestUpdatedAt(
                      item,
                    );

                  const buyPrice =
                    getBuyPrice(
                      item,
                    );

                  const sellPrice =
                    getSellPrice(
                      item,
                    );

                  const sourceCode =
                    String(
                      item.source_code ??
                        item.source ??
                        activeSource ??
                        '',
                    )
                      .trim()
                      .toUpperCase();

                  const isSjc =
                    sourceCode ===
                    'SJC';

                  const goldType =
                    isSjc
                      ? 'Vàng miếng SJC'
                      : item.product_name ??
                        item.gold_type_name ??
                        item.gold_type ??
                        item.source_product_name ??
                        '-';

                  const note =
                    item.note ??
                    item.source_name ??
                    '-';

                  return (
                    <tr
                      key={
                        item.id ??
                        `${updatedAt}-${index}`
                      }
                    >
                      <td>
                        {formatDateTime(
                          updatedAt,
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
                                Giá quy đổi:
                                VND/chỉ
                              </small>

                              <small
                                className="sjc-conversion-note"
                                title="Hệ thống tự quy đổi 1 lượng = 10 chỉ."
                              >
                                Hệ thống tự
                                quy đổi 1
                                lượng = 10
                                chỉ.
                              </small>
                            </>
                          )}
                        </div>
                      </td>

                      <td>
                        <PriceWithChange
                          price={
                            buyPrice
                          }
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
                            buyPrice,
                        )}{' '}
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
                              event,
                            ) => {
                              event.preventDefault();
                              event.stopPropagation();

                              onDelete(
                                item,
                              );
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
                },
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
                Trang {historyPage}{' '}
                /{' '}
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