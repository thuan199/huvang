import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  LockKeyhole,
  Trash2,
  UnlockKeyhole,
  X,
} from "lucide-react";

function ConfirmModal({
  isOpen,
  title = "Xác nhận",
  message = "",
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  type = "default",
  icon,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) {
    return null;
  }

  function getIconComponent() {
    switch (icon) {
      case "lock":
        return LockKeyhole;

      case "unlock":
        return UnlockKeyhole;

      case "success":
        return CheckCircle2;

      case "warning":
        return AlertTriangle;

      case "delete":
        return Trash2;

      default:
        if (type === "danger") {
          return Trash2;
        }

        if (type === "warning") {
          return AlertTriangle;
        }

        if (type === "success") {
          return CheckCircle2;
        }

        return HelpCircle;
    }
  }

  const IconComponent =
    getIconComponent();

  function handleBackdropMouseDown(
    event,
  ) {
    if (
      event.target ===
      event.currentTarget
    ) {
      onCancel?.();
    }
  }

  function handleConfirm() {
    onConfirm?.();
  }

  function handleCancel() {
    onCancel?.();
  }

  return (
    <div
      className="confirm-modal-backdrop"
      onMouseDown={
        handleBackdropMouseDown
      }
      role="presentation"
    >
      <div
        className={`confirm-modal confirm-modal-${type}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
      >
        <button
          type="button"
          className="confirm-modal-close"
          onClick={handleCancel}
          aria-label="Đóng"
          title="Đóng"
        >
          <X size={18} />
        </button>

        <div
          className={`confirm-modal-icon confirm-modal-icon-${type}`}
        >
          <IconComponent size={22} />
        </div>

        <h3 id="confirm-modal-title">
          {title}
        </h3>

        <div
          id="confirm-modal-message"
          className="confirm-modal-message"
        >
          {message}
        </div>

        <div className="confirm-modal-actions">
          <button
            type="button"
            className="confirm-cancel-button"
            onClick={handleCancel}
          >
            {cancelText}
          </button>

          <button
            type="button"
            className={`confirm-submit-button confirm-submit-${type}`}
            onClick={handleConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;