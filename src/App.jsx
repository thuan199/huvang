import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

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
  Globe2,
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

function formatShortDate(value) {
  if (!value) return '-';

  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

function TradingViewGoldPriceWidget() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    containerRef.current.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js';
    script.type = 'text/javascript';
    script.async = true;

    script.textContent = JSON.stringify({
      symbol: 'OANDA:XAUUSD',
      width: 260,
      isTransparent: false,
      colorTheme: 'light',
      locale: 'vi_VN',
    });

    containerRef.current.appendChild(script);
  }, []);

  return (
    <div
      className="tradingview-widget-container tradingview-mini-widget"
      ref={containerRef}
    >
      <div className="tradingview-widget-container__widget" />
    </div>
  );
}

function App() {
  const [transactions, setTransactions] = useState([]);
  const [prices, setPrices] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [isWorldGoldOpen, setIsWorldGoldOpen] = useState(false);

  const [worldGold, setWorldGold] = useState(null);
  const [worldGoldLoading, setWorldGoldLoading] = useState(false);
  const [worldGoldError, setWorldGoldError] = useState('');

  const defaultTransactionForm = {
    transaction_type: 'BUY',
    gold_type: 'Nhẫn 9999',
    quantity_chi: '',
    price_per_chi: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    location: '',
    note: '',
  };

  const defaultPriceForm = {
  gold_type: 'Nhẫn 9999',
  current_price_per_chi: '',
  sell_price_per_chi: '',
  note: '',
};

  const [transactionForm, setTransactionForm] = useState(
    defaultTransactionForm
  );

  const [priceForm, setPriceForm] = useState(defaultPriceForm);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadWorldGoldPrice();

    const timer = setInterval(() => {
      loadWorldGoldPrice();
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  async function loadWorldGoldPrice() {
    try {
      setWorldGoldLoading(true);
      setWorldGoldError('');

      const [goldRes, fxRes] = await Promise.all([
        fetch(`https://xaus.com/api/v1/spot?t=${Date.now()}`),
        fetch('https://open.er-api.com/v6/latest/USD'),
      ]);

      if (!goldRes.ok || !fxRes.ok) {
        throw new Error('Không lấy được dữ liệu giá vàng thế giới hoặc tỷ giá.');
      }

      const goldData = await goldRes.json();
      const fxData = await fxRes.json();

      const goldUsdOz = Number(
        goldData.spot_usd_oz ??
          goldData.price ??
          goldData.gold_price ??
          goldData.data?.spot_usd_oz ??
          goldData.data?.price
      );

      const usdVnd = Number(fxData.rates?.VND);

      if (!goldUsdOz || !usdVnd) {
        throw new Error('Dữ liệu giá vàng thế giới hoặc tỷ giá không hợp lệ.');
      }

      const gramPerOunce = 31.1035;
      const gramPerLuong = 37.5;

      const worldGoldVndPerLuong =
        goldUsdOz * usdVnd * (gramPerLuong / gramPerOunce);

      setWorldGold({
        goldUsdOz,
        usdVnd,
        worldGoldVndPerLuong,
        updatedAt:
          goldData.updated_at ||
          goldData.timestamp ||
          goldData.data?.updated_at ||
          new Date().toISOString(),
      });
    } catch (error) {
      setWorldGoldError(error.message || 'Không thể cập nhật giá vàng thế giới.');
    } finally {
      setWorldGoldLoading(false);
    }
  }

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
        transactionError?.message ||
          priceError?.message ||
          historyError?.message
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
      transaction_date:
        tx.transaction_date || new Date().toISOString().slice(0, 10),
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
	const sellPrice = Number(priceForm.sell_price_per_chi);
    const goldType = priceForm.gold_type.trim();

    if (!goldType) {
      setMessage('Vui lòng nhập loại vàng.');
      return;
    }

    if (!currentPrice || currentPrice <= 0) {
      setMessage('Vui lòng nhập giá hiện tại hợp lệ.');
      return;
    }
	
	if (!sellPrice || sellPrice <= 0) {
	  setMessage('Vui lòng nhập giá bán ra hợp lệ.');
	  return;
	}

    let priceError;

    if (editingPriceId) {
      const result = await supabase
        .from('gold_prices')
        .update({
          gold_type: goldType,
          current_price_per_chi: currentPrice,
		  sell_price_per_chi: sellPrice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingPriceId);

      priceError = result.error;
    } else {
      const result = await supabase.from('gold_prices').upsert(
        {
          gold_type: goldType,
          current_price_per_chi: currentPrice,
		  sell_price_per_chi: sellPrice,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'gold_type',
        }
      );

      priceError = result.error;
    }

    if (priceError) {
      setMessage(priceError.message);
      return;
    }

    const { error: historyError } = await supabase
      .from('gold_price_history')
      .insert({
        gold_type: goldType,
        price_per_chi: currentPrice,
		sell_price_per_chi: sellPrice,
        note: priceForm.note.trim() || 'Cập nhật giá hiện tại',
      });

    if (historyError) {
      setMessage(historyError.message);
      return;
    }

    setPriceForm(defaultPriceForm);
    setEditingPriceId(null);

    await loadData();

    setMessage(
      editingPriceId
        ? 'Đã sửa giá hiện tại và lưu lịch sử giá.'
        : 'Đã cập nhật giá vàng và lưu lịch sử giá.'
    );
  }

  function editCurrentPrice(item) {
    setEditingPriceId(item.id);

    setPriceForm({
      gold_type: item.gold_type || '',
      current_price_per_chi: String(item.current_price_per_chi || ''),
	  sell_price_per_chi: String(item.sell_price_per_chi || ''),
      note: 'Sửa giá hiện tại',
    });

    setMessage('Đang chỉnh sửa giá hiện tại. Sửa xong bấm Lưu giá đã sửa.');
  }

  function cancelPriceEdit() {
    setEditingPriceId(null);
    setPriceForm(defaultPriceForm);
    setMessage('');
  }

  async function deleteCurrentPrice(id, goldType) {
    const ok = window.confirm(`Bạn muốn xóa giá hiện tại của ${goldType}?`);
    if (!ok) return;

    const { error } = await supabase.from('gold_prices').delete().eq('id', id);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (editingPriceId === id) {
      cancelPriceEdit();
    }

    await loadData();

    setMessage('Đã xóa giá hiện tại. Lịch sử giá vẫn được giữ lại.');
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

  const priceChartData = useMemo(() => {
  const sorted = [...priceHistory].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  if (sorted.length === 0) return [];

  const result = [];

  const currentDate = new Date(sorted[0].created_at);
  currentDate.setHours(0, 0, 0, 0);

  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  let currentPrice = Number(sorted[0].price_per_chi || 0);

  while (currentDate.getTime() <= endDate.getTime()) {
    const historiesOfDay = sorted.filter((item) => {
      const itemDate = new Date(item.created_at);
      itemDate.setHours(0, 0, 0, 0);
      return itemDate.getTime() === currentDate.getTime();
    });

    if (historiesOfDay.length > 0) {
      const lastHistoryOfDay = historiesOfDay[historiesOfDay.length - 1];
      currentPrice = Number(lastHistoryOfDay.price_per_chi || 0);
    }

    result.push({
      time: currentDate.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      }),
      fullTime: currentDate.toLocaleDateString('vi-VN'),
      price: currentPrice,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
}, [priceHistory]);

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

  const shopGold = prices[0];

	const shopSellPriceVndPerLuong = shopGold
	  ? Number(shopGold.sell_price_per_chi || 0) * 10
	  : 0;

	const goldDifference =
	  worldGold && shopSellPriceVndPerLuong
		? shopSellPriceVndPerLuong - worldGold.worldGoldVndPerLuong
		: 0;

  const goldDifferencePercent =
    worldGold && worldGold.worldGoldVndPerLuong > 0
      ? (goldDifference / worldGold.worldGoldVndPerLuong) * 100
      : 0;

  return (
    <div className="container">
      <div className="topbar">
        <div className="app-title">
          <div className="app-logo">
            <Coins size={28} />
          </div>

          <div>
            <h1>Hũ vàng của Ethan</h1>
            <p className="user-email">
              Theo dõi lịch sử mua bán vàng, lời/lỗ và giá hiện tại
            </p>
          </div>
        </div>
      </div>

      {message && <p className="message">{message}</p>}

      <div
        className={isWorldGoldOpen ? 'world-gold-mini open' : 'world-gold-mini'}
      >
        {!isWorldGoldOpen ? (
          <button
            type="button"
            className="world-gold-tab gold-blink"
            onClick={() => setIsWorldGoldOpen(true)}
            title="Mở giá vàng thế giới"
          >
            <Globe2 size={18} />
          </button>
        ) : (
          <div className="world-gold-price-card">
            <button
              type="button"
              className="world-gold-mini-close"
              onClick={() => setIsWorldGoldOpen(false)}
              title="Đóng"
            >
              <XCircle size={18} />
            </button>

            <TradingViewGoldPriceWidget />
          </div>
        )}
      </div>

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

          <label>Giá cửa hàng mua vào mỗi chỉ</label>
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
		  
		  <label>Giá cửa hàng bán ra mỗi chỉ</label>
			<input
			  type="number"
			  value={priceForm.sell_price_per_chi}
			  onChange={(e) =>
				setPriceForm({
				  ...priceForm,
				  sell_price_per_chi: e.target.value,
				})
			  }
			  placeholder="Ví dụ: 14800000"
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

          <div className="form-actions">
            <button type="submit" className="icon-button">
              <RefreshCcw size={17} />
              {editingPriceId ? 'Lưu giá đã sửa' : 'Cập nhật giá'}
            </button>

            {editingPriceId && (
              <button
                type="button"
                className="secondary-button icon-button"
                onClick={cancelPriceEdit}
              >
                <XCircle size={17} />
                Hủy sửa giá
              </button>
            )}
          </div>

          <h3>Giá đang lưu</h3>

          {prices.length === 0 ? (
            <p className="small-text">Chưa có giá hiện tại.</p>
          ) : (
            <ul className="price-list">
              {prices.map((item) => (
                <li key={item.id}>
                  <div className="price-info">
                    <span>{item.gold_type}</span>
                    <strong>
                      Mua vào: {formatMoney(item.current_price_per_chi)} VND/chỉ
                    </strong>
					<strong>
					 Bán ra: {formatMoney(item.sell_price_per_chi)} VND/chỉ
					</strong> 
                  </div>

                  <div className="price-actions">
                    <button
                      type="button"
                      className="edit-button icon-button table-icon-button"
                      onClick={() => editCurrentPrice(item)}
                    >
                      <Pencil size={15} />
                      Sửa
                    </button>

                    <button
                      type="button"
                      className="danger-button icon-button table-icon-button"
                      onClick={() =>
                        deleteCurrentPrice(item.id, item.gold_type)
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
      </div>

      <div className="card">
        <h2 className="section-title">
          <BarChart3 size={20} />
          Biểu đồ lịch sử giá
        </h2>

        {priceChartData.length === 0 ? (
          <p className="small-text">Chưa có dữ liệu để vẽ biểu đồ.</p>
        ) : (
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={priceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis
                  tickFormatter={(value) => formatMoney(value)}
				  domain={['dataMin - 50000', 'dataMax + 50000']}
                  width={90}
                />
                <Tooltip
                  formatter={(value) => [`${formatMoney(value)} VND`, 'Giá']}
                  labelFormatter={(_, payload) => {
                    if (!payload || payload.length === 0) return '';
                    return payload[0].payload.fullTime;
                  }}
                />
                <Line
                  type="stepAfter"
                  dataKey="price"
                  name="Giá mỗi chỉ"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="section-title">
          <Globe2 size={20} />
          So sánh giá vàng thế giới
        </h2>

        <p className="small-text">
          Tự động cập nhật giá vàng thế giới và tỷ giá USD/VND mỗi 1 phút.
        </p>

        {worldGoldLoading && (
          <p className="small-text">Đang cập nhật giá thế giới...</p>
        )}

        {worldGoldError && <p className="message">{worldGoldError}</p>}

        {worldGold && (
          <div className="world-gold-compare">
            <div>
              <span>Giá vàng thế giới</span>
              <strong>{worldGold.goldUsdOz.toFixed(2)} USD/oz</strong>
            </div>

            <div>
              <span>Tỷ giá USD/VND</span>
              <strong>{formatMoney(worldGold.usdVnd)} VND</strong>
            </div>

            <div>
              <span>Quy đổi VND/lượng</span>
              <strong>
                {formatMoney(Math.round(worldGold.worldGoldVndPerLuong))} VND
              </strong>
            </div>

						<div>
			  <span>Giá cửa hàng bán ra</span>
			  <strong>
				{shopGold && shopGold.sell_price_per_chi
				  ? `${shopGold.gold_type}: ${formatMoney(
					  shopSellPriceVndPerLuong
					)} VND/lượng`
				  : 'Chưa có giá bán ra'}
			  </strong>
			</div>

			<div>
			  <span>Chênh lệch</span>
			  <strong className={goldDifference >= 0 ? 'profit' : 'loss'}>
				{shopGold && shopGold.sell_price_per_chi
				  ? `${formatMoney(Math.round(goldDifference))} VND (${goldDifferencePercent.toFixed(
					  2
					)}%)`
				  : '-'}
			  </strong>
			</div>

            <div>
              <span>Cập nhật lúc</span>
              <strong>{formatDateTime(worldGold.updatedAt)}</strong>
            </div>
          </div>
        )}

        {!worldGold && !worldGoldLoading && !worldGoldError && (
          <p className="small-text">Chưa có dữ liệu giá vàng thế giới.</p>
        )}
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
				  <th>Giá bán ra mỗi chỉ</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>

              <tbody>
                {priceHistory.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDateTime(item.created_at)}</td>
                    <td>{item.gold_type}</td>
                    <td>{formatMoney(item.price_per_chi)} VND</td>
					<td>{formatMoney(item.sell_price_per_chi)} VND</td>
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