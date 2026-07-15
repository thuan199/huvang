import {
  RefreshCcw,
  Pencil,
  Trash2,
  XCircle,
} from 'lucide-react';

import { formatMoney } from '../utils/formatters';

function CurrentPriceForm({
  editingPriceId,
  priceForm,
  setPriceForm,
  prices,
  onSubmit,
  onCancel,
  onEdit,
  onDelete,
}) {
  return (
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
            current_price_per_chi: event.target.value,
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
            sell_price_per_chi: event.target.value,
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

      <h3>Giá đang lưu</h3>

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
  );
}

export default CurrentPriceForm;