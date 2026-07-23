import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  supabase,
} from "../supabaseClient";

function getWorldGoldMarketStatus(
  date = new Date()
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "Asia/Ho_Chi_Minh",

        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }
    ).formatToParts(date);

  const values = {};

  for (const part of parts) {
    values[part.type] =
      part.value;
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

  const day =
    dayMap[values.weekday];

  const hour =
    Number(values.hour);

  const minute =
    Number(values.minute);

  const totalMinutes =
    hour * 60 + minute;

  const fourAM =
    4 * 60;

  const isClosed =
    day === 0 ||
    (
      day === 6 &&
      totalMinutes >= fourAM
    ) ||
    (
      day === 1 &&
      totalMinutes < fourAM
    );

  if (isClosed) {
    return {
      isOpen: false,

      message:
        "Thị trường vàng thế giới đang đóng cửa. " +
        "Thị trường hoạt động lại từ 04:00 sáng thứ Hai " +
        "đến 04:00 sáng thứ Bảy theo giờ Việt Nam.",
    };
  }

  return {
    isOpen: true,

    message:
      "Thị trường vàng thế giới hoạt động từ 04:00 sáng thứ Hai " +
      "đến 04:00 sáng thứ Bảy theo giờ Việt Nam.",
  };
}

function parsePositiveNumber(
  value
) {
  const numberValue =
    Number(value);

  if (
    !Number.isFinite(
      numberValue
    ) ||
    numberValue <= 0
  ) {
    return null;
  }

  return numberValue;
}

function useWorldGold() {
  const [
    worldGold,
    setWorldGold,
  ] = useState(null);

  const [
    worldGoldLoading,
    setWorldGoldLoading,
  ] = useState(false);

  const [
    worldGoldError,
    setWorldGoldError,
  ] = useState("");

  const [
    worldGoldMarketMessage,
    setWorldGoldMarketMessage,
  ] = useState("");

  const loadWorldGoldPrice =
    useCallback(async () => {
      const marketStatus =
        getWorldGoldMarketStatus();

      setWorldGoldMarketMessage(
        marketStatus.message
      );

      setWorldGoldError("");

      if (!marketStatus.isOpen) {
        setWorldGoldLoading(false);
        return;
      }

      try {
        setWorldGoldLoading(true);

        /*
         * Lấy giá vàng và tỷ giá
         * Vietcombank song song.
         */
        const [
          goldResponse,
          exchangeRateResult,
        ] = await Promise.all([
          fetch(
            `https://xaus.com/api/v1/spot?t=${Date.now()}`,
            {
              cache: "no-store",
            }
          ),

          supabase.functions.invoke(
            "vietcombank-exchange-rate",
            {
              body: {
                currencyCode:
                  "USD",
              },
            }
          ),
        ]);

        if (!goldResponse.ok) {
          throw new Error(
            "Không lấy được giá vàng thế giới."
          );
        }

        if (
          exchangeRateResult.error
        ) {
          throw new Error(
            exchangeRateResult
              .error
              .message ||
              "Không lấy được tỷ giá Vietcombank."
          );
        }

        const goldData =
          await goldResponse.json();

        const exchangeRateData =
          exchangeRateResult.data;

        const goldUsdOz =
          parsePositiveNumber(
            goldData.spot_usd_oz ??
              goldData.price ??
              goldData.gold_price ??
              goldData.data
                ?.spot_usd_oz ??
              goldData.data?.price
          );

        /*
         * Dùng giá bán USD của
         * Vietcombank để quy đổi
         * từ USD sang VND.
         */
        const usdVnd =
          parsePositiveNumber(
            exchangeRateData?.sell
          );

        if (!goldUsdOz) {
          throw new Error(
            "Giá vàng thế giới không hợp lệ."
          );
        }

        if (!usdVnd) {
          throw new Error(
            "Tỷ giá bán USD của Vietcombank không hợp lệ."
          );
        }

        const gramPerOunce =
          31.1035;

        const gramPerLuong =
          37.5;

        const worldGoldVndPerLuong =
          goldUsdOz *
          usdVnd *
          (
            gramPerLuong /
            gramPerOunce
          );

        setWorldGold({
          goldUsdOz,

          usdVnd,

          exchangeRateType:
            "sell",

          exchangeRateSource:
            "Vietcombank",

          exchangeRateUpdatedAt:
            exchangeRateData
              ?.updatedAt ??
            null,

          buyCash:
            parsePositiveNumber(
              exchangeRateData
                ?.buyCash
            ),

          buyTransfer:
            parsePositiveNumber(
              exchangeRateData
                ?.buyTransfer
            ),

          sell:
            usdVnd,

          worldGoldVndPerLuong,

          updatedAt:
            goldData.updated_at ||
            goldData.timestamp ||
            goldData.data
              ?.updated_at ||
            new Date()
              .toISOString(),
        });
      } catch (error) {
        console.error(
          "loadWorldGoldPrice:",
          error
        );

        setWorldGoldError(
          error?.message ||
            "Không thể cập nhật giá vàng thế giới."
        );
      } finally {
        setWorldGoldLoading(
          false
        );
      }
    }, []);

  useEffect(() => {
    loadWorldGoldPrice();

    const timer =
      window.setInterval(() => {
        if (
          document
            .visibilityState ===
          "visible"
        ) {
          loadWorldGoldPrice();
        }
      }, 60 * 1000);

    function handleVisibilityChange() {
      if (
        document
          .visibilityState ===
        "visible"
      ) {
        loadWorldGoldPrice();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.clearInterval(
        timer
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [loadWorldGoldPrice]);

  return {
    worldGold,
    worldGoldLoading,
    worldGoldError,
    worldGoldMarketMessage,

    reloadWorldGold:
      loadWorldGoldPrice,
  };
}

export default useWorldGold;