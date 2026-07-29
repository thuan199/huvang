import {
  useState,
} from "react";

import {
  Eye,
  EyeOff,
} from "lucide-react";

import {
  supabase,
} from "../supabaseClient";

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
    hasPasswordLogin,
    setHasPasswordLogin,
  ] = useState(true);

  const [
    checkingProvider,
    setCheckingProvider,
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

  function getUserProviders(user) {
    const identityProviders =
      user?.identities
        ?.map(
          (identity) =>
            identity?.provider,
        )
        .filter(Boolean) ?? [];

    const metadataProviders =
      Array.isArray(
        user?.app_metadata
          ?.providers,
      )
        ? user.app_metadata
            .providers
        : [];

    const primaryProvider =
      user?.app_metadata
        ?.provider;

    return Array.from(
      new Set([
        ...identityProviders,
        ...metadataProviders,
        primaryProvider,
      ].filter(Boolean)),
    );
  }

  async function checkPasswordProvider() {
    const {
      data,
      error: userError,
    } =
      await supabase.auth
        .getUser();

    if (userError) {
      throw userError;
    }

    const user = data?.user;

    if (!user) {
      throw new Error(
        "Không tìm thấy thông tin tài khoản.",
      );
    }

    const providers =
      getUserProviders(user);

    /*
     * Có provider "email" nghĩa là tài khoản
     * đã hỗ trợ đăng nhập bằng email/mật khẩu.
     *
     * Chỉ có "google" nghĩa là user chưa tạo
     * mật khẩu cho ứng dụng.
     */
    const hasEmailProvider =
      providers.includes(
        "email",
      );

    setHasPasswordLogin(
      hasEmailProvider,
    );

    return {
      user,
      hasEmailProvider,
    };
  }

  async function openModal() {
    resetForm();
    setCheckingProvider(true);

    try {
      await checkPasswordProvider();
      setIsOpen(true);
    } catch (err) {
      console.error(
        "Lỗi kiểm tra phương thức đăng nhập:",
        err,
      );

      onSuccess?.(
        err?.message ||
          "Không thể kiểm tra thông tin tài khoản.",
      );
    } finally {
      setCheckingProvider(false);
    }
  }

  function closeModal() {
    if (saving) {
      return;
    }

    resetForm();
    setIsOpen(false);
  }

  async function verifyCurrentPassword(
    user,
  ) {
    if (!user?.email) {
      throw new Error(
        "Không tìm thấy email của tài khoản.",
      );
    }

    const {
      error: signInError,
    } =
      await supabase.auth
        .signInWithPassword({
          email:
            user.email,

          password:
            currentPassword,
        });

    if (signInError) {
      throw new Error(
        "Mật khẩu hiện tại không đúng.",
      );
    }
  }

  async function handleSubmit(
    event,
  ) {
    event.preventDefault();
    setError("");

    if (
      hasPasswordLogin &&
      !currentPassword
    ) {
      setError(
        "Vui lòng nhập mật khẩu hiện tại.",
      );

      return;
    }

    if (!newPassword) {
      setError(
        "Vui lòng nhập mật khẩu mới.",
      );

      return;
    }

    if (
      newPassword.length < 8
    ) {
      setError(
        "Mật khẩu mới phải có ít nhất 8 ký tự.",
      );

      return;
    }

    if (!confirmPassword) {
      setError(
        "Vui lòng xác nhận mật khẩu mới.",
      );

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setError(
        "Xác nhận mật khẩu mới không khớp.",
      );

      return;
    }

    if (
      hasPasswordLogin &&
      currentPassword ===
        newPassword
    ) {
      setError(
        "Mật khẩu mới phải khác mật khẩu hiện tại.",
      );

      return;
    }

    try {
      setSaving(true);

      const {
        data: userData,
        error: userError,
      } =
        await supabase.auth
          .getUser();

      if (userError) {
        throw userError;
      }

      const user =
        userData?.user;

      if (!user) {
        throw new Error(
          "Không tìm thấy thông tin tài khoản.",
        );
      }

      /*
       * Chỉ xác thực mật khẩu hiện tại khi
       * tài khoản đã có đăng nhập password.
       *
       * Tài khoản Google lần đầu sẽ bỏ qua bước này.
       */
      if (hasPasswordLogin) {
        await verifyCurrentPassword(
          user,
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

      const successMessage =
        hasPasswordLogin
          ? "Đã đổi mật khẩu thành công."
          : "Đã tạo mật khẩu đăng nhập thành công. Từ bây giờ bạn có thể đăng nhập bằng Google hoặc email và mật khẩu.";

      setHasPasswordLogin(true);

      resetForm();
      setIsOpen(false);

      onSuccess?.(
        successMessage,
      );
    } catch (err) {
      console.error(
        hasPasswordLogin
          ? "Lỗi đổi mật khẩu:"
          : "Lỗi tạo mật khẩu:",
        err,
      );

      setError(
        err?.message ||
          (hasPasswordLogin
            ? "Không thể đổi mật khẩu."
            : "Không thể tạo mật khẩu đăng nhập."),
      );
    } finally {
      setSaving(false);
    }
  }

  const modalTitle =
    hasPasswordLogin
      ? "Đổi mật khẩu"
      : "Tạo mật khẩu đăng nhập";

  const modalDescription =
    hasPasswordLogin
      ? "Nhập mật khẩu hiện tại và mật khẩu mới."
      : "Bạn đang đăng nhập bằng Google. Hãy tạo mật khẩu để có thể đăng nhập bằng email.";

  const submitLabel =
    hasPasswordLogin
      ? "Đổi mật khẩu"
      : "Tạo mật khẩu";

  return (
    <>
      <button
        type="button"
        className={
          buttonClassName ||
          "change-password-open-button"
        }
        onClick={openModal}
        disabled={
          checkingProvider
        }
        title="Mật khẩu đăng nhập"
      >
        {buttonIcon}

        <span className="header-admin-menu__item-content">
          <span className="header-admin-menu__item-title">
            {checkingProvider
              ? "Đang kiểm tra..."
              : "Mật khẩu đăng nhập"}
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
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <div className="change-password-header">
              <div>
                <h2
                  id="change-password-title"
                >
                  {modalTitle}
                </h2>

                <p>
                  {modalDescription}
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
              {hasPasswordLogin && (
                <>
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
                        event,
                      ) =>
                        setCurrentPassword(
                          event.target
                            .value,
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
                            !current,
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
                </>
              )}

              {!hasPasswordLogin && (
                <div className="change-password-info">
                  Tài khoản này đang sử dụng Google để đăng nhập và chưa có mật khẩu riêng.
                </div>
              )}

              <label
                className="change-password-label"
                htmlFor="new-password"
              >
                {hasPasswordLogin
                  ? "Mật khẩu mới"
                  : "Mật khẩu đăng nhập"}
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
                    event,
                  ) =>
                    setNewPassword(
                      event.target
                        .value,
                    )
                  }
                  autoComplete="new-password"
                  disabled={
                    saving
                  }
                  autoFocus={
                    !hasPasswordLogin
                  }
                />

                <button
                  type="button"
                  className="password-eye-button"
                  onClick={() =>
                    setShowNewPassword(
                      (current) =>
                        !current,
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
                    event,
                  ) =>
                    setConfirmPassword(
                      event.target
                        .value,
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
                        !current,
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
                    ? hasPasswordLogin
                      ? "Đang đổi..."
                      : "Đang tạo..."
                    : submitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}