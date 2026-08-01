import { useEffect, useState } from 'react';
import {
  ListChecks,
  MapPin,
  Pencil,
  Trash2,
} from 'lucide-react';

import { formatMoney } from '../utils/formatters';


function getSourceLabel(transaction) {
  const sourceCode = String(
    transaction?.source_code ?? ''
  ).trim().toUpperCase();

  const labels = {
    PNJ: 'PNJ',
    SJC: 'SJC',
    MI_HONG: 'Mi Hồng',
    PRIVATE: 'Tư nhân',
  };

  return labels[sourceCode] ?? (sourceCode || '-');
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

function getPrivatePriceForTransaction(
  transaction,
  privateGoldPrices = [],
) {
  const sourceCode = String(
    transaction?.source_code ??
    transaction?.market_source_code ??
    ''
  )
    .trim()
    .toUpperCase();

  if (sourceCode !== 'PRIVATE') {
    return null;
  }

  const transactionShopId = String(
    transaction?.private_shop_id ??
    transaction?.shop_id ??
    ''
  ).trim();

  const transactionShopName = normalizeText(
    transaction?.location ??
    transaction?.seller_name ??
    transaction?.shop_name
  );

  const transactionGoldType = normalizeText(
    transaction?.gold_type ??
    transaction?.gold_name ??
    transaction?.gold_type_name
  );

  const candidates = (
    Array.isArray(privateGoldPrices)
      ? privateGoldPrices
      : []
  ).filter((item) => {
    const priceShopId = String(
      item?.shop_id ??
      item?.private_shop_id ??
      item?.shop?.id ??
      ''
    ).trim();

    const priceShopName = normalizeText(
      item?.shop_name ??
      item?.shop?.shop_name
    );

    const sameShopId =
      transactionShopId &&
      priceShopId &&
      transactionShopId === priceShopId;

    const sameShopName =
      transactionShopName &&
      priceShopName &&
      transactionShopName === priceShopName;

    return sameShopId || sameShopName;
  });

  let matched = candidates.find((item) => {
    const priceGoldType = normalizeText(
      item?.gold_type_name ??
      item?.gold_type ??
      item?.gold_name
    );

    return (
      transactionGoldType &&
      priceGoldType === transactionGoldType
    );
  });

  if (!matched && transactionGoldType) {
    matched = candidates.find((item) => {
      const priceGoldType = normalizeText(
        item?.gold_type_name ??
        item?.gold_type ??
        item?.gold_name
      );

      return (
        priceGoldType.includes(
          transactionGoldType
        ) ||
        transactionGoldType.includes(
          priceGoldType
        )
      );
    });
  }

  if (!matched && candidates.length === 1) {
    matched = candidates[0];
  }

  if (!matched) {
    return null;
  }

  const currentPrice = Number(
    matched?.buy_price_per_chi ??
    matched?.buy_price ??
    0
  );

  if (currentPrice <= 0) {
    return null;
  }

  return {
    currentPrice,
    priceDate:
      matched?.price_date ??
      matched?.updated_at ??
      matched?.created_at ??
      null,
  };
}

function buildTransactionResult(
  transaction,
  calculateTransactionResult,
  privateGoldPrices,
) {
  const baseResult =
    typeof calculateTransactionResult ===
      'function'
      ? calculateTransactionResult(
          transaction
        )
      : {};

  if (
    Number(
      baseResult?.currentPrice ?? 0
    ) > 0
  ) {
    return baseResult;
  }

  const privatePrice =
    getPrivatePriceForTransaction(
      transaction,
      privateGoldPrices
    );

  if (!privatePrice) {
    return baseResult;
  }

  const quantity = Number(
    transaction?.quantity_chi ?? 0
  );

  const purchasePrice = Number(
    transaction?.price_per_chi ??
    transaction?.unit_price ??
    0
  );

  const originalValue =
    quantity * purchasePrice;

  const currentValue =
    quantity *
    privatePrice.currentPrice;

  const profit =
    currentValue - originalValue;

  const profitPercent =
    originalValue > 0
      ? (profit / originalValue) * 100
      : 0;

  return {
    ...baseResult,
    originalValue,
    currentValue,
    currentPrice:
      privatePrice.currentPrice,
    profit,
    profitPercent,
    hasMarketPrice: true,
    isLiveMarketPrice: false,
    priceSource: 'private-latest',
    priceDate:
      privatePrice.priceDate,
  };
}

function TransactionTable({
  loading,
  transactions,
  privateGoldPrices = [],
  calculateTransactionResult,
  onEdit,
  onDelete,
}) {
  const [mobilePage, setMobilePage] = useState(1);

  const mobileTotalPages = Math.max(1, transactions.length);
  const mobileTransaction = transactions[mobilePage - 1] || null;
  const mobileResult = mobileTransaction
    ? buildTransactionResult(
        mobileTransaction,
        calculateTransactionResult,
        privateGoldPrices
      )
    : null;

  useEffect(() => {
    setMobilePage((currentPage) =>
      Math.min(currentPage, mobileTotalPages)
    );
  }, [mobileTotalPages]);

  return (
    <div className="card">
      <h2 className="section-title">
        <ListChecks size={20} />
        Danh sách giao dịch
      </h2>

      {loading ? (
        <p>Đang tải...</p>
      ) : transactions.length === 0 ? (
        <p className="small-text">Chưa có giao dịch.</p>
      ) : (
        <>
          <div className="transaction-desktop-table">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Loại</th>
                    <th>Vàng</th>
                    <th>Số chỉ</th>
                    <th>Giá mua lúc giao dịch</th>
                    <th>Giá thu lại hiện tại</th>
                    <th>Nơi mua/bán</th>
                    <th>Lời/lỗ</th>
                    <th>Lời/lỗ %</th>
                    <th>Ghi chú</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map((transaction) => {
                    const result =
                      buildTransactionResult(
                        transaction,
                        calculateTransactionResult,
                        privateGoldPrices
                      );

                    return (
                      <tr key={transaction.id}>
                        <td>{transaction.transaction_date}</td>

                        <td>
                          <span
                            className={`transaction-type-badge ${transaction.transaction_type === 'BUY'
                              ? 'transaction-type-badge--buy'
                              : 'transaction-type-badge--sell'
                              }`}
                          >
                            {transaction.transaction_type === 'BUY'
                              ? 'Mua'
                              : 'Bán'}
                          </span>
                        </td>

                        <td>
                          <div>{transaction.gold_type}</div>
                          <small className="transaction-source-label">
                            {getSourceLabel(transaction)}
                          </small>
                        </td>

                        <td>
                          {Number(transaction.quantity_chi || 0)}
                        </td>

                        <td>
                          {formatMoney(transaction.price_per_chi)}
                        </td>


                        <td title="Giá mua lại mới nhất dùng để tính lời/lỗ">
                          {Number(
                            result.currentPrice || 0
                          ) > 0
                            ? (
                              <>
                                {formatMoney(result.currentPrice)} VND/chỉ
                                {result.priceDate && (
                                  <small className="transaction-price-date">
                                    Cập nhật {new Date(result.priceDate).toLocaleDateString('vi-VN')}
                                  </small>
                                )}
                              </>
                            )
                            : 'Chưa có giá hiện tại'}
                        </td>

                        <td>
                          {transaction.location ? (
                            <span className="location-cell">
                              <MapPin size={14} />
                              {transaction.location}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>

                        <td
                          className={
                            result.hasMarketPrice
                              ? (
                                result.profit >= 0
                                  ? 'profit'
                                  : 'loss'
                              )
                              : ''
                          }
                        >
                          {result.hasMarketPrice
                            ? `${formatMoney(
                              result.profit
                            )} VND`
                            : '-'}
                        </td>

                        <td
                          className={
                            result.hasMarketPrice
                              ? (
                                result.profitPercent >= 0
                                  ? 'profit'
                                  : 'loss'
                              )
                              : ''
                          }
                        >
                          {result.hasMarketPrice
                            ? `${result.profitPercent.toFixed(
                              2
                            )}%`
                            : '-'}
                        </td>

                        <td>{transaction.note || '-'}</td>

                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="edit-button icon-button table-icon-button"
                              onClick={() => onEdit(transaction)}
                            >
                              <Pencil size={15} />
                              Sửa
                            </button>

                            <button
                              type="button"
                              className="danger-button icon-button table-icon-button"
                              onClick={() => onDelete(transaction.id)}
                            >
                              <Trash2 size={15} />
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="transaction-mobile-list">
            {mobileTransaction && mobileResult && (
              <article
                key={mobileTransaction.id}
                className="transaction-mobile-card"
              >
                <div className="transaction-mobile-table-wrap">
                  <table className="transaction-mobile-table">
                    <tbody>
                      <tr>
                        <th>Ngày</th>
                        <td>{mobileTransaction.transaction_date}</td>
                      </tr>

                      <tr>
                        <th>Loại</th>
                        <td>
                          <span
                            className={`transaction-type-badge ${mobileTransaction.transaction_type === 'BUY'
                                ? 'transaction-type-badge--buy'
                                : 'transaction-type-badge--sell'
                              }`}
                          >
                            {mobileTransaction.transaction_type === 'BUY'
                              ? 'Mua'
                              : 'Bán'}
                          </span>
                        </td>
                      </tr>

                      <tr>
                        <th>Vàng</th>
                        <td>
                          <div>{mobileTransaction.gold_type}</div>
                          <small className="transaction-source-label">
                            {getSourceLabel(mobileTransaction)}
                          </small>
                        </td>
                      </tr>

                      <tr>
                        <th>Số chỉ</th>
                        <td>
                          {Number(
                            mobileTransaction.quantity_chi || 0
                          )}{' '}
                          chỉ
                        </td>
                      </tr>

                      <tr>
                        <th>Giá lúc mua</th>
                        <td>
                          {formatMoney(
                            mobileTransaction.price_per_chi
                          )}{' '}
                          VND
                        </td>
                      </tr>

                      <tr>
                        <th>Giá thu lại lúc giao dịch</th>
                        <td>
                          {Number(mobileTransaction.sell_price_per_chi || 0) > 0
                            ? `${formatMoney(mobileTransaction.sell_price_per_chi)} VND/chỉ`
                            : '-'}
                        </td>
                      </tr>

                      <tr>
                        <th>Giá thu lại hiện tại</th>
                        <td title="Giá mua lại mới nhất dùng để tính lời/lỗ">
                          {Number(
                            mobileResult.currentPrice || 0
                          ) > 0
                            ? (
                              <>
                                {formatMoney(mobileResult.currentPrice)} VND/chỉ
                                {mobileResult.priceDate && (
                                  <small className="transaction-price-date">
                                    Cập nhật {new Date(mobileResult.priceDate).toLocaleDateString('vi-VN')}
                                  </small>
                                )}
                              </>
                            )
                            : 'Chưa có giá hiện tại'}
                        </td>
                      </tr>

                      <tr>
                        <th>Nơi mua/bán</th>
                        <td>{mobileTransaction.location || '-'}</td>
                      </tr>

                      <tr>
                        <th>Lời/lỗ</th>
                        <td
                          className={
                            mobileResult.hasMarketPrice
                              ? (
                                mobileResult.profit >= 0
                                  ? 'profit'
                                  : 'loss'
                              )
                              : ''
                          }
                        >
                          {mobileResult.hasMarketPrice
                            ? `${formatMoney(
                              mobileResult.profit
                            )} VND`
                            : '-'}
                        </td>
                      </tr>

                      <tr>
                        <th>Lời/lỗ %</th>
                        <td
                          className={
                            mobileResult.hasMarketPrice
                              ? (
                                mobileResult.profitPercent >= 0
                                  ? 'profit'
                                  : 'loss'
                              )
                              : ''
                          }
                        >
                          {mobileResult.hasMarketPrice
                            ? (
                              <>
                                {mobileResult.profitPercent >= 0
                                  ? '↑ +'
                                  : '↓ '}
                                {mobileResult.profitPercent.toFixed(
                                  2
                                )}%
                              </>
                            )
                            : '-'}
                        </td>
                      </tr>

                      <tr>
                        <th>Ghi chú</th>
                        <td>{mobileTransaction.note || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="transaction-mobile-actions">
                  <button
                    type="button"
                    className="edit-button icon-button"
                    onClick={() => onEdit(mobileTransaction)}
                  >
                    <Pencil size={15} />
                    Sửa
                  </button>

                  <button
                    type="button"
                    className="danger-button icon-button"
                    onClick={() => onDelete(mobileTransaction.id)}
                  >
                    <Trash2 size={15} />
                    Xóa
                  </button>
                </div>
              </article>
            )}

            {transactions.length > 1 && (
              <div className="pagination transaction-mobile-pagination">
                <button
                  type="button"
                  disabled={mobilePage === 1}
                  onClick={() =>
                    setMobilePage((page) => Math.max(1, page - 1))
                  }
                >
                  Trang trước
                </button>

                <span>
                  {mobilePage} / {mobileTotalPages}
                </span>

                <button
                  type="button"
                  disabled={mobilePage === mobileTotalPages}
                  onClick={() =>
                    setMobilePage((page) =>
                      Math.min(mobileTotalPages, page + 1)
                    )
                  }
                >
                  Trang sau
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default TransactionTable;