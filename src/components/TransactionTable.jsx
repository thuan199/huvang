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
                    <th>Giá bán ra hiện tại</th>
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
                          {formatMoney(result.currentPrice)}
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
                            result.profit >= 0
                              ? 'profit'
                              : 'loss'
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
            {transactions.map((transaction) => {
              const result =
                calculateTransactionResult(transaction);

              const isProfit = result.profit >= 0;

              return (
                <article
                  key={transaction.id}
                  className="transaction-mobile-card"
                >
                  <div className="transaction-mobile-header">
                    <div>
                      <strong>{transaction.gold_type}</strong>
                      <span>{transaction.transaction_date}</span>
                    </div>

                    <span
                      className={`transaction-type-badge ${
                        transaction.transaction_type === 'BUY'
                          ? 'transaction-type-buy'
                          : 'transaction-type-sell'
                      }`}
                    >
                      {transaction.transaction_type === 'BUY'
                        ? 'Mua'
                        : 'Bán'}
                    </span>
                  </div>

                  <div className="transaction-mobile-grid">
                    <div>
                      <span>Số lượng</span>
                      <strong>
                        {Number(transaction.quantity_chi || 0)} chỉ
                      </strong>
                    </div>

                    <div>
                      <span>Giá mua</span>
                      <strong>
                        {formatMoney(transaction.price_per_chi)} VND
                      </strong>
                    </div>

                    <div>
                      <span>Giá hiện tại</span>
                      <strong>
                        {formatMoney(result.currentPrice)} VND
                      </strong>
                    </div>

                    <div>
                      <span>Nơi mua/bán</span>
                      <strong>
                        {transaction.location || '-'}
                      </strong>
                    </div>
                  </div>

                  <div
                    className={`transaction-mobile-profit ${
                      isProfit ? 'profit' : 'loss'
                    }`}
                  >
                    <span>Lời/lỗ</span>

                    <strong>
                      {formatMoney(result.profit)} VND
                    </strong>

                    <small>
                      {isProfit ? '↑' : '↓'}{' '}
                      {result.profitPercent >= 0 ? '+' : ''}
                      {result.profitPercent.toFixed(2)}%
                    </small>
                  </div>

                  {transaction.note && (
                    <div className="transaction-mobile-note">
                      <span>Ghi chú</span>
                      <p>{transaction.note}</p>
                    </div>
                  )}

                  <div className="transaction-mobile-actions">
                    <button
                      type="button"
                      className="edit-button icon-button"
                      onClick={() => onEdit(transaction)}
                    >
                      <Pencil size={15} />
                      Sửa
                    </button>

                    <button
                      type="button"
                      className="danger-button icon-button"
                      onClick={() => onDelete(transaction.id)}
                    >
                      <Trash2 size={15} />
                      Xóa
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default TransactionTable;