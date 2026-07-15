import {
  History,
  Trash2,
} from 'lucide-react';

import {
  formatDateTime,
  formatMoney,
} from '../utils/formatters';

import PriceWithChange from './PriceWithChange';

function PriceHistoryTable({
  priceHistory,
  paginatedPriceHistory,
  historyPage,
  historyTotalPages,
  onPreviousPage,
  onNextPage,
  onDelete,
}) {
  return (
    <div className="card">
      <h2 className="section-title">
        <History size={20} />
        Lịch sử cập nhật giá tại cửa hàng PNJ
      </h2>

      {priceHistory.length === 0 ? (
        <p className="small-text">
          Chưa có lịch sử cập nhật giá.
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
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {paginatedPriceHistory.map((item) => (
                <tr key={item.id}>
                  <td>
                    {formatDateTime(item.created_at)}
                  </td>

                  <td>{item.gold_type}</td>

                  <td>
                    <PriceWithChange
                      price={item.price_per_chi}
                      change={item.buyPriceChange}
                    />
                  </td>

                  <td>
                    <PriceWithChange
                      price={item.sell_price_per_chi}
                      change={item.sellPriceChange}
                    />
                  </td>

                  <td>
                    {formatMoney(
                      Number(item.sell_price_per_chi || 0) -
                      Number(item.price_per_chi || 0)
                    )}{' '}
                    VND
                  </td>

                  <td>{item.note || '-'}</td>

                  <td>
                    <button
                      type="button"
                      className="danger-button icon-button table-icon-button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onDelete(item);
                      }}
                    >
                      <Trash2 size={15} />
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button
              type="button"
              disabled={historyPage === 1}
              onClick={onPreviousPage}
            >
              Trang trước
            </button>

            <span>
              Trang {historyPage} / {historyTotalPages}
            </span>

            <button
              type="button"
              disabled={historyPage >= historyTotalPages}
              onClick={onNextPage}
            >
              Trang sau
            </button>
          </div>

          <footer className="app-footer">
            <p>© 2026 Phạm Ngọc Thuần</p>
          </footer>
        </div>
      )}
    </div>
  );
}

export default PriceHistoryTable;