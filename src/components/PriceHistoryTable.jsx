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
  priceHistory = [],
  paginatedPriceHistory = [],
  historyPage = 1,
  historyTotalPages = 1,
  onPreviousPage,
  onNextPage,
  onDelete,
}) {
  /*
   * Chỉ hiển thị cột và nút xóa khi component
   * thật sự nhận được hàm onDelete.
   *
   * Lịch sử PNJ dùng chung sẽ không truyền onDelete,
   * vì vậy người dùng không thể xóa dữ liệu thị trường.
   */
  const canDelete =
    typeof onDelete === 'function';

  return (
    <div className="card">
      <h2 className="section-title">
        <History size={20} />
        Lịch sử cập nhật giá cửa hàng PNJ
      </h2>

      {priceHistory.length === 0 ? (
        <p className="small-text">
          Chưa có lịch sử cập nhật giá PNJ.
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
                    item.created_at;

                  const buyPrice = Number(
                    item.price_per_chi ??
                    item.new_buy_price_per_chi ??
                    item.buy_price_per_chi ??
                    0
                  );

                  const sellPrice = Number(
                    item.sell_price_per_chi ??
                    item.new_sell_price_per_chi ??
                    0
                  );

                  return (
                    <tr key={item.id}>
                      <td>
                        {formatDateTime(
                          updatedAt
                        )}
                      </td>

                      <td>
                        {item.gold_type || '-'}
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
                          price={sellPrice}
                          change={
                            item.sellPriceChange
                          }
                        />
                      </td>

                      <td>
                        {formatMoney(
                          sellPrice -
                          buyPrice
                        )}{' '}
                        VND
                      </td>

                      <td>
                        {item.note || '-'}
                      </td>

                      {canDelete && (
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
                      )}
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>

          {historyTotalPages > 1 && (
            <div className="pagination">
              <button
                type="button"
                disabled={historyPage <= 1}
                onClick={
                  onPreviousPage
                }
              >
                Trang trước
              </button>

              <span>
                Trang {historyPage} /{' '}
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