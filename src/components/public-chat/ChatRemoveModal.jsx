import {
  useEffect,
  useState,
} from "react";

export default function ChatRemoveModal({
  message,
  onClose,
  onRemoveMessage,
}) {
  const [
    removalMessage,
    setRemovalMessage,
  ] = useState(
    "Tin nhắn đã bị xóa vì vi phạm quy định"
  );

  const [
    processing,
    setProcessing,
  ] = useState(false);

  useEffect(() => {
    setRemovalMessage(
      "Tin nhắn đã bị xóa vì vi phạm quy định"
    );

    setProcessing(false);
  }, [message]);

  if (!message) {
    return null;
  }

  async function handleRemove() {
    try {
      setProcessing(true);

      const success =
        await onRemoveMessage({
          messageId: message.id,
          removalMessage:
            removalMessage.trim(),
        });

      if (success) {
        onClose();
      }
    } finally {
      setProcessing(false);
    }
  }

  function handleClose() {
    if (!processing) {
      onClose();
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
          handleClose();
        }
      }}
    >
      <div
        className="chat-modal chat-remove-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-remove-title"
      >
        <div className="chat-modal__header">
          <h3 id="chat-remove-title">
            Xóa tin nhắn vi phạm
          </h3>

          <button
            type="button"
            onClick={handleClose}
            disabled={processing}
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

        <label htmlFor="removal-message">
          Nội dung hiển thị sau khi xóa
        </label>

        <textarea
          id="removal-message"
          value={removalMessage}
          maxLength={200}
          rows={3}
          disabled={processing}
          onChange={(event) =>
            setRemovalMessage(
              event.target.value
            )
          }
        />

        <div className="chat-modal__count">
          {removalMessage.length}/200
        </div>

        <div className="chat-modal__actions">
          <button
            type="button"
            className="chat-button chat-button--secondary"
            disabled={processing}
            onClick={handleClose}
          >
            Hủy
          </button>

          <button
            type="button"
            className="chat-button chat-button--danger"
            disabled={
              processing ||
              !removalMessage.trim()
            }
            onClick={handleRemove}
          >
            {processing
              ? "Đang xóa..."
              : "Xóa tin nhắn"}
          </button>
        </div>
      </div>
    </div>
  );
}