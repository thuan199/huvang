import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "../supabaseClient";

const banks = [
  {
    id: "vietcombank",
    name: "Vietcombank",
  },
  {
    id: "bidv",
    name: "BIDV",
  },
  {
    id: "techcombank",
    name: "Techcombank",
  },
  {
    id: "vpbank",
    name: "VPBank",
  },
  {
    id: "agribank",
    name: "Agribank",
  },
  {
    id: "mbbank",
    name: "MBBank",
  },
  {
    id: "acb",
    name: "ACB",
  },
  {
    id: "vib",
    name: "VIB",
  },
  {
    id: "sacombank",
    name: "Sacombank",
  },
];

function formatNumber(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return "-";
  }

  return new Intl.NumberFormat(
    "vi-VN",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  ).format(number);
}

function formatDateTime(
  value
) {
  if (!value) {
    return "--/--/---- --:--:--";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(date);
}

function RateValue({
  value,
}) {
  return (
    <div className="exchange-rate-value">
      <strong>
        {formatNumber(value)}
      </strong>
    </div>
  );
}

function ExchangeRatePage() {
  const [
    activeBank,
    setActiveBank,
  ] = useState(
    "vietcombank"
  );

  const [
    bankResults,
    setBankResults,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    fetchedAt,
    setFetchedAt,
  ] = useState(null);

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const loadExchangeRates =
    useCallback(
      async (
        isRefresh = false
      ) => {
        try {
          if (isRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          const {
            data,
            error:
              functionError,
          } =
            await supabase
              .functions
              .invoke(
                "get-exchange-rates",
                {
                  method: "GET",
                }
              );

          if (functionError) {
            throw functionError;
          }

          if (
            !Array.isArray(
              data?.banks
            )
          ) {
            throw new Error(
              "Dữ liệu tỷ giá trả về không hợp lệ."
            );
          }

          setBankResults(
            data.banks
          );

          setFetchedAt(
            data.fetchedAt ??
            new Date()
              .toISOString()
          );
        } catch (
          loadError
        ) {
          console.error(
            "Lỗi tải tỷ giá:",
            loadError
          );

          setError(
            loadError?.message ||
            "Không thể tải tỷ giá ngoại tệ."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    loadExchangeRates();
  }, [loadExchangeRates]);

  const activeBankInfo =
    useMemo(
      () =>
        banks.find(
          (bank) =>
            bank.id ===
            activeBank
        ) ?? banks[0],
      [activeBank]
    );

  const activeBankResult =
    useMemo(
      () =>
        bankResults.find(
          (bank) =>
            bank.bankCode ===
            activeBank
        ) ?? null,
      [
        bankResults,
        activeBank,
      ]
    );

  const rates =
    useMemo(
      () =>
        Array.isArray(
          activeBankResult
            ?.rates
        )
          ? activeBankResult
              .rates
          : [],
      [activeBankResult]
    );

  const filteredRates =
    useMemo(
      () => {
        const keyword =
          searchText
            .trim()
            .toLowerCase();

        if (!keyword) {
          return rates;
        }

        return rates.filter(
          (item) =>
            String(
              item.code ?? ""
            )
              .toLowerCase()
              .includes(keyword) ||

            String(
              item.name ?? ""
            )
              .toLowerCase()
              .includes(keyword)
        );
      },
      [
        rates,
        searchText,
      ]
    );

  const updatedTime =
    activeBankResult
      ?.updatedAt ??
    fetchedAt;

  const hasBankError =
    activeBankResult
      ?.status === "error";

  function selectBank(
    bankId
  ) {
    setActiveBank(bankId);
    setSearchText("");
  }

  return (
    <section className="exchange-page">
      <div className="exchange-heading">
        <div>
          <h2>
            Tỷ Giá Ngoại Tệ Hôm Nay
          </h2>

          <p>
            Tỷ giá mua và bán ngoại tệ tại các ngân hàng Việt Nam
          </p>
        </div>

        <button
          type="button"
          className="exchange-refresh-button"
          disabled={
            loading ||
            refreshing
          }
          onClick={() =>
            loadExchangeRates(
              true
            )
          }
        >
          {refreshing
            ? "Đang cập nhật..."
            : "Cập nhật tỷ giá"}
        </button>
      </div>

      <div className="exchange-bank-tabs">
        {banks.map(
          (bank) => (
            <button
              key={bank.id}
              type="button"
              className={
                activeBank ===
                bank.id
                  ? "exchange-bank-tab exchange-bank-tab--active"
                  : "exchange-bank-tab"
              }
              onClick={() =>
                selectBank(
                  bank.id
                )
              }
            >
              {bank.name}
            </button>
          )
        )}
      </div>

      <div className="exchange-toolbar">
        <div className="exchange-bank-title">
          <strong>
            {activeBankInfo.name}
          </strong>

          <span>
            {rates.length} ngoại tệ
          </span>
        </div>

        <label className="exchange-search">
          <span>
            Tìm ngoại tệ
          </span>

          <input
            type="search"
            value={searchText}
            placeholder="USD, EUR, JPY..."
            onChange={(
              event
            ) =>
              setSearchText(
                event.target
                  .value
              )
            }
          />
        </label>
      </div>

      <div className="exchange-meta-card">
        <div className="exchange-meta-row">
          <div className="exchange-updated">
            <span
              className={
                hasBankError
                  ? "exchange-status-dot exchange-status-dot--error"
                  : "exchange-status-dot"
              }
            />

            <strong>
              {formatDateTime(
                updatedTime
              )}
            </strong>
          </div>

          <span className="exchange-unit">
            Đơn vị: VND/ngoại tệ
          </span>
        </div>

        <div className="exchange-table-header">
          <span>
            Ngoại tệ
          </span>

          <span>
            Bán ra
          </span>

          <span>
            Mua CK
          </span>

          <span>
            Mua TM
          </span>
        </div>
      </div>

      <div className="exchange-table-card">
        {loading ? (
          <div className="exchange-loading">
            Đang tải tỷ giá ngoại tệ...
          </div>
        ) : error ? (
          <div className="exchange-error">
            <strong>
              Không thể tải tỷ giá
            </strong>

            <p>
              {error}
            </p>

            <button
              type="button"
              className="exchange-retry-button"
              onClick={() =>
                loadExchangeRates()
              }
            >
              Thử lại
            </button>
          </div>
        ) : !activeBankResult ? (
          <div className="exchange-empty">
            Không tìm thấy dữ liệu của{" "}
            {activeBankInfo.name}.
          </div>
        ) : hasBankError ? (
          <div className="exchange-error">
            <strong>
              Không lấy được tỷ giá từ{" "}
              {activeBankInfo.name}
            </strong>

            <p>
              {activeBankResult
                .error ||
                "Nguồn dữ liệu của ngân hàng hiện không phản hồi."}
            </p>

            <button
              type="button"
              className="exchange-retry-button"
              onClick={() =>
                loadExchangeRates(
                  true
                )
              }
            >
              Tải lại
            </button>
          </div>
        ) : filteredRates.length ===
          0 ? (
          <div className="exchange-empty">
            Không tìm thấy ngoại tệ phù hợp.
          </div>
        ) : (
          <>
            <div className="exchange-desktop-table">
              {filteredRates.map(
                (
                  item,
                  index
                ) => (
                  <div
                    key={`${item.code}-${index}`}
                    className="exchange-row"
                  >
                    <div className="exchange-currency">
                      <strong>
                        {item.code}
                      </strong>

                      <span>
                        {item.name}
                      </span>
                    </div>

                    <RateValue
                      value={
                        item.sell
                      }
                    />

                    <RateValue
                      value={
                        item.transferBuy
                      }
                    />

                    <RateValue
                      value={
                        item.cashBuy
                      }
                    />
                  </div>
                )
              )}
            </div>

            <div className="exchange-mobile-list">
              {filteredRates.map(
                (
                  item,
                  index
                ) => (
                  <article
                    key={`${item.code}-${index}`}
                    className="exchange-mobile-card"
                  >
                    <div className="exchange-mobile-card__header">
                      <div>
                        <strong>
                          {item.code}
                        </strong>

                        <span>
                          {item.name}
                        </span>
                      </div>
                    </div>

                    <div className="exchange-mobile-card__grid">
                      <div>
                        <span>
                          Bán ra
                        </span>

                        <RateValue
                          value={
                            item.sell
                          }
                        />
                      </div>

                      <div>
                        <span>
                          Mua chuyển khoản
                        </span>

                        <RateValue
                          value={
                            item.transferBuy
                          }
                        />
                      </div>

                      <div>
                        <span>
                          Mua tiền mặt
                        </span>

                        <RateValue
                          value={
                            item.cashBuy
                          }
                        />
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>

            {activeBankResult
              .sourceUrl && (
              <div className="exchange-source">
                Nguồn dữ liệu:{" "}
                <a
                  href={
                    activeBankResult
                      .sourceUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  {activeBankInfo.name}
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default ExchangeRatePage;