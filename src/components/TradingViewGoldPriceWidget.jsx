import { useEffect, useRef } from 'react';

function TradingViewGoldPriceWidget() {
  const containerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const container = containerRef.current;

      if (!container) return;

      container.innerHTML = '';

      const widgetDiv = document.createElement('div');
      widgetDiv.className = 'tradingview-widget-container__widget';

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

      container.appendChild(widgetDiv);
      container.appendChild(script);
    }, 100);

    return () => {
      clearTimeout(timer);

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container tradingview-mini-widget"
    />
  );
}

export default TradingViewGoldPriceWidget;