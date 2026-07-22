import {
  useEffect,
  useState,
} from "react";

import {
  CHAT_REPORT_REASONS,
} from "../../utils/chatConstants";

export default function ChatReportModal({
  message,
  onClose,
  onSubmit,
}) {
  const [reason, setReason] =
    useState("spam");

  const [
    description,
    setDescription,
  ] = useState("");

  const [submitting, setSubmitting] =
    useState(false);

  useEffect(() => {
    setReason("spam");
    setDescription("");
  }, [message]);

  if (!message) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitting(true);

      const success =
        await onSubmit({
          messageId: message.id,
          reason,
          description,
        });

      if (success) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="chat-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        className="chat-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
      >
        <div className="chat-modal__header">
          <h3 id="report-title">
            Báo cáo tin nhắn
          </h3>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <div className="chat-modal__quoted">
          <strong>
            {message.profile
              ?.display_name ||
              "Thành viên"}
          </strong>

          <p>{message.content}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Lý do báo cáo
          </label>

          <select
            value={reason}
            onChange={(event) =>
              setReason(
                event.target.value
              )
            }
          >
            {CHAT_REPORT_REASONS.map(
              (item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              )
            )}
          </select>

          <label>
            Mô tả thêm
          </label>

          <textarea
            value={description}
            maxLength={500}
            rows={4}
            placeholder="Mô tả nội dung cần báo cáo..."
            onChange={(event) =>
              setDescription(
                event.target.value
              )
            }
          />

          <div className="chat-modal__count">
            {description.length}/500
          </div>

          <div className="chat-modal__actions">
            <button
              type="button"
              className="chat-button chat-button--secondary"
              onClick={onClose}
            >
              Hủy
            </button>

            <button
              type="submit"
              className="chat-button chat-button--danger"
              disabled={submitting}
            >
              {submitting
                ? "Đang gửi..."
                : "Gửi báo cáo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}