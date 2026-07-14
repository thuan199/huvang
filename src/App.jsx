import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import './App.css';
import Login from './components/Login';

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
  Sun,
  Moon,
  LogOut,
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

function getVietnamDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = {};

  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
}

function TradingViewGoldPriceWidget() {
  const containerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = '';

      const widgetDiv = document.createElement('div');
      widgetDiv.className = 'tradingview-widget-container__widget';
      container.appendChild(widgetDiv);

      const script = document.createElement('script');
      script.src =
        'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js';
      script.type = 'text/javascript';
      script.async = true;

      script.innerHTML = JSON.stringify({
        symbol: 'OANDA:XAUUSD',
        width: '100%',
        isTransparent: false,
        colorTheme: 'light',
        locale: 'vi_VN',
      });

      container.appendChild(script);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="tradingview-widget-container tradingview-mini-widget"
      ref={containerRef}
    />
  );
}

function TradingViewGoldChart({ theme }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    container.innerHTML = '';

    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.width = '100%';
    widget.style.height = '100%';

    const script = document.createElement('script');

    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';

    script.type = 'text/javascript';
    script.async = true;

    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: 'OANDA:XAUUSD',
      interval: '60',
      timezone: 'Asia/Ho_Chi_Minh',
      theme: theme === 'dark' ? 'dark' : 'light',
      style: '1',
      locale: 'vi_VN',
      allow_symbol_change: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      save_image: true,
      calendar: false,
      details: true,
      hotlist: false,
      withdateranges: true,
      studies: [],
      support_host: 'https://www.tradingview.com',
    });

    container.appendChild(widget);
    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container gold-chart-widget"
    />
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeGoldTab, setActiveGoldTab] = useState('local');
  const loadedUserIdRef = useRef(null);

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
      setAuthLoading(false);
    }

    checkUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          loadedUserIdRef.current = null;
        }

        setUser(session?.user || null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function updateDisplayName() {
    const name = window.prompt('Nhập tên hiển thị:');

    if (!name || !name.trim()) return;

    const { data, error } = await supabase.auth.updateUser({
      data: {
        display_name: name.trim(),
      },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setUser(data.user);
    setMessage('Đã cập nhật tên hiển thị.');
  }
  async function handleLogout() {
    await supabase.auth.signOut();
    loadedUserIdRef.current = null;
    setUser(null);
  }

  const [transactions, setTransactions] = useState([]);
  const [prices, setPrices] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);

  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 10;

  const historyTotalPages = Math.max(
    1,
    Math.ceil(priceHistory.length / historyPageSize)
  );

  const paginatedPriceHistory = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return priceHistory.slice(start, start + historyPageSize);
  }, [priceHistory, historyPage]);

  useEffect(() => {
    if (historyPage > historyTotalPages) {
      setHistoryPage(historyTotalPages);
    }
  }, [historyPage, historyTotalPages]);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  useEffect(() => {
  if (!message) return;

  const timer = setTimeout(() => {
    setMessage('');
  }, 10000);

  return () => clearTimeout(timer);
}, [message]);

  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [isWorldGoldOpen, setIsWorldGoldOpen] = useState(false);
  const [chartRange, setChartRange] = useState('1d');
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
  }, [theme]);

  const [worldGold, setWorldGold] = useState(null);
  const [worldGoldLoading, setWorldGoldLoading] = useState(false);
  const [worldGoldError, setWorldGoldError] = useState('');
  const [worldGoldMarketMessage, setWorldGoldMarketMessage] = useState('');

  const defaultTransactionForm = {
    transaction_type: 'BUY',
    gold_type: 'Nhẫn 9999',
    quantity_chi: '',
    price_per_chi: '',
    sell_price_per_chi: '',
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
  // Chỉ tự động lấy giá khi đang thêm giao dịch mới.
  // Khi sửa giao dịch cũ thì giữ nguyên dữ liệu đã lưu.
  if (editingId) return;

  const currentBuybackPrice = getCurrentBuybackPrice(
    transactionForm.gold_type
  );

  setTransactionForm((currentForm) => {
    const newSellPrice =
      currentBuybackPrice > 0 ? String(currentBuybackPrice) : '';

    if (currentForm.sell_price_per_chi === newSellPrice) {
      return currentForm;
    }

    return {
      ...currentForm,
      sell_price_per_chi: newSellPrice,
    };
  });
}, [transactionForm.gold_type, prices, editingId]);

  useEffect(() => {
    const userId = user?.id;

    if (!userId) {
      loadedUserIdRef.current = null;
      return;
    }

    /*
     * Chỉ tải dữ liệu một lần khi đăng nhập.
     * Việc đổi tên hiển thị vẫn tạo object user mới nhưng không tải lại,
     * vì user.id không thay đổi.
     *
     * Ref cũng ngăn React StrictMode gọi tải dữ liệu hai lần trong môi
     * trường development.
     */
    if (loadedUserIdRef.current === userId) return;

    loadedUserIdRef.current = userId;

    loadData(userId).catch(() => {
      // Cho phép thử tải lại nếu lần tải đầu tiên thất bại.
      loadedUserIdRef.current = null;
    });
  }, [user?.id]);

  function getWorldGoldMarketStatus(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);

    const values = {};

    for (const part of parts) {
      values[part.type] = part.value;
    }

    const dayMap = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    const day = dayMap[values.weekday];
    const hour = Number(values.hour);
    const minute = Number(values.minute);
    const totalMinutes = hour * 60 + minute;

    const fourAM = 4 * 60;

    const isClosed =
      day === 0 ||
      (day === 6 && totalMinutes >= fourAM) ||
      (day === 1 && totalMinutes < fourAM);

    if (isClosed) {
      return {
        isOpen: false,
        message:
          'Thị trường vàng thế giới đang đóng cửa. Thị trường hoạt động lại từ 04:00 sáng thứ Hai đến 04:00 sáng thứ Bảy theo giờ Việt Nam.',
      };
    }

    return {
      isOpen: true,
      message:
        'Thị trường vàng thế giới hoạt động từ 04:00 sáng thứ Hai đến 04:00 sáng thứ Bảy theo giờ Việt Nam.',
    };
  }

  useEffect(() => {
    loadWorldGoldPrice();

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadWorldGoldPrice();
      }
    }, 60 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadWorldGoldPrice();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  async function loadWorldGoldPrice() {
    const marketStatus = getWorldGoldMarketStatus();

    setWorldGoldMarketMessage(marketStatus.message);
    setWorldGoldError('');

    // Từ 04:00 thứ Bảy đến trước 04:00 thứ Hai:
    // không gọi API lấy giá mới.
    if (!marketStatus.isOpen) {
      setWorldGoldLoading(false);
      return;
    }

    try {
      setWorldGoldLoading(true);

      const [goldRes, fxRes] = await Promise.all([
        fetch(`https://xaus.com/api/v1/spot?t=${Date.now()}`),
        fetch('https://open.er-api.com/v6/latest/USD'),
      ]);

      if (!goldRes.ok || !fxRes.ok) {
        throw new Error(
          'Không lấy được dữ liệu giá vàng thế giới hoặc tỷ giá.'
        );
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
        throw new Error(
          'Dữ liệu giá vàng thế giới hoặc tỷ giá không hợp lệ.'
        );
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
      setWorldGoldError(
        error?.message || 'Không thể cập nhật giá vàng thế giới.'
      );
    } finally {
      setWorldGoldLoading(false);
    }
  }

  async function loadData(userId = user?.id) {
    if (!userId) return;

    setLoading(true);
    setMessage('');

    const { data: transactionData, error: transactionError } = await supabase
      .from('gold_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    const { data: priceData, error: priceError } = await supabase
      .from('gold_prices')
      .select('*')
      .eq('user_id', userId)
      .order('gold_type', { ascending: true });

    const { data: historyData, error: historyError } = await supabase
      .from('gold_price_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1000);

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

  function getCurrentBuybackPrice(goldType) {
  const normalizedGoldType = String(goldType || '').trim().toLowerCase();

  const matchedPrice = prices.find(
    (item) =>
      String(item.gold_type || '').trim().toLowerCase() ===
      normalizedGoldType
  );

  return matchedPrice
    ? Number(matchedPrice.current_price_per_chi || 0)
    : 0;
}

  async function saveTransaction(e) {
    e.preventDefault();
    setMessage('');

    const quantity = Number(transactionForm.quantity_chi);
    const price = Number(transactionForm.price_per_chi);
    const sellPrice = Number(transactionForm.sell_price_per_chi);

    if (!transactionForm.gold_type.trim()) {
      setMessage('Vui lòng nhập loại vàng.');
      return;
    }

    if (!quantity || quantity <= 0) {
      setMessage('Vui lòng nhập số lượng vàng hợp lệ.');
      return;
    }

    if (!price || price <= 0) {
      setMessage('Vui lòng nhập giá mua vào hợp lệ.');
      return;
    }

    if (!sellPrice || sellPrice <= 0) {
      setMessage('Vui lòng nhập giá bán ra hợp lệ.');
      return;
    }

    const payload = {
      user_id: user.id,
      transaction_type: transactionForm.transaction_type,
      gold_type: transactionForm.gold_type.trim(),
      quantity_chi: quantity,
      price_per_chi: price,
      sell_price_per_chi: sellPrice,
      transaction_date: transactionForm.transaction_date,
      location: transactionForm.location.trim(),
      note: transactionForm.note.trim(),
    };

    let error;

    if (editingId) {
      const result = await supabase
        .from('gold_transactions')
        .update(payload)
        .eq('id', editingId)
        .eq('user_id', user.id);

      error = result.error;
    } else {
      const result = await supabase.from('gold_transactions').insert(payload);
      error = result.error;
    }

    if (error) {
      setMessage(error.message);
      return;
    }

    const wasEditing = Boolean(editingId);

    setTransactionForm(defaultTransactionForm);
    setEditingId(null);

    await loadData(user.id);

    setMessage(wasEditing ? 'Đã cập nhật giao dịch.' : 'Đã lưu giao dịch.');
  }

  function editTransaction(tx) {
    setEditingId(tx.id);

    setTransactionForm({
      transaction_type: tx.transaction_type,
      gold_type: tx.gold_type || '',
      quantity_chi: String(tx.quantity_chi || ''),
      price_per_chi: String(tx.price_per_chi || ''),
      sell_price_per_chi: String(tx.sell_price_per_chi || ''),
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
    const now = new Date().toISOString();
    const priceDate = getVietnamDateKey();

    if (!goldType) {
      setMessage('Vui lòng nhập loại vàng.');
      return;
    }

    if (!currentPrice || currentPrice <= 0) {
      setMessage('Vui lòng nhập giá cửa hàng mua vào hợp lệ.');
      return;
    }

    if (!sellPrice || sellPrice <= 0) {
      setMessage('Vui lòng nhập giá cửa hàng bán ra hợp lệ.');
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
          updated_at: now,
        })
        .eq('id', editingPriceId)
        .eq('user_id', user.id);

      priceError = result.error;
    } else {
      const result = await supabase
        .from('gold_prices')
        .upsert(
          {
            user_id: user.id,
            gold_type: goldType,
            current_price_per_chi: currentPrice,
            sell_price_per_chi: sellPrice,
            updated_at: now,
          },
          {
            onConflict: 'user_id,gold_type',
          }
        );

      priceError = result.error;
    }

    if (priceError) {
      setMessage(priceError.message);
      return;
    }

    /*
     * Giá cửa hàng mua vào hiện tại là giá người dùng
     * có thể bán vàng lại cho cửa hàng.
     */
    const { error: transactionPriceError } = await supabase
      .from('gold_transactions')
      .update({
        sell_price_per_chi: currentPrice,
      })
      .eq('user_id', user.id)
      .eq('gold_type', goldType);

    if (transactionPriceError) {
      setMessage(
        `Đã lưu giá hiện tại nhưng không cập nhật được giá trong danh sách giao dịch: ${transactionPriceError.message}`
      );
      return;
    }

    /*
     * Mỗi người dùng + loại vàng + ngày chỉ có một dòng lịch sử.
     *
     * - Chưa có ngày hôm nay: INSERT.
     * - Đã có ngày hôm nay: UPDATE giá mới nhất.
     *
     * created_at được cập nhật lại để bảng và biểu đồ phản ánh
     * thời điểm sửa giá gần nhất trong ngày.
     */
    const { error: historyError } = await supabase
      .from('gold_price_history')
      .upsert(
        {
          user_id: user.id,
          gold_type: goldType,
          price_date: priceDate,
          price_per_chi: currentPrice,
          sell_price_per_chi: sellPrice,
          note: priceForm.note.trim() || 'Cập nhật giá hiện tại',
          created_at: now,
        },
        {
          onConflict: 'user_id,gold_type,price_date',
        }
      );

    if (historyError) {
      setMessage(
        `Không lưu được lịch sử giá theo ngày: ${historyError.message}`
      );
      return;
    }

    const wasEditing = Boolean(editingPriceId);

    setPriceForm(defaultPriceForm);
    setEditingPriceId(null);

    await loadData(user.id);

    setMessage(
      wasEditing
        ? 'Đã sửa giá hiện tại và cập nhật giá mới nhất của ngày hôm nay.'
        : 'Đã cập nhật giá hiện tại và lưu giá mới nhất của ngày hôm nay.'
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

    const { error } = await supabase
      .from('gold_prices')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (editingPriceId === id) {
      cancelPriceEdit();
    }

    await loadData(user.id);

    setMessage('Đã xóa giá hiện tại. Lịch sử giá vẫn được giữ lại.');
  }

  async function deletePriceHistory(item) {
    try {
      if (!item?.id) {
        setMessage('Không tìm thấy ID của lịch sử giá cần xóa.');
        return;
      }

      const ok = window.confirm(
        `Bạn muốn xóa lịch sử giá của ${item.gold_type} lúc ${formatDateTime(
          item.created_at
        )}?`
      );

      if (!ok) return;

      setMessage('');

      /*
       * Xóa lịch sử và yêu cầu Supabase trả lại dòng đã xóa.
       * Nếu mảng rỗng thì thường do RLS không cho phép DELETE.
       */
      const {
        data: deletedRows,
        error: deleteHistoryError,
      } = await supabase
        .from('gold_price_history')
        .delete()
        .eq('id', item.id)
        .eq('user_id', user.id)
        .select();

      console.log('deletedRows:', deletedRows);
      console.log('deleteHistoryError:', deleteHistoryError);

      if (deleteHistoryError) {
        throw new Error(
          `Không xóa được lịch sử giá: ${deleteHistoryError.message}`
        );
      }

      if (!deletedRows || deletedRows.length === 0) {
        throw new Error(
          'Supabase không xóa dòng dữ liệu. Hãy kiểm tra quyền DELETE của bảng gold_price_history.'
        );
      }

      /*
       * Tìm dòng lịch sử mới nhất còn lại của cùng loại vàng.
       */
      const {
        data: latestHistory,
        error: latestHistoryError,
      } = await supabase
        .from('gold_price_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('gold_type', item.gold_type)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestHistoryError) {
        throw new Error(
          `Không lấy được lịch sử giá mới nhất: ${latestHistoryError.message}`
        );
      }

      if (latestHistory) {
        const latestBuyPrice = Number(latestHistory.price_per_chi || 0);
        const latestSellPrice = Number(
          latestHistory.sell_price_per_chi || 0
        );

        /*
         * Đồng bộ dòng lịch sử mới nhất sang "Giá đang lưu".
         */
        const {
          data: updatedPrices,
          error: updateCurrentPriceError,
        } = await supabase
          .from('gold_prices')
          .upsert(
            {
              user_id: user.id,
              gold_type: item.gold_type,
              current_price_per_chi: latestBuyPrice,
              sell_price_per_chi: latestSellPrice,
              updated_at: latestHistory.created_at,
            },
            {
              onConflict: 'user_id,gold_type',
            }
          )
          .select();

        if (updateCurrentPriceError) {
          throw new Error(
            `Không đồng bộ được giá đang lưu: ${updateCurrentPriceError.message}`
          );
        }

        console.log('updatedPrices:', updatedPrices);

        /*
         * Đồng bộ giá cửa hàng mua vào mới nhất
         * sang giá bán ra hiện tại của giao dịch.
         */
        const {
          data: updatedTransactions,
          error: updateTransactionError,
        } = await supabase
          .from('gold_transactions')
          .update({
            sell_price_per_chi: latestBuyPrice,
          })
          .eq('user_id', user.id)
          .eq('gold_type', item.gold_type)
          .select();

        if (updateTransactionError) {
          throw new Error(
            `Không cập nhật được giá giao dịch: ${updateTransactionError.message}`
          );
        }

        console.log('updatedTransactions:', updatedTransactions);

        await loadData(user.id);

        setMessage(
          `Đã xóa lịch sử giá. Giá hiện tại của ${item.gold_type
          } đã trở về ${formatMoney(latestBuyPrice)} VND/chỉ.`
        );

        return;
      }

      /*
       * Nếu không còn dòng lịch sử nào:
       * xóa luôn "Giá đang lưu".
       */
      const {
        data: deletedCurrentPrices,
        error: deleteCurrentPriceError,
      } = await supabase
        .from('gold_prices')
        .delete()
        .eq('user_id', user.id)
        .eq('gold_type', item.gold_type)
        .select();

      if (deleteCurrentPriceError) {
        throw new Error(
          `Không xóa được giá đang lưu: ${deleteCurrentPriceError.message}`
        );
      }

      console.log('deletedCurrentPrices:', deletedCurrentPrices);

      /*
       * Không còn giá hiện tại thì đưa giá giao dịch về null.
       */
      const {
        data: clearedTransactions,
        error: clearTransactionError,
      } = await supabase
        .from('gold_transactions')
        .update({
          sell_price_per_chi: null,
        })
        .eq('user_id', user.id)
        .eq('gold_type', item.gold_type)
        .select();

      if (clearTransactionError) {
        throw new Error(
          `Không xóa được giá hiện tại của giao dịch: ${clearTransactionError.message}`
        );
      }

      console.log('clearedTransactions:', clearedTransactions);

      await loadData(user.id);

      setMessage(
        `Đã xóa lịch sử cuối cùng của ${item.gold_type}. Giá đang lưu cũng đã được xóa.`
      );
    } catch (error) {
      console.error('Lỗi xóa lịch sử giá:', error);

      setMessage(
        error?.message || 'Không thể xóa lịch sử giá.'
      );
    }
  }

  async function deleteTransaction(id) {
    const ok = window.confirm('Bạn muốn xóa giao dịch này?');
    if (!ok) return;

    const { error } = await supabase
      .from('gold_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (editingId === id) {
      cancelEdit();
    }

    await loadData(user.id);
    setMessage('Đã xóa giao dịch.');
  }

  const priceMap = useMemo(() => {
    const map = {};

    // priceHistory đang được load theo created_at giảm dần.
    // Vì vậy dòng đầu tiên của mỗi loại vàng là giá mới nhất.
    for (const item of priceHistory) {
      if (!map[item.gold_type]) {
        map[item.gold_type] = Number(item.price_per_chi || 0);
      }
    }

    return map;
  }, [priceHistory]);

  function calculateTransactionResult(tx) {
    const quantity = Number(tx.quantity_chi || 0);
    const buyPrice = Number(tx.price_per_chi || 0);

    // Giá cửa hàng mua vào mới nhất trong lịch sử giá.
    // Đây là giá người dùng có thể bán vàng lại cho cửa hàng.
    const latestBuybackPrice = Number(priceMap[tx.gold_type] || 0);

    const currentPrice = Number(
      latestBuybackPrice ||
      tx.sell_price_per_chi ||
      buyPrice
    );

    const originalValue = quantity * buyPrice;
    const currentValue = quantity * currentPrice;

    /*
     * BUY/SELL chỉ là nhãn loại giao dịch.
     * Theo định nghĩa của ứng dụng:
     * - originalValue: tổng giá tại thời điểm mua
     * - currentValue: tổng giá cửa hàng có thể thu lại hiện tại
     *
     * Vì vậy cả hai loại đều dùng cùng một công thức.
     */
    const profit = currentValue - originalValue;

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

  function getChartStartDate(range) {
    const date = new Date();
    if (range === '1d') {
      date.setHours(0, 0, 0, 0);
      return date;
    }
    if (range === '1w') date.setDate(date.getDate() - 7);
    if (range === '1m') date.setMonth(date.getMonth() - 1);
    if (range === '3m') date.setMonth(date.getMonth() - 3);
    if (range === '6m') date.setMonth(date.getMonth() - 6);
    if (range === '12m') date.setMonth(date.getMonth() - 12);

    date.setHours(0, 0, 0, 0);
    return date;
  }
  const priceChartData = useMemo(() => {
    const sorted = [...priceHistory].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    if (sorted.length === 0) return [];

    const startDate = getChartStartDate(chartRange);
    startDate.setHours(0, 0, 0, 0);

    // Các lần cập nhật nằm trong khoảng thời gian đang xem.
    const historyInRange = sorted.filter(
      (item) => new Date(item.created_at) >= startDate
    );

    // Tìm giá cuối cùng trước thời điểm bắt đầu khoảng xem.
    const historyBeforeRange = sorted.filter(
      (item) => new Date(item.created_at) < startDate
    );

    const latestPreviousPrice =
      historyBeforeRange.length > 0
        ? historyBeforeRange[historyBeforeRange.length - 1]
        : null;

    const chartData = [];

    /*
     * Nếu trước thời điểm bắt đầu đã có giá,
     * thêm một điểm đầu kỳ để giữ nguyên giá cũ.
     *
     * Ví dụ:
     * Hôm nay chưa cập nhật giá thì giá hôm nay
     * bằng giá cuối cùng của ngày hôm qua.
     */
    if (latestPreviousPrice) {
      chartData.push({
        time:
          chartRange === '1d'
            ? 'Đầu ngày'
            : startDate.toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
            }),
        fullTime: `${startDate.toLocaleDateString('vi-VN')} 00:00`,
        price: Number(latestPreviousPrice.price_per_chi || 0),
        sellPrice: Number(latestPreviousPrice.sell_price_per_chi || 0),
        isCarriedForward: true,
      });
    }

    // Thêm các lần cập nhật thực tế trong khoảng thời gian đang xem.
    for (const item of historyInRange) {
      chartData.push({
        time: new Date(item.created_at).toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        fullTime: formatDateTime(item.created_at),
        price: Number(item.price_per_chi || 0),
        sellPrice: Number(item.sell_price_per_chi || 0),
        isCarriedForward: false,
      });
    }

    /*
     * Trường hợp không có giá cũ trước khoảng xem nhưng có lịch sử,
     * dùng dòng đầu tiên có thể tìm thấy.
     */
    if (chartData.length === 0 && sorted.length > 0) {
      const latestPrice = sorted[sorted.length - 1];

      chartData.push({
        time: 'Giá gần nhất',
        fullTime: formatDateTime(latestPrice.created_at),
        price: Number(latestPrice.price_per_chi || 0),
        sellPrice: Number(latestPrice.sell_price_per_chi || 0),
        isCarriedForward: true,
      });
    }

    return chartData;
  }, [priceHistory, chartRange]);

  const summary = useMemo(() => {
    let totalGoldQuantity = 0;
    let totalBuyCost = 0;
    let totalCurrentValue = 0;

    for (const tx of transactions) {
      const quantity = Number(tx.quantity_chi || 0);

      if (tx.transaction_type === 'BUY') {
        totalGoldQuantity += quantity;
      } else if (tx.transaction_type === 'SELL') {
        totalGoldQuantity -= quantity;
      }

      const result = calculateTransactionResult(tx);

      totalBuyCost += result.originalValue;
      totalCurrentValue += result.currentValue;
    }

    const profit = totalCurrentValue - totalBuyCost;

    const profitPercent =
      totalBuyCost > 0
        ? (profit / totalBuyCost) * 100
        : 0;

    return {
      totalGoldQuantity,
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

  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" />
        <p>Đang kiểm tra đăng nhập...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }
  return (
    <div className="container">  
      <div className="topbar">
        <div className="app-title">
          <div className="app-logo">
            <a href='https://gold-tracker-drab.vercel.app/'>
            <img
              src="/logo.png"
              className="login-logo"
            />
            </a>
          </div>

          <div>
            <h1>Hũ vàng</h1>
            <p className="user-email">
              Theo dõi lịch sử mua bán vàng
            </p>
          </div>
        </div>

        <div className="topbar-right">
          <div className="topbar-actions">
            <div className="welcome-user">
              Xin chào, <strong>{user?.user_metadata?.display_name || user?.email}</strong>
            </div>
            <button
              type="button"
              className="logout-button"
              onClick={updateDisplayName}
            >
              Đổi tên
            </button>
            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
              title="Đăng xuất"
            >
              <LogOut size={16} />
              Đăng xuất
            </button>

            <button
              type="button"
              className="theme-toggle small"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              title={theme === 'light' ? 'Chuyển sang theme tối' : 'Chuyển sang theme sáng'}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </div>
      </div>

      {message &&  
        <p className={`message ${messageType}`}>
          {message}
        </p>}
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
          <div className="summary-icon">
            <Coins size={22} />
          </div>
          <span>Tổng số vàng hiện có</span>

          <strong>
            {Number(summary.totalGoldQuantity || 0).toLocaleString('vi-VN', {
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
          <strong>{formatMoney(summary.totalBuyCost)}</strong>
        </div>

        <div className="summary-card">
          <div className="summary-icon chart-icon">
            <BarChart3 size={22} />
          </div>
          <span>Giá trị hiện tại (VND)</span>
          <strong>{formatMoney(summary.totalCurrentValue)}</strong>
        </div>

        <div className="summary-card">
          <div className="summary-icon profit-icon">
            {summary.profit >= 0 ? (
              <TrendingUp size={22} />
            ) : (
              <TrendingDown size={22} />
            )}
          </div>
          <span>Lời / lỗ (VND)</span>
          <strong className={summary.profit >= 0 ? 'profit' : 'loss'}>
            {formatMoney(summary.profit)}
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
            step="1"
            value={transactionForm.quantity_chi}
            onChange={(e) =>
              setTransactionForm({
                ...transactionForm,
                quantity_chi: e.target.value,
              })
            }
            placeholder="Ví dụ: 5"
          />

          <label>Giá mua vào</label>
          <input
            type="number"
            step="10000"
            value={transactionForm.price_per_chi}
            onChange={(e) =>
              setTransactionForm({
                ...transactionForm,
                price_per_chi: e.target.value,
              })
            }
            placeholder="Ví dụ: 14320000"
          />
          <label>Giá bán ra mỗi chỉ</label>
          <input
            type="number"
            step="10000"
            value={transactionForm.sell_price_per_chi}
            onChange={(e) =>
              setTransactionForm({
                ...transactionForm,
                sell_price_per_chi: e.target.value,
              })
            }
            placeholder="Ví dụ: 14690000"
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
            Mỗi ngày chỉ lưu một mức giá mới nhất cho từng loại vàng.
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
            placeholder="Ví dụ: 14320000"
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
            placeholder="Ví dụ: 14690000"
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
        <div className="gold-chart-tabs">
          <button
            type="button"
            className={activeGoldTab === 'local' ? 'active' : ''}
            onClick={() => setActiveGoldTab('local')}
          >
            <BarChart3 size={17} />
            Lịch sử giá PNJ
          </button>

          <button
            type="button"
            className={activeGoldTab === 'world' ? 'active' : ''}
            onClick={() => setActiveGoldTab('world')}
          >
            <Globe2 size={17} />
            Biểu đồ XAU/USD
          </button>
        </div>

        {activeGoldTab === 'local' && (
          <>
            <h2 className="section-title">
              <BarChart3 size={20} />
              Biểu đồ lịch sử giá
            </h2>

            <div className="chart-range-buttons">
              <button
                type="button"
                className={chartRange === '1d' ? 'active' : ''}
                onClick={() => setChartRange('1d')}
              >
                Hôm nay
              </button>

              <button
                type="button"
                className={chartRange === '1w' ? 'active' : ''}
                onClick={() => setChartRange('1w')}
              >
                1 tuần
              </button>

              <button
                type="button"
                className={chartRange === '1m' ? 'active' : ''}
                onClick={() => setChartRange('1m')}
              >
                1 tháng
              </button>

              <button
                type="button"
                className={chartRange === '3m' ? 'active' : ''}
                onClick={() => setChartRange('3m')}
              >
                3 tháng
              </button>

              <button
                type="button"
                className={chartRange === '6m' ? 'active' : ''}
                onClick={() => setChartRange('6m')}
              >
                6 tháng
              </button>

              <button
                type="button"
                className={chartRange === '12m' ? 'active' : ''}
                onClick={() => setChartRange('12m')}
              >
                12 tháng
              </button>
            </div>

            {priceChartData.length === 0 ? (
              <p className="small-text">
                Chưa có lịch sử giá để vẽ biểu đồ.
              </p>
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
                      formatter={(value, name) => [
                        `${formatMoney(value)} VND`,
                        name,
                      ]}
                      labelFormatter={(_, payload) => {
                        if (!payload || payload.length === 0) return '';

                        return payload[0].payload.fullTime;
                      }}
                    />

                    <Line
                      type="stepAfter"
                      dataKey="price"
                      name="Giá mua"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />

                    <Line
                      type="stepAfter"
                      dataKey="sellPrice"
                      name="Giá bán"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {activeGoldTab === 'world' && (
          <>
            <h2 className="section-title">
              <Globe2 size={20} />
              Biểu đồ vàng thế giới XAU/USD
            </h2>

            <p className="small-text">
              Biểu đồ tương tác từ TradingView, mã OANDA:XAUUSD.
            </p>

            <div className="world-chart-box">
              <TradingViewGoldChart theme={theme} />
            </div>
          </>
        )}
      </div>

      <div className="card">
        <p className="small-text">
          Tự động cập nhật giá vàng thế giới và tỷ giá USD/VND mỗi 1 phút khi thị trường đang hoạt động.
        </p>

        {worldGoldMarketMessage && (
          <p className="world-gold-market-note">
            {worldGoldMarketMessage}
          </p>
        )}

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
                  <th>Giá tại thời điểm mua</th>
                  <th>Giá bán ra hiện tại</th>
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
          Lịch sử cập nhật giá tại cửa hàng PNJ
        </h2>

        {priceHistory.length === 0 ? (
          <p className="small-text">Chưa có lịch sử cập nhật giá.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ngày cập nhật</th>
                  <th>Loại vàng</th>
                  <th>Giá mua</th>
                  <th>Giá bán </th>
                  <th>Chênh lệch </th>
                  <th>Ghi chú</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {paginatedPriceHistory.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDateTime(item.created_at)}</td>

                    <td>{item.gold_type}</td>

                    <td>
                      {formatMoney(item.price_per_chi)} VND
                    </td>

                    <td>
                      {formatMoney(item.sell_price_per_chi)} VND
                    </td>

                    <td>
                      {formatMoney(Number(item.sell_price_per_chi || 0) - Number(item.price_per_chi || 0))} VND
                    </td>

                    <td>{item.note || '-'}</td>

                    <td>
                      <button
                        type="button"
                        className="danger-button icon-button table-icon-button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deletePriceHistory(item);
                        }}
                      >
                        <Trash2 size={15} />
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
              <button
                type="button"
                disabled={historyPage === 1}
                onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
              >
                Trang trước
              </button>

              <span>
                Trang {historyPage} / {historyTotalPages}
              </span>

              <button
                type="button"
                disabled={historyPage >= historyTotalPages}
                onClick={() =>
                  setHistoryPage((page) =>
                    Math.min(historyTotalPages, page + 1)
                  )
                }
              >
                Trang sau
              </button>
            </div>

            <footer className="app-footer">
            <p>© 2026 Phạm Ngọc Thuần</p>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;