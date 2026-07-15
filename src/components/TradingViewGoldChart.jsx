import { useEffect, useRef, useState } from 'react';

function TradingViewGoldChart({ theme }) {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    setIsLoading(true);
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

    const observer = new MutationObserver(() => {
      const iframe = container.querySelector('iframe');

      if (!iframe) return;

      iframe.addEventListener(
        'load',
        () => {
          setIsLoading(false);
        },
        { once: true }
      );

      observer.disconnect();
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
    });

    script.onerror = () => {
      setIsLoading(false);
    };

    container.appendChild(widget);
    container.appendChild(script);

    return () => {
      observer.disconnect();
      container.innerHTML = '';
    };
  }, [theme]);

  return (
    <div className="gold-chart-wrapper">
      {isLoading && (
        <div className="gold-chart-loading">
          <div className="gold-chart-spinner" />
          <span>Đang load dữ liệu...</span>
        </div>
      )}

      <div
        ref={containerRef}
        className={`tradingview-widget-container gold-chart-widget ${
          isLoading ? 'gold-chart-hidden' : ''
        }`}
      />
    </div>
  );
}

export default TradingViewGoldChart;