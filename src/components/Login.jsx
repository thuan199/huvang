import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  UserPlus,
} from "lucide-react";

import {
  supabase,
} from "../supabaseClient";

function getAuthErrorMessage(
  error,
  fallbackMessage =
    "Có lỗi xảy ra. Vui lòng thử lại.",
) {
  const errorCode =
    String(
      error?.code || "",
    ).toLowerCase();

  const errorMessage =
    String(
      error?.message || "",
    ).toLowerCase();

  if (
    errorCode === "user_banned" ||
    errorMessage.includes(
      "user is banned",
    ) ||
    errorMessage.includes(
      "banned",
    )
  ) {
    return (
      "Tài khoản của bạn đang bị khóa. " +
      "Vui lòng liên hệ quản trị viên qua email: thu2toite@gmail.com."
    );
  }

  if (
    errorCode ===
      "invalid_credentials" ||
    errorMessage.includes(
      "invalid login credentials",
    )
  ) {
    return "Email hoặc mật khẩu không đúng.";
  }

  if (
    errorCode ===
      "email_not_confirmed" ||
    errorMessage.includes(
      "email not confirmed",
    )
  ) {
    return (
      "Email chưa được xác nhận. " +
      "Vui lòng kiểm tra hộp thư."
    );
  }

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

  if (
    errorCode ===
      "over_request_rate_limit" ||
    errorCode ===
      "too_many_attempts" ||
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

  const targetTimestamp =
    new Date(
      targetTime,
    ).getTime();

  const remainingMilliseconds =
    targetTimestamp -
    Date.now();

  if (
    !Number.isFinite(
      targetTimestamp,
    ) ||
    remainingMilliseconds <= 0
  ) {
    return "";
  }

  const totalSeconds =
    Math.floor(
      remainingMilliseconds /
        1000,
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
    parts.push(
      `${days} ngày`,
    );
  }

  parts.push(
    `${String(hours).padStart(
      2,
      "0",
    )} giờ`,
  );

  parts.push(
    `${String(minutes).padStart(
      2,
      "0",
    )} phút`,
  );

  parts.push(
    `${String(seconds).padStart(
      2,
      "0",
    )} giây`,
  );

  return parts.join(" ");
}

function getGoogleLoginErrorMessage(
  errorValue,
) {
  const normalizedError =
    String(
      errorValue || "",
    ).toLowerCase();

  if (
    normalizedError.includes(
      "user is banned",
    ) ||
    normalizedError.includes(
      "user_banned",
    ) ||
    normalizedError.includes(
      "banned",
    )
  ) {
    return (
      "Tài khoản của bạn đang bị khóa. " +
      "Vui lòng liên hệ quản trị viên."
    );
  }

  if (
    normalizedError.includes(
      "access_denied",
    ) ||
    normalizedError.includes(
      "access denied",
    )
  ) {
    return (
      "Bạn đã hủy hoặc từ chối " +
      "đăng nhập bằng Google."
    );
  }

  return (
    errorValue ||
    "Không thể đăng nhập bằng Google."
  );
}

async function readJsonResponse(
  response,
) {
  const contentType =
    response.headers.get(
      "content-type",
    ) || "";

  if (
    !contentType.includes(
      "application/json",
    )
  ) {
    const text =
      await response.text();

    return {
      success: false,
      code:
        "invalid_server_response",
      error:
        text ||
        "Máy chủ trả về dữ liệu không hợp lệ.",
    };
  }

  return response.json();
}

export default function Login() {
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

  const [
    bannedUntil,
    setBannedUntil,
  ] = useState(null);

  const [
    remainingLockTime,
    setRemainingLockTime,
  ] = useState("");

  const googlePopupRef =
    useRef(null);

  const googlePopupWatcherRef =
    useRef(null);

  const googleLoginFinishedRef =
    useRef(false);

  const supabaseUrl =
    import.meta.env
      .VITE_SUPABASE_URL;

  const supabasePublicKey =
    import.meta.env
      .VITE_SUPABASE_ANON_KEY ||
    import.meta.env
      .VITE_SUPABASE_PUBLISHABLE_KEY;

  const bannedUntilText =
    useMemo(() => {
      if (!bannedUntil) {
        return "";
      }

      const date =
        new Date(
          bannedUntil,
        );

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        return "";
      }

      return new Intl.DateTimeFormat(
        "vi-VN",
        {
          dateStyle:
            "short",
          timeStyle:
            "medium",
          timeZone:
            "Asia/Ho_Chi_Minh",
        },
      ).format(date);
    }, [bannedUntil]);

  function clearBanStatus() {
    setBannedUntil(null);
    setRemainingLockTime("");
  }

  function changeMode(
    nextMode,
  ) {
    setMode(nextMode);
    setMessage("");
    setPassword("");
    setShowPassword(false);
    clearBanStatus();

    if (
      nextMode !==
      "register"
    ) {
      setDisplayName("");
    }
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

      if (!remaining) {
        clearBanStatus();

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

  function stopGooglePopupWatcher() {
    if (
      googlePopupWatcherRef.current
    ) {
      window.clearTimeout(
        googlePopupWatcherRef.current,
      );

      googlePopupWatcherRef.current =
        null;
    }
  }

  function finishGoogleLogin({
    message: nextMessage = "",
  } = {}) {
    googleLoginFinishedRef.current =
      true;

    stopGooglePopupWatcher();

    /*
     * Không gọi popup.close() từ cửa sổ cha.
     * COOP có thể chặn thao tác này sau khi popup
     * đã đi qua Google hoặc Supabase.
     *
     * OAuthCallback sẽ tự đóng chính nó sau khi
     * gửi postMessage về cửa sổ cha.
     */
    googlePopupRef.current =
      null;

    setLoading(false);
    setMessage(nextMessage);
  }

  /*
   * Nhận kết quả từ OAuthCallback.
   *
   * OAuthCallback nên gửi:
   * - GOOGLE_LOGIN_SUCCESS
   * - GOOGLE_LOGIN_ERROR
   */
  useEffect(() => {
    function handleOAuthMessage(
      event,
    ) {
      if (
        event.origin !==
        window.location.origin
      ) {
        return;
      }

      if (
        event.data?.type ===
        "GOOGLE_LOGIN_ERROR"
      ) {
        clearBanStatus();

        finishGoogleLogin({
          message:
            getGoogleLoginErrorMessage(
              event.data?.message,
            ),
        });

        return;
      }

      if (
        event.data?.type ===
        "GOOGLE_LOGIN_SUCCESS"
      ) {
        clearBanStatus();

        finishGoogleLogin({
          message: "",
        });
      }
    }

    window.addEventListener(
      "message",
      handleOAuthMessage,
    );

    return () => {
      window.removeEventListener(
        "message",
        handleOAuthMessage,
      );

      stopGooglePopupWatcher();

      googlePopupRef.current =
        null;
    };
  }, []);

  async function loginWithPassword(
    normalizedEmail,
  ) {
    if (!password) {
      setMessage(
        "Vui lòng nhập mật khẩu.",
      );

      return;
    }

    if (
      !supabaseUrl ||
      !supabasePublicKey
    ) {
      throw new Error(
        "Thiếu cấu hình Supabase ở frontend.",
      );
    }

    const functionUrl =
      `${supabaseUrl}/functions/v1/login-with-status`;

    const response =
      await fetch(
        functionUrl,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            apikey:
              supabasePublicKey,
          },

          body: JSON.stringify({
            email:
              normalizedEmail,

            /*
             * Không trim mật khẩu.
             * Khoảng trắng có thể là
             * một phần của mật khẩu.
             */
            password,
          }),
        },
      );

    const result =
      await readJsonResponse(
        response,
      );

    console.log(
      "login-with-status:",
      {
        status:
          response.status,
        code:
          result?.code,
        success:
          result?.success,
      },
    );

    if (!response.ok) {
      if (
        result?.code ===
        "user_banned"
      ) {
        setMessage(
          result?.error ||
          "Tài khoản của bạn đang bị khóa.",
        );

        setBannedUntil(
          result?.bannedUntil ||
          null,
        );

        return;
      }

      if (
        result?.code ===
        "too_many_attempts"
      ) {
        clearBanStatus();

        const retryAfter =
          Number(
            result?.retryAfter,
          );

        setMessage(
          Number.isFinite(
            retryAfter,
          )
            ? `Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${retryAfter} giây.`
            : "Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.",
        );

        return;
      }

      clearBanStatus();

      setMessage(
        result?.error ||
        "Email hoặc mật khẩu không đúng.",
      );

      return;
    }

    const accessToken =
      result?.session
        ?.accessToken;

    const refreshToken =
      result?.session
        ?.refreshToken;

    if (
      !accessToken ||
      !refreshToken
    ) {
      throw new Error(
        "Máy chủ không trả về phiên đăng nhập hợp lệ.",
      );
    }

    const {
      error:
        sessionError,
    } =
      await supabase.auth
        .setSession({
          access_token:
            accessToken,

          refresh_token:
            refreshToken,
        });

    if (sessionError) {
      throw sessionError;
    }

    clearBanStatus();
    setMessage("");
  }

  async function registerUser(
    normalizedEmail,
  ) {
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

    if (
      password.length < 6
    ) {
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

      return;
    }

    setMessage(
      "Đăng ký thành công. Vui lòng kiểm tra email để xác nhận tài khoản.",
    );
  }

  async function sendPasswordReset(
    normalizedEmail,
  ) {
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

      return;
    }

    setMessage(
      "Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.",
    );
  }

  async function handleSubmit(
    event,
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setMessage("");
    setLoading(true);

    try {
      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      if (
        !normalizedEmail
      ) {
        setMessage(
          "Vui lòng nhập email.",
        );

        return;
      }

      if (
        mode === "login"
      ) {
        await loginWithPassword(
          normalizedEmail,
        );

        return;
      }

      if (
        mode === "register"
      ) {
        await registerUser(
          normalizedEmail,
        );

        return;
      }

      if (
        mode === "forgot"
      ) {
        await sendPasswordReset(
          normalizedEmail,
        );
      }
    } catch (error) {
      console.error(
        "Lỗi xác thực:",
        error,
      );

      clearBanStatus();

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
    if (loading) {
      return;
    }

    setMessage("");
    clearBanStatus();
    setLoading(true);

    googleLoginFinishedRef.current =
      false;

    try {
      const popup =
        window.open(
          "",
          "google-login",
          "width=500,height=650,left=500,top=100",
        );

      if (!popup) {
        throw new Error(
          "Trình duyệt đang chặn cửa sổ đăng nhập. Vui lòng cho phép popup.",
        );
      }

      googlePopupRef.current =
        popup;

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
            provider:
              "google",

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

      stopGooglePopupWatcher();

      /*
       * Không kiểm tra currentPopup.closed và không đọc
       * currentPopup.location.href vì COOP có thể chặn.
       *
       * OAuthCallback gửi kết quả về bằng postMessage().
       * Timeout này chỉ tránh trạng thái loading kéo dài.
       */
      googlePopupWatcherRef.current =
        window.setTimeout(
          () => {
            googlePopupWatcherRef.current =
              null;

            if (
              googleLoginFinishedRef.current
            ) {
              return;
            }

            googlePopupRef.current =
              null;

            setLoading(false);

            setMessage(
              "Phiên đăng nhập Google đã hết thời gian. Bạn có thể đóng cửa sổ Google và thử lại.",
            );
          },
          120000,
        );
    } catch (error) {
      console.error(
        "Lỗi đăng nhập Google:",
        error,
      );

      finishGoogleLogin({
        message:
          getAuthErrorMessage(
            error,
            "Không thể đăng nhập bằng Google.",
          ),
      });
    }
  }

  return (
    <div className="login-page">
      <form
        className="login-card"
        onSubmit={
          handleSubmit
        }
      >
        <div className="login-logo">
          <img
            src="/logo.png"
            className="login-logo__image"
            alt="Hũ vàng"
          />
        </div>

        <h1>
          Hũ vàng
        </h1>

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
                <Clock3
                  size={22}
                />
              </div>

              <div>
                <strong>
                  Thời gian khóa còn lại
                </strong>

                <span>
                  {
                    remainingLockTime
                  }
                </span>

                {bannedUntilText && (
                  <small>
                    Tự động mở khóa lúc{" "}
                    {
                      bannedUntilText
                    }
                  </small>
                )}
              </div>
            </div>
          )}

        {mode ===
          "register" && (
          <div className="input-group">
            <UserPlus
              size={18}
            />

            <input
              type="text"
              placeholder="Tên hiển thị"
              value={
                displayName
              }
              onChange={(
                event,
              ) =>
                setDisplayName(
                  event.target
                    .value,
                )
              }
              autoComplete="name"
              disabled={
                loading
              }
            />
          </div>
        )}

        <div className="input-group">
          <Mail size={18} />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(
              event,
            ) =>
              setEmail(
                event.target
                  .value,
              )
            }
            autoComplete="email"
            disabled={
              loading
            }
          />
        </div>

        {mode !==
          "forgot" && (
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
              onChange={(
                event,
              ) =>
                setPassword(
                  event.target
                    .value,
                )
              }
              autoComplete={
                mode ===
                "register"
                  ? "new-password"
                  : "current-password"
              }
              disabled={
                loading
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
              disabled={
                loading
              }
            >
              {showPassword ? (
                <EyeOff
                  size={19}
                />
              ) : (
                <Eye
                  size={19}
                />
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
            mode ===
              "login" &&
            "Đăng nhập"}

          {!loading &&
            mode ===
              "register" &&
            "Đăng ký"}

          {!loading &&
            mode ===
              "forgot" &&
            "Gửi email khôi phục"}
        </button>

        {mode ===
          "login" && (
          <>
            <div className="login-divider">
              <span>
                hoặc
              </span>
            </div>

            <button
              type="button"
              className="google-login-button"
              onClick={
                handleGoogleLogin
              }
              disabled={
                loading
              }
            >
              <img
                src="/google-icon.svg"
                alt=""
                className="google-login-icon"
              />

              Đăng nhập bằng Google
            </button>
          </>
        )}

        <div className="login-links">
          {mode !==
            "login" && (
            <button
              type="button"
              onClick={() =>
                changeMode(
                  "login",
                )
              }
              disabled={
                loading
              }
            >
              Đã có tài khoản? Đăng nhập
            </button>
          )}

          {mode !==
            "register" && (
            <button
              type="button"
              onClick={() =>
                changeMode(
                  "register",
                )
              }
              disabled={
                loading
              }
            >
              Chưa có tài khoản? Đăng ký
            </button>
          )}

          {mode !==
            "forgot" && (
            <button
              type="button"
              onClick={() =>
                changeMode(
                  "forgot",
                )
              }
              disabled={
                loading
              }
            >
              <KeyRound
                size={14}
              />

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