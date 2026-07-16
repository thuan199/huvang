import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  CloudDownload,
  Pencil,
  Trash2,
  XCircle,
  RefreshCcw,
  CheckCircle2,
  Info,
  AlertCircle,
  X,
} from 'lucide-react';

import { formatMoney } from '../utils/formatters';
import {
  syncGoldPriceFromPnj,
} from '../services/goldDataService.js';

function CurrentPriceForm({
  editingPriceId,
  priceForm,
  setPriceForm,
  prices,
  onSubmit,
  onCancel,
  onEdit,
  onDelete,
  onPriceUpdated,
}) {
  const [
    isLoadingPnjPrice,
    setIsLoadingPnjPrice,
  ] = useState(false);

  const [toast, setToast] = useState(null);

  const toastTimerRef = useRef(null);

  function hideToast() {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    setToast(null);
  }

  function showToast(message, type = 'success') {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    setToast({
      message,
      type,
    });

    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3500);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  async function handleGetPriceFromPnj() {
    if (isLoadingPnjPrice) {
      return;
    }

    try {
      setIsLoadingPnjPrice(true);

      const result = await syncGoldPriceFromPnj();

      if (!result.changed) {
        showToast(
          result.message || 'PNJ chưa có giá mới.',
          'info'
        );

        return;
      }

      if (onPriceUpdated) {
        await onPriceUpdated();
      }

      showToast(
        result.message ||
          'Đã cập nhật giá mới từ PNJ và lưu lịch sử.',
        'success'
      );
    } catch (error) {
      console.error(
        'Lỗi lấy giá hiện tại từ PNJ:',
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : 'Không thể lấy giá hiện tại từ PNJ.',
        'error'
      );
    } finally {
      setIsLoadingPnjPrice(false);
    }
  }

  function getToastIcon() {
    if (toast?.type === 'success') {
      return <CheckCircle2 size={20} />;
    }

    if (toast?.type === 'error') {
      return <AlertCircle size={20} />;
    }

    return <Info size={20} />;
  }

  return (
    <>
      {toast && (
        <div
          className={`app-toast app-toast-${toast.type}`}
          role="status"
          aria-live="polite"
        >
          <div className="app-toast-icon">
            {getToastIcon()}
          </div>

          <span className="app-toast-message">
            {toast.message}
          </span>

          <button
            type="button"
            className="app-toast-close"
            onClick={hideToast}
            aria-label="Đóng thông báo"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <form className="card" onSubmit={onSubmit}>
        <h2 className="section-title">
          <RefreshCcw size={20} />
          Cập nhật giá hiện tại
        </h2>

        <p className="small-text">
          Mỗi ngày chỉ lưu một mức giá mới nhất cho từng loại vàng.
        </p>

        <label>Loại vàng</label>

        <input
          value={priceForm.gold_type}
          onChange={(event) =>
            setPriceForm({
              ...priceForm,
              gold_type: event.target.value,
            })
          }
          placeholder="Nhẫn 9999"
        />

        <label>Giá cửa hàng mua vào mỗi chỉ</label>

        <input
          type="number"
          value={priceForm.current_price_per_chi}
          onChange={(event) =>
            setPriceForm({
              ...priceForm,
              current_price_per_chi:
                event.target.value,
            })
          }
          placeholder="Ví dụ: 14320000"
        />

        <label>Giá cửa hàng bán ra mỗi chỉ</label>

        <input
          type="number"
          value={priceForm.sell_price_per_chi}
          onChange={(event) =>
            setPriceForm({
              ...priceForm,
              sell_price_per_chi:
                event.target.value,
            })
          }
          placeholder="Ví dụ: 14690000"
        />

        <label>Ghi chú giá</label>

        <input
          value={priceForm.note}
          onChange={(event) =>
            setPriceForm({
              ...priceForm,
              note: event.target.value,
            })
          }
          placeholder="Ví dụ: Giá PNJ sáng nay"
        />

        <div className="form-actions">
          <button
            type="submit"
            className="icon-button"
          >
            <RefreshCcw size={17} />

            {editingPriceId
              ? 'Lưu giá đã sửa'
              : 'Cập nhật giá'}
          </button>

          {!editingPriceId && (
            <button
              type="button"
              className="pnj-button icon-button"
              onClick={handleGetPriceFromPnj}
              disabled={isLoadingPnjPrice}
            >
              <CloudDownload size={17} />

              {isLoadingPnjPrice
                ? 'Đang lấy giá PNJ...'
                : 'Lấy giá hiện tại từ PNJ'}
            </button>
          )}

          {editingPriceId && (
            <button
              type="button"
              className="secondary-button icon-button"
              onClick={onCancel}
            >
              <XCircle size={17} />
              Hủy sửa giá
            </button>
          )}
        </div>

        <h3>Giá hiện tại</h3>

        {prices.length === 0 ? (
          <p className="small-text">
            Chưa có giá hiện tại.
          </p>
        ) : (
          <ul className="price-list">
            {prices.map((item) => (
              <li key={item.id}>
                <div className="price-info">
                  <span>{item.gold_type}</span>

                  <strong>
                    Mua vào:{' '}
                    {formatMoney(
                      item.current_price_per_chi
                    )}{' '}
                    VND/chỉ
                  </strong>

                  <strong>
                    Bán ra:{' '}
                    {formatMoney(
                      item.sell_price_per_chi
                    )}{' '}
                    VND/chỉ
                  </strong>
                </div>

                <div className="price-actions">
                  <button
                    type="button"
                    className="edit-button icon-button table-icon-button"
                    onClick={() => onEdit(item)}
                  >
                    <Pencil size={15} />
                    Sửa
                  </button>

                  <button
                    type="button"
                    className="danger-button icon-button table-icon-button"
                    onClick={() =>
                      onDelete(
                        item.id,
                        item.gold_type
                      )
                    }
                  >
                    <Trash2 size={15} />
                    Xóa
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </form>
    </>
  );
}

export default CurrentPriceForm;