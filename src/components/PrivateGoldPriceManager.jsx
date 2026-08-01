import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Inbox,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import { formatMoney } from '../utils/formatters';
import EmptyState from './EmptyState';
import {
  deletePrivateGoldPriceSeries,
  savePrivateGoldPrice,
} from '../services/privateGoldPriceService';

const EMPTY_FORM = {
  priceId: '',
  optionKey: '',
  shopId: '',
  shopName: '',
  goldTypeName: '',
  buyPricePerChi: '',
  sellPricePerChi: '',
};

function normalizeText(value) {
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

function normalizeSourceCode(value) {
  return String(value ?? '').trim().toUpperCase();
}

function formatUpdatedAt(value) {
  if (!value) return 'Chưa rõ thời gian';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa rõ thời gian';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getAgeInDays(value) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.floor((Date.now() - time) / 86400000);
}

function buildPrivateTransactionOptions(transactions = []) {
  const optionMap = new Map();

  for (const transaction of transactions) {
    const sourceCode = normalizeSourceCode(
      transaction?.source_code ?? transaction?.market_source_code,
    );

    if (sourceCode !== 'PRIVATE') continue;

    const shopId = String(
      transaction?.private_shop_id ?? transaction?.shop_id ?? '',
    ).trim();
    const shopName = String(
      transaction?.location ??
        transaction?.seller_name ??
        transaction?.shop_name ??
        '',
    ).trim();
    const goldTypeName = String(
      transaction?.gold_type ??
        transaction?.gold_name ??
        transaction?.gold_type_name ??
        '',
    ).trim();

    if (!shopName || !goldTypeName) continue;

    const key = [
      shopId || normalizeText(shopName),
      normalizeText(goldTypeName),
    ].join('::');

    if (!optionMap.has(key)) {
      optionMap.set(key, {
        key,
        shopId,
        shopName,
        goldTypeName,
        label: `${shopName} - ${goldTypeName}`,
      });
    }
  }

  return Array.from(optionMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'vi'),
  );
}

export default function PrivateGoldPriceManager({
  open,
  user,
  prices = [],
  transactions = [],
  onClose,
  onChanged,
  confirm,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const privateOptions = useMemo(
    () => buildPrivateTransactionOptions(transactions),
    [transactions],
  );

  const sortedPrices = useMemo(
    () =>
      [...prices].sort((a, b) => {
        const shopCompare = String(a.shop_name ?? '').localeCompare(
          String(b.shop_name ?? ''),
          'vi',
        );
        if (shopCompare !== 0) return shopCompare;
        return String(a.gold_type_name ?? '').localeCompare(
          String(b.gold_type_name ?? ''),
          'vi',
        );
      }),
    [prices],
  );

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      setError('');
      setStatus('');
    }
  }, [open]);

  useEffect(() => {
    if (
      open &&
      !form.priceId &&
      !form.optionKey &&
      privateOptions.length === 1
    ) {
      const onlyOption = privateOptions[0];
      setForm((current) => ({
        ...current,
        optionKey: onlyOption.key,
        shopId: onlyOption.shopId,
        shopName: onlyOption.shopName,
        goldTypeName: onlyOption.goldTypeName,
      }));
    }
  }, [open, form.priceId, form.optionKey, privateOptions]);

  if (!open) return null;

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleOptionChange(event) {
    const optionKey = event.target.value;
    const selected = privateOptions.find((item) => item.key === optionKey);

    setForm((current) => ({
      ...current,
      optionKey,
      shopId: selected?.shopId ?? '',
      shopName: selected?.shopName ?? '',
      goldTypeName: selected?.goldTypeName ?? '',
    }));
    setError('');
    setStatus('');
  }

  function startEdit(item) {
    const option = privateOptions.find((candidate) => {
      const sameShopId =
        String(candidate.shopId ?? '') === String(item.shop_id ?? '');
      const sameShopName =
        normalizeText(candidate.shopName) === normalizeText(item.shop_name);
      const sameGoldType =
        normalizeText(candidate.goldTypeName) ===
        normalizeText(item.gold_type_name);

      return sameGoldType && (sameShopId || sameShopName);
    });

    setForm({
      priceId: item.id,
      optionKey: option?.key ?? '',
      shopId: item.shop_id ?? '',
      shopName: item.shop_name ?? '',
      goldTypeName: item.gold_type_name ?? '',
      buyPricePerChi: String(item.buy_price_per_chi ?? ''),
      sellPricePerChi: String(item.sell_price_per_chi ?? ''),
    });
    setError('');
    setStatus('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!user?.id) {
      setError('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
      return;
    }

    if (!form.shopName || !form.goldTypeName) {
      setError('Vui lòng chọn tiệm vàng và loại vàng từ giao dịch đã lưu.');
      return;
    }

    setSaving(true);
    setError('');
    setStatus('');

    try {
      // Luôn INSERT bản ghi mới để giữ đầy đủ lịch sử giá.
      const savedPrice = await savePrivateGoldPrice({
        userId: user.id,
        shopId: form.shopId || null,
        shopName: form.shopName,
        goldTypeName: form.goldTypeName,
        buyPricePerChi: form.buyPricePerChi,
        sellPricePerChi: form.sellPricePerChi,
      });

      const savedOptionKey = form.optionKey;
      const savedShopId = form.shopId;
      const savedShopName = form.shopName;
      const savedGoldTypeName = form.goldTypeName;

      if (typeof onChanged === 'function') {
        await onChanged();
      }

      if (savedPrice?.save_action === 'unchanged') {
        setStatus('Giá không thay đổi nên không tạo thêm lịch sử mới.');
      } else if (savedPrice?.save_action === 'updated') {
        setStatus('Đã cập nhật giá của ngày hôm nay.');
      } else {
        setStatus('Đã thêm giá mới cho ngày hôm nay.');
      }

      setForm({
        ...EMPTY_FORM,
        optionKey: savedOptionKey,
        shopId: savedShopId,
        shopName: savedShopName,
        goldTypeName: savedGoldTypeName,
      });
    } catch (submitError) {
      setStatus('');
      setError(submitError?.message || 'Không thể lưu giá tiệm vàng.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    const accepted = confirm
      ? await confirm({
          title: 'Xóa toàn bộ lịch sử giá?',
          message: `Tất cả các lần cập nhật giá của ${item.shop_name} - ${item.gold_type_name} sẽ bị xóa.`,
          confirmText: 'Xóa lịch sử',
          cancelText: 'Hủy',
          type: 'danger',
          danger: true,
        })
      : window.confirm('Xóa mức giá này?');

    if (!accepted) return;

    try {
      await deletePrivateGoldPriceSeries({
        userId: user.id,
        shopId: item.shop_id,
        goldTypeName: item.gold_type_name,
      });
      if (form.priceId === item.id) setForm(EMPTY_FORM);
      if (typeof onChanged === 'function') await onChanged();
    } catch (deleteError) {
      setError(deleteError?.message || 'Không thể xóa giá tiệm vàng.');
    }
  }

  return (
    <div
      className="private-price-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="private-price-modal" role="dialog" aria-modal="true">
        <header className="private-price-modal__header">
          <div>
            <h2>
              <Building2 size={21} /> Giá tiệm vàng tư nhân
            </h2>
            <p>
              Mỗi lần lưu sẽ tạo một mốc lịch sử mới cho đúng tiệm và loại vàng.
            </p>
          </div>
          <button
            type="button"
            className="private-price-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </header>

        <div className="private-price-modal__body">
          <form className="private-price-form" onSubmit={handleSubmit}>
            <h3>Thêm giá tiệm vàng</h3>

            {privateOptions.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="Chưa có giao dịch vàng tư nhân"
                description="Hãy thêm giao dịch, chọn nguồn Tư nhân và nhập đúng tên tiệm trước khi cập nhật giá."
                compact
              />
            ) : (
              <div className="private-price-form__grid">
                <label>
                  <span>Tiệm vàng và loại vàng</span>
                  <select
                    value={form.optionKey}
                    onChange={handleOptionChange}
                    required
                  >
                    <option value="">Chọn giao dịch tư nhân</option>
                    {privateOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Tiệm thu lại (VND/chỉ)</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    inputMode="numeric"
                    value={form.buyPricePerChi}
                    onChange={(event) =>
                      updateField('buyPricePerChi', event.target.value)
                    }
                    placeholder="Giá mua vào"
                    required
                  />
                </label>

                <label>
                  <span>Tiệm bán ra (VND/chỉ)</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    inputMode="numeric"
                    value={form.sellPricePerChi}
                    onChange={(event) =>
                      updateField('sellPricePerChi', event.target.value)
                    }
                    placeholder="Giá bán ra"
                    required
                  />
                </label>
              </div>
            )}

            {error && (
              <p className="private-price-error">
                {error}
              </p>
            )}

            {status && (
              <p className="private-price-status">
                {status}
              </p>
            )}

            <div className="private-price-form__actions">
              {form.priceId && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setForm(EMPTY_FORM)}
                >
                  Hủy sửa
                </button>
              )}
              <button
                type="submit"
                className="primary-button"
                disabled={saving || privateOptions.length === 0}
              >
                <Plus size={16} />
                {saving ? 'Đang lưu...' : 'Thêm giá'}
              </button>
            </div>
          </form>

          <div className="private-price-list">
            <h3>Giá mới nhất</h3>
            {sortedPrices.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Chưa có giá tiệm vàng"
                description="Hãy chọn một giao dịch tư nhân và thêm giá hiện tại của tiệm vàng bạn đang theo dõi."
                compact
              />
            ) : (
              sortedPrices.map((item) => {
                const ageInDays = getAgeInDays(item.price_date);
                const isOld = ageInDays !== null && ageInDays >= 3;

                return (
                  <article className="private-price-item" key={item.id}>
                    <div className="private-price-item__top">
                      <div>
                        <strong>{item.shop_name}</strong>
                        <span>{item.gold_type_name}</span>
                      </div>
                      <div className="private-price-item__actions">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          title="Thêm lần cập nhật giá mới"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          title="Xóa toàn bộ lịch sử giá"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="private-price-item__prices">
                      <span>
                        Thu lại{' '}
                        <strong>
                          {formatMoney(item.buy_price_per_chi)} VND/chỉ
                        </strong>
                      </span>
                      <span>
                        Bán ra{' '}
                        <strong>
                          {formatMoney(item.sell_price_per_chi)} VND/chỉ
                        </strong>
                      </span>
                    </div>

                    <small className={isOld ? 'private-price-stale' : ''}>
                      {isOld ? '⚠ Giá đã cũ · ' : ''}Cập nhật{' '}
                      {formatUpdatedAt(item.price_date)}
                    </small>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}