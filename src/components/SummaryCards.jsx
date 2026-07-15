import {
  Coins,
  Wallet,
  BarChart3,
  TrendingUp,
} from 'lucide-react';

import {
  Smile,
  Frown,
} from 'lucide-react';

import { formatMoney } from '../utils/formatters';

function SummaryCards({ summary }) {
  const totalGoldQuantity = Number(summary?.totalGoldQuantity || 0);
  const totalBuyCost = Number(summary?.totalBuyCost || 0);
  const totalCurrentValue = Number(summary?.totalCurrentValue || 0);
  const profit = Number(summary?.profit || 0);
  const profitPercent = Number(summary?.profitPercent || 0);

  return (
    <div className="summary">
      <div className="summary-card">
        <div className="summary-icon">
          <Coins size={22} />
        </div>

        <span>Tổng số vàng hiện có</span>

        <strong>
          {totalGoldQuantity.toLocaleString('vi-VN', {
            maximumFractionDigits: 4,
          })}{' '}
          chỉ
        </strong>
      </div>

      <div className="summary-card">
        <div className="summary-icon wallet-icon">
          <Wallet size={22} />
        </div>

        <span>Tổng vốn mua (VND)</span>

        <strong>
          {formatMoney(totalBuyCost)}
        </strong>
      </div>

      <div className="summary-card">
        <div className="summary-icon chart-icon">
          <BarChart3 size={22} />
        </div>

        <span>Giá trị hiện tại (VND)</span>

        <strong>
          {formatMoney(totalCurrentValue)}
        </strong>
      </div>

      <div className="summary-card">
        <div
          className={`summary-icon ${
            profit >= 0 ? 'profit-icon' : 'loss-icon'
          }`}
        >
          {profit >= 0 ? (
            <Smile size={22} />
          ) : (
            <Frown size={22} />
          )}
        </div>

        <span>Lời / lỗ (VND)</span>

        <strong className={profit >= 0 ? 'profit' : 'loss'}>
          {formatMoney(profit)}
        </strong>
      </div>

      <div className="summary-card">
        <div className="summary-icon percent-icon">
          <TrendingUp size={22} />
        </div>

        <span>Lời / lỗ %</span>

        <strong
          className={profitPercent >= 0 ? 'profit' : 'loss'}
        >
          {profitPercent.toFixed(2)}%
        </strong>
      </div>
    </div>
  );
}

export default SummaryCards;