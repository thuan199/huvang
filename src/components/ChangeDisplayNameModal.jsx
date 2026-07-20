import {
  useEffect,
  useState,
} from "react";

import {
  Pencil,
  X,
} from "lucide-react";

export default function ChangeDisplayNameModal({
  isOpen,
  currentName,
  saving,
  error,
  onClose,
  onSubmit,
}) {
  const [
    displayName,
    setDisplayName,
  ] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDisplayName(
      currentName ?? ""
    );
  }, [
    isOpen,
    currentName,
  ]);

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    const trimmedName =
      displayName.trim();

    if (
      !trimmedName ||
      saving
    ) {
      return;
    }

    await onSubmit?.(
      trimmedName
    );
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="display-name-overlay"
      role="presentation"
      onMouseDown={
        saving
          ? undefined
          : onClose
      }
    >
      <div
        className="display-name-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="display-name-title"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="display-name-header">
          <div className="display-name-heading">
            <div className="display-name-icon">
              <Pencil size={18} />
            </div>

            <div>
              <h2 id="display-name-title">
                Đổi tên hiển thị
              </h2>

              <p>
                Nhập tên bạn muốn hiển thị
                trên Hũ vàng.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="display-name-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Đóng"
            title="Đóng"
          >
            <X size={19} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
        >
          <label
            className="display-name-label"
            htmlFor="display-name-input"
          >
            Tên hiển thị
          </label>

          <input
            id="display-name-input"
            type="text"
            className="display-name-input"
            value={displayName}
            onChange={(event) =>
              setDisplayName(
                event.target.value
              )
            }
            placeholder="Ví dụ: Ethan"
            maxLength={50}
            disabled={saving}
            autoFocus
          />

          <div className="display-name-count">
            {displayName.length}/50
          </div>

          {error && (
            <div
              className="display-name-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="display-name-actions">
            <button
              type="button"
              className="display-name-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Hủy
            </button>

            <button
              type="submit"
              className="display-name-submit"
              disabled={
                saving ||
                !displayName.trim()
              }
            >
              {saving
                ? "Đang lưu..."
                : "Lưu tên"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
