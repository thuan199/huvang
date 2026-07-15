import {
  AlertCircle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';

function getToastIcon(type) {
  if (type === 'error') {
    return <AlertCircle size={20} />;
  }

  if (type === 'info') {
    return <Info size={20} />;
  }

  return <CheckCircle2 size={20} />;
}

function ToastContainer({
  toasts,
  onRemove,
}) {
  if (!toasts.length) {
    return null;
  }

  return (
    <div
      className="toast-container"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`app-toast app-toast-${toast.type}`}
          role={
            toast.type === 'error'
              ? 'alert'
              : 'status'
          }
        >
          <div className="app-toast-icon">
            {getToastIcon(toast.type)}
          </div>

          <div className="app-toast-content">
            {toast.title && (
              <strong>{toast.title}</strong>
            )}

            <p>{toast.message}</p>
          </div>

          <button
            type="button"
            className="app-toast-close"
            onClick={() => onRemove(toast.id)}
            aria-label="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;