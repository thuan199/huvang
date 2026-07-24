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
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    setActiveTab("guide");

    document.body.style.overflow =
      "hidden";

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  function handleOverlayMouseDown(
    event
  ) {
    if (
      event.target ===
      event.currentTarget
    ) {
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
        onMouseDown={(event) =>
          event.stopPropagation()
        }
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
            Lấy giá hiện tại từ PNJ
          </strong>
          {" "}
          để hệ thống tự động lấy
          giá mua và giá bán mới
          nhất từ PNJ.
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
            PNJ, Vietcombank,
            XAU/USD
          </span>
        </div>
      </div>
    </div>
  );
}