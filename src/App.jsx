import './App.css';
import {
  createGoldTransaction,
  updateGoldTransaction,
  deleteGoldTransaction,
  updateTransactionSellPriceByGoldType,
  clearTransactionSellPriceByGoldType,
} from './services/goldTransactionService';
import useGoldData from './hooks/useGoldData';
import Login from './components/Login';
import PriceWithChange from './components/PriceWithChange';
import { supabase } from './supabaseClient';
import { formatDateTime, formatMoney, formatShortDate, getVietnamDateKey, } from './utils/formatters';
import { useEffect, useMemo, useRef, useState } from 'react';
import SummaryCards from './components/SummaryCards';
import TransactionTable from './components/TransactionTable';
import PriceHistoryTable from './components/PriceHistoryTable';
import TransactionForm from './components/TransactionForm';
import CurrentPriceForm from './components/CurrentPriceForm';
import LocalGoldChart from './components/LocalGoldChart';
import WorldGoldComparison from './components/WorldGoldComparison';
import AppHeader from './components/AppHeader';
import WorldGoldMiniWidget from './components/WorldGoldMiniWidget';
import usePriceHistoryPagination from './hooks/usePriceHistoryPagination';
import useGoldSummary from './hooks/useGoldSummary';
import useWorldGold from './hooks/useWorldGold';
import usePriceChartData from './hooks/usePriceChartData';
import ToastContainer from './components/ToastContainer';
import ConfirmModal from './components/ConfirmModal';
import useToast from './hooks/useToast';
import useConfirm from './hooks/useConfirm';
import {
  Coins,
  Frown,
  ListChecks,
  MapPin,
  XCircle,
  Smile,
  TrendingUp,
  Wallet,
} from 'lucide-react';


function App() {
  const {
    toasts,
    addToast,
    removeToast,
  } = useToast();

  const {
    confirm,
    confirmModalProps,
  } = useConfirm();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeGoldTab, setActiveGoldTab] = useState('local');
  const {
    transactions,
    prices,
    priceHistory,
    loading,
    error: goldDataError,
    reloadGoldData,
  } = useGoldData(user?.id);

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
      setAuthLoading(false);
    }

    checkUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
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
    setUser(null);
  }


  const {
    summary,
    calculateTransactionResult,
  } = useGoldSummary(
    transactions,
    priceHistory
  );
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 10;

  /*
   * Tính mức tăng/giảm trên TOÀN BỘ lịch sử trước khi phân trang.
   *
   * priceHistory đang được tải theo created_at giảm dần:
   * dòng mới nhất nằm trước, dòng cũ hơn nằm sau.
   *
   * Mỗi dòng chỉ so sánh với lần cập nhật cũ hơn gần nhất
   * của CÙNG loại vàng.
   */
  const priceHistoryWithChanges = useMemo(() => {
    const previousPriceByGoldType = new Map();
    const result = new Array(priceHistory.length);

    for (let index = priceHistory.length - 1; index >= 0; index -= 1) {
      const item = priceHistory[index];
      const goldTypeKey = String(item.gold_type || '')
        .trim()
        .toLowerCase();

      const previousItem = previousPriceByGoldType.get(goldTypeKey);

      result[index] = {
        ...item,
        buyPriceChange: previousItem
          ? Number(item.price_per_chi || 0) -
          Number(previousItem.price_per_chi || 0)
          : null,
        sellPriceChange: previousItem
          ? Number(item.sell_price_per_chi || 0) -
          Number(previousItem.sell_price_per_chi || 0)
          : null,
      };

      previousPriceByGoldType.set(goldTypeKey, item);
    }

    return result;
  }, [priceHistory]);

  const historyTotalPages = Math.max(
    1,
    Math.ceil(priceHistoryWithChanges.length / historyPageSize)
  );

  /*
   * Chỉ phân trang SAU KHI đã tính xong mức tăng/giảm.
   * Nhờ vậy dòng cuối trang 1 vẫn so sánh đúng với dòng đầu trang 2.
   */
  const paginatedPriceHistory = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;

    return priceHistoryWithChanges.slice(
      start,
      start + historyPageSize
    );
  }, [priceHistoryWithChanges, historyPage]);

  useEffect(() => {
    if (historyPage > historyTotalPages) {
      setHistoryPage(historyTotalPages);
    }
  }, [historyPage, historyTotalPages]);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  useEffect(() => {
    if (!goldDataError) return;

    setMessageType('error');
    setMessage(goldDataError);
  }, [goldDataError]);
  useEffect(() => {
    if (!message) return;

    const normalizedMessage = message.toLowerCase();

    const looksLikeError =
      messageType === 'error' ||
      normalizedMessage.includes('không thể') ||
      normalizedMessage.includes('không tải') ||
      normalizedMessage.includes('không lưu') ||
      normalizedMessage.includes('không xóa') ||
      normalizedMessage.includes('lỗi') ||
      normalizedMessage.includes('thiếu');

    addToast({
      title: looksLikeError
        ? 'Có lỗi xảy ra'
        : 'Thông báo',
      message,
      type: looksLikeError
        ? 'error'
        : messageType,
    });

    setMessage('');
  }, [
    message,
    messageType,
    addToast,
  ]);
  const [editingId, setEditingId] = useState(null);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [isWorldGoldOpen, setIsWorldGoldOpen] = useState(false);
  const [chartRange, setChartRange] = useState('1d');
  const priceChartData = usePriceChartData(
    priceHistory,
    chartRange
  );
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
  }, [theme]);

  const {
    worldGold,
    worldGoldLoading,
    worldGoldError,
    worldGoldMarketMessage,
  } = useWorldGold();

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

  async function saveTransaction(event) {
    event.preventDefault();
    setMessage('');

    const quantity = Number(
      transactionForm.quantity_chi
    );

    const price = Number(
      transactionForm.price_per_chi
    );

    const sellPrice = Number(
      transactionForm.sell_price_per_chi
    );

    if (!transactionForm.gold_type.trim()) {
      setMessage('Vui lòng nhập loại vàng.');
      return;
    }

    if (!quantity || quantity <= 0) {
      setMessage(
        'Vui lòng nhập số lượng vàng hợp lệ.'
      );
      return;
    }

    if (!price || price <= 0) {
      setMessage(
        'Vui lòng nhập giá mua vào hợp lệ.'
      );
      return;
    }

    if (!sellPrice || sellPrice <= 0) {
      setMessage(
        'Vui lòng nhập giá bán ra hợp lệ.'
      );
      return;
    }

    const payload = {
      user_id: user.id,
      transaction_type:
        transactionForm.transaction_type,
      gold_type:
        transactionForm.gold_type.trim(),
      quantity_chi: quantity,
      price_per_chi: price,
      sell_price_per_chi: sellPrice,
      transaction_date:
        transactionForm.transaction_date,
      location:
        transactionForm.location.trim(),
      note:
        transactionForm.note.trim(),
    };

    try {
      const wasEditing = Boolean(editingId);

      if (editingId) {
        await updateGoldTransaction({
          transactionId: editingId,
          userId: user.id,
          payload,
        });
      } else {
        await createGoldTransaction(payload);
      }

      setTransactionForm(
        defaultTransactionForm
      );

      setEditingId(null);

      await reloadGoldData();

      setMessage(
        wasEditing
          ? 'Đã cập nhật giao dịch.'
          : 'Đã lưu giao dịch.'
      );
    } catch (error) {
      setMessage(
        error?.message ||
        'Không thể lưu giao dịch.'
      );
    }
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
    try {
      await updateTransactionSellPriceByGoldType({
        userId: user.id,
        goldType,
        sellPricePerChi: currentPrice,
      });
    } catch (error) {
      setMessage(
        `Đã lưu giá hiện tại nhưng không cập nhật được giá trong danh sách giao dịch: ${error?.message || 'Lỗi không xác định'
        }`
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

    await reloadGoldData();

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
    const ok = await confirm({
      title: `Xóa giá của ${goldType}?`,
      message:
        'Giá đang lưu sẽ bị xóa. Lịch sử cập nhật giá vẫn được giữ lại.',
      confirmText: 'Xóa giá',
      cancelText: 'Giữ lại',
      type: 'danger',
    });
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

    await reloadGoldData();

    setMessage('Đã xóa giá hiện tại. Lịch sử giá vẫn được giữ lại.');
  }

  async function deletePriceHistory(item) {
    try {
      if (!item?.id) {
        setMessage('Không tìm thấy ID của lịch sử giá cần xóa.');
        return;
      }

      const ok = await confirm({
        title: 'Xóa lịch sử cập nhật giá?',
        message: `Bạn đang xóa lịch sử của ${item.gold_type
          } lúc ${formatDateTime(
            item.created_at
          )}. Giá hiện tại có thể được đưa về mức cập nhật trước đó.`,
        confirmText: 'Xóa lịch sử',
        cancelText: 'Giữ lại',
        type: 'danger',
      });

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
        const updatedTransactions =
          await updateTransactionSellPriceByGoldType({
            userId: user.id,
            goldType: item.gold_type,
            sellPricePerChi: latestBuyPrice,
          });

        console.log(
          'updatedTransactions:',
          updatedTransactions
        );

        await reloadGoldData();

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
      const clearedTransactions =
        await clearTransactionSellPriceByGoldType({
          userId: user.id,
          goldType: item.gold_type,
        });

      console.log(
        'clearedTransactions:',
        clearedTransactions
      );

      await reloadGoldData();

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

  async function deleteTransaction(transactionId) {
    const ok = await confirm({
      title: 'Xóa giao dịch?',
      message:
        'Giao dịch này sẽ bị xóa khỏi danh sách và không thể khôi phục.',
      confirmText: 'Xóa giao dịch',
      cancelText: 'Giữ lại',
      type: 'danger',
    }
    );

    if (!ok) return;

    try {
      setMessage('');

      await deleteGoldTransaction({
        transactionId,
        userId: user.id,
      });

      if (editingId === transactionId) {
        cancelEdit();
      }

      await reloadGoldData();

      setMessage('Đã xóa giao dịch.');
    } catch (error) {
      setMessage(
        error?.message ||
        'Không thể xóa giao dịch.'
      );
    }
  }
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
      <AppHeader
        user={user}
        theme={theme}
        onChangeDisplayName={updateDisplayName}
        onLogout={handleLogout}
        onToggleTheme={() =>
          setTheme((currentTheme) =>
            currentTheme === 'light'
              ? 'dark'
              : 'light'
          )
        }
      />

      <WorldGoldMiniWidget
        isOpen={isWorldGoldOpen}
        onOpen={() => setIsWorldGoldOpen(true)}
        onClose={() => setIsWorldGoldOpen(false)}
      />

      <SummaryCards summary={summary} />

      <div className="grid">
        <TransactionForm
          editingId={editingId}
          transactionForm={transactionForm}
          setTransactionForm={setTransactionForm}
          onSubmit={saveTransaction}
          onCancel={cancelEdit}
        />

        <CurrentPriceForm
          editingPriceId={editingPriceId}
          priceForm={priceForm}
          setPriceForm={setPriceForm}
          prices={prices}
          onSubmit={saveCurrentPrice}
          onCancel={cancelPriceEdit}
          onEdit={editCurrentPrice}
          onDelete={deleteCurrentPrice}
          onPriceUpdated={reloadGoldData}
        />
      </div>

      <LocalGoldChart
        activeGoldTab={activeGoldTab}
        setActiveGoldTab={setActiveGoldTab}
        chartRange={chartRange}
        setChartRange={setChartRange}
        priceChartData={priceChartData}
        theme={theme}
      />

      <WorldGoldComparison
        worldGold={worldGold}
        worldGoldLoading={worldGoldLoading}
        worldGoldError={worldGoldError}
        worldGoldMarketMessage={worldGoldMarketMessage}
        shopGold={shopGold}
        shopSellPriceVndPerLuong={shopSellPriceVndPerLuong}
        goldDifference={goldDifference}
        goldDifferencePercent={goldDifferencePercent}
      />

      <TransactionTable
        loading={loading}
        transactions={transactions}
        calculateTransactionResult={calculateTransactionResult}
        onEdit={editTransaction}
        onDelete={deleteTransaction}
      />

      <PriceHistoryTable
        priceHistory={priceHistory}
        paginatedPriceHistory={paginatedPriceHistory}
        historyPage={historyPage}
        historyTotalPages={historyTotalPages}
        onPreviousPage={() =>
          setHistoryPage((page) => Math.max(1, page - 1))
        }
        onNextPage={() =>
          setHistoryPage((page) =>
            Math.min(historyTotalPages, page + 1)
          )
        }
        onDelete={deletePriceHistory}
      />
      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
      />

      <ConfirmModal
        {...confirmModalProps}
      />
    </div>

  );

}

export default App;