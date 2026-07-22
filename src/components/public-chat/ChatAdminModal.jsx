import {
  useEffect,
  useState,
} from "react";

import {
  CHAT_BAN_DURATIONS,
} from "../../utils/chatConstants";

export default function ChatAdminModal({
  message,
  onClose,
  onBanUser,
  onUnbanUser,
}) {
  const [
    duration,
    setDuration,
  ] = useState("1h");

  const [
    reason,
    setReason,
  ] = useState("");

  const [
    processing,
    setProcessing,
  ] = useState(false);

  useEffect(() => {
    setDuration("1h");
    setReason("");
    setProcessing(false);
  }, [message]);

  if (!message) {
    return null;
  }

  async function handleBan() {
    if (!onBanUser) {
      return;
    }

    try {
      setProcessing(true);

      const success =
        await onBanUser({
          userId: message.user_id,
          duration,
          reason:
            reason.trim() || null,
        });

      if (success) {
        onClose();
      }
    } finally {
      setProcessing(false);
    }
  }

  async function handleUnban() {
    if (!onUnbanUser) {
      return;
    }

    try {
      setProcessing(true);

      const success =
        await onUnbanUser(
          message.user_id
        );

      if (success) {
        onClose();
      }
    } finally {
      setProcessing(false);
    }
  }

  function handleClose() {
    if (processing) {
      return;
    }

    onClose();
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
          handleClose();
        }
      }}
    >
      <div
        className="chat-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-admin-title"
      >
        <div className="chat-modal__header">
          <h3 id="chat-admin-title">
            Quản lý thành viên
          </h3>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Đóng"
            disabled={processing}
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

          <p>
            {message.content ||
              message.moderation_message ||
              "Tin nhắn không còn nội dung"}
          </p>
        </div>

        <div className="chat-admin-section">
          <h4>
            Khóa chức năng chat
          </h4>

          <label htmlFor="ban-duration">
            Thời gian khóa chat
          </label>

          <select
            id="ban-duration"
            value={duration}
            disabled={processing}
            onChange={(event) =>
              setDuration(
                event.target.value
              )
            }
          >
            {CHAT_BAN_DURATIONS.map(
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

          <label htmlFor="ban-reason">
            Lý do khóa
          </label>

          <textarea
            id="ban-reason"
            value={reason}
            maxLength={500}
            rows={3}
            disabled={processing}
            placeholder="Nhập lý do khóa..."
            onChange={(event) =>
              setReason(
                event.target.value
              )
            }
          />

          <div className="chat-modal__count">
            {reason.length}/500
          </div>

          <div className="chat-admin-actions">
            <button
              type="button"
              className="chat-button chat-button--danger"
              disabled={processing}
              onClick={handleBan}
            >
              {processing
                ? "Đang xử lý..."
                : "Khóa thành viên"}
            </button>

            <button
              type="button"
              className="chat-button chat-button--secondary"
              disabled={processing}
              onClick={handleUnban}
            >
              Mở khóa ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}