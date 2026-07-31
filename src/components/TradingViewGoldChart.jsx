import {
  useEffect,
  useRef,
  useState,
} from "react";

const TRADING_VIEW_SCRIPT_ID =
  "tradingview-main-script";

const TRADING_VIEW_SCRIPT_URL =
  "https://s3.tradingview.com/tv.js";

const MOBILE_BREAKPOINT = 768;

/**
 * Chỉ tải thư viện TradingView một lần.
 */
function loadTradingViewScript() {
  if (
    window.TradingView &&
    typeof window.TradingView.widget ===
    "function"
  ) {
    return Promise.resolve(
      window.TradingView
    );
  }

  const existingScript =
    document.getElementById(
      TRADING_VIEW_SCRIPT_ID
    );

  if (existingScript) {
    return new Promise(
      (resolve, reject) => {
        const checkTradingView =
          () => {
            if (
              window.TradingView &&
              typeof window
                .TradingView
                .widget ===
              "function"
            ) {
              resolve(
                window.TradingView
              );
            } else {
              reject(
                new Error(
                  "TradingView đã tải nhưng không khởi tạo được."
                )
              );
            }
          };

        if (
          existingScript.dataset
            .loaded === "true"
        ) {
          checkTradingView();
          return;
        }

        existingScript.addEventListener(
          "load",
          checkTradingView,
          {
            once: true,
          }
        );

        existingScript.addEventListener(
          "error",
          () => {
            reject(
              new Error(
                "Không thể tải thư viện TradingView."
              )
            );
          },
          {
            once: true,
          }
        );
      }
    );
  }

  return new Promise(
    (resolve, reject) => {
      const script =
        document.createElement(
          "script"
        );

      script.id =
        TRADING_VIEW_SCRIPT_ID;

      script.src =
        TRADING_VIEW_SCRIPT_URL;

      script.type =
        "text/javascript";

      script.async = true;

      script.onload = () => {
        script.dataset.loaded =
          "true";

        if (
          window.TradingView &&
          typeof window
            .TradingView
            .widget ===
          "function"
        ) {
          resolve(
            window.TradingView
          );
        } else {
          reject(
            new Error(
              "TradingView không khởi tạo được."
            )
          );
        }
      };

      script.onerror = () => {
        script.remove();

        reject(
          new Error(
            "Không thể tải thư viện TradingView."
          )
        );
      };

      document.head.appendChild(
        script
      );
    }
  );
}

function TradingViewGoldChart({
  theme,
}) {
  const containerRef =
    useRef(null);

  const containerIdRef =
    useRef(
      `tradingview-gold-chart-${Math.random()
        .toString(36)
        .slice(2)}`
    );

  const widgetRef =
    useRef(null);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    isMobile,
    setIsMobile,
  ] = useState(() =>
    window.innerWidth <=
    MOBILE_BREAKPOINT
  );

  useEffect(() => {
    const mediaQuery =
      window.matchMedia(
        `(max-width: ${MOBILE_BREAKPOINT}px)`
      );

    function handleViewportChange(
      event
    ) {
      setIsMobile(
        event.matches
      );
    }

    setIsMobile(
      mediaQuery.matches
    );

    mediaQuery.addEventListener(
      "change",
      handleViewportChange
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleViewportChange
      );
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadingTimeout = null;
    let checkIframe = null;

    const container =
      containerRef.current;

    if (!container) {
      return undefined;
    }

    setIsLoading(true);
    setError("");

    container.innerHTML = "";

    const chartElement =
      document.createElement(
        "div"
      );

    chartElement.id =
      containerIdRef.current;

    chartElement.style.width =
      "100%";

    chartElement.style.height =
      "100%";

    container.appendChild(
      chartElement
    );

    async function createChart() {
      try {
        await loadTradingViewScript();

        if (
          cancelled ||
          !containerRef.current ||
          !document.getElementById(
            containerIdRef.current
          )
        ) {
          return;
        }

        widgetRef.current =
          new window.TradingView.widget(
            {
              container_id:
                containerIdRef.current,

              width: "100%",
              height: "100%",

              autosize: true,

              symbol:
                "OANDA:XAUUSD",

              interval:
                isMobile
                  ? "60"
                  : "60",

              timezone:
                "Asia/Ho_Chi_Minh",

              theme:
                theme === "dark"
                  ? "dark"
                  : "light",

              style: "1",

              locale: "vi",

              toolbar_bg:
                theme === "dark"
                  ? "#131722"
                  : "#ffffff",

              allow_symbol_change:
                false,

              /*
               * Mobile cần ưu tiên diện tích biểu đồ.
               * Ẩn thanh công cụ bên trái và bảng chi tiết
               * bên phải để không bị cắt phần dưới.
               */
              hide_side_toolbar:
                isMobile,

              hide_top_toolbar:
                false,

              hide_legend:
                false,

              hide_volume:
                isMobile,

              save_image:
                !isMobile,

              calendar:
                false,

              details:
                !isMobile,

              hotlist:
                false,

              withdateranges:
                true,

              enable_publishing:
                false,

              studies: [],

              support_host:
                "https://www.tradingview.com",
            }
          );

        if (
          widgetRef.current &&
          typeof widgetRef.current
            .onChartReady ===
          "function"
        ) {
          widgetRef.current.onChartReady(
            () => {
              if (!cancelled) {
                setIsLoading(
                  false
                );
              }
            }
          );
        }

        checkIframe =
          window.setInterval(
            () => {
              if (cancelled) {
                window.clearInterval(
                  checkIframe
                );
                return;
              }

              const iframe =
                container.querySelector(
                  "iframe"
                );

              if (!iframe) {
                return;
              }

              window.clearInterval(
                checkIframe
              );

              iframe.style.width =
                "100%";

              iframe.style.height =
                "100%";

              iframe.style.border =
                "0";

              const handleIframeLoad =
                () => {
                  if (!cancelled) {
                    setIsLoading(
                      false
                    );
                  }
                };

              iframe.addEventListener(
                "load",
                handleIframeLoad,
                {
                  once: true,
                }
              );

              window.setTimeout(
                () => {
                  if (!cancelled) {
                    setIsLoading(
                      false
                    );
                  }
                },
                1500
              );
            },
            250
          );

        loadingTimeout =
          window.setTimeout(
            () => {
              if (checkIframe) {
                window.clearInterval(
                  checkIframe
                );
              }

              if (!cancelled) {
                setIsLoading(
                  false
                );
              }
            },
            10000
          );
      } catch (
        chartError
      ) {
        console.error(
          "Lỗi tải biểu đồ TradingView:",
          chartError
        );

        if (!cancelled) {
          setIsLoading(false);

          setError(
            chartError?.message ||
            "Không thể tải biểu đồ XAU/USD."
          );
        }
      }
    }

    createChart();

    return () => {
      cancelled = true;

      if (checkIframe) {
        window.clearInterval(
          checkIframe
        );
      }

      if (loadingTimeout) {
        window.clearTimeout(
          loadingTimeout
        );
      }

      widgetRef.current =
        null;

      if (
        containerRef.current ===
        container
      ) {
        container.innerHTML =
          "";
      }
    };
  }, [
    theme,
    isMobile,
  ]);

  return (
    <div className="gold-chart-wrapper">
      {isLoading && !error && (
        <div className="gold-chart-loading">
          <div className="gold-chart-spinner" />

          <span>
            Đang tải biểu đồ tương tác từ TradingView, mã OANDA:XAUUSD.
          </span>
        </div>
      )}

      {error && (
        <div className="gold-chart-error">
          <strong>
            Không thể mở biểu đồ
          </strong>

          <span>{error}</span>
        </div>
      )}

      <div
        ref={containerRef}
        className={`gold-chart-widget ${
          isLoading
            ? "gold-chart-hidden"
            : ""
        }`}
      />
    </div>
  );
}

export default TradingViewGoldChart;