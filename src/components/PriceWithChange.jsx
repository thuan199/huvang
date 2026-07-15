import {
  formatMoney,
  formatPriceChange,
} from '../utils/formatters';

function PriceWithChange({ price, change }) {
  const hasChange =
    change !== null &&
    change !== undefined;

  const isIncrease = change > 0;
  const isDecrease = change < 0;

  const changeClass = isIncrease
    ? 'price-change-positive'
    : isDecrease
      ? 'price-change-negative'
      : 'price-change-neutral';

  const arrow = isIncrease
    ? '▲'
    : isDecrease
      ? '▼'
      : '•';

  const tooltipText = hasChange
    ? `So với lần cập nhật trước: ${formatPriceChange(
        change
      )} VND`
    : '';

  return (
    <div className="history-price-cell">
      {hasChange && (
        <span
          className={`history-price-change ${changeClass}`}
          title={tooltipText}
        >
          <span className="history-price-arrow">
            {arrow}
          </span>

          <span>
            {formatPriceChange(change)}
          </span>
        </span>
      )}

      <span className="history-price-value">
        {formatMoney(price)} VND
      </span>
    </div>
  );
}

export default PriceWithChange;