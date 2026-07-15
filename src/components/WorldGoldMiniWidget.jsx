import {
  Globe2,
  XCircle,
} from 'lucide-react';

import TradingViewGoldPriceWidget from './TradingViewGoldPriceWidget';

function WorldGoldMiniWidget({
  isOpen,
  onOpen,
  onClose,
}) {
  return (
    <div
      className={
        isOpen
          ? 'world-gold-mini open'
          : 'world-gold-mini'
      }
    >
      {!isOpen ? (
        <button
          type="button"
          className="world-gold-tab gold-blink"
          onClick={onOpen}
          title="Mở giá vàng thế giới"
        >
          <Globe2 size={18} />
        </button>
      ) : (
        <div className="world-gold-price-card">
          <button
            type="button"
            className="world-gold-mini-close"
            onClick={onClose}
            title="Đóng"
          >
            <XCircle size={18} />
          </button>

          <TradingViewGoldPriceWidget />
        </div>
      )}
    </div>
  );
}

export default WorldGoldMiniWidget;