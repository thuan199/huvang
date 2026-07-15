import {
  AlertTriangle,
  HelpCircle,
  Trash2,
  X,
} from 'lucide-react';

function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  type = 'danger',
  onConfirm,
  onCancel,
}) {
  if (!isOpen) {
    return null;
  }

  const Icon =
    type === 'danger'
      ? Trash2
      : type === 'warning'
        ? AlertTriangle
        : HelpCircle;

  return (
    <div
      className="confirm-modal-backdrop"
      onMouseDown={onCancel}
      role="presentation"
    >
      <div
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <button
          type="button"
          className="confirm-modal-close"
          onClick={onCancel}
          aria-label="Đóng"
        >
          <X size={18} />
        </button>

        <div
          className={`confirm-modal-icon confirm-modal-icon-${type}`}
        >
          <Icon size={22} />
        </div>

        <h3 id="confirm-modal-title">
          {title}
        </h3>

        <p>{message}</p>

        <div className="confirm-modal-actions">
          <button
            type="button"
            className="confirm-cancel-button"
            onClick={onCancel}
          >
            {cancelText}
          </button>

          <button
            type="button"
            className={`confirm-submit-button confirm-submit-${type}`}
            onClick={onConfirm}
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