import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Home,
  KeyRound,
  LogOut,
  MessageCircle,
  Moon,
  Pencil,
  Settings2,
  Sun,
  Users,
  Wrench,
  BadgeDollarSign,
} from "lucide-react";

import ChangePassword from "./ChangePassword";
import ChangeAvatar from "./ChangeAvatar";

function AppHeader({
  user,
  theme,
  isAdmin,
  activePage,
  onChangePage,
  onOpenMaintenance,
  onOpenUserManager,
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

  const [
    isSettingsMenuOpen,
    setIsSettingsMenuOpen,
  ] = useState(false);

  const settingsMenuRef =
    useRef(null);

  const metadata =
    user?.user_metadata ?? {};

  const displayName =
    metadata.display_name ||
    metadata.full_name ||
    metadata.name ||
    user?.email?.split("@")[0] ||
    "Người dùng";

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

  const showAvatarImage =
    Boolean(avatarUrl) &&
    !avatarError;

  useEffect(() => {
    setAvatarError(false);
  }, [avatarUrl]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(
          event.target
        )
      ) {
        setIsSettingsMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (
        event.key === "Escape"
      ) {
        setIsSettingsMenuOpen(false);
      }
    }

    if (isSettingsMenuOpen) {
      document.addEventListener(
        "mousedown",
        handleClickOutside
      );

      document.addEventListener(
        "keydown",
        handleKeyDown
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [isSettingsMenuOpen]);

  function closeSettingsMenu() {
    setIsSettingsMenuOpen(false);
  }

  function changePage(page) {
    closeSettingsMenu();
    onChangePage?.(page);
  }

  function handleChangeDisplayName() {
    closeSettingsMenu();
    onChangeDisplayName?.();
  }

  function handleOpenMaintenance() {
    closeSettingsMenu();
    onOpenMaintenance?.();
  }

  function handleOpenUserManager() {
    closeSettingsMenu();
    onOpenUserManager?.();
  }

  async function handleLogout() {
    closeSettingsMenu();

    try {
      await onLogout?.();
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  }

  return (
    <div className="topbar">
      <div className="app-title">
        <div className="app-logo">
          <button
            type="button"
            className="app-logo-button"
            onClick={() =>
              changePage("home")
            }
            title="Về Trang chủ"
            aria-label="Về Trang chủ"
          >
            <img
              src="/logo.png"
              className="login-logo"
              alt="Hũ vàng"
            />
          </button>
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
          <nav
            className="header-navigation"
            aria-label="Điều hướng chính"
          >
            <button
              type="button"
              className={
                activePage === "home"
                  ? "header-nav-button header-nav-button--active"
                  : "header-nav-button"
              }
              onClick={() =>
                changePage("home")
              }
              aria-current={
                activePage === "home"
                  ? "page"
                  : undefined
              }
              title="Trang chủ"
            >
              <Home
                size={17}
                strokeWidth={2.2}
              />

              <span>
                Trang chủ
              </span>
            </button>

            <button
              type="button"
              className={
                activePage === "chat"
                  ? "header-nav-button header-nav-button--active"
                  : "header-nav-button"
              }
              onClick={() =>
                changePage("chat")
              }
              aria-current={
                activePage === "chat"
                  ? "page"
                  : undefined
              }
              title="Chat cộng đồng"
            >
              <MessageCircle
                size={17}
                strokeWidth={2.2}
              />

              <span>
                Chat
              </span>
            </button>
          </nav>

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

              <div className="header-name-row">
                <strong
                  className="header-display-name"
                  title={displayName}
                >
                  {displayName}
                </strong>

                <div
                  className="header-admin-tools"
                  ref={settingsMenuRef}
                >
                  <button
                    type="button"
                    className="header-maintenance-button"
                    onClick={() =>
                      setIsSettingsMenuOpen(
                        (current) =>
                          !current
                      )
                    }
                    title={
                      isAdmin
                        ? "Bảng điều khiển quản trị"
                        : "Cài đặt tài khoản"
                    }
                    aria-label={
                      isAdmin
                        ? "Bảng điều khiển quản trị"
                        : "Cài đặt tài khoản"
                    }
                    aria-haspopup="menu"
                    aria-expanded={
                      isSettingsMenuOpen
                    }
                  >
                    <Settings2
                      size={17}
                      strokeWidth={2.2}
                    />
                  </button>

                  {isSettingsMenuOpen && (
                    <div
                      className="header-admin-menu"
                      role="menu"
                    >
                      <div className="header-admin-menu__header">
                        <Settings2
                          size={18}
                          strokeWidth={2}
                        />

                        <div className="header-admin-menu__header-content">
                          <span className="header-admin-menu__header-title">
                            {isAdmin
                              ? "Bảng điều khiển quản trị"
                              : "Cài đặt tài khoản"}
                          </span>

                          <span className="header-admin-menu__header-description">
                            {isAdmin
                              ? "Quản lý tài khoản và hệ thống"
                              : "Quản lý thông tin cá nhân"}
                          </span>
                        </div>
                      </div>

                      <div className="header-admin-menu__group">
                        <div className="header-admin-menu__group-title">
                          <span className="header-admin-menu__group-icon">
                            <Pencil
                              size={14}
                              strokeWidth={2}
                            />
                          </span>

                          <span className="header-admin-menu__group-title-text">
                            Tài khoản cá nhân
                          </span>
                        </div>

                        <div className="header-admin-menu__group-content">
                          <button
                            type="button"
                            className="header-admin-menu__item"
                            onClick={
                              handleChangeDisplayName
                            }
                            role="menuitem"
                          >
                            <span className="header-admin-menu__item-icon">
                              <Pencil
                                size={17}
                                strokeWidth={2}
                              />
                            </span>

                            <span className="header-admin-menu__item-content">
                              <span className="header-admin-menu__item-title">
                                Đổi tên hiển thị
                              </span>

                              <span className="header-admin-menu__item-description">
                                Thay đổi tên hiển thị trong hệ thống
                              </span>
                            </span>
                          </button>

                          <ChangePassword
                            onSuccess={() => {
                              closeSettingsMenu();
                              onPasswordChanged?.();
                            }}
                            buttonClassName="header-admin-menu__item"
                            buttonIcon={
                              <span className="header-admin-menu__item-icon">
                                <KeyRound
                                  size={17}
                                  strokeWidth={2}
                                />
                              </span>
                            }
                          />
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="header-admin-menu__group">
                          <div className="header-admin-menu__section-header">
                            <Settings2
                              size={17}
                              strokeWidth={2}
                            />

                            <div className="header-admin-menu__section-content">
                              <span className="header-admin-menu__section-title">
                                Quản trị hệ thống
                              </span>

                              <span className="header-admin-menu__section-description">
                                Công cụ dành cho quản trị viên
                              </span>
                            </div>
                          </div>

                          <div className="header-admin-menu__group-content">
                            <button
                              type="button"
                              className="header-admin-menu__item"
                              onClick={
                                handleOpenMaintenance
                              }
                              role="menuitem"
                            >
                              <span className="header-admin-menu__item-icon">
                                <Wrench
                                  size={17}
                                  strokeWidth={2}
                                />
                              </span>

                              <span className="header-admin-menu__item-content">
                                <span className="header-admin-menu__item-title">
                                  Bảo trì hệ thống
                                </span>

                                <span className="header-admin-menu__item-description">
                                  Quản lý trạng thái và bảo trì ứng dụng
                                </span>
                              </span>
                            </button>

                            <button
                              type="button"
                              className="header-admin-menu__item"
                              onClick={
                                handleOpenUserManager
                              }
                              role="menuitem"
                            >
                              <span className="header-admin-menu__item-icon">
                                <Users
                                  size={17}
                                  strokeWidth={2}
                                />
                              </span>

                              <span className="header-admin-menu__item-content">
                                <span className="header-admin-menu__item-title">
                                  Quản lý người dùng
                                </span>

                                <span className="header-admin-menu__item-description">
                                  Xem và quản lý tài khoản thành viên
                                </span>
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
            title="Đăng xuất"
          >
            <LogOut size={16} />

            <span>
              Đăng xuất
            </span>
          </button>

          <button
            type="button"
            className="theme-toggle small"
            onClick={onToggleTheme}
            title={
              theme === "light"
                ? "Chuyển sang giao diện tối"
                : "Chuyển sang giao diện sáng"
            }
            aria-label={
              theme === "light"
                ? "Chuyển sang giao diện tối"
                : "Chuyển sang giao diện sáng"
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