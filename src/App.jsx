import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

import {
  Coins,
  Wallet,
  BarChart3,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  RefreshCcw,
  ListChecks,
  Pencil,
  Trash2,
  Save,
  XCircle,
  MapPin,
  History,
} from 'lucide-react';

function formatMoney(value) {
  const number = Number(value || 0);
  return number.toLocaleString('vi-VN');
}

function formatDateTime(value) {
  if (!value) return '-';

  return new Date(value).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function App() {
  const [transactions, setTransactions] = useState([]);
  const [prices, setPrices] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const defaultTransactionForm = {
    transaction_type: 'BUY',
    gold_type: 'Nhẫn 9999',
    quantity_chi: '',
    price_per_chi: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    location: '',
    note: '',
  };

  const [transactionForm, setTransactionForm] = useState(defaultTransactionForm);

  const [priceForm, setPriceForm] = useState({
    gold_type: 'Nhẫn 9999',
    current_price_per_chi: '',
    note: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setMessage('');

    const { data: transactionData, error: transactionError } = await supabase
      .from('gold_transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    const { data: priceData, error: priceError } = await supabase
      .from('gold_prices')
      .select('*')
      .order('gold_type', { ascending: true });

    const { data: historyData, error: historyError } = await supabase
      .from('gold_price_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (transactionError || priceError || historyError) {
      setMessage(
        transactionError?.message || priceError?.message || historyError?.message
      );
    } else {
      setTransactions(transactionData || []);
      setPrices(priceData || []);
      setPriceHistory(historyData || []);
    }

    setLoading(false);
  }

  async function saveTransaction(e) {
    e.preventDefault();
    setMessage('');

    const quantity = Number(transactionForm.quantity_chi);
    const price = Number(transactionForm.price_per_chi);

    if (!transactionForm.gold_type.trim()) {
      setMessage('Vui lòng nhập loại vàng.');
      return;
    }

    if (!quantity || quantity <= 0) {
      setMessage('Vui lòng nhập số lượng vàng hợp lệ.');
      return;
    }

    if (!price || price <= 0) {
      setMessage('Vui lòng nhập giá hợp lệ.');
      return;
    }

    const payload = {
      transaction_type: transactionForm.transaction_type,
      gold_type: transactionForm.gold_type.trim(),
      quantity_chi: quantity,
      price_per_chi: price,
      transaction_date: transactionForm.transaction_date,
      location: transactionForm.location.trim(),
      note: transactionForm.note.trim(),
    };

    let error;

    if (editingId) {
      const result = await supabase
        .from('gold_transactions')
        .update(payload)
        .eq('id', editingId);

      error = result.error;
    } else {
      const result = await supabase.from('gold_transactions').insert(payload);
      error = result.error;
    }

    if (error) {
      setMessage(error.message);
      return;
    }

    setTransactionForm(defaultTransactionForm);
    setEditingId(null);

    await loadData();

    setMessage(editingId ? 'Đã cập nhật giao dịch.' : 'Đã lưu giao dịch.');
  }

  function editTransaction(tx) {
    setEditingId(tx.id);

    setTransactionForm({
      transaction_type: tx.transaction_type,
      gold_type: tx.gold_type || '',
      quantity_chi: String(tx.quantity_chi || ''),
      price_per_chi: String(tx.price_per_chi || ''),
      transaction_date: tx.transaction_date || new Date().toISOString().slice(0, 10),
      location: tx.location || '',
      note: tx.note || '',
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });

    setMessage('Đang chỉnh sửa giao dịch. Sửa xong bấm Cập nhật giao dịch.');
  }

  function cancelEdit() {
    setEditingId(null);
    setTransactionForm(defaultTransactionForm);
    setMessage('');
  }

  async function saveCurrentPrice(e) {
    e.preventDefault();
    setMessage('');

    const currentPrice = Number(priceForm.current_price_per_chi);
    const goldType = priceForm.gold_type.trim();

    if (!goldType) {
      setMessage('Vui lòng nhập loại vàng.');
      return;
    }

    if (!currentPrice || currentPrice <= 0) {
      setMessage('Vui lòng nhập giá hiện tại hợp lệ.');
      return;
    }

    const { error: priceError } = await supabase.from('gold_prices').upsert(
      {
        gold_type: goldType,
        current_price_per_chi: currentPrice,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'gold_type',
      }
    );

    if (priceError) {
      setMessage(priceError.message);
      return;
    }

    const { error: historyError } = await supabase
      .from('gold_price_history')
      .insert({
        gold_type: goldType,
        price_per_chi: currentPrice,
        note: priceForm.note.trim() || 'Cập nhật giá hiện tại',
      });

    if (historyError) {
      setMessage(historyError.message);
      return;
    }

    setPriceForm({
      ...priceForm,
      current_price_per_chi: '',
      note: '',
    });

    await loadData();
    setMessage('Đã cập nhật giá vàng và lưu lịch sử giá.');
  }

  async function deleteTransaction(id) {
    const ok = window.confirm('Bạn muốn xóa giao dịch này?');
    if (!ok) return;

    const { error } = await supabase
      .from('gold_transactions')
      .delete()
      .eq('id', id);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (editingId === id) {
      cancelEdit();
    }

    await loadData();
    setMessage('Đã xóa giao dịch.');
  }

  const priceMap = useMemo(() => {
    const map = {};

    for (const item of prices) {
      map[item.gold_type] = Number(item.current_price_per_chi);
    }

    return map;
  }, [prices]);

  function calculateTransactionResult(tx) {
    const quantity = Number(tx.quantity_chi);
    const transactionPrice = Number(tx.price_per_chi);
    const currentPrice = priceMap[tx.gold_type] || transactionPrice;

    const originalValue = quantity * transactionPrice;
    const currentValue = quantity * currentPrice;

    let profit = 0;

    if (tx.transaction_type === 'BUY') {
      profit = currentValue - originalValue;
    } else {
      profit = originalValue - currentValue;
    }

    const profitPercent =
      originalValue > 0 ? (profit / originalValue) * 100 : 0;

    return {
      originalValue,
      currentValue,
      currentPrice,
      profit,
      profitPercent,
    };
  }

  const summary = useMemo(() => {
    let totalBuyCost = 0;
    let totalCurrentValue = 0;

    for (const tx of transactions) {
      if (tx.transaction_type !== 'BUY') continue;

      const result = calculateTransactionResult(tx);

      totalBuyCost += result.originalValue;
      totalCurrentValue += result.currentValue;
    }

    const profit = totalCurrentValue - totalBuyCost;
    const profitPercent =
      totalBuyCost > 0 ? (profit / totalBuyCost) * 100 : 0;

    return {
      totalBuyCost,
      totalCurrentValue,
      profit,
      profitPercent,
    };
  }, [transactions, priceMap]);

  return (
    <div className="container">
      <div className="topbar">
        <div className="app-title">
          <div className="app-logo">
            <Coins size={28} />
          </div>

          <div>
            <h1>Gold Tracker</h1>
            <p className="user-email">
              Theo dõi lịch sử mua bán vàng, lời/lỗ và giá hiện tại
            </p>
          </div>
        </div>
      </div>

      {message && <p className="message">{message}</p>}

      <div className="summary">
        <div className="summary-card">
          <div className="summary-icon wallet-icon">
            <Wallet size={22} />
          </div>
          <span>Tổng vốn mua</span>
          <strong>{formatMoney(summary.totalBuyCost)} VND</strong>
        </div>

        <div className="summary-card">
          <div className="summary-icon chart-icon">
            <BarChart3 size={22} />
          </div>
          <span>Giá trị hiện tại</span>
          <strong>{formatMoney(summary.totalCurrentValue)} VND</strong>
        </div>

        <div className="summary-card">
          <div className="summary-icon profit-icon">
            {summary.profit >= 0 ? (
              <TrendingUp size={22} />
            ) : (
              <TrendingDown size={22} />
            )}
          </div>
          <span>Lời / lỗ</span>
          <strong className={summary.profit >= 0 ? 'profit' : 'loss'}>
            {formatMoney(summary.profit)} VND
          </strong>
        </div>

        <div className="summary-card">
          <div className="summary-icon percent-icon">
            <TrendingUp size={22} />
          </div>
          <span>Lời / lỗ %</span>
          <strong className={summary.profitPercent >= 0 ? 'profit' : 'loss'}>
            {summary.profitPercent.toFixed(2)}%
          </strong>
        </div>
      </div>

      <div className="grid">
        <form className="card" onSubmit={saveTransaction}>
          <h2 className="section-title">
            {editingId ? <Pencil size={20} /> : <PlusCircle size={20} />}
            {editingId ? 'Chỉnh sửa giao dịch' : 'Thêm giao dịch mới'}
          </h2>

          <p className="small-text">
            {editingId
              ? 'Bạn đang chỉnh sửa giao dịch đã chọn.'
              : 'Nhập thông tin mua hoặc bán vàng của bạn.'}
          </p>

          <label>Loại giao dịch</label>
          <select
            value={transactionForm.transaction_type}
            onChange={(e) =>
              setTransactionForm({
                ...transactionForm,
                transaction_type: e.target.value,
              })
            }
          >
            <option value="BUY">Mua</option>
            <option value="SELL">Bán</option>
          </select>

          <label>Loại vàng</label>
          <input
            value={transactionForm.gold_type}
            onChange={(e) =>
              setTransactionForm({
                ...transactionForm,
                gold_type: e.target.value,
              })
            }
            placeholder="SJC, Nhẫn 9999, 24K..."
          />

          <label>Số lượng chỉ</label>
          <input
            type="number"
            step="0.0001"
            value={transactionForm.quantity_chi}
            onChange={(e) =>
              setTransactionForm({
                ...transactionForm,
                quantity_chi: e.target.value,
              })
            }
            placeholder="Ví dụ: 5"
          />

          <label>Giá mỗi chỉ</label>
          <input
            type="number"
            value={transactionForm.price_per_chi}
            onChange={(e) =>
              setTransactionForm({
                ...transactionForm,
                price_per_chi: e.target.value,
              })
            }
            placeholder="Ví dụ: 8000000"
          />

          <label>Ngày giao dịch</label>
          <input
            type="date"
            value={transactionForm.transaction_date}
            onChange={(e) =>
              setTransactionForm({
                ...transactionForm,
                transaction_date: e.target.value,
              })
            }
          />

          <label>Mua/bán ở đâu?</label>
          <input
            value={transactionForm.location}
            onChange={(e) =>
              setTransactionForm({
                ...transactionForm,
                location: e.target.value,
              })
            }
            placeholder="Ví dụ: PNJ, SJC, tiệm vàng..."
          />

          <label>Ghi chú</label>
          <textarea
            value={transactionForm.note}
            onChange={(e) =>
              setTransactionForm({
                ...transactionForm,
                note: e.target.value,
              })
            }
            placeholder="Ghi chú thêm nếu có"
          />

          <div className="form-actions">
            <button type="submit" className="icon-button">
              <Save size={17} />
              {editingId ? 'Cập nhật giao dịch' : 'Lưu giao dịch'}
            </button>

            {editingId && (
              <button
                type="button"
                className="secondary-button icon-button"
                onClick={cancelEdit}
              >
                <XCircle size={17} />
                Hủy chỉnh sửa
              </button>
            )}
          </div>
        </form>

        <form className="card" onSubmit={saveCurrentPrice}>
          <h2 className="section-title">
            <RefreshCcw size={20} />
            Cập nhật giá hiện tại
          </h2>

          <p className="small-text">
            Mỗi lần cập nhật giá sẽ được lưu lại vào lịch sử.
          </p>

          <label>Loại vàng</label>
          <input
            value={priceForm.gold_type}
            onChange={(e) =>
              setPriceForm({
                ...priceForm,
                gold_type: e.target.value,
              })
            }
            placeholder="Nhẫn 9999"
          />

          <label>Giá hiện tại mỗi chỉ</label>
          <input
            type="number"
            value={priceForm.current_price_per_chi}
            onChange={(e) =>
              setPriceForm({
                ...priceForm,
                current_price_per_chi: e.target.value,
              })
            }
            placeholder="Ví dụ: 8300000"
          />

          <label>Ghi chú giá</label>
          <input
            value={priceForm.note}
            onChange={(e) =>
              setPriceForm({
                ...priceForm,
                note: e.target.value,
              })
            }
            placeholder="Ví dụ: Giá PNJ sáng nay"
          />

          <button type="submit" className="icon-button">
            <RefreshCcw size={17} />
            Cập nhật giá
          </button>

          <h3>Giá đang lưu</h3>

          {prices.length === 0 ? (
            <p className="small-text">Chưa có giá hiện tại.</p>
          ) : (
            <ul className="price-list">
              {prices.map((item) => (
                <li key={item.id}>
                  <span>{item.gold_type}</span>
                  <strong>
                    {formatMoney(item.current_price_per_chi)} VND/chỉ
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </form>
      </div>

      <div className="card">
        <h2 className="section-title">
          <ListChecks size={20} />
          Danh sách giao dịch
        </h2>

        {loading ? (
          <p>Đang tải...</p>
        ) : transactions.length === 0 ? (
          <p className="small-text">Chưa có giao dịch.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Loại</th>
                  <th>Vàng</th>
                  <th>Số chỉ</th>
                  <th>Giá mua/bán</th>
                  <th>Giá hiện tại</th>
                  <th>Nơi mua/bán</th>
                  <th>Lời/lỗ</th>
                  <th>Lời/lỗ %</th>
                  <th>Ghi chú</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {transactions.map((tx) => {
                  const result = calculateTransactionResult(tx);

                  return (
                    <tr key={tx.id}>
                      <td>{tx.transaction_date}</td>
                      <td>{tx.transaction_type === 'BUY' ? 'Mua' : 'Bán'}</td>
                      <td>{tx.gold_type}</td>
                      <td>{Number(tx.quantity_chi)}</td>
                      <td>{formatMoney(tx.price_per_chi)}</td>
                      <td>{formatMoney(result.currentPrice)}</td>
                      <td>
                        {tx.location ? (
                          <span className="location-cell">
                            <MapPin size={14} />
                            {tx.location}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className={result.profit >= 0 ? 'profit' : 'loss'}>
                        {formatMoney(result.profit)} VND
                      </td>
                      <td
                        className={
                          result.profitPercent >= 0 ? 'profit' : 'loss'
                        }
                      >
                        {result.profitPercent.toFixed(2)}%
                      </td>
                      <td>{tx.note || '-'}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="edit-button icon-button table-icon-button"
                            onClick={() => editTransaction(tx)}
                          >
                            <Pencil size={15} />
                            Sửa
                          </button>

                          <button
                            type="button"
                            className="danger-button icon-button table-icon-button"
                            onClick={() => deleteTransaction(tx.id)}
                          >
                            <Trash2 size={15} />
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="section-title">
          <History size={20} />
          Lịch sử cập nhật giá
        </h2>

        {priceHistory.length === 0 ? (
          <p className="small-text">Chưa có lịch sử cập nhật giá.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Loại vàng</th>
                  <th>Giá mỗi chỉ</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>

              <tbody>
                {priceHistory.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDateTime(item.created_at)}</td>
                    <td>{item.gold_type}</td>
                    <td>{formatMoney(item.price_per_chi)} VND</td>
                    <td>{item.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;