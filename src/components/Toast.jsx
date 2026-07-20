import {
  CheckCircle2,
  CircleAlert,
  Info,
  X,
  XCircle,
} from "lucide-react";

function Toast({
  isOpen,
  message,
  type = "success",
  onClose,
}) {
  if (!isOpen || !message) {
    return null;
  }

  const Icon =
    type === "error"
      ? XCircle
      : type === "warning"
        ? CircleAlert
        : type === "info"
          ? Info
          : CheckCircle2;

  return (
    <div
      className={`app-toast app-toast--${type}`}
      role="status"
      aria-live="polite"
    >
      <div className="app-toast__icon">
        <Icon size={21} />
      </div>

      <span className="app-toast__message">
        {message}
      </span>

      <button
        type="button"
        className="app-toast__close"
        onClick={onClose}
        title="Đóng"
        aria-label="Đóng thông báo"
      >
        <X size={17} />
      </button>
    </div>
  );
}

export default Toast;