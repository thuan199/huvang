import {
  useEffect,
  useState,
} from "react";

import {
  Mail,
  Lock,
  UserPlus,
  KeyRound,
  Eye,
  EyeOff,
  Clock3,
} from "lucide-react";

import { supabase } from "../supabaseClient";

/*
 * Chuyển lỗi kỹ thuật của Supabase
 * thành thông báo tiếng Việt dễ hiểu.
 */
function getAuthErrorMessage(
  error,
  fallbackMessage = "Có lỗi xảy ra. Vui lòng thử lại.",
) {
  const errorCode = String(
    error?.code || "",
  ).toLowerCase();

  const errorMessage = String(
    error?.message || "",
  ).toLowerCase();

  /*
   * Tài khoản đã bị admin khóa.
   */
  if (
    errorCode === "user_banned" ||
    errorMessage.includes("user is banned") ||
    errorMessage.includes("banned")
  ) {
    return (
      "Tài khoản của bạn đã bị khóa. " +
      "Vui lòng liên hệ quản trị viên để được hỗ trợ."
    );
  }

  /*
   * Sai email hoặc mật khẩu.
   */
  if (
    errorCode ===
    "invalid_credentials" ||
    errorMessage.includes(
      "invalid login credentials",
    )
  ) {
    return "Email hoặc mật khẩu không đúng.";
  }

  /*
   * Email chưa được xác nhận.
   */
  if (
    errorCode ===
    "email_not_confirmed" ||
    errorMessage.includes(
      "email not confirmed",
    )
  ) {
    return (
      "Email chưa được xác nhận. " +
      "Vui lòng kiểm tra hộp thư của bạn."
    );
  }

  /*
   * Email đã tồn tại khi đăng ký.
   */
  if (
    errorCode ===
    "user_already_exists" ||
    errorMessage.includes(
      "user already registered",
    ) ||
    errorMessage.includes(
      "already been registered",
    )
  ) {
    return "Email này đã được đăng ký.";
  }

  /*
   * Gửi yêu cầu quá nhiều lần.
   */
  if (
    errorCode ===
    "over_request_rate_limit" ||
    errorMessage.includes(
      "rate limit",
    )
  ) {
    return (
      "Bạn đã thao tác quá nhiều lần. " +
      "Vui lòng thử lại sau."
    );
  }

  return (
    error?.message ||
    fallbackMessage
  );
}

function formatRemainingTime(
  targetTime,
) {
  if (!targetTime) {
    return "";
  }

  const remainingMilliseconds =
    new Date(targetTime).getTime() -
    Date.now();

  if (
    !Number.isFinite(
      remainingMilliseconds,
    ) ||
    remainingMilliseconds <= 0
  ) {
    return "";
  }

  const totalSeconds =
    Math.floor(
      remainingMilliseconds / 1000,
    );

  const days =
    Math.floor(
      totalSeconds / 86400,
    );

  const hours =
    Math.floor(
      (totalSeconds % 86400) /
      3600,
    );

  const minutes =
    Math.floor(
      (totalSeconds % 3600) /
      60,
    );

  const seconds =
    totalSeconds % 60;

  const parts = [];

  if (days > 0) {
    parts.push(`${days} ngày`);
  }

  parts.push(
    `${String(hours).padStart(2, "0")} giờ`,
  );

  parts.push(
    `${String(minutes).padStart(2, "0")} phút`,
  );

  parts.push(
    `${String(seconds).padStart(2, "0")} giây`,
  );

  return parts.join(" ");
}

export default function Login() {
  const [
    bannedUntil,
    setBannedUntil,
  ] = useState(null);

  const [
    remainingLockTime,
    setRemainingLockTime,
  ] = useState("");

  const [
    mode,
    setMode,
  ] = useState("login");

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    displayName,
    setDisplayName,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    setPassword("");
    setShowPassword(false);
  }

  useEffect(() => {
    if (!bannedUntil) {
      setRemainingLockTime("");
      return undefined;
    }

    function updateCountdown() {
      const remaining =
        formatRemainingTime(
          bannedUntil,
        );

      setRemainingLockTime(
        remaining,
      );

      /*
       * Hết thời gian khóa.
       */
      if (!remaining) {
        setBannedUntil(null);

        setMessage(
          "Thời gian khóa đã kết thúc. Bạn có thể đăng nhập lại.",
        );
      }
    }

    updateCountdown();

    const intervalId =
      window.setInterval(
        updateCountdown,
        1000,
      );

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, [bannedUntil]);

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const normalizedEmail =
        email.trim();

      if (!normalizedEmail) {
        setMessage(
          "Vui lòng nhập email.",
        );
        return;
      }

      /*
       * Đăng nhập bằng email và mật khẩu.
       */
      if (mode === "login") {
        if (!password.trim()) {
          setMessage(
            "Vui lòng nhập mật khẩu.",
          );
          return;
        }

        const functionUrl =
          `${import.meta.env.VITE_SUPABASE_URL}` +
          "/functions/v1/login-with-status";

        const response =
          await fetch(
            functionUrl,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                apikey:
                  import.meta.env
                    .VITE_SUPABASE_ANON_KEY,
              },

              body: JSON.stringify({
                email:
                  normalizedEmail,
                password,
              }),
            },
          );

        const result =
          await response.json();

        if (!response.ok) {
          if (
            result?.code ===
            "user_banned"
          ) {
            setMessage(
              result.error ||
              "Tài khoản của bạn đang bị khóa.",
            );

            setBannedUntil(
              result.bannedUntil ??
              null,
            );

            return;
          }

          setBannedUntil(null);

          setMessage(
            result?.error ||
            "Không thể đăng nhập.",
          );

          return;
        }

        const {
          error: sessionError,
        } =
          await supabase.auth
            .setSession({
              access_token:
                result.session
                  .accessToken,

              refresh_token:
                result.session
                  .refreshToken,
            });

        if (sessionError) {
          throw sessionError;
        }

        setBannedUntil(null);
        setRemainingLockTime("");

        return;
      }

      /*
       * Đăng ký tài khoản.
       */
      if (mode === "register") {
        const normalizedDisplayName =
          displayName.trim();

        if (
          !normalizedDisplayName
        ) {
          setMessage(
            "Vui lòng nhập tên hiển thị.",
          );
          return;
        }

        if (password.length < 6) {
          setMessage(
            "Mật khẩu phải từ 6 ký tự trở lên.",
          );
          return;
        }

        const {
          error,
        } =
          await supabase.auth
            .signUp({
              email:
                normalizedEmail,

              password,

              options: {
                data: {
                  display_name:
                    normalizedDisplayName,
                },
              },
            });

        if (error) {
          setMessage(
            getAuthErrorMessage(
              error,
              "Không thể đăng ký tài khoản.",
            ),
          );
        } else {
          setMessage(
            "Đăng ký thành công. " +
            "Vui lòng kiểm tra email để xác nhận tài khoản.",
          );
        }

        return;
      }

      /*
       * Quên mật khẩu.
       */
      if (mode === "forgot") {
        const {
          error,
        } =
          await supabase.auth
            .resetPasswordForEmail(
              normalizedEmail,
              {
                redirectTo:
                  window.location
                    .origin,
              },
            );

        if (error) {
          setMessage(
            getAuthErrorMessage(
              error,
              "Không thể gửi email khôi phục mật khẩu.",
            ),
          );
        } else {
          setMessage(
            "Đã gửi email đặt lại mật khẩu. " +
            "Vui lòng kiểm tra hộp thư.",
          );
        }
      }
    } catch (error) {
      console.error(
        "Lỗi xác thực:",
        error,
      );

      setMessage(
        getAuthErrorMessage(
          error,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    let popup = null;

    setMessage("");

    try {
      /*
       * Mở popup ngay khi người dùng bấm
       * để tránh bị trình duyệt chặn.
       */
      popup = window.open(
        "",
        "google-login",
        "width=500,height=650,left=500,top=100",
      );

      if (!popup) {
        throw new Error(
          "Trình duyệt đang chặn cửa sổ đăng nhập. " +
          "Vui lòng cho phép popup.",
        );
      }

      popup.document.title =
        "Đang mở đăng nhập Google...";

      popup.document.body.innerHTML = `
        <div style="
          font-family: Arial, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        ">
          Đang mở đăng nhập Google...
        </div>
      `;

      const {
        data,
        error,
      } =
        await supabase.auth
          .signInWithOAuth({
            provider: "google",

            options: {
              redirectTo:
                `${window.location.origin}/oauth-callback`,

              skipBrowserRedirect:
                true,

              queryParams: {
                prompt:
                  "select_account",
              },
            },
          });

      if (error) {
        throw error;
      }

      if (!data?.url) {
        throw new Error(
          "Không lấy được đường dẫn đăng nhập Google.",
        );
      }

      popup.location.href =
        data.url;
    } catch (error) {
      popup?.close();

      console.error(
        "Lỗi đăng nhập Google:",
        error,
      );

      setMessage(
        getAuthErrorMessage(
          error,
          "Không thể đăng nhập bằng Google.",
        ),
      );
    }
  }

  return (
    <div className="login-page">
      <form
        className="login-card"
        onSubmit={handleSubmit}
      >
        <div className="login-logo">
          <img
            src="/logo.png"
            className="login-logo"
            alt="Hũ vàng"
          />
        </div>

        <h1>Hũ vàng</h1>

        <p>
          {mode === "login" &&
            "Đăng nhập để theo dõi đầu tư vàng"}

          {mode === "register" &&
            "Tạo tài khoản mới"}

          {mode === "forgot" &&
            "Khôi phục mật khẩu"}
        </p>

        {message && (
          <div className="login-message">
            {message}
          </div>
        )}

        {bannedUntil &&
          remainingLockTime && (
            <div className="login-ban-countdown">
              <div className="login-ban-countdown__icon">
                <Clock3 size={22} />
              </div>

              <div>
                <strong>
                  Thời gian khóa còn lại
                </strong>

                <span>
                  {remainingLockTime}
                </span>

                <small>
                  Tự động mở khóa lúc{" "}
                  {new Intl.DateTimeFormat(
                    "vi-VN",
                    {
                      dateStyle: "short",
                      timeStyle: "medium",
                      timeZone:
                        "Asia/Ho_Chi_Minh",
                    },
                  ).format(
                    new Date(bannedUntil),
                  )}
                </small>
              </div>
            </div>
          )}

        {mode === "register" && (
          <div className="input-group">
            <UserPlus size={18} />

            <input
              type="text"
              placeholder="Tên hiển thị"
              value={displayName}
              onChange={(event) =>
                setDisplayName(
                  event.target.value,
                )
              }
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
            onChange={(event) =>
              setEmail(
                event.target.value,
              )
            }
            autoComplete="email"
          />
        </div>

        {mode !== "forgot" && (
          <div className="input-group password-input-group">
            <Lock size={18} />

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Mật khẩu"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              autoComplete={
                mode === "register"
                  ? "new-password"
                  : "current-password"
              }
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowPassword(
                  (current) =>
                    !current,
                )
              }
              title={
                showPassword
                  ? "Ẩn mật khẩu"
                  : "Hiện mật khẩu"
              }
              aria-label={
                showPassword
                  ? "Ẩn mật khẩu"
                  : "Hiện mật khẩu"
              }
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
          {loading &&
            "Đang xử lý..."}

          {!loading &&
            mode === "login" &&
            "Đăng nhập"}

          {!loading &&
            mode === "register" &&
            "Đăng ký"}

          {!loading &&
            mode === "forgot" &&
            "Gửi email khôi phục"}
        </button>

        <div className="login-divider">
          <span>hoặc</span>
        </div>

        <button
          type="button"
          className="google-login-button"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <img
            src="/google-icon.svg"
            alt=""
            className="google-login-icon"
          />

          Đăng nhập bằng Google
        </button>

        <div className="login-links">
          {mode !== "login" && (
            <button
              type="button"
              onClick={() =>
                changeMode("login")
              }
            >
              Đã có tài khoản? Đăng nhập
            </button>
          )}

          {mode !== "register" && (
            <button
              type="button"
              onClick={() =>
                changeMode(
                  "register",
                )
              }
            >
              Chưa có tài khoản? Đăng ký
            </button>
          )}

          {mode !== "forgot" && (
            <button
              type="button"
              onClick={() =>
                changeMode("forgot")
              }
            >
              <KeyRound size={14} />
              Quên mật khẩu?
            </button>
          )}
        </div>

        <div className="login-footer">
          <div className="login-footer-divider" />

          <p>
            © 2026 Phạm Ngọc Thuần
          </p>
        </div>
      </form>
    </div>
  );
}