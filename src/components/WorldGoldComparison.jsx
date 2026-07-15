import { formatDateTime, formatMoney } from '../utils/formatters';

function WorldGoldComparison({
  worldGold,
  worldGoldLoading,
  worldGoldError,
  worldGoldMarketMessage,
  shopGold,
  shopSellPriceVndPerLuong,
  goldDifference,
  goldDifferencePercent,
}) {
  return (
    <div className="card">
      <p className="small-text">
        Tự động cập nhật giá vàng thế giới và tỷ giá USD/VND mỗi 1 phút
        khi thị trường đang hoạt động.
      </p>

      {worldGoldMarketMessage && (
        <p className="world-gold-market-note">
          {worldGoldMarketMessage}
        </p>
      )}

      {worldGoldLoading && (
        <p className="small-text">
          Đang cập nhật giá thế giới...
        </p>
      )}

      {worldGoldError && (
        <p className="message">
          {worldGoldError}
        </p>
      )}

      {worldGold && (
        <div className="world-gold-compare">
          <div>
            <span>Giá vàng thế giới</span>

            <strong>
              {Number(worldGold.goldUsdOz || 0).toFixed(2)} USD/oz
            </strong>
          </div>

          <div>
            <span>Tỷ giá USD/VND</span>

            <strong>
              {formatMoney(worldGold.usdVnd)} VND
            </strong>
          </div>

          <div>
            <span>Quy đổi VND/lượng</span>

            <strong>
              {formatMoney(
                Math.round(worldGold.worldGoldVndPerLuong || 0)
              )}{' '}
              VND
            </strong>
          </div>

          <div>
            <span>Giá cửa hàng bán ra</span>

            <strong>
              {shopGold?.sell_price_per_chi
                ? `${shopGold.gold_type}: ${formatMoney(
                    shopSellPriceVndPerLuong
                  )} VND/lượng`
                : 'Chưa có giá bán ra'}
            </strong>
          </div>

          <div>
            <span>Chênh lệch</span>

            <strong
              className={
                goldDifference >= 0
                  ? 'profit'
                  : 'loss'
              }
            >
              {shopGold?.sell_price_per_chi
                ? `${formatMoney(
                    Math.round(goldDifference)
                  )} VND (${Number(
                    goldDifferencePercent || 0
                  ).toFixed(2)}%)`
                : '-'}
            </strong>
          </div>

          <div>
            <span>Cập nhật lúc</span>

            <strong>
              {formatDateTime(worldGold.updatedAt)}
            </strong>
          </div>
        </div>
      )}

      {!worldGold &&
        !worldGoldLoading &&
        !worldGoldError && (
          <p className="small-text">
            Chưa có dữ liệu giá vàng thế giới.
          </p>
        )}
    </div>
  );
}

export default WorldGoldComparison;