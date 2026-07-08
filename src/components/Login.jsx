import { useState } from 'react';
import { Mail, Lock, Coins, UserPlus, KeyRound } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [mode, setMode] = useState('login'); // login | register | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      if (!email.trim()) {
        setMessage('Vui lòng nhập email.');
        return;
      }

      if (mode === 'login') {
        if (!password.trim()) {
          setMessage('Vui lòng nhập mật khẩu.');
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) setMessage('Email hoặc mật khẩu không đúng.');
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
          email: email.trim(),
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
          setMessage('Đăng ký thành công. Vui lòng kiểm tra email để xác nhận tài khoản.');
        }
      }

      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: window.location.origin,
          }
        );

        if (error) {
          setMessage(error.message);
        } else {
          setMessage('Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">
          <Coins size={42} />
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
          />
        </div>

        {mode !== 'forgot' && (
          <div className="input-group">
            <Lock size={18} />
            <input
              type="password"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}

        <button className="login-button" type="submit" disabled={loading}>
          {loading && 'Đang xử lý...'}
          {!loading && mode === 'login' && 'Đăng nhập'}
          {!loading && mode === 'register' && 'Đăng ký'}
          {!loading && mode === 'forgot' && 'Gửi email khôi phục'}
        </button>

        <div className="login-links">
          {mode !== 'login' && (
            <button type="button" onClick={() => setMode('login')}>
              Đã có tài khoản? Đăng nhập
            </button>
          )}

          {mode !== 'register' && (
            <button type="button" onClick={() => setMode('register')}>
              Chưa có tài khoản? Đăng ký
            </button>
          )}

          {mode !== 'forgot' && (
            <button type="button" onClick={() => setMode('forgot')}>
              <KeyRound size={14} />
              Quên mật khẩu?
            </button>
          )}
        </div>
      </form>
    </div>
  );
}