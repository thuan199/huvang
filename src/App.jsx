import './App.css';

import {
  createGoldTransaction,
  updateGoldTransaction,
  deleteGoldTransaction,
  updateTransactionSellPriceByGoldType,
} from './services/goldTransactionService';
import Toast from "./components/Toast";
import AdminUserManager from "./components/AdminUserManager";
import ChangeDisplayNameModal from "./components/ChangeDisplayNameModal";
import OAuthCallback from "./components/OAuthCallback";
import useGoldData from './hooks/useGoldData';
import MaintenanceScreen from "./components/MaintenanceScreen";
import { useMaintenanceMode } from "./hooks/useMaintenanceMode";
import MaintenanceControl from "./components/MaintenanceControl";

import Login from './components/Login';
import SummaryCards from './components/SummaryCards';
import TransactionTable from './components/TransactionTable';
import PriceHistoryTable from './components/PriceHistoryTable';
import TransactionForm from './components/TransactionForm';
import CurrentPriceForm from './components/CurrentPriceForm';
import LocalGoldChart from './components/LocalGoldChart';
import WorldGoldComparison from './components/WorldGoldComparison';
import AppHeader from './components/AppHeader';
import WorldGoldMiniWidget from './components/WorldGoldMiniWidget';
import ToastContainer from './components/ToastContainer';
import ConfirmModal from './components/ConfirmModal';

import { supabase } from './supabaseClient';

import {
  getVietnamDateKey,
} from './utils/formatters';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import useGoldSummary from './hooks/useGoldSummary';
import useWorldGold from './hooks/useWorldGold';
import usePriceChartData from './hooks/usePriceChartData';
import useToast from './hooks/useToast';
import useConfirm from './hooks/useConfirm';

function App() {
  const [
    toast,
    setToast,
  ] = useState({
    isOpen: false,
    message: "",
    type: "success",
  });

  function showToast(
    message,
    type = "success",
  ) {
    setToast({
      isOpen: true,
      message,
      type,
    });
  }

  function closeToast() {
    setToast((current) => ({
      ...current,
      isOpen: false,
    }));
  }

  useEffect(() => {
    if (!toast.isOpen) {
      return undefined;
    }

    const timeoutId =
      window.setTimeout(() => {
        setToast((current) => ({
          ...current,
          isOpen: false,
        }));
      }, 3000);

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [
    toast.isOpen,
    toast.message,
  ]);

  const [
    activeAdminPanel,
    setActiveAdminPanel,
  ] = useState(false);

  const [
    isDisplayNameOpen,
    setIsDisplayNameOpen,
  ] = useState(false);

  const [
    displayNameSaving,
    setDisplayNameSaving,
  ] = useState(false);

  const [
    displayNameError,
    setDisplayNameError,
  ] = useState("");

  const {
    maintenance,
    isAdmin,
    loading: maintenanceLoading,
    reloadMaintenance,
  } = useMaintenanceMode();

  const {
    toasts,
    addToast,
    removeToast,
    success: showSuccessToast,
    error: showErrorToast,
  } = useToast();

  const {
    confirm,
    confirmModalProps,
  } = useConfirm();

  const [user, setUser] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [
    appInitialized,
    setAppInitialized,
  ] = useState(false);

  const authInitializedRef =
    useRef(false);

  const [
    activeGoldTab,
    setActiveGoldTab,
  ] = useState('local');

  /*
   * useGoldData trả về hai nhóm dữ liệu:
   *
   * Dữ liệu cá nhân:
   * - transactions
   * - prices
   * - personalPriceHistory
   *
   * Dữ liệu PNJ dùng chung:
   * - pnjCurrentPrice
   * - pnjPriceHistory
   */
  const {
    transactions,
    prices,
    personalPriceHistory,
    pnjCurrentPrice,
    pnjPriceHistory,
    loading,
    error: goldDataError,
    reloadGoldData,
  } = useGoldData(user?.id);

  /*
   * Giữ tên priceHistory để không phải sửa các phần
   * biểu đồ, tính biến động và bảng lịch sử phía dưới.
   *
   * Từ đây priceHistory là lịch sử PNJ dùng chung.
   */
  const priceHistory =
    pnjPriceHistory ?? [];

  /*
   * Chuẩn hóa dữ liệu giá PNJ theo cấu trúc mà
   * các component cũ đang sử dụng.
   */
  const shopGold = useMemo(() => {
    if (!pnjCurrentPrice) {
      return null;
    }

    const buyPricePerChi = Number(
      pnjCurrentPrice.buy_price_per_chi ??
      pnjCurrentPrice.current_price_per_chi ??
      pnjCurrentPrice.price_per_chi ??
      0
    );

    const sellPricePerChi = Number(
      pnjCurrentPrice.sell_price_per_chi ??
      0
    );

    return {
      ...pnjCurrentPrice,

      current_price_per_chi:
        buyPricePerChi,

      price_per_chi:
        buyPricePerChi,

      buy_price_per_chi:
        buyPricePerChi,

      sell_price_per_chi:
        sellPricePerChi,
    };
  }, [pnjCurrentPrice]);

  /*
   * Kiểm tra trạng thái đăng nhập.
   *
   * USER_UPDATED xảy ra khi đổi tên hoặc avatar.
   * Sự kiện này chỉ cập nhật user, không bật lại màn hình
   * "Đang kiểm tra hệ thống...".
   */
  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      try {
        const {
          data,
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!mounted) {
          return;
        }

        setUser(
          data.session?.user ?? null
        );
      } catch (error) {
        console.error(
          'Không thể kiểm tra phiên đăng nhập:',
          error
        );

        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          authInitializedRef.current = true;
          setAuthLoading(false);
        }
      }
    }

    checkUser();

    const {
      data: listener,
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) {
          return;
        }

        setUser(
          session?.user ?? null
        );

        if (event === 'SIGNED_OUT') {
          setActiveAdminPanel(null);
          setIsDisplayNameOpen(false);
          setIsWorldGoldOpen(false);
          setUser(null);
        }

        /*
         * Không gọi setAuthLoading(true) tại đây.
         * Đổi tên sẽ phát USER_UPDATED; nếu bật loading lại,
         * App bị unmount và Toast vừa tạo sẽ biến mất.
         */
        if (!authInitializedRef.current) {
          authInitializedRef.current = true;
          setAuthLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  /*
   * Nhận thông báo đăng nhập thành công từ popup Google.
   */
  useEffect(() => {
    async function handleOAuthMessage(event) {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type !== 'GOOGLE_LOGIN_SUCCESS') {
        return;
      }

      const { data, error } =
        await supabase.auth.getSession();

      if (error) {
        console.error(
          'Không thể lấy phiên đăng nhập Google:',
          error
        );
        return;
      }

      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    }

    window.addEventListener(
      'message',
      handleOAuthMessage
    );

    return () => {
      window.removeEventListener(
        'message',
        handleOAuthMessage
      );
    };
  }, []);

  /*
   * Chỉ chờ auth và maintenance trong lần khởi tạo đầu tiên.
   * Sau đó USER_UPDATED không được thay toàn bộ giao diện.
   */
  useEffect(() => {
    if (
      appInitialized ||
      authLoading ||
      maintenanceLoading
    ) {
      return;
    }

    setAppInitialized(true);
  }, [
    appInitialized,
    authLoading,
    maintenanceLoading,
  ]);

  const [message, setMessage] =
    useState('');

  const [
    messageType,
    setMessageType,
  ] = useState('success');

  /*
   * Hiển thị lỗi tải dữ liệu.
   */
  useEffect(() => {
    if (!goldDataError) {
      return;
    }

    setMessageType('error');
    setMessage(goldDataError);
  }, [goldDataError]);

  /*
   * Chuyển message thành Toast.
   */
  useEffect(() => {
    if (!message) {
      return;
    }

    const normalizedMessage =
      message.toLowerCase();

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
    setMessageType('success');
  }, [
    message,
    messageType,
    addToast,
  ]);

  async function updateDisplayName(
    name
  ) {
    const trimmedName =
      name?.trim();

    setDisplayNameError("");

    if (!trimmedName) {
      setDisplayNameError(
        "Vui lòng nhập tên hiển thị."
      );
      return;
    }

    if (trimmedName.length < 2) {
      setDisplayNameError(
        "Tên hiển thị phải có ít nhất 2 ký tự."
      );
      return;
    }

    try {
      setDisplayNameSaving(true);

      const {
        data,
        error,
      } =
        await supabase.auth
          .updateUser({
            data: {
              display_name:
                trimmedName,
            },
          });

      if (error) {
        throw error;
      }

      setUser(
        (currentUser) => ({
          ...currentUser,
          ...data.user,
          user_metadata: {
            ...currentUser
              ?.user_metadata,
            ...data.user
              ?.user_metadata,
            display_name:
              trimmedName,
          },
        })
      );

      setDisplayNameError("");
      setIsDisplayNameOpen(false);

      setMessageType("success");
      setMessage(
        "Đã cập nhật tên hiển thị."
      );
    } catch (error) {
      console.error(
        "Lỗi đổi tên hiển thị:",
        error
      );

      const errorMessage =
        error?.message ||
        "Không thể cập nhật tên hiển thị.";

      setDisplayNameError(
        errorMessage
      );

      setMessageType("error");
      setMessage(errorMessage);
    } finally {
      setDisplayNameSaving(false);
    }
  }

  async function handleLogout() {
    setActiveAdminPanel(null);
    setIsDisplayNameOpen(false);
    setIsWorldGoldOpen(false);

    await supabase.auth.signOut();

    setUser(null);
  }

  /*
   * Thống kê danh mục.
   *
   * priceHistory hiện là lịch sử PNJ dùng chung,
   * nên kết quả giao dịch được tính theo giá PNJ.
   */
  const {
    summary,
    calculateTransactionResult,
  } = useGoldSummary(
    transactions,
    priceHistory
  );

  const [historyPage, setHistoryPage] =
    useState(1);

  const historyPageSize = 10;

  /*
   * Tính mức tăng giảm trên toàn bộ lịch sử
   * trước khi thực hiện phân trang.
   */
  const priceHistoryWithChanges =
    useMemo(() => {
      const previousPriceByGoldType =
        new Map();

      const result =
        new Array(
          priceHistory.length
        );

      for (
        let index =
          priceHistory.length - 1;
        index >= 0;
        index -= 1
      ) {
        const item =
          priceHistory[index];

        const goldTypeKey = String(
          item.gold_type ?? ''
        )
          .trim()
          .toLowerCase();

        const previousItem =
          previousPriceByGoldType.get(
            goldTypeKey
          );

        const currentBuyPrice =
          Number(
            item.price_per_chi ??
            item.new_buy_price_per_chi ??
            item.buy_price_per_chi ??
            0
          );

        const currentSellPrice =
          Number(
            item.sell_price_per_chi ??
            item.new_sell_price_per_chi ??
            0
          );

        const previousBuyPrice =
          previousItem
            ? Number(
              previousItem.price_per_chi ??
              previousItem
                .new_buy_price_per_chi ??
              previousItem
                .buy_price_per_chi ??
              0
            )
            : 0;

        const previousSellPrice =
          previousItem
            ? Number(
              previousItem
                .sell_price_per_chi ??
              previousItem
                .new_sell_price_per_chi ??
              0
            )
            : 0;

        result[index] = {
          ...item,

          /*
           * Bảo đảm component cũ đọc được
           * tên cột đã ánh xạ.
           */
          price_per_chi:
            currentBuyPrice,

          sell_price_per_chi:
            currentSellPrice,

          buyPriceChange:
            previousItem
              ? currentBuyPrice -
              previousBuyPrice
              : null,

          sellPriceChange:
            previousItem
              ? currentSellPrice -
              previousSellPrice
              : null,
        };

        previousPriceByGoldType.set(
          goldTypeKey,
          result[index]
        );
      }

      return result;
    }, [priceHistory]);

  const historyTotalPages =
    Math.max(
      1,
      Math.ceil(
        priceHistoryWithChanges.length /
        historyPageSize
      )
    );

  const paginatedPriceHistory =
    useMemo(() => {
      const start =
        (historyPage - 1) *
        historyPageSize;

      return priceHistoryWithChanges.slice(
        start,
        start + historyPageSize
      );
    }, [
      priceHistoryWithChanges,
      historyPage,
    ]);

  useEffect(() => {
    if (
      historyPage >
      historyTotalPages
    ) {
      setHistoryPage(
        historyTotalPages
      );
    }
  }, [
    historyPage,
    historyTotalPages,
  ]);

  const [editingId, setEditingId] =
    useState(null);

  const [
    editingPriceId,
    setEditingPriceId,
  ] = useState(null);

  const [
    isWorldGoldOpen,
    setIsWorldGoldOpen,
  ] = useState(false);

  const [
    chartRange,
    setChartRange,
  ] = useState('1d');

  /*
   * Biểu đồ sử dụng lịch sử PNJ dùng chung.
   */
  const priceChartData =
    usePriceChartData(
      priceHistory,
      chartRange
    );

  const [theme, setTheme] =
    useState('light');

  useEffect(() => {
    document.body.className =
      theme === 'dark'
        ? 'dark-theme'
        : '';
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
    transaction_date:
      new Date()
        .toISOString()
        .slice(0, 10),
    location: '',
    note: '',
  };

  const defaultPriceForm = {
    gold_type: 'Nhẫn 9999',
    current_price_per_chi: '',
    sell_price_per_chi: '',
    note: '',
  };

  const [
    transactionForm,
    setTransactionForm,
  ] = useState(
    defaultTransactionForm
  );

  const [
    priceForm,
    setPriceForm,
  ] = useState(
    defaultPriceForm
  );

  /*
   * Lấy giá cửa hàng mua lại hiện tại.
   *
   * Ưu tiên:
   * 1. Giá PNJ dùng chung.
   * 2. Giá cá nhân trong gold_prices.
   */
  function getCurrentBuybackPrice(
    goldType
  ) {
    const normalizedGoldType =
      String(goldType ?? '')
        .trim()
        .toLowerCase();

    const pnjGoldType =
      String(
        shopGold?.gold_type ?? ''
      )
        .trim()
        .toLowerCase();

    if (
      shopGold &&
      normalizedGoldType === pnjGoldType
    ) {
      return Number(
        shopGold.buy_price_per_chi ??
        shopGold.current_price_per_chi ??
        shopGold.price_per_chi ??
        0
      );
    }

    const matchedPrice =
      prices.find(
        (item) =>
          String(
            item.gold_type ?? ''
          )
            .trim()
            .toLowerCase() ===
          normalizedGoldType
      );

    return matchedPrice
      ? Number(
        matchedPrice
          .current_price_per_chi ??
        0
      )
      : 0;
  }

  /*
   * Khi thêm giao dịch mới, tự động lấy giá
   * cửa hàng đang mua lại.
   */
  useEffect(() => {
    if (editingId) {
      return;
    }

    const currentBuybackPrice =
      getCurrentBuybackPrice(
        transactionForm.gold_type
      );

    setTransactionForm(
      (currentForm) => {
        const newSellPrice =
          currentBuybackPrice > 0
            ? String(
              currentBuybackPrice
            )
            : '';

        if (
          currentForm
            .sell_price_per_chi ===
          newSellPrice
        ) {
          return currentForm;
        }

        return {
          ...currentForm,
          sell_price_per_chi:
            newSellPrice,
        };
      }
    );
  }, [
    transactionForm.gold_type,
    prices,
    shopGold,
    editingId,
  ]);

  async function saveTransaction(
    event
  ) {
    event.preventDefault();

    setMessage('');
    setMessageType('success');

    const quantity = Number(
      transactionForm.quantity_chi
    );

    const price = Number(
      transactionForm.price_per_chi
    );

    const sellPrice = Number(
      transactionForm
        .sell_price_per_chi
    );

    if (
      !transactionForm
        .gold_type
        .trim()
    ) {
      setMessageType('error');
      setMessage(
        'Vui lòng nhập loại vàng.'
      );
      return;
    }

    if (
      !quantity ||
      quantity <= 0
    ) {
      setMessageType('error');
      setMessage(
        'Vui lòng nhập số lượng vàng hợp lệ.'
      );
      return;
    }

    if (!price || price <= 0) {
      setMessageType('error');
      setMessage(
        'Vui lòng nhập giá mua vào hợp lệ.'
      );
      return;
    }

    if (
      !sellPrice ||
      sellPrice <= 0
    ) {
      setMessageType('error');
      setMessage(
        'Vui lòng nhập giá bán ra hợp lệ.'
      );
      return;
    }

    const payload = {
      user_id: user.id,

      transaction_type:
        transactionForm
          .transaction_type,

      gold_type:
        transactionForm
          .gold_type
          .trim(),

      quantity_chi:
        quantity,

      price_per_chi:
        price,

      sell_price_per_chi:
        sellPrice,

      transaction_date:
        transactionForm
          .transaction_date,

      location:
        transactionForm
          .location
          .trim(),

      note:
        transactionForm
          .note
          .trim(),
    };

    try {
      const wasEditing =
        Boolean(editingId);

      if (editingId) {
        await updateGoldTransaction({
          transactionId:
            editingId,

          userId:
            user.id,

          payload,
        });
      } else {
        await createGoldTransaction(
          payload
        );
      }

      setTransactionForm(
        defaultTransactionForm
      );

      setEditingId(null);

      await reloadGoldData();

      setMessageType('success');

      setMessage(
        wasEditing
          ? 'Đã cập nhật giao dịch.'
          : 'Đã lưu giao dịch.'
      );
    } catch (error) {
      setMessageType('error');

      setMessage(
        error?.message ||
        'Không thể lưu giao dịch.'
      );
    }
  }

  function editTransaction(tx) {
    setEditingId(tx.id);

    setTransactionForm({
      transaction_type:
        tx.transaction_type,

      gold_type:
        tx.gold_type ?? '',

      quantity_chi:
        String(
          tx.quantity_chi ?? ''
        ),

      price_per_chi:
        String(
          tx.price_per_chi ?? ''
        ),

      sell_price_per_chi:
        String(
          tx.sell_price_per_chi ??
          ''
        ),

      transaction_date:
        tx.transaction_date ??
        new Date()
          .toISOString()
          .slice(0, 10),

      location:
        tx.location ?? '',

      note:
        tx.note ?? '',
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });

    setMessageType('success');

    setMessage(
      'Đang chỉnh sửa giao dịch. Sửa xong bấm Cập nhật giao dịch.'
    );
  }

  function cancelEdit() {
    setEditingId(null);

    setTransactionForm(
      defaultTransactionForm
    );

    setMessage('');
  }

  /*
   * Lưu giá do người dùng tự nhập.
   *
   * Chức năng này vẫn ghi vào:
   * - gold_prices
   * - gold_price_history
   *
   * Đây là dữ liệu cá nhân, không phải dữ liệu PNJ dùng chung.
   */
  async function saveCurrentPrice(
    event
  ) {
    event.preventDefault();

    setMessage('');
    setMessageType('success');

    const currentPrice = Number(
      priceForm
        .current_price_per_chi
    );

    const sellPrice = Number(
      priceForm
        .sell_price_per_chi
    );

    const goldType =
      priceForm
        .gold_type
        .trim();

    const now =
      new Date().toISOString();

    const priceDate =
      getVietnamDateKey();

    if (!goldType) {
      setMessageType('error');
      setMessage(
        'Vui lòng nhập loại vàng.'
      );
      return;
    }

    if (
      !currentPrice ||
      currentPrice <= 0
    ) {
      setMessageType('error');

      setMessage(
        'Vui lòng nhập giá cửa hàng mua vào hợp lệ.'
      );

      return;
    }

    if (
      !sellPrice ||
      sellPrice <= 0
    ) {
      setMessageType('error');

      setMessage(
        'Vui lòng nhập giá cửa hàng bán ra hợp lệ.'
      );

      return;
    }

    let priceError;

    if (editingPriceId) {
      const result =
        await supabase
          .from('gold_prices')
          .update({
            gold_type:
              goldType,

            current_price_per_chi:
              currentPrice,

            sell_price_per_chi:
              sellPrice,

            updated_at:
              now,
          })
          .eq(
            'id',
            editingPriceId
          )
          .eq(
            'user_id',
            user.id
          );

      priceError =
        result.error;
    } else {
      const result =
        await supabase
          .from('gold_prices')
          .upsert(
            {
              user_id:
                user.id,

              gold_type:
                goldType,

              current_price_per_chi:
                currentPrice,

              sell_price_per_chi:
                sellPrice,

              updated_at:
                now,
            },
            {
              onConflict:
                'user_id,gold_type',
            }
          );

      priceError =
        result.error;
    }

    if (priceError) {
      setMessageType('error');
      setMessage(
        priceError.message
      );
      return;
    }

    try {
      await updateTransactionSellPriceByGoldType({
        userId:
          user.id,

        goldType,

        sellPricePerChi:
          currentPrice,
      });
    } catch (error) {
      setMessageType('error');

      setMessage(
        `Đã lưu giá hiện tại nhưng không cập nhật được giá trong danh sách giao dịch: ${error?.message ||
        'Lỗi không xác định'
        }`
      );

      return;
    }

    const {
      error: historyError,
    } = await supabase
      .from('gold_price_history')
      .upsert(
        {
          user_id:
            user.id,

          gold_type:
            goldType,

          price_date:
            priceDate,

          price_per_chi:
            currentPrice,

          sell_price_per_chi:
            sellPrice,

          note:
            priceForm.note.trim() ||
            'Cập nhật giá hiện tại',

          created_at:
            now,
        },
        {
          onConflict:
            'user_id,gold_type,price_date',
        }
      );

    if (historyError) {
      setMessageType('error');

      setMessage(
        `Không lưu được lịch sử giá theo ngày: ${historyError.message}`
      );

      return;
    }

    const wasEditing =
      Boolean(editingPriceId);

    setPriceForm(
      defaultPriceForm
    );

    setEditingPriceId(null);

    await reloadGoldData();

    setMessageType('success');

    setMessage(
      wasEditing
        ? 'Đã sửa giá hiện tại và cập nhật giá mới nhất của ngày hôm nay.'
        : 'Đã cập nhật giá hiện tại và lưu giá mới nhất của ngày hôm nay.'
    );
  }

  function editCurrentPrice(item) {
    setEditingPriceId(
      item.id
    );

    setPriceForm({
      gold_type:
        item.gold_type ?? '',

      current_price_per_chi:
        String(
          item.current_price_per_chi ??
          ''
        ),

      sell_price_per_chi:
        String(
          item.sell_price_per_chi ??
          ''
        ),

      note:
        'Sửa giá hiện tại',
    });

    setMessageType('success');

    setMessage(
      'Đang chỉnh sửa giá hiện tại. Sửa xong bấm Lưu giá đã sửa.'
    );
  }

  function cancelPriceEdit() {
    setEditingPriceId(null);

    setPriceForm(
      defaultPriceForm
    );

    setMessage('');
  }

  async function deleteCurrentPrice(
    id,
    goldType
  ) {
    const ok = await confirm({
      title:
        `Xóa giá của ${goldType}?`,

      message:
        'Giá đang lưu sẽ bị xóa. Lịch sử cập nhật giá cá nhân vẫn được giữ lại.',

      confirmText:
        'Xóa giá',

      cancelText:
        'Giữ lại',

      type:
        'danger',
    });

    if (!ok) {
      return;
    }

    const {
      error,
    } = await supabase
      .from('gold_prices')
      .delete()
      .eq('id', id)
      .eq(
        'user_id',
        user.id
      );

    if (error) {
      setMessageType('error');
      setMessage(error.message);
      return;
    }

    if (
      editingPriceId === id
    ) {
      cancelPriceEdit();
    }

    await reloadGoldData();

    setMessageType('success');

    setMessage(
      'Đã xóa giá hiện tại. Lịch sử giá cá nhân vẫn được giữ lại.'
    );
  }

  async function deleteTransaction(
    transactionId
  ) {
    const ok = await confirm({
      title:
        'Xóa giao dịch?',

      message:
        'Giao dịch này sẽ bị xóa khỏi danh sách và không thể khôi phục.',

      confirmText:
        'Xóa giao dịch',

      cancelText:
        'Giữ lại',

      type:
        'danger',
    });

    if (!ok) {
      return;
    }

    try {
      setMessage('');

      await deleteGoldTransaction({
        transactionId,
        userId:
          user.id,
      });

      if (
        editingId ===
        transactionId
      ) {
        cancelEdit();
      }

      await reloadGoldData();

      setMessageType('success');

      setMessage(
        'Đã xóa giao dịch.'
      );
    } catch (error) {
      setMessageType('error');

      setMessage(
        error?.message ||
        'Không thể xóa giao dịch.'
      );
    }
  }

  /*
   * Giá PNJ bán ra quy đổi từ giá/chỉ sang giá/lượng.
   */
  const shopSellPriceVndPerLuong =
    shopGold
      ? Number(
        shopGold
          .sell_price_per_chi ??
        0
      ) * 10
      : 0;

  const goldDifference =
    worldGold &&
      shopSellPriceVndPerLuong
      ? shopSellPriceVndPerLuong -
      worldGold
        .worldGoldVndPerLuong
      : 0;

  const goldDifferencePercent =
    worldGold &&
      worldGold
        .worldGoldVndPerLuong > 0
      ? (
        goldDifference /
        worldGold
          .worldGoldVndPerLuong
      ) * 100
      : 0;

  /*
   * Trang callback chạy trong popup Google.
   */
  const isOAuthCallback =
    window.location.pathname ===
    '/oauth-callback';

  if (isOAuthCallback) {
    return <OAuthCallback />;
  }

  /*
   * Chờ kiểm tra đăng nhập và trạng thái bảo trì.
   */
  if (!appInitialized) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" />

        <p>
          Đang kiểm tra hệ thống...
        </p>
      </div>
    );
  }

  /*
   * Khi bật bảo trì:
   * - User thường sẽ thấy màn hình bảo trì.
   * - Admin vẫn vào được ứng dụng để kiểm tra.
   */
  /*
 * Người chưa đăng nhập luôn được phép
 * vào màn hình đăng nhập, kể cả khi
 * hệ thống đang bảo trì.
 */
  if (!user) {
    return <Login />;
  }

  /*
   * Sau khi đăng nhập:
   * - Admin vẫn được vào ứng dụng.
   * - User thường sẽ thấy màn hình bảo trì.
   */
  if (
    maintenance.enabled &&
    !isAdmin
  ) {
    return (
      <MaintenanceScreen
        maintenance={maintenance}
      />
    );
  }

  return (
    <>
      <div className="container">
        <AppHeader
          user={user}
          theme={theme}
          isAdmin={isAdmin}
          onOpenMaintenance={() =>
            setActiveAdminPanel(
              (current) =>
                current === "maintenance"
                  ? null
                  : "maintenance"
            )
          }
          onOpenUserManager={() =>
            setActiveAdminPanel(
              (current) =>
                current === "users"
                  ? null
                  : "users"
            )
          }
          onChangeDisplayName={() => {
            setDisplayNameError("");
            setIsDisplayNameOpen(true);
          }}
          onChangeDisplayName={() => {
            setDisplayNameError("");
            setIsDisplayNameOpen(true);
          }}
          onPasswordChanged={(
            successMessage
          ) => {
            setMessageType(
              "success"
            );

            setMessage(
              successMessage
            );
          }}
          onAvatarChanged={(
            updatedUser
          ) => {
            setUser(
              updatedUser
            );

            setMessageType(
              "success"
            );

            setMessage(
              "Đã cập nhật ảnh đại diện."
            );
          }}
          onLogout={
            handleLogout
          }
          onToggleTheme={() =>
            setTheme(
              (currentTheme) =>
                currentTheme ===
                  "light"
                  ? "dark"
                  : "light"
            )
          }
        />

        <ChangeDisplayNameModal
          isOpen={isDisplayNameOpen}
          currentName={
            user?.user_metadata?.display_name ||
            user?.user_metadata?.full_name ||
            user?.user_metadata?.name ||
            user?.email?.split("@")[0] ||
            ""
          }
          saving={displayNameSaving}
          error={displayNameError}
          onClose={() => {
            if (displayNameSaving) {
              return;
            }

            setDisplayNameError("");
            setIsDisplayNameOpen(false);
          }}
          onSubmit={updateDisplayName}
        />

        {isAdmin &&
          activeAdminPanel === "maintenance" && (
            <div className="maintenance-admin-area">
              <MaintenanceControl
                maintenance={maintenance}
                reloadMaintenance={reloadMaintenance}
                onClose={() =>
                  setActiveAdminPanel(null)
                }
              />
            </div>
          )}

        {isAdmin &&
          activeAdminPanel === "users" && (
            <AdminUserManager
              confirm={confirm}
              showToast={showToast}
              onClose={() =>
                setActiveAdminPanel(null)
              }
            />
          )}

        <WorldGoldMiniWidget
          isOpen={isWorldGoldOpen}
          onOpen={() =>
            setIsWorldGoldOpen(true)
          }
          onClose={() =>
            setIsWorldGoldOpen(false)
          }
        />

        <SummaryCards
          summary={summary}
        />

        <div className="grid">
          <TransactionForm
            editingId={
              editingId
            }
            transactionForm={
              transactionForm
            }
            setTransactionForm={
              setTransactionForm
            }
            onSubmit={
              saveTransaction
            }
            onCancel={
              cancelEdit
            }
          />

          <CurrentPriceForm
            editingPriceId={
              editingPriceId
            }
            priceForm={
              priceForm
            }
            setPriceForm={
              setPriceForm
            }
            prices={
              prices
            }
            pnjCurrentPrice={
              shopGold
            }
            onSubmit={
              saveCurrentPrice
            }
            onCancel={
              cancelPriceEdit
            }
            onEdit={
              editCurrentPrice
            }
            onDelete={
              deleteCurrentPrice
            }
            onPriceUpdated={
              reloadGoldData
            }
          />
        </div>

        <LocalGoldChart
          activeGoldTab={
            activeGoldTab
          }
          setActiveGoldTab={
            setActiveGoldTab
          }
          chartRange={
            chartRange
          }
          setChartRange={
            setChartRange
          }
          priceChartData={
            priceChartData
          }
          theme={
            theme
          }
        />

        <WorldGoldComparison
          worldGold={
            worldGold
          }
          worldGoldLoading={
            worldGoldLoading
          }
          worldGoldError={
            worldGoldError
          }
          worldGoldMarketMessage={
            worldGoldMarketMessage
          }
          shopGold={
            shopGold
          }
          shopSellPriceVndPerLuong={
            shopSellPriceVndPerLuong
          }
          goldDifference={
            goldDifference
          }
          goldDifferencePercent={
            goldDifferencePercent
          }
        />

        <TransactionTable
          loading={
            loading
          }
          transactions={
            transactions
          }
          calculateTransactionResult={
            calculateTransactionResult
          }
          onEdit={
            editTransaction
          }
          onDelete={
            deleteTransaction
          }
        />

        {/*
       * Đây là lịch sử PNJ dùng chung.
       *
       * Không truyền onDelete vì người dùng
       * không được xóa dữ liệu thị trường chung.
       */}
        <PriceHistoryTable
          priceHistory={
            priceHistoryWithChanges
          }
          paginatedPriceHistory={
            paginatedPriceHistory
          }
          historyPage={
            historyPage
          }
          historyTotalPages={
            historyTotalPages
          }
          onPreviousPage={() =>
            setHistoryPage(
              (page) =>
                Math.max(
                  1,
                  page - 1
                )
            )
          }
          onNextPage={() =>
            setHistoryPage(
              (page) =>
                Math.min(
                  historyTotalPages,
                  page + 1
                )
            )
          }
        />

      </div>

      <ToastContainer
        toasts={
          toasts
        }
        onRemove={
          removeToast
        }
      />
      <Toast
        isOpen={toast.isOpen}
        title={toast.title}
        message={toast.message}
        type={toast.type}
        onClose={closeToast}
      />

      <ConfirmModal
        {...confirmModalProps}
      />
    </>
  );
}

export default App;