import {
  PlusCircle,
  Pencil,
  Save,
  XCircle,
} from 'lucide-react';

function TransactionForm({
  editingId,
  transactionForm,
  setTransactionForm,
  onSubmit,
  onCancel,
}) {
  return (
    <form className="card" onSubmit={onSubmit}>
      <h2 className="section-title">
        {editingId ? (
          <Pencil size={20} />
        ) : (
          <PlusCircle size={20} />
        )}

        {editingId
          ? 'Chỉnh sửa giao dịch'
          : 'Thêm giao dịch mới'}
      </h2>

      <p className="small-text">
        {editingId
          ? 'Bạn đang chỉnh sửa giao dịch đã chọn.'
          : 'Nhập thông tin mua hoặc bán vàng của bạn.'}
      </p>

      <label>Loại giao dịch</label>

      <select
        value={transactionForm.transaction_type}
        onChange={(event) =>
          setTransactionForm({
            ...transactionForm,
            transaction_type: event.target.value,
          })
        }
      >
        <option value="BUY">Mua</option>
        <option value="SELL">Bán</option>
      </select>

      <label>Loại vàng</label>

      <input
        value={transactionForm.gold_type}
        onChange={(event) =>
          setTransactionForm({
            ...transactionForm,
            gold_type: event.target.value,
          })
        }
        placeholder="SJC, Nhẫn 9999, 24K..."
      />

      <label>Số lượng chỉ</label>

      <input
        type="number"
        step="1"
        value={transactionForm.quantity_chi}
        onChange={(event) =>
          setTransactionForm({
            ...transactionForm,
            quantity_chi: event.target.value,
          })
        }
        placeholder="Ví dụ: 5"
      />

      <label>Giá mua vào</label>

      <input
        type="number"
        step="10000"
        value={transactionForm.price_per_chi}
        onChange={(event) =>
          setTransactionForm({
            ...transactionForm,
            price_per_chi: event.target.value,
          })
        }
        placeholder="Ví dụ: 14320000"
      />

      <label>Giá bán ra mỗi chỉ</label>

      <input
        type="number"
        step="10000"
        value={transactionForm.sell_price_per_chi}
        onChange={(event) =>
          setTransactionForm({
            ...transactionForm,
            sell_price_per_chi: event.target.value,
          })
        }
        placeholder="Ví dụ: 14690000"
      />

      <label>Ngày giao dịch</label>

      <input
        type="date"
        value={transactionForm.transaction_date}
        onChange={(event) =>
          setTransactionForm({
            ...transactionForm,
            transaction_date: event.target.value,
          })
        }
      />

      <label>Mua/bán ở đâu?</label>

      <input
        value={transactionForm.location}
        onChange={(event) =>
          setTransactionForm({
            ...transactionForm,
            location: event.target.value,
          })
        }
        placeholder="Ví dụ: PNJ, SJC, tiệm vàng..."
      />

      <label>Ghi chú</label>

      <textarea
        value={transactionForm.note}
        onChange={(event) =>
          setTransactionForm({
            ...transactionForm,
            note: event.target.value,
          })
        }
        placeholder="Ghi chú thêm nếu có"
      />

      <div className="form-actions">
        <button
          type="submit"
          className="icon-button"
        >
          <Save size={17} />

          {editingId
            ? 'Cập nhật giao dịch'
            : 'Lưu giao dịch'}
        </button>

        {editingId && (
          <button
            type="button"
            className="secondary-button icon-button"
            onClick={onCancel}
          >
            <XCircle size={17} />
            Hủy chỉnh sửa
          </button>
        )}
      </div>
    </form>
  );
}

export default TransactionForm;