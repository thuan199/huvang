import {
  useEffect,
  useState,
} from "react";

import {
  KeyRound,
  LogOut,
  Moon,
  Pencil,
  Sun,
} from "lucide-react";

import ChangePassword from "./ChangePassword";
import ChangeAvatar from "./ChangeAvatar";
function AppHeader({
  user,
  theme,
  onChangeDisplayName,
  onPasswordChanged,
  onAvatarChanged,
  onLogout,
  onToggleTheme,
}) {
  const [
    avatarError,
    setAvatarError,
  ] = useState(false);

  const metadata =
    user?.user_metadata ?? {};

  /*
   * Ưu tiên tên do người dùng tự đặt trong Hũ vàng.
   * Nếu chưa có thì lấy tên Google, cuối cùng là email.
   */
  const displayName =
    metadata.display_name ||
    metadata.full_name ||
    metadata.name ||
    user?.email?.split("@")[0] ||
    "Người dùng";

  /*
   * Google thường trả ảnh tại avatar_url hoặc picture.
   */
  const avatarUrl =
    metadata.custom_avatar_url ||
    metadata.avatar_url ||
    metadata.picture ||
    "";

  const avatarLetter =
    displayName
      .trim()
      .charAt(0)
      .toUpperCase() || "U";

  useEffect(() => {
    setAvatarError(false);
  }, [avatarUrl]);

  const showAvatarImage =
    Boolean(avatarUrl) &&
    !avatarError;

  return (
    <div className="topbar">
      <div className="app-title">
        <div className="app-logo">
          <a href="https://huvang.vercel.app/">
            <img
              src="/logo.png"
              className="login-logo"
              alt="Hũ vàng"
            />
          </a>
        </div>

        <div>
          <h1>Hũ vàng</h1>

          <p className="user-email">
            Theo dõi lịch sử mua bán vàng
          </p>
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-actions">
          <div className="header-user-info">
            <div className="header-avatar-wrapper">
              <div className="header-avatar">
                {showAvatarImage ? (
                  <img
                    src={avatarUrl}
                    alt={`Ảnh đại diện của ${displayName}`}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setAvatarError(true)
                    }
                  />
                ) : (
                  <span>
                    {avatarLetter}
                  </span>
                )}
              </div>

              <ChangeAvatar
                user={user}
                onAvatarChanged={
                  onAvatarChanged
                }
              />
            </div>

            <div className="header-user-text">
              <span className="header-welcome">
                Xin chào,
              </span>

              <strong
                className="header-display-name"
                title={displayName}
              >
                {displayName}
              </strong>
            </div>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={onChangeDisplayName}
            title="Đổi tên hiển thị"
          >
            <Pencil size={16} />
            Đổi tên
          </button>

          <ChangePassword
            onSuccess={onPasswordChanged}
            buttonClassName="logout-button"
            buttonIcon={
              <KeyRound size={16} />
            }
          />

          <button
            type="button"
            className="logout-button"
            onClick={onLogout}
            title="Đăng xuất"
          >
            <LogOut size={16} />
            Đăng xuất
          </button>

          <button
            type="button"
            className="theme-toggle small"
            onClick={onToggleTheme}
            title={
              theme === "light"
                ? "Chuyển sang theme tối"
                : "Chuyển sang theme sáng"
            }
          >
            {theme === "light" ? (
              <Moon size={16} />
            ) : (
              <Sun size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AppHeader;