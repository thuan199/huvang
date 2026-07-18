import {
  useState,
} from "react";

import { supabase } from "../supabaseClient";

export default function ChangePassword({
  onSuccess,
  buttonClassName = '',
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
    showPassword,
    setShowPassword,
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
    setError("");
    setShowPassword(false);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    resetForm();
    setIsOpen(false);
  }

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    setError("");

    if (!currentPassword) {
      setError(
        "Vui lòng nhập mật khẩu hiện tại."
      );
      return;
    }

    if (!newPassword) {
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

      const user =
        userData?.user;

      if (!user?.email) {
        throw new Error(
          "Không tìm thấy email của tài khoản."
        );
      }

      /*
       * Xác nhận mật khẩu hiện tại bằng cách
       * đăng nhập lại với email hiện tại.
       */
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

      /*
       * Đổi mật khẩu cho user đang đăng nhập.
       */
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
          'change-password-open-button'
        }
        onClick={() => setIsOpen(true)}
        title="Đổi mật khẩu"
      >
        {buttonIcon}
        Đổi mật khẩu
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
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
            >
              <label className="change-password-label">
                Mật khẩu hiện tại
              </label>

              <input
                type={
                  showPassword
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
              />

              <label className="change-password-label">
                Mật khẩu mới
              </label>

              <input
                type={
                  showPassword
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

              <label className="change-password-label">
                Xác nhận mật khẩu mới
              </label>

              <input
                type={
                  showPassword
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

              <label className="change-password-show">
                <input
                  type="checkbox"
                  checked={
                    showPassword
                  }
                  onChange={(
                    event
                  ) =>
                    setShowPassword(
                      event.target
                        .checked
                    )
                  }
                  disabled={
                    saving
                  }
                />

                Hiển thị mật khẩu
              </label>

              {error && (
                <div className="change-password-error">
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