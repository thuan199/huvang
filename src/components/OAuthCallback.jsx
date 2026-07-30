import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function getFriendlyOAuthError(error) {
  const message = String(
    error?.message ||
    error?.error_description ||
    error ||
    ""
  ).toLowerCase();

  if (
    message.includes("banned") ||
    message.includes("ban duration") ||
    message.includes("user is banned")
  ) {
    return "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.";
  }

  if (
    message.includes("access_denied") ||
    message.includes("access denied")
  ) {
    return "Bạn đã hủy hoặc từ chối đăng nhập bằng Google.";
  }

  return "Không thể đăng nhập bằng Google. Vui lòng thử lại.";
}

export default function OAuthCallback() {
  const [message, setMessage] = useState(
    "Đang xác thực tài khoản Google..."
  );

  useEffect(() => {
    let mounted = true;

    async function completeOAuthLogin() {
      try {
        /*
         * Supabase có thể trả lỗi OAuth trong URL.
         */
        const params = new URLSearchParams(
          window.location.search
        );

        const hashParams = new URLSearchParams(
          window.location.hash.replace(/^#/, "")
        );

        const urlError =
          params.get("error_description") ||
          params.get("error") ||
          hashParams.get("error_description") ||
          hashParams.get("error");

        if (urlError) {
          throw new Error(urlError);
        }

        const {
          data,
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!data.session?.user) {
          throw new Error(
            "Không tìm thấy phiên đăng nhập."
          );
        }

        window.opener?.postMessage(
          {
            type: "GOOGLE_LOGIN_SUCCESS",
          },
          window.location.origin
        );

        if (mounted) {
          setMessage(
            "Đăng nhập thành công. Đang đóng cửa sổ..."
          );
        }

        window.setTimeout(() => {
          window.close();
        }, 300);
      } catch (error) {
        console.error(
          "Google OAuth callback error:",
          error
        );

        const friendlyMessage =
          getFriendlyOAuthError(error);

        if (mounted) {
          setMessage(friendlyMessage);
        }

        /*
         * Gửi lỗi về màn hình Login.
         */
        window.opener?.postMessage(
          {
            type: "GOOGLE_LOGIN_ERROR",
            message: friendlyMessage,
          },
          window.location.origin
        );

        /*
         * Đóng popup kể cả khi tài khoản bị khóa.
         */
        window.setTimeout(() => {
          window.close();
        }, 1200);
      }
    }

    completeOAuthLogin();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="oauth-callback">
      <div className="auth-spinner" />

      <p>{message}</p>
    </div>
  );
}