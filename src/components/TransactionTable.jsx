import { useEffect, useState } from 'react';
import {
  ListChecks,
  MapPin,
  Pencil,
  Trash2,
} from 'lucide-react';

import { formatMoney } from '../utils/formatters';

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
    ? calculateTransactionResult(mobileTransaction)
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
                    <th>Giá cửa hàng thu lại hiện tại</th>
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
                      calculateTransactionResult(transaction);

                    return (
                      <tr key={transaction.id}>
                        <td>{transaction.transaction_date}</td>

                        <td>
                          {transaction.transaction_type === 'BUY'
                            ? 'Mua'
                            : 'Bán'}
                        </td>

                        <td>{transaction.gold_type}</td>

                        <td>
                          {Number(transaction.quantity_chi || 0)}
                        </td>

                        <td>
                          {formatMoney(transaction.price_per_chi)}
                        </td>

                        <td>
                          {result.hasMarketPrice
                            ? `${formatMoney(result.currentPrice)} VND/chỉ`
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
                            result.profit >= 0 ? 'profit' : 'loss'
                          }
                        >
                          {formatMoney(result.profit)} VND
                        </td>

                        <td
                          className={
                            result.profitPercent >= 0
                              ? 'profit'
                              : 'loss'
                          }
                        >
                          {result.profitPercent.toFixed(2)}%
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
                          {mobileTransaction.transaction_type === 'BUY'
                            ? 'Mua'
                            : 'Bán'}
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
                        <th>Giá cửa hàng thu lại</th>
                        <td>
                          {mobileResult.hasMarketPrice
                            ? `${formatMoney(
                              mobileResult.currentPrice
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
                            mobileResult.profit >= 0
                              ? 'profit'
                              : 'loss'
                          }
                        >
                          {formatMoney(mobileResult.profit)} VND
                        </td>
                      </tr>

                      <tr>
                        <th>Lời/lỗ %</th>
                        <td
                          className={
                            mobileResult.profitPercent >= 0
                              ? 'profit'
                              : 'loss'
                          }
                        >
                          {mobileResult.profitPercent >= 0
                            ? '↑ +'
                            : '↓ '}
                          {mobileResult.profitPercent.toFixed(2)}%
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