import {
  PlusCircle,
  Pencil,
  Save,
  XCircle,
} from 'lucide-react';

const GOLD_SOURCES = [
  {
    code: 'SJC',
    label: '🥇 SJC',
    products: [
      {
        value: 'Nhẫn SJC',
        label: 'Nhẫn SJC',
      },
    ],
  },
  {
    code: 'MI_HONG',
    label: '🏪 Mi Hồng',
    products: [
      {
        value: 'Vàng 999',
        label: 'Vàng 999',
      },
    ],
  },
  {
    code: 'PNJ',
    label: '💍 PNJ',
    products: [
      {
        value: 'Nhẫn 9999',
        label: 'Nhẫn 9999',
      },
    ],
  },
];

function normalizeSourceCode(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^MIHONG$/, 'MI_HONG');
}

function getItemSourceCode(item) {
  const nestedSource =
    Array.isArray(item?.source)
      ? item.source[0]
      : item?.source;

  const joinedSource =
    Array.isArray(item?.gold_price_sources)
      ? item.gold_price_sources[0]
      : item?.gold_price_sources;

  return normalizeSourceCode(
    item?.source_code ??
      item?.sourceCode ??
      nestedSource?.code ??
      nestedSource?.source_code ??
      joinedSource?.code ??
      joinedSource?.source_code ??
      item?.source_name ??
      item?.source,
  );
}

function normalizeProductName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getItemProductName(item) {
  return (
    item?.product_name ??
    item?.gold_type_name ??
    item?.source_product_name ??
    item?.gold_type ??
    ''
  );
}

function getMarketBuybackPrice(
  marketCurrentPrices,
  sourceCode,
  goldType,
) {
  const normalizedSource =
    normalizeSourceCode(sourceCode);

  const normalizedGoldType =
    normalizeProductName(goldType);

  const sourceRows =
    marketCurrentPrices.filter(
      (item) =>
        getItemSourceCode(item) ===
        normalizedSource,
    );

  const marketPrice =
    sourceRows.find(
      (item) =>
        normalizeProductName(
          getItemProductName(item),
        ) === normalizedGoldType,
    ) ??
    sourceRows.find(
      (item) =>
        Number(
          item.buy_price ??
            item.buy_price_per_chi ??
            item.current_price_per_chi ??
            item.price_per_chi ??
            0,
        ) > 0,
    );

  return Number(
    marketPrice?.buy_price ??
      marketPrice?.buy_price_per_chi ??
      marketPrice?.current_price_per_chi ??
      marketPrice?.price_per_chi ??
      0,
  );
}

function TransactionForm({
  editingId,
  transactionForm,
  setTransactionForm,
  marketCurrentPrices = [],
  onSubmit,
  onCancel,
}) {
  const selectedSourceCode =
    normalizeSourceCode(
      transactionForm.source_code,
    ) || 'PNJ';

  const selectedSource =
    GOLD_SOURCES.find(
      (source) =>
        source.code ===
        selectedSourceCode,
    ) ??
    GOLD_SOURCES.find(
      (source) =>
        source.code === 'PNJ',
    );

  const availableProducts =
    selectedSource?.products ?? [];

  const selectedGoldType =
    availableProducts.some(
      (product) =>
        product.value ===
        transactionForm.gold_type,
    )
      ? transactionForm.gold_type
      : availableProducts[0]?.value ?? '';

  function updateFormField(
    fieldName,
    fieldValue,
  ) {
    setTransactionForm(
      (currentForm) => ({
        ...currentForm,
        [fieldName]: fieldValue,
      }),
    );
  }

  function handleSourceChange(event) {
    const sourceCode =
      normalizeSourceCode(
        event.target.value,
      );

    const newSource =
      GOLD_SOURCES.find(
        (source) =>
          source.code === sourceCode,
      );

    if (!newSource) {
      return;
    }

    const firstProduct =
      newSource.products?.[0];

    const buybackPrice =
      getMarketBuybackPrice(
        marketCurrentPrices,
        sourceCode,
        firstProduct?.value,
      );

    setTransactionForm(
      (currentForm) => ({
        ...currentForm,

        source_code:
          sourceCode,

        gold_type:
          firstProduct?.value ?? '',

        sell_price_per_chi:
          buybackPrice > 0
            ? String(buybackPrice)
            : '',
      }),
    );
  }

  function handleGoldTypeChange(event) {
    const nextGoldType =
      event.target.value;

    const buybackPrice =
      getMarketBuybackPrice(
        marketCurrentPrices,
        selectedSourceCode,
        nextGoldType,
      );

    setTransactionForm(
      (currentForm) => ({
        ...currentForm,
        gold_type:
          nextGoldType,
        sell_price_per_chi:
          buybackPrice > 0
            ? String(buybackPrice)
            : currentForm.sell_price_per_chi,
      }),
    );
  }

  return (
    <form
      className="card"
      onSubmit={onSubmit}
    >
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
          : 'Chọn cửa hàng và loại vàng bạn đã mua hoặc bán.'}
      </p>

      <label htmlFor="transaction-type">
        Loại giao dịch
      </label>

      <select
        id="transaction-type"
        value={
          transactionForm
            .transaction_type ?? 'BUY'
        }
        onChange={(event) =>
          updateFormField(
            'transaction_type',
            event.target.value,
          )
        }
      >
        <option value="BUY">
          Mua
        </option>

        <option value="SELL">
          Bán
        </option>
      </select>

      <label htmlFor="gold-source">
        Cửa hàng / nguồn vàng
      </label>

      <select
        id="gold-source"
        value={selectedSourceCode}
        onChange={handleSourceChange}
      >
        {GOLD_SOURCES.map(
          (source) => (
            <option
              key={source.code}
              value={source.code}
            >
              {source.label}
            </option>
          ),
        )}
      </select>

      <label htmlFor="gold-type">
        Loại vàng
      </label>

      <select
        id="gold-type"
        value={selectedGoldType}
        onChange={
          handleGoldTypeChange
        }
      >
        {availableProducts.map(
          (product) => (
            <option
              key={product.value}
              value={product.value}
            >
              {product.label}
            </option>
          ),
        )}
      </select>

      {selectedSourceCode ===
        'SJC' && (
          <p className="transaction-unit-note">
            Giá SJC được nhập theo chỉ.
            Nguồn SJC công bố theo lượng,
            với 1 lượng = 10 chỉ.
          </p>
        )}

      <label htmlFor="quantity-chi">
        Số lượng chỉ
      </label>

      <input
        id="quantity-chi"
        type="number"
        min="0"
        step="0.1"
        value={
          transactionForm
            .quantity_chi ?? ''
        }
        onChange={(event) =>
          updateFormField(
            'quantity_chi',
            event.target.value,
          )
        }
        placeholder="Ví dụ: 5"
      />

      <label htmlFor="buy-price">
        Giá mua mỗi chỉ
      </label>

      <input
        id="buy-price"
        type="number"
        min="0"
        step="5000"
        value={
          transactionForm
            .price_per_chi ?? ''
        }
        onChange={(event) =>
          updateFormField(
            'price_per_chi',
            event.target.value,
          )
        }
        placeholder="Ví dụ: 14320000"
      />

      <label htmlFor="sell-price">
        Giá cửa hàng thu lại mỗi chỉ
      </label>

      <p className="transaction-price-note">
        Giá được tự động lấy theo nguồn
        vàng đã chọn và được lưu cùng giao
        dịch.
      </p>

      <input
        id="sell-price"
        type="number"
        min="0"
        step="5000"
        value={
          transactionForm
            .sell_price_per_chi ?? ''
        }
        onChange={(event) =>
          updateFormField(
            'sell_price_per_chi',
            event.target.value,
          )
        }
        placeholder="Chưa có giá cửa hàng thu lại"
      />

      <p className="transaction-price-note">
        Giá được tự động lấy theo nguồn
        vàng đã chọn. Bạn vẫn có thể điều
        chỉnh lại trước khi lưu.
      </p>

      <label htmlFor="transaction-date">
        Ngày giao dịch
      </label>

      <input
        id="transaction-date"
        type="date"
        value={
          transactionForm
            .transaction_date ?? ''
        }
        onChange={(event) =>
          updateFormField(
            'transaction_date',
            event.target.value,
          )
        }
      />

      <label htmlFor="transaction-location">
        Nơi mua/bán
      </label>

      <input
        id="transaction-location"
        type="text"
        value={
          transactionForm.location ?? ''
        }
        onChange={(event) =>
          updateFormField(
            'location',
            event.target.value,
          )
        }
        placeholder="Ví dụ: PNJ Tô Ngọc Vân, Chợ Bà Chiểu..."
      />

      <label htmlFor="transaction-note">
        Ghi chú
      </label>

      <textarea
        id="transaction-note"
        value={
          transactionForm.note ?? ''
        }
        onChange={(event) =>
          updateFormField(
            'note',
            event.target.value,
          )
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