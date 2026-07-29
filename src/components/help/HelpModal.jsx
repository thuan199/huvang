import {
  useEffect,
  useState,
} from "react";

import "./HelpModal.css";

const HELP_TABS = [
  {
    id: "guide",
    label: "Hướng dẫn",
    icon: "📖",
  },

  {
    id: "world-gold",
    label: "Giá vàng thế giới",
    icon: "🌍",
  },

  {
    id: "faq",
    label: "Câu hỏi thường gặp",
    icon: "❓",
  },
  {
    id: "contact",
    label: "Liên hệ",
    icon: "☎️",
  },
  {
    id: "about",
    label: "Giới thiệu",
    icon: "ℹ️",
  },
];

export default function HelpModal({
  open,
  onClose,
}) {
  const [
    activeTab,
    setActiveTab,
  ] = useState("guide");

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return undefined;
    }

    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow = "";

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open]);


  if (!open) {
    return null;
  }

  function handleOverlayMouseDown(event) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="help-modal-overlay"
      role="presentation"
      onMouseDown={
        handleOverlayMouseDown
      }
    >
      <section
        className="help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
      >
        <header className="help-modal__header">
          <div>
            <h2 id="help-modal-title">
              Hỗ trợ Hũ Vàng
            </h2>

            <p>
              Hướng dẫn sử dụng và
              thông tin liên hệ
            </p>
          </div>

          <button
            type="button"
            className="help-modal__close"
            onClick={onClose}
            aria-label="Đóng cửa sổ hỗ trợ"
          >
            ×
          </button>
        </header>

        <div className="help-modal__body">
          <nav
            className="help-modal__tabs"
            aria-label="Danh mục hỗ trợ"
          >
            {HELP_TABS.map(
              (tab) => {
                const isActive =
                  activeTab ===
                  tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={
                      isActive
                        ? "help-tab help-tab--active"
                        : "help-tab"
                    }
                    aria-pressed={
                      isActive
                    }
                    onClick={() =>
                      setActiveTab(
                        tab.id
                      )
                    }
                  >
                    <span
                      aria-hidden="true"
                    >
                      {tab.icon}
                    </span>

                    <span>
                      {tab.label}
                    </span>
                  </button>
                );
              }
            )}
          </nav>

          <div className="help-modal__content">
            {activeTab ===
              "guide" && (
                <GuideContent />
              )}

             {activeTab === "world-gold" && (
                <WorldGoldContent />
              )}  

            {activeTab ===
              "faq" && (
                <FaqContent />
              )}

            {activeTab ===
              "contact" && (
                <ContactContent />
              )}

            {activeTab ===
              "about" && (
                <AboutContent />
              )}
          </div>
        </div>
      </section>
    </div>
  );
}

function GuideContent() {
  return (
    <div className="help-section">
      <h3>
        Hướng dẫn sử dụng
      </h3>

      <HelpStep
        number="1"
        title="Cập nhật giá vàng hiện tại"
      >
        <p>
          Tại mục
          <strong>
            {" "}
            Cập nhật giá cá nhân
          </strong>
          , chọn loại vàng và nhập
          giá mua vào, giá bán ra
          của bạn khi giao dịch.
          Sau đó nhấn
          <strong>
            {" "}
            Cập nhật giá
          </strong>
          .
        </p>

        <p>
          Hoặc nhấn
          <strong>
            {" "}
            Làm mới giá
          </strong>
          {" "}
          để hệ thống tự động lấy
          giá mua và giá bán mới
          nhất từ SJC, PNJ, Mi Hồng.
        </p>
      </HelpStep>

      <HelpStep
        number="2"
        title="Thêm giao dịch mua hoặc bán"
      >
        <p>
          Tại mục
          <strong>
            {" "}
            Thêm giao dịch mới
          </strong>
          , chọn loại giao dịch,
          loại vàng, số lượng và
          giá giao dịch.
        </p>

        <p>
          Nhấn
          <strong>
            {" "}
            Lưu giao dịch
          </strong>
          {" "}
          để ghi nhận giao dịch.
        </p>
      </HelpStep>

      <HelpStep
        number="3"
        title="Theo dõi lãi hoặc lỗ"
      >
        <p>
          Hệ thống tự động so sánh
          giá mua của bạn với giá
          bán hiện tại để tính số
          tiền lãi hoặc lỗ và tỷ lệ
          phần trăm.
        </p>
      </HelpStep>

      <HelpStep
        number="4"
        title="Xem lịch sử giá"
      >
        <p>
          Sử dụng biểu đồ để xem
          biến động giá trong ngày,
          một tuần, một tháng hoặc
          các khoảng thời gian dài
          hơn.
        </p>
      </HelpStep>

      <HelpStep
        number="5"
        title="Dùng Chat và Trợ lý AI"
      >
        <p>
          Mục Chat dùng để trao đổi
          với cộng đồng. Trợ lý AI
          dùng để hỏi về vàng, tỷ
          giá và cách sử dụng ứng
          dụng.
        </p>
      </HelpStep>
    </div>
  );
}

function HelpStep({
  number,
  title,
  children,
}) {
  return (
    <article className="help-step">
      <div className="help-step__number">
        {number}
      </div>

      <div className="help-step__content">
        <h4>
          {title}
        </h4>

        {children}
      </div>
    </article>
  );
}

function WorldGoldContent() {
  return (
    <div className="help-section help-world-gold">
      <h3>
        Giá vàng Thế giới
      </h3>

      <p>
        Ứng dụng lấy giá vàng thế giới
        theo cặp tiền tệ
        <strong> OANDA:XAUUSD</strong>.
      </p>

      <p>
        Cặp tiền tệ
        <strong> OANDA:XAUUSD </strong>
        giao dịch 24 giờ mỗi ngày,
        5 ngày mỗi tuần trên thị trường
        ngoại hối Forex.
      </p>

      <p>
        Tuy nhiên, thanh khoản và biến
        động giá không đồng đều trong
        suốt 24 giờ mà phụ thuộc vào các
        phiên giao dịch chính trên toàn
        cầu.
      </p>

      <HelpInfoSection
        icon="🗓️"
        title="Thời gian bắt đầu và kết thúc giao dịch mỗi tuần (giờ Việt Nam - GMT+7)"
      >
        <div className="help-table-wrapper">
          <table className="help-info-table">
            <thead>
              <tr>
                <th>Sự kiện</th>
                <th>Thời gian (giờ Việt Nam)</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>Mở cửa phiên đầu tuần</td>
                <td>
                  <strong>
                    Thứ Hai, 04:00 sáng
                  </strong>
                </td>
              </tr>

              <tr>
                <td>Đóng cửa phiên cuối tuần</td>
                <td>
                  <strong>
                    Thứ Bảy, 04:00 sáng
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </HelpInfoSection>

      <HelpInfoSection
        icon="🕘"
        title="Thời gian giao dịch Forex toàn cầu (theo giờ Việt Nam)"
      >
        <div className="help-table-wrapper">
          <table className="help-info-table">
            <thead>
              <tr>
                <th>Phiên</th>
                <th>Thành phố</th>
                <th>Giờ mở cửa</th>
                <th>Giờ đóng cửa</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>
                  <strong>Châu Úc</strong>
                </td>
                <td>Sydney</td>
                <td>04:00</td>
                <td>13:00</td>
              </tr>

              <tr>
                <td>
                  <strong>Châu Á</strong>
                </td>
                <td>Tokyo</td>
                <td>06:00</td>
                <td>15:00</td>
              </tr>

              <tr>
                <td>
                  <strong>Châu Âu</strong>
                </td>
                <td>London</td>
                <td>14:00</td>
                <td>23:00</td>
              </tr>

              <tr>
                <td>
                  <strong>Bắc Mỹ</strong>
                </td>
                <td>New York</td>
                <td>19:00</td>
                <td>04:00 hôm sau</td>
              </tr>
            </tbody>
          </table>
        </div>
      </HelpInfoSection>

      <HelpInfoSection
        icon="📊"
        title="Tác động của từng phiên đối với XAU/USD"
      >
        <div className="help-table-wrapper">
          <table className="help-info-table">
            <thead>
              <tr>
                <th>Phiên</th>
                <th>Đặc điểm</th>
                <th>Mức độ ảnh hưởng</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>
                  <strong>Sydney (Úc)</strong>
                </td>
                <td>
                  Khối lượng thấp, thường
                  giao dịch đi ngang
                </td>
                <td>🟣 Thấp</td>
              </tr>

              <tr>
                <td>
                  <strong>Tokyo (Châu Á)</strong>
                </td>
                <td>
                  Có một phần nhu cầu vàng
                  vật chất nhưng ít biến
                  động mạnh
                </td>
                <td>🟣🟠 Trung bình thấp</td>
              </tr>

              <tr>
                <td>
                  <strong>London (Châu Âu)</strong>
                </td>
                <td>
                  Khối lượng giao dịch lớn,
                  vàng thường được xem là
                  tài sản trú ẩn
                </td>
                <td>🟡 Cao</td>
              </tr>

              <tr>
                <td>
                  <strong>New York (Mỹ)</strong>
                </td>
                <td>
                  Đồng USD, dữ liệu kinh tế
                  và các quyết định của
                  FOMC ảnh hưởng mạnh đến
                  giá vàng
                </td>
                <td>🟡🟡 Rất cao</td>
              </tr>

              <tr>
                <td>
                  <strong>
                    Giao nhau London–New York
                    (19:00–23:00)
                  </strong>
                </td>
                <td>
                  Thời điểm sôi động nhất,
                  thanh khoản cao và biến
                  động lớn
                </td>
                <td>🔥 Cực cao</td>
              </tr>
            </tbody>
          </table>
        </div>
      </HelpInfoSection>

      <HelpInfoSection
        icon="🗓️"
        title="Thời gian sôi động nhất cho giao dịch XAU/USD (giờ Việt Nam)"
      >
        <div className="help-table-wrapper">
          <table className="help-info-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Đặc điểm</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>
                  <strong>14:00 – 23:00</strong>
                </td>
                <td>
                  London mở cửa, thanh
                  khoản bắt đầu tăng
                </td>
              </tr>

              <tr>
                <td>
                  <strong>19:00 – 23:00</strong>
                </td>
                <td>
                  London và New York giao
                  nhau, thị trường thường
                  sôi động nhất
                </td>
              </tr>

              <tr>
                <td>
                  <strong>23:00 – 04:00</strong>
                </td>
                <td>
                  New York vẫn mở nhưng
                  thanh khoản giảm dần
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </HelpInfoSection>

      <HelpInfoSection
        icon="✅"
        title="Khuyến nghị cho nhà giao dịch ở Việt Nam"
      >
        <ul className="help-info-list">
          <li>
            <strong>
              Thời điểm tốt nhất để giao dịch:
            </strong>{" "}
            từ 19:00 đến 23:00, khi cả
            London và New York cùng hoạt động.
          </li>

          <li>
            <strong>
              Nên tránh giao dịch:
            </strong>{" "}
            phiên Sydney hoặc đầu phiên
            Sydney khoảng 04:00–10:00 vì
            khối lượng thấp, dễ xuất hiện
            biến động bất thường và quét
            stop-loss.
          </li>
        </ul>
      </HelpInfoSection>

      <HelpInfoSection
        icon="🔁"
        title="Tóm tắt tuần giao dịch Forex đối với XAU/USD"
      >
        <ul className="help-info-list">
          <li>
            Mở cửa lúc 04:00 sáng thứ Hai,
            bắt đầu từ phiên Sydney.
          </li>

          <li>
            Hoạt động 24 giờ mỗi ngày,
            5 ngày mỗi tuần, từ thứ Hai
            đến thứ Sáu.
          </li>

          <li>
            Đóng cửa lúc 04:00 sáng thứ Bảy,
            khi phiên New York ngày thứ Sáu
            kết thúc.
          </li>
        </ul>
      </HelpInfoSection>

      <HelpInfoSection
        icon="💡"
        title="Lưu ý"
      >
        <ul className="help-info-list">
          <li>
            Giờ giao dịch có thể thay đổi
            khoảng một giờ khi Mỹ hoặc
            châu Âu chuyển sang giờ mùa hè
            DST.
          </li>

          <li>
            Khi xem trên OANDA hoặc
            TradingView, cần chú ý múi giờ
            đang được thiết lập trên biểu đồ.
          </li>

          <li>
            Ứng dụng Hũ Vàng đang sử dụng
            múi giờ
            <strong>
              {" "}
              Asia/Ho_Chi_Minh, GMT+7
            </strong>
            .
          </li>
        </ul>
      </HelpInfoSection>

      <div className="help-world-gold__notice">
        Nội dung này chỉ dùng để tham khảo
        về thời gian hoạt động của thị
        trường, không phải khuyến nghị đầu tư.
      </div>
    </div>
  );
}

function HelpInfoSection({
  icon,
  title,
  children,
}) {
  return (
    <section className="help-info-section">
      <h4 className="help-info-section__title">
        <span aria-hidden="true">
          {icon}
        </span>

        <span>{title}</span>
      </h4>

      <div className="help-info-section__content">
        {children}
      </div>
    </section>
  );
}

function FaqContent() {
  return (
    <div className="help-section">
      <h3>
        Câu hỏi thường gặp
      </h3>

      <details className="help-faq">
        <summary>
          Vì sao lãi/lỗ đang âm?
        </summary>

        <p>
          Vì giá bán hiện tại thấp
          hơn tổng giá vốn của giao
          dịch bạn đã lưu.
        </p>
      </details>

      <details className="help-faq">
        <summary>
          Vì sao giá trong ứng dụng
          khác giá cửa hàng?
        </summary>

        <p>
          Giá phụ thuộc vào loại
          vàng, thời điểm cập nhật và
          giá cá nhân mà bạn nhập.
        </p>
      </details>

      <details className="help-faq">
        <summary>
          Giá vàng thế giới được
          tính như thế nào?
        </summary>

        <p>
          Giá XAU/USD được quy đổi
          sang VND bằng tỷ giá USD
          của Vietcombank, sau đó
          quy đổi từ ounce sang
          lượng.
        </p>
      </details>

      <details className="help-faq">
        <summary>
          Dữ liệu của tôi có bị mất
          khi tải lại trang không?
        </summary>

        <p>
          Dữ liệu đã lưu trên hệ
          thống vẫn được giữ lại khi
          bạn đăng nhập lại đúng tài
          khoản.
        </p>
      </details>
    </div>
  );
}

function ContactContent() {
  return (
    <div className="help-section">
      <h3>
        Thông tin liên hệ
      </h3>

      <div className="help-contact-card">
        <div className="help-contact-card__icon">
          👤
        </div>

        <div>
          <span>
            Người phát triển
          </span>

          <strong>
            Phạm Ngọc Thuần
          </strong>
        </div>
      </div>

      <a
        className="help-contact-card"
        href="mailto:thu2toite@gmail.com"
      >
        <div className="help-contact-card__icon">
          ✉️
        </div>

        <div>
          <span>
            Email
          </span>

          <strong>
            thu2toite@gmail.com
          </strong>
        </div>
      </a>

      <a
        className="help-contact-card"
        href="https://facebook.com/uron199"
        target="_blank"
        rel="noreferrer"
      >
        <div className="help-contact-card__icon">
          🌐
        </div>

        <div>
          <span>
            Facebook
          </span>

          <strong>
            Liên hệ qua Facebook
          </strong>
        </div>
      </a>

      <a
        className="help-contact-card"
        href="mailto:thu2toite@gmail.com?subject=Báo lỗi ứng dụng Hũ Vàng"
      >
        <div className="help-contact-card__icon">
          🐞
        </div>

        <div>
          <span>
            Báo lỗi
          </span>

          <strong>
            Gửi thông tin lỗi
          </strong>
        </div>
      </a>
    </div>
  );
}

function AboutContent() {
  return (
    <div className="help-section">
      <h3>
        Giới thiệu webApp Hũ Vàng
      </h3>

      <div className="help-about">
        <img
          src="/logo.png"
          className="help-about__logo-image"
          alt="Hũ Vàng"
        />

        <h4>
          Hũ Vàng
        </h4>

        <p>
          Công cụ hỗ trợ quản lý
          giao dịch vàng, theo dõi
          giá vốn, giá hiện tại và
          lãi/lỗ.
        </p>

        <ul>
          <li>
            Quản lý giao dịch vàng
          </li>

          <li>
            Theo dõi giá cá nhân
          </li>

          <li>
            Xem lịch sử và biểu đồ
          </li>

          <li>
            Quy đổi giá vàng thế
            giới
          </li>

          <li>
            Chat cộng đồng
          </li>

          <li>
            Trợ lý AI
          </li>
        </ul>

        <div className="help-about__sources">
          <strong>
            Nguồn dữ liệu tham khảo
          </strong>

          <span>
            SJC, PNJ, Mi Hồng, Vietcombank,
            XAU/USD
          </span>
        </div>
      </div>
    </div>
  );
}