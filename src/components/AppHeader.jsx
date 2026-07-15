import {
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';

function AppHeader({
  user,
  theme,
  onChangeDisplayName,
  onLogout,
  onToggleTheme,
}) {
  const displayName =
    user?.user_metadata?.display_name ||
    user?.email ||
    'Người dùng';

  return (
    <div className="topbar">
      <div className="app-title">
        <div className="app-logo">
          <a href="https://gold-tracker-drab.vercel.app/">
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
          <div className="welcome-user">
            Xin chào, <strong>{displayName}</strong>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={onChangeDisplayName}
          >
            Đổi tên
          </button>

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
              theme === 'light'
                ? 'Chuyển sang theme tối'
                : 'Chuyển sang theme sáng'
            }
          >
            {theme === 'light' ? (
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