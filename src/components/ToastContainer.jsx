import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { createPortal } from "react-dom";

import {
  CheckCircle2,
  CircleAlert,
  Info,
  X,
} from "lucide-react";

function ToastItem({
  toast,
  onRemove,
}) {
  const [
    isClosing,
    setIsClosing,
  ] = useState(false);

  const closeToast = useCallback(() => {
    setIsClosing(
      (currentValue) => {
        if (currentValue) {
          return currentValue;
        }

        window.setTimeout(() => {
          onRemove(toast.id);
        }, 280);

        return true;
      }
    );
  }, [
    onRemove,
    toast.id,
  ]);

  useEffect(() => {
    if (
      !toast.duration ||
      toast.duration <= 0
    ) {
      return undefined;
    }

    const timer =
      window.setTimeout(
        closeToast,
        toast.duration
      );

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    closeToast,
    toast.duration,
  ]);

  function renderIcon() {
    if (toast.type === "error") {
      return (
        <CircleAlert size={20} />
      );
    }

    if (toast.type === "info") {
      return <Info size={20} />;
    }

    return (
      <CheckCircle2 size={20} />
    );
  }

  return (
    <div
      className={[
        "toast",
        `toast-${toast.type}`,
        isClosing
          ? "toast-closing"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className="toast-icon">
        {renderIcon()}
      </div>

      <div className="toast-content">
        {toast.title && (
          <strong className="toast-title">
            {toast.title}
          </strong>
        )}

        <div className="toast-message">
          {toast.message}
        </div>
      </div>

      <button
        type="button"
        className="toast-close"
        onClick={closeToast}
        aria-label="Đóng thông báo"
        title="Đóng"
      >
        <X size={17} />
      </button>
    </div>
  );
}

export default function ToastContainer({
  toasts = [],
  onRemove,
}) {
  if (
    typeof document === "undefined"
  ) {
    return null;
  }

  return createPortal(
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
        />
      ))}
    </div>,
    document.body
  );
}
