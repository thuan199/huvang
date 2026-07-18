import { useState } from 'react';
import {
  Mail,
  Lock,
  Coins,
  UserPlus,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [mode, setMode] = useState('login'); // login | register | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage('');
    setPassword('');
    setShowPassword(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const normalizedEmail = email.trim();

      if (!normalizedEmail) {
        setMessage('Vui lòng nhập email.');
        return;
      }

      if (mode === 'login') {
        if (!password.trim()) {
          setMessage('Vui lòng nhập mật khẩu.');
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) {
          setMessage('Email hoặc mật khẩu không đúng.');
        }

        return;
      }

      if (mode === 'register') {
        if (!displayName.trim()) {
          setMessage('Vui lòng nhập tên hiển thị.');
          return;
        }

        if (password.length < 6) {
          setMessage('Mật khẩu phải từ 6 ký tự trở lên.');
          return;
        }

        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              display_name: displayName.trim(),
            },
          },
        });

        if (error) {
          setMessage(error.message);
        } else {
          setMessage(
            'Đăng ký thành công. Vui lòng kiểm tra email để xác nhận tài khoản.'
          );
        }

        return;
      }

      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo: window.location.origin,
          }
        );

        if (error) {
          setMessage(error.message);
        } else {
          setMessage(
            'Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.'
          );
        }
      }
    } catch (error) {
      console.error('Lỗi xác thực:', error);
      setMessage(error?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">
          <img
          src="/logo.png"
          className="login-logo"
          />
        </div>

        <h1>Hũ vàng</h1>

        <p>
          {mode === 'login' && 'Đăng nhập để theo dõi đầu tư vàng'}
          {mode === 'register' && 'Tạo tài khoản mới'}
          {mode === 'forgot' && 'Khôi phục mật khẩu'}
        </p>

        {message && <div className="login-message">{message}</div>}

        {mode === 'register' && (
          <div className="input-group">
            <UserPlus size={18} />

            <input
              type="text"
              placeholder="Tên hiển thị"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
            />
          </div>
        )}

        <div className="input-group">
          <Mail size={18} />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        {mode !== 'forgot' && (
          <div className="input-group password-input-group">
            <Lock size={18} />

            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === 'register'
                  ? 'new-password'
                  : 'current-password'
              }
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? (
                <EyeOff size={19} />
              ) : (
                <Eye size={19} />
              )}
            </button>
          </div>
        )}

        <button
          className="login-button"
          type="submit"
          disabled={loading}
        >
          {loading && 'Đang xử lý...'}
          {!loading && mode === 'login' && 'Đăng nhập'}
          {!loading && mode === 'register' && 'Đăng ký'}
          {!loading && mode === 'forgot' && 'Gửi email khôi phục'}
        </button>

        <div className="login-links">
          {mode !== 'login' && (
            <button
              type="button"
              onClick={() => changeMode('login')}
            >
              Đã có tài khoản? Đăng nhập
            </button>
          )}

          {mode !== 'register' && (
            <button
              type="button"
              onClick={() => changeMode('register')}
            >
              Chưa có tài khoản? Đăng ký
            </button>
          )}

          {mode !== 'forgot' && (
            <button
              type="button"
              onClick={() => changeMode('forgot')}
            >
              <KeyRound size={14} />
              Quên mật khẩu?
            </button>
          )}
        </div>
        <div className="login-footer">
        <div className="login-footer-divider" />
        <p>© 2026 Phạm Ngọc Thuần</p>
      </div>
      </form>
    </div>
  );
}