import { useEffect, useState } from 'react';
import {
  ListChecks,
  MapPin,
  Pencil,
  Trash2,
} from 'lucide-react';

import { formatMoney } from '../utils/formatters';

function calculateSavedTransactionResult(transaction) {
  const quantity = Number(
    transaction.quantity_chi || 0
  );

  const purchasePrice = Number(
    transaction.price_per_chi ??
    transaction.unit_price ??
    0
  );

  const savedBuybackPrice = Number(
    transaction.sell_price_per_chi || 0
  );

  const hasSavedBuybackPrice =
    savedBuybackPrice > 0;

  const profit = hasSavedBuybackPrice
    ? (
      savedBuybackPrice -
      purchasePrice
    ) * quantity
    : 0;

  const investedAmount =
    purchasePrice * quantity;

  const profitPercent =
    hasSavedBuybackPrice &&
      investedAmount > 0
      ? (
        profit /
        investedAmount
      ) * 100
      : 0;

  return {
    hasSavedBuybackPrice,
    profit,
    profitPercent,
  };
}

function TransactionTable({
  loading,
  transactions,
  calculateTransactionResult,
  onEdit,
  onDelete,
}) {
  const [mobilePage, setMobilePage] = useState(1);

  const mobileTotalPages = Math.max(1, transactions.length);
  const mobileTransaction = transactions[mobilePage - 1] || null;
  const mobileResult = mobileTransaction
    ? calculateSavedTransactionResult(
      mobileTransaction
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
                    <th>Giá tại thời điểm mua</th>
                    <th>Giá cửa hàng thu lại lúc giao dịch</th>
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
                      calculateSavedTransactionResult(
                        transaction
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

                        <td>{transaction.gold_type}</td>

                        <td>
                          {Number(transaction.quantity_chi || 0)}
                        </td>

                        <td>
                          {formatMoney(transaction.price_per_chi)}
                        </td>

                        <td title="Giá cửa hàng thu lại đã lưu cùng giao dịch">
                          {Number(
                            transaction.sell_price_per_chi || 0
                          ) > 0
                            ? `${formatMoney(
                              transaction.sell_price_per_chi
                            )} VND/chỉ`
                            : 'Chưa có giá'}
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
                            result.hasSavedBuybackPrice
                              ? (
                                result.profit >= 0
                                  ? 'profit'
                                  : 'loss'
                              )
                              : ''
                          }
                        >
                          {result.hasSavedBuybackPrice
                            ? `${formatMoney(
                              result.profit
                            )} VND`
                            : '-'}
                        </td>

                        <td
                          className={
                            result.hasSavedBuybackPrice
                              ? (
                                result.profitPercent >= 0
                                  ? 'profit'
                                  : 'loss'
                              )
                              : ''
                          }
                        >
                          {result.hasSavedBuybackPrice
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
                        <td>{mobileTransaction.gold_type}</td>
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
                        <td title="Giá cửa hàng thu lại đã lưu cùng giao dịch">
                          {Number(
                            mobileTransaction.sell_price_per_chi || 0
                          ) > 0
                            ? `${formatMoney(
                              mobileTransaction.sell_price_per_chi
                            )} VND/chỉ`
                            : 'Chưa có giá'}
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
                            mobileResult.hasSavedBuybackPrice
                              ? (
                                mobileResult.profit >= 0
                                  ? 'profit'
                                  : 'loss'
                              )
                              : ''
                          }
                        >
                          {mobileResult.hasSavedBuybackPrice
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
                            mobileResult.hasSavedBuybackPrice
                              ? (
                                mobileResult.profitPercent >= 0
                                  ? 'profit'
                                  : 'loss'
                              )
                              : ''
                          }
                        >
                          {mobileResult.hasSavedBuybackPrice
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