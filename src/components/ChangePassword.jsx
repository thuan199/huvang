import { useState } from "react";
import {
  Eye,
  EyeOff,
} from "lucide-react";

import { supabase } from "../supabaseClient";

export default function ChangePassword({
  onSuccess,
  buttonClassName = "",
  buttonIcon = null,
}) {
  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] = useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  function resetForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);

    setError("");
  }

  function openModal() {
    resetForm();
    setIsOpen(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    resetForm();
    setIsOpen(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!currentPassword.trim()) {
      setError(
        "Vui lòng nhập mật khẩu hiện tại."
      );
      return;
    }

    if (!newPassword.trim()) {
      setError(
        "Vui lòng nhập mật khẩu mới."
      );
      return;
    }

    if (newPassword.length < 8) {
      setError(
        "Mật khẩu mới phải có ít nhất 8 ký tự."
      );
      return;
    }

    if (!confirmPassword.trim()) {
      setError(
        "Vui lòng xác nhận mật khẩu mới."
      );
      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setError(
        "Xác nhận mật khẩu mới không khớp."
      );
      return;
    }

    if (
      currentPassword ===
      newPassword
    ) {
      setError(
        "Mật khẩu mới phải khác mật khẩu hiện tại."
      );
      return;
    }

    try {
      setSaving(true);

      const {
        data: userData,
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      const user = userData?.user;

      if (!user?.email) {
        throw new Error(
          "Không tìm thấy email của tài khoản."
        );
      }

      const {
        error: signInError,
      } =
        await supabase.auth
          .signInWithPassword({
            email: user.email,
            password:
              currentPassword,
          });

      if (signInError) {
        throw new Error(
          "Mật khẩu hiện tại không đúng."
        );
      }

      const {
        error: updateError,
      } =
        await supabase.auth
          .updateUser({
            password:
              newPassword,
          });

      if (updateError) {
        throw updateError;
      }

      resetForm();
      setIsOpen(false);

      onSuccess?.(
        "Đã đổi mật khẩu thành công."
      );
    } catch (err) {
      console.error(
        "Lỗi đổi mật khẩu:",
        err
      );

      setError(
        err?.message ||
        "Không thể đổi mật khẩu."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={
          buttonClassName ||
          "change-password-open-button"
        }
        onClick={openModal}
        title="Đổi mật khẩu"
      >
        {buttonIcon}

        <span className="header-admin-menu__item-content">
          <span className="header-admin-menu__item-title">
            Đổi mật khẩu
          </span>
        </span>
      </button>

      {isOpen && (
        <div
          className="change-password-overlay"
          role="presentation"
          onMouseDown={
            closeModal
          }
        >
          <div
            className="change-password-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="change-password-header">
              <div>
                <h2
                  id="change-password-title"
                >
                  Đổi mật khẩu
                </h2>

                <p>
                  Nhập mật khẩu hiện tại
                  và mật khẩu mới.
                </p>
              </div>

              <button
                type="button"
                className="change-password-close"
                onClick={
                  closeModal
                }
                disabled={
                  saving
                }
                aria-label="Đóng"
                title="Đóng"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
            >
              <label
                className="change-password-label"
                htmlFor="current-password"
              >
                Mật khẩu hiện tại
              </label>

              <div className="password-input-wrapper">
                <input
                  id="current-password"
                  type={
                    showCurrentPassword
                      ? "text"
                      : "password"
                  }
                  className="change-password-input"
                  value={
                    currentPassword
                  }
                  onChange={(
                    event
                  ) =>
                    setCurrentPassword(
                      event.target
                        .value
                    )
                  }
                  autoComplete="current-password"
                  disabled={
                    saving
                  }
                  autoFocus
                />

                <button
                  type="button"
                  className="password-eye-button"
                  onClick={() =>
                    setShowCurrentPassword(
                      (current) =>
                        !current
                    )
                  }
                  disabled={
                    saving
                  }
                  title={
                    showCurrentPassword
                      ? "Ẩn mật khẩu"
                      : "Hiện mật khẩu"
                  }
                  aria-label={
                    showCurrentPassword
                      ? "Ẩn mật khẩu hiện tại"
                      : "Hiện mật khẩu hiện tại"
                  }
                >
                  {showCurrentPassword ? (
                    <EyeOff
                      size={18}
                    />
                  ) : (
                    <Eye
                      size={18}
                    />
                  )}
                </button>
              </div>

              <label
                className="change-password-label"
                htmlFor="new-password"
              >
                Mật khẩu mới
              </label>

              <div className="password-input-wrapper">
                <input
                  id="new-password"
                  type={
                    showNewPassword
                      ? "text"
                      : "password"
                  }
                  className="change-password-input"
                  value={
                    newPassword
                  }
                  onChange={(
                    event
                  ) =>
                    setNewPassword(
                      event.target
                        .value
                    )
                  }
                  autoComplete="new-password"
                  disabled={
                    saving
                  }
                />

                <button
                  type="button"
                  className="password-eye-button"
                  onClick={() =>
                    setShowNewPassword(
                      (current) =>
                        !current
                    )
                  }
                  disabled={
                    saving
                  }
                  title={
                    showNewPassword
                      ? "Ẩn mật khẩu"
                      : "Hiện mật khẩu"
                  }
                  aria-label={
                    showNewPassword
                      ? "Ẩn mật khẩu mới"
                      : "Hiện mật khẩu mới"
                  }
                >
                  {showNewPassword ? (
                    <EyeOff
                      size={18}
                    />
                  ) : (
                    <Eye
                      size={18}
                    />
                  )}
                </button>
              </div>

              <label
                className="change-password-label"
                htmlFor="confirm-password"
              >
                Xác nhận mật khẩu mới
              </label>

              <div className="password-input-wrapper">
                <input
                  id="confirm-password"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  className="change-password-input"
                  value={
                    confirmPassword
                  }
                  onChange={(
                    event
                  ) =>
                    setConfirmPassword(
                      event.target
                        .value
                    )
                  }
                  autoComplete="new-password"
                  disabled={
                    saving
                  }
                />

                <button
                  type="button"
                  className="password-eye-button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (current) =>
                        !current
                    )
                  }
                  disabled={
                    saving
                  }
                  title={
                    showConfirmPassword
                      ? "Ẩn mật khẩu"
                      : "Hiện mật khẩu"
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Ẩn xác nhận mật khẩu mới"
                      : "Hiện xác nhận mật khẩu mới"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff
                      size={18}
                    />
                  ) : (
                    <Eye
                      size={18}
                    />
                  )}
                </button>
              </div>

              {error && (
                <div
                  className="change-password-error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <div className="change-password-actions">
                <button
                  type="button"
                  className="change-password-cancel"
                  onClick={
                    closeModal
                  }
                  disabled={
                    saving
                  }
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="change-password-submit"
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? "Đang đổi..."
                    : "Đổi mật khẩu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}