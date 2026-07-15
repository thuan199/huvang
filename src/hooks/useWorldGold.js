import { useEffect, useState } from 'react';

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

function useWorldGold() {
  const [worldGold, setWorldGold] = useState(null);
  const [worldGoldLoading, setWorldGoldLoading] = useState(false);
  const [worldGoldError, setWorldGoldError] = useState('');
  const [worldGoldMarketMessage, setWorldGoldMarketMessage] =
    useState('');

  async function loadWorldGoldPrice() {
    const marketStatus = getWorldGoldMarketStatus();

    setWorldGoldMarketMessage(marketStatus.message);
    setWorldGoldError('');

    if (!marketStatus.isOpen) {
      setWorldGoldLoading(false);
      return;
    }

    try {
      setWorldGoldLoading(true);

      const [goldResponse, exchangeRateResponse] =
        await Promise.all([
          fetch(
            `https://xaus.com/api/v1/spot?t=${Date.now()}`
          ),
          fetch(
            'https://open.er-api.com/v6/latest/USD'
          ),
        ]);

      if (
        !goldResponse.ok ||
        !exchangeRateResponse.ok
      ) {
        throw new Error(
          'Không lấy được dữ liệu giá vàng thế giới hoặc tỷ giá.'
        );
      }

      const goldData = await goldResponse.json();
      const exchangeRateData =
        await exchangeRateResponse.json();

      const goldUsdOz = Number(
        goldData.spot_usd_oz ??
          goldData.price ??
          goldData.gold_price ??
          goldData.data?.spot_usd_oz ??
          goldData.data?.price
      );

      const usdVnd = Number(
        exchangeRateData.rates?.VND
      );

      if (!goldUsdOz || !usdVnd) {
        throw new Error(
          'Dữ liệu giá vàng thế giới hoặc tỷ giá không hợp lệ.'
        );
      }

      const gramPerOunce = 31.1035;
      const gramPerLuong = 37.5;

      const worldGoldVndPerLuong =
        goldUsdOz *
        usdVnd *
        (gramPerLuong / gramPerOunce);

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
        error?.message ||
          'Không thể cập nhật giá vàng thế giới.'
      );
    } finally {
      setWorldGoldLoading(false);
    }
  }

  useEffect(() => {
    loadWorldGoldPrice();

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadWorldGoldPrice();
      }
    }, 60 * 1000);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        loadWorldGoldPrice();
      }
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );

    return () => {
      clearInterval(timer);

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );
    };
  }, []);

  return {
    worldGold,
    worldGoldLoading,
    worldGoldError,
    worldGoldMarketMessage,
    reloadWorldGold: loadWorldGoldPrice,
  };
}

export default useWorldGold;