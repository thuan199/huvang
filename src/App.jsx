import './App.css';

import {
  createGoldTransaction,
  updateGoldTransaction,
  deleteGoldTransaction,
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
import ToastContainer from './components/ToastContainer';
import ConfirmModal from './components/ConfirmModal';
import PublicChat from './components/public-chat/PublicChat';
import AIChatPage from "./components/ai-chat/AIChatPage";
import MarketNews from "./components/market-news/MarketNews";
import { supabase } from './supabaseClient';


import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  BadgeDollarSign,
  ChartNoAxesCombined,
  CirclePlus,
  Globe2,
  History,
  Newspaper,
  ReceiptText,
  Wallet,
} from 'lucide-react';

import useGoldSummary from './hooks/useGoldSummary';
import useWorldGold from './hooks/useWorldGold';
import usePriceChartData from './hooks/usePriceChartData';
import useToast from './hooks/useToast';
import useConfirm from './hooks/useConfirm';

const MOBILE_TABS = [
  {
    id: 'assets',
    label: 'Tài sản',
    icon: Wallet,
  },
  {
    id: 'add-transaction',
    label: 'Thêm mới',
    icon: CirclePlus,
  },
  {
    id: 'current-price',
    label: 'Giá vàng',
    icon: BadgeDollarSign,
  },
  {
    id: 'transactions',
    label: 'Giao dịch',
    icon: ReceiptText,
  },
  {
    id: 'store-history',
    label: 'Lịch sử giá',
    icon: History,
  },
  {
    id: 'charts',
    label: 'Biểu đồ',
    icon: ChartNoAxesCombined,
  },
  {
    id: 'world-gold',
    label: 'Thế giới',
    icon: Globe2,
  },
  {
    id: 'news',
    label: 'Tin tức',
    icon: Newspaper,
  },
];

function App() {
  const [
    toast,
    setToast,
  ] = useState({
    isOpen: false,
    message: "",
    type: "success",
  });

  const [
    helpOpen,
    setHelpOpen,
  ] = useState(false);

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

  const appHeaderRef =
    useRef(null);

  const [
    appHeaderHeight,
    setAppHeaderHeight,
  ] = useState(0);

  const [
    activeGoldTab,
    setActiveGoldTab,
  ] = useState('local');

  const [
    activeMobileTab,
    setActiveMobileTab,
  ] = useState('assets');

  const [
    isMobileView,
    setIsMobileView,
  ] = useState(() =>
    window.matchMedia(
      '(max-width: 768px)'
    ).matches
  );

  useEffect(() => {
    const mediaQuery =
      window.matchMedia(
        '(max-width: 768px)'
      );

    function handleViewportChange(
      event
    ) {
      setIsMobileView(
        event.matches
      );
    }

    setIsMobileView(
      mediaQuery.matches
    );

    mediaQuery.addEventListener(
      'change',
      handleViewportChange
    );

    return () => {
      mediaQuery.removeEventListener(
        'change',
        handleViewportChange
      );
    };
  }, []);

  useEffect(() => {
    const headerElement =
      appHeaderRef.current;

    if (!headerElement) {
      return undefined;
    }

    function updateHeaderHeight() {
      setAppHeaderHeight(
        headerElement.getBoundingClientRect().height
      );
    }

    updateHeaderHeight();

    const resizeObserver =
      new ResizeObserver(
        updateHeaderHeight
      );

    resizeObserver.observe(
      headerElement
    );

    window.addEventListener(
      "resize",
      updateHeaderHeight
    );

    return () => {
      resizeObserver.disconnect();

      window.removeEventListener(
        "resize",
        updateHeaderHeight
      );
    };
  }, []);


  /*
   * Nguồn đang được chọn trong thẻ lịch sử giá cửa hàng.
   * Hiện tại hệ thống mới có dữ liệu PNJ.
   * Hai tab SJC và Mi Hồng sẽ hiển thị rỗng cho đến khi
   * có Edge Function đồng bộ tương ứng.
   */
  const [
    activeHistorySource,
    setActiveHistorySource,
  ] = useState('PNJ');

  /*
   * Điều hướng nội bộ:
   * - home: giao diện Hũ vàng hiện tại.
   * - chat: khung trò chuyện cộng đồng.
   */
  const [
    activePage,
    setActivePage,
  ] = useState('home');

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
    marketCurrentPrices = [],
    marketPriceHistory = [],
    currentPricesBySource = {},
    priceHistoryBySource = {},
    pnjCurrentPrice,
    pnjPriceHistory = [],
    loading,
    error: goldDataError,
    reloadGoldData,
  } = useGoldData(user?.id);

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
      item?.source
    );
  }

  function getItemProductName(item) {
    const nestedProduct =
      Array.isArray(item?.source_product)
        ? item.source_product[0]
        : item?.source_product;

    const joinedProduct =
      Array.isArray(item?.gold_source_products)
        ? item.gold_source_products[0]
        : item?.gold_source_products;

    const nestedGoldType =
      Array.isArray(item?.gold_type)
        ? item.gold_type[0]
        : item?.gold_type;

    return (
      item?.product_name ??
      item?.source_product_name ??
      nestedProduct?.product_name ??
      nestedProduct?.name ??
      joinedProduct?.product_name ??
      joinedProduct?.name ??
      item?.gold_type_name ??
      nestedGoldType?.name ??
      item?.gold_type ??
      ''
    );
  }

  const allShopPriceHistory = useMemo(() => {
    if (
      Array.isArray(marketPriceHistory) &&
      marketPriceHistory.length > 0
    ) {
      return marketPriceHistory;
    }

    return Array.isArray(pnjPriceHistory)
      ? pnjPriceHistory.map((item) => ({
        ...item,
        source_code:
          item.source_code ??
          'PNJ',
      }))
      : [];
  }, [
    marketPriceHistory,
    pnjPriceHistory,
  ]);

  /*
   * Tính tăng/giảm cho toàn bộ lịch sử của tất cả nguồn.
   * CurrentPriceForm dùng dữ liệu này thay vì localStorage.
   */
  const allShopPriceHistoryWithChanges =
    useMemo(() => {
      const rows = Array.isArray(
        allShopPriceHistory
      )
        ? allShopPriceHistory
        : [];

      const groups = new Map();

      rows.forEach((item) => {
        const sourceCode =
          getItemSourceCode(item);

        const productName =
          normalizeProductName(
            getItemProductName(item)
          );

        const groupKey = [
          sourceCode,
          productName,
        ].join("|");

        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }

        groups.get(groupKey).push(item);
      });

      const result = [];

      groups.forEach((groupRows) => {
        const sortedRows = [
          ...groupRows,
        ].sort((first, second) => {
          const firstDate =
            first.source_updated_at ??
            first.recorded_at ??
            first.fetched_at ??
            first.updated_at ??
            first.created_at;

          const secondDate =
            second.source_updated_at ??
            second.recorded_at ??
            second.fetched_at ??
            second.updated_at ??
            second.created_at;

          return (
            new Date(firstDate).getTime() -
            new Date(secondDate).getTime()
          );
        });

        sortedRows.forEach(
          (item, index) => {
            const previousItem =
              index > 0
                ? sortedRows[index - 1]
                : null;

            const currentBuyPrice =
              Number(
                item.buy_price ??
                item.price_per_chi ??
                item.new_buy_price_per_chi ??
                item.buy_price_per_chi ??
                0
              );

            const currentSellPrice =
              Number(
                item.sell_price ??
                item.sell_price_per_chi ??
                item.new_sell_price_per_chi ??
                0
              );

            const previousBuyPrice =
              previousItem
                ? Number(
                    previousItem.buy_price ??
                    previousItem.price_per_chi ??
                    previousItem
                      .new_buy_price_per_chi ??
                    previousItem
                      .buy_price_per_chi ??
                    0
                  )
                : null;

            const previousSellPrice =
              previousItem
                ? Number(
                    previousItem.sell_price ??
                    previousItem
                      .sell_price_per_chi ??
                    previousItem
                      .new_sell_price_per_chi ??
                    0
                  )
                : null;

            result.push({
              ...item,
              source_code:
                getItemSourceCode(item),

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
            });
          }
        );
      });

      return result.sort(
        (first, second) => {
          const firstDate =
            first.source_updated_at ??
            first.recorded_at ??
            first.fetched_at ??
            first.updated_at ??
            first.created_at;

          const secondDate =
            second.source_updated_at ??
            second.recorded_at ??
            second.fetched_at ??
            second.updated_at ??
            second.created_at;

          return (
            new Date(secondDate).getTime() -
            new Date(firstDate).getTime()
          );
        }
      );
    }, [
      allShopPriceHistory,
    ]);

  const priceHistory = useMemo(() => {
    const selectedSource =
      normalizeSourceCode(
        activeHistorySource
      );

    const groupedRows =
      priceHistoryBySource?.[
      selectedSource
      ];

    if (
      Array.isArray(groupedRows) &&
      groupedRows.length > 0
    ) {
      return groupedRows;
    }

    return allShopPriceHistory.filter(
      (item) =>
        getItemSourceCode(item) ===
        selectedSource
    );
  }, [
    activeHistorySource,
    allShopPriceHistory,
    priceHistoryBySource,
  ]);

  const shopGold = useMemo(() => {
    const currentPnjPrice =
      (
        Array.isArray(marketCurrentPrices)
          ? marketCurrentPrices
          : []
      ).find(
        (item) =>
          getItemSourceCode(item) ===
          'PNJ'
      ) ??
      pnjCurrentPrice ??
      null;

    if (!currentPnjPrice) {
      return null;
    }

    const buyPricePerChi = Number(
      currentPnjPrice.buy_price ??
      currentPnjPrice.buy_price_per_chi ??
      currentPnjPrice.current_price_per_chi ??
      currentPnjPrice.price_per_chi ??
      0
    );

    const sellPricePerChi = Number(
      currentPnjPrice.sell_price ??
      currentPnjPrice.sell_price_per_chi ??
      0
    );

    return {
      ...currentPnjPrice,
      source_code: 'PNJ',
      source: 'PNJ',
      current_price_per_chi:
        buyPricePerChi,
      price_per_chi:
        buyPricePerChi,
      buy_price_per_chi:
        buyPricePerChi,
      sell_price_per_chi:
        sellPricePerChi,
    };
  }, [
    marketCurrentPrices,
    pnjCurrentPrice,
  ]);

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
          setActivePage('home');
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
    setActivePage('home');

    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      // Không thay đổi savedTheme.
      // Không xóa app-theme.
      // Khi user trở thành null,
      // displayTheme tự chuyển sang light.

      setUser(null);
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
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
    marketCurrentPrices
  );

  const [historyPage, setHistoryPage] =
    useState(1);

  /*
   * Khi đổi nguồn giá, quay lại trang đầu tiên.
   */
  useEffect(() => {
    setHistoryPage(1);
  }, [activeHistorySource]);

  const historyPageSize = 10;

  /*
   * Lịch sử của nguồn đang chọn đã được tính tăng/giảm
   * từ allShopPriceHistoryWithChanges.
   */
  const priceHistoryWithChanges =
    useMemo(() => {
      const selectedSource =
        normalizeSourceCode(
          activeHistorySource
        );

      return allShopPriceHistoryWithChanges
        .filter(
          (item) =>
            getItemSourceCode(item) ===
            selectedSource
        );
    }, [
      activeHistorySource,
      allShopPriceHistoryWithChanges,
    ]);

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

  const [
    savedTheme,
    setSavedTheme,
  ] = useState("light");

  const displayTheme =
    user ? savedTheme : "light";

  /*
   * Khi user đăng nhập hoặc chuyển tài khoản,
   * lấy theme riêng của tài khoản đó.
   */
  useEffect(() => {
    if (!user?.id) {
      setSavedTheme("light");
      return;
    }

    const themeKey =
      `app-theme-${user.id}`;

    const userTheme =
      localStorage.getItem(themeKey) ||
      "light";

    setSavedTheme(userTheme);
  }, [user?.id]);

  /*
   * Áp dụng theme lên giao diện.
   * Khi đăng xuất, displayTheme luôn là light.
   */
  useEffect(() => {
    document.body.classList.toggle(
      "dark-theme",
      displayTheme === "dark"
    );

    document.body.classList.toggle(
      "light-theme",
      displayTheme === "light"
    );
  }, [displayTheme]);

  function handleToggleTheme() {
    if (!user?.id) {
      return;
    }

    setSavedTheme(
      (currentTheme) => {
        const nextTheme =
          currentTheme === "dark"
            ? "light"
            : "dark";

        const themeKey =
          `app-theme-${user.id}`;

        localStorage.setItem(
          themeKey,
          nextTheme
        );

        return nextTheme;
      }
    );
  }


  const {
    worldGold,
    worldGoldLoading,
    worldGoldError,
    worldGoldMarketMessage,
  } = useWorldGold();

  const defaultTransactionForm = {
    transaction_type: 'BUY',
    source_code: 'PNJ',
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

  const [
    transactionForm,
    setTransactionForm,
  ] = useState(
    defaultTransactionForm
  );

  /*
   * Ghi nhớ cửa hàng + loại vàng đã được tự động nạp giá.
   * Mục đích:
   * - Đổi cửa hàng/loại vàng: tự lấy giá hiện hành.
   * - Người dùng sửa giá trên form: không tự ghi đè lại.
   * - Dữ liệu giá thị trường refresh: không làm mất giá nhập tay.
   */
  const lastAutoBuybackSelectionRef =
    useRef("");

  function getCurrentBuybackPrice(
    sourceCode,
    goldType
  ) {
    const normalizedSource =
      normalizeSourceCode(sourceCode);

    const normalizedGoldType =
      normalizeProductName(goldType);

    const sourceRows =
      (
        Array.isArray(marketCurrentPrices)
          ? marketCurrentPrices
          : []
      ).filter(
        (item) =>
          getItemSourceCode(item) ===
          normalizedSource
      );

    const exactRow = sourceRows.find(
      (item) =>
        normalizeProductName(
          getItemProductName(item)
        ) === normalizedGoldType
    );

    const aliasBySource = {
      PNJ: [
        'nhan 9999',
        'nhan tron 9999',
        'vang nhan 9999',
      ],
      MI_HONG: [
        'vang 999',
        'vang 999 9',
        'vang nhan 999',
      ],
      SJC: [
        'nhan sjc',
        'vang nhan sjc',
        'vang mieng sjc',
      ],
    };

    const aliases =
      aliasBySource[normalizedSource] ??
      [];

    const aliasRow = sourceRows.find(
      (item) =>
        aliases.some(
          (alias) =>
            normalizeProductName(
              getItemProductName(item)
            ).includes(alias)
        )
    );

    const matchedMarketPrice =
      exactRow ??
      aliasRow ??
      sourceRows.find(
        (item) =>
          Number(
            item.buy_price ??
            item.buy_price_per_chi ??
            item.current_price_per_chi ??
            item.price_per_chi ??
            0
          ) > 0
      );

    return Number(
      matchedMarketPrice?.buy_price ??
      matchedMarketPrice
        ?.buy_price_per_chi ??
      matchedMarketPrice
        ?.current_price_per_chi ??
      matchedMarketPrice?.price_per_chi ??
      0
    );
  }

  useEffect(() => {
    const selectionKey = [
      normalizeSourceCode(
        transactionForm.source_code
      ),
      normalizeProductName(
        transactionForm.gold_type
      ),
    ].join("|");

    const selectionChanged =
      lastAutoBuybackSelectionRef.current !==
      selectionKey;

    /*
     * Cập nhật key ngay cả khi dữ liệu giá chưa tải xong.
     * Khi marketCurrentPrices tải xong, ô giá vẫn được nạp
     * nếu hiện tại đang trống.
     */
    lastAutoBuybackSelectionRef.current =
      selectionKey;

    /*
     * Khi đang chỉnh sửa giao dịch cũ, luôn giữ nguyên
     * giá đã lưu trong giao dịch.
     */
    if (editingId) {
      return;
    }

    const existingSellPrice = Number(
      transactionForm.sell_price_per_chi ||
      0
    );

    /*
     * Nếu người dùng không đổi cửa hàng/loại vàng
     * và ô giá đã có dữ liệu, xem đó là giá người dùng
     * đang sử dụng. Không ghi đè bằng giá hiện hành.
     */
    if (
      !selectionChanged &&
      existingSellPrice > 0
    ) {
      return;
    }

    const currentBuybackPrice =
      getCurrentBuybackPrice(
        transactionForm.source_code,
        transactionForm.gold_type
      );

    if (
      !currentBuybackPrice ||
      currentBuybackPrice <= 0
    ) {
      return;
    }

    const nextSellPrice =
      String(currentBuybackPrice);

    setTransactionForm(
      (currentForm) => {
        if (
          currentForm.sell_price_per_chi ===
          nextSellPrice
        ) {
          return currentForm;
        }

        return {
          ...currentForm,
          sell_price_per_chi:
            nextSellPrice,
        };
      }
    );
  }, [
    editingId,
    transactionForm.source_code,
    transactionForm.gold_type,
    marketCurrentPrices,
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
      transaction_type: transactionForm.transaction_type,
      gold_name: transactionForm.gold_type.trim(),
      quantity_chi: quantity,
      unit_price: price,
      sell_price_per_chi:
        sellPrice,
      source_code:
        transactionForm.source_code,
      fee_amount: 0,
      total_amount: quantity * price,
      transaction_date: transactionForm.transaction_date,
      seller_name: transactionForm.location.trim() || null,
      note: transactionForm.note.trim() || null,
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

      const defaultBuybackPrice =
        getCurrentBuybackPrice(
          defaultTransactionForm.source_code,
          defaultTransactionForm.gold_type
        );

      setTransactionForm({
        ...defaultTransactionForm,

        sell_price_per_chi:
          defaultBuybackPrice > 0
            ? String(defaultBuybackPrice)
            : "",
      });

      lastAutoBuybackSelectionRef.current = [
        normalizeSourceCode(
          defaultTransactionForm.source_code
        ),
        normalizeProductName(
          defaultTransactionForm.gold_type
        ),
      ].join("|");

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

      source_code:
        tx.source_code ??
        tx.market_source_code ??
        'PNJ',

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

    if (isMobileView) {
      setActiveMobileTab(
        'add-transaction'
      );
    }

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

    const defaultBuybackPrice =
      getCurrentBuybackPrice(
        defaultTransactionForm.source_code,
        defaultTransactionForm.gold_type
      );

    setTransactionForm({
      ...defaultTransactionForm,

      sell_price_per_chi:
        defaultBuybackPrice > 0
          ? String(defaultBuybackPrice)
          : "",
    });

    lastAutoBuybackSelectionRef.current = [
      normalizeSourceCode(
        defaultTransactionForm.source_code
      ),
      normalizeProductName(
        defaultTransactionForm.gold_type
      ),
    ].join("|");

    setMessage('');
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

  function renderPriceHistoryTable() {
    return (
      <PriceHistoryTable
        activeSource={activeHistorySource}
        onSourceChange={
          setActiveHistorySource
        }
        priceHistory={
          priceHistory
        }
        paginatedPriceHistory={
          paginatedPriceHistory
        }
        historyPage={historyPage}
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
    );
  }

  function renderLocalGoldChart() {
    return (
      <LocalGoldChart
        activeGoldTab={activeGoldTab}
        setActiveGoldTab={
          setActiveGoldTab
        }
        activeHistorySource={
          activeHistorySource
        }
        setActiveHistorySource={
          setActiveHistorySource
        }
        chartRange={chartRange}
        setChartRange={
          setChartRange
        }
        priceChartData={
          priceChartData
        }
        theme={displayTheme}
      />
    );
  }

  function renderWorldGoldComparison() {
    return (
      <WorldGoldComparison
        worldGold={worldGold}
        worldGoldLoading={
          worldGoldLoading
        }
        worldGoldError={
          worldGoldError
        }
        worldGoldMarketMessage={
          worldGoldMarketMessage
        }
        shopGold={shopGold}
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
    );
  }

  function renderMobileHomeContent() {
    switch (activeMobileTab) {
      case 'assets':
        return (
          <section className="mobile-tab-panel">
            <SummaryCards
              summary={summary}
            />
          </section>
        );

      case 'add-transaction':
        return (
          <section className="mobile-tab-panel">


            <TransactionForm
              editingId={editingId}
              transactionForm={
                transactionForm
              }
              setTransactionForm={
                setTransactionForm
              }
              marketCurrentPrices={
                marketCurrentPrices
              }
              onSubmit={
                saveTransaction
              }
              onCancel={
                cancelEdit
              }
            />
          </section>
        );

      case 'current-price':
        return (
          <section className="mobile-tab-panel">


            <CurrentPriceForm
              prices={
                marketCurrentPrices
              }
              priceHistory={
                allShopPriceHistoryWithChanges
              }
              onPriceUpdated={
                reloadGoldData
              }
            />
          </section>
        );

      case 'transactions':
        return (
          <section className="mobile-tab-panel">


            <TransactionTable
              loading={loading}
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
          </section>
        );

      case 'store-history':
        return (
          <section className="mobile-tab-panel">


            {renderPriceHistoryTable()}
          </section>
        );

      case 'charts':
        return (
          <section className="mobile-tab-panel">


            {renderLocalGoldChart()}
          </section>
        );

      case 'world-gold':
        return (
          <section className="mobile-tab-panel">


            {renderWorldGoldComparison()}
          </section>
        );

      case 'news':
        return (
          <section className="mobile-tab-panel">


            <MarketNews />
          </section>
        );

      default:
        return null;
    }
  }

  function handleMobileTabChange(
    tabId
  ) {
    setActiveMobileTab(tabId);

    // Khi người dùng chọn tab mobile,
    // tự động đóng cửa sổ Help.
    setHelpOpen(false);

    window.requestAnimationFrame(
      () => {
        const activeButton =
          document.querySelector(
            `[data-mobile-tab="${tabId}"]`
          );

        activeButton?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

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
      <div
        ref={appHeaderRef}
        className="app-header-fixed"
      >
        <div className="container app-header-fixed__inner">
          <AppHeader
          user={user}
          theme={displayTheme}
          isAdmin={isAdmin}
          activePage={activePage}
          helpOpen={helpOpen}
          onOpenHelp={() =>
            setHelpOpen(true)
          }
          onCloseHelp={() =>
            setHelpOpen(false)
          }
          onChangePage={(page) => {
            setActivePage(page);

            setActiveAdminPanel(null);

            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }}
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
          onPasswordChanged={(
            successMessage
          ) => {
            setMessageType("success");
            setMessage(successMessage);
          }}
          onAvatarChanged={(
            updatedUser
          ) => {
            setUser(updatedUser);

            setMessageType("success");
            setMessage(
              "Đã cập nhật ảnh đại diện."
            );
          }}
          onLogout={handleLogout}
          onToggleTheme={
            handleToggleTheme
          }
        />
        </div>
      </div>

      <div
        className="container"
        style={{
          paddingTop:
            appHeaderHeight,
        }}
      >
        <ChangeDisplayNameModal
          isOpen={isDisplayNameOpen}
          currentName={
            user?.user_metadata
              ?.display_name ||
            user?.user_metadata
              ?.full_name ||
            user?.user_metadata
              ?.name ||
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
          activeAdminPanel ===
          "maintenance" && (
            <div className="maintenance-admin-area">
              <MaintenanceControl
                maintenance={
                  maintenance
                }
                reloadMaintenance={
                  reloadMaintenance
                }
                onClose={() =>
                  setActiveAdminPanel(
                    null
                  )
                }
              />
            </div>
          )}

        {isAdmin &&
          activeAdminPanel ===
          "users" && (
            <AdminUserManager
              confirm={confirm}
              showToast={showToast}
              onClose={() =>
                setActiveAdminPanel(
                  null
                )
              }
            />
          )}

        {!helpOpen && (
          activePage === "home" ? (
          <>
            {isMobileView ? (
              <main className="mobile-app-content">
                {renderMobileHomeContent()}
              </main>
            ) : (
              <main className="desktop-app-content">
                <SummaryCards
                  summary={summary}
                />

                <div className="grid">
                  <TransactionForm
                    editingId={editingId}
                    transactionForm={
                      transactionForm
                    }
                    setTransactionForm={
                      setTransactionForm
                    }
                    marketCurrentPrices={
                      marketCurrentPrices
                    }
                    onSubmit={
                      saveTransaction
                    }
                    onCancel={
                      cancelEdit
                    }
                  />

                  <CurrentPriceForm
                    prices={
                      marketCurrentPrices
                    }
                    priceHistory={
                      allShopPriceHistoryWithChanges
                    }
                    onPriceUpdated={
                      reloadGoldData
                    }
                  />
                </div>

                <TransactionTable
                  loading={loading}
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

                {renderPriceHistoryTable()}

                {renderLocalGoldChart()}

                {renderWorldGoldComparison()}

                <MarketNews />
              </main>
            )}
          </>
        ) : activePage ===
          "ai-chat" ? (
          <AIChatPage
            theme={displayTheme}
          />
        ) : activePage === "chat" ? (
          <div
            style={{
              width: "100%",
              minWidth: 0,
            }}
          >
            <PublicChat />
          </div>
        ) : null
        )}
      </div>

      {activePage === 'home' &&
        isMobileView &&
        !helpOpen && (
          <nav
            className="mobile-bottom-tabs"
            aria-label="Điều hướng ứng dụng"
          >
            {MOBILE_TABS.map(
              ({
                id,
                label,
                icon: Icon,
              }) => {
                const isActive =
                  activeMobileTab ===
                  id;

                return (
                  <button
                    key={id}
                    type="button"
                    data-mobile-tab={id}
                    className={`mobile-bottom-tab ${isActive
                        ? 'is-active'
                        : ''
                      }`}
                    onClick={() =>
                      handleMobileTabChange(
                        id
                      )
                    }
                    aria-current={
                      isActive
                        ? 'page'
                        : undefined
                    }
                    title={label}
                  >
                    <Icon size={21} />

                    <span>
                      {label}
                    </span>
                  </button>
                );
              }
            )}
          </nav>
        )}

      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
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