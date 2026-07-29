import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../supabaseClient";

export default function OAuthCallback() {
  const [
    message,
    setMessage,
  ] = useState(
    "Đang hoàn tất đăng nhập..."
  );

  useEffect(() => {
    let closeTimer;

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log(
            "OAuth callback:",
            event,
            session,
          );

          if (
            event !== "SIGNED_IN" &&
            event !== "INITIAL_SESSION"
          ) {
            return;
          }

          if (!session) {
            return;
          }

          setMessage(
            "Đăng nhập thành công. Đang đóng cửa sổ...",
          );

          if (window.opener) {
            window.opener.postMessage(
              {
                type:
                  "GOOGLE_LOGIN_SUCCESS",
              },
              window.location.origin,
            );
          }

          closeTimer =
            window.setTimeout(() => {
              window.close();

              // Nếu trình duyệt không cho đóng,
              // chuyển popup về trang chính.
              if (!window.closed) {
                window.location.replace(
                  "/",
                );
              }
            }, 300);
        },
      );

    async function checkExistingSession() {
      const {
        data,
        error,
      } =
        await supabase.auth.getSession();

      if (error) {
        console.error(
          "Lỗi lấy session:",
          error,
        );

        setMessage(
          error.message ||
          "Không thể hoàn tất đăng nhập.",
        );

        return;
      }

      if (data?.session) {
        setMessage(
          "Đăng nhập thành công. Đang đóng cửa sổ...",
        );

        window.opener?.postMessage(
          {
            type:
              "GOOGLE_LOGIN_SUCCESS",
          },
          window.location.origin,
        );

        closeTimer =
          window.setTimeout(() => {
            window.close();

            if (!window.closed) {
              window.location.replace(
                "/",
              );
            }
          }, 300);
      }
    }

    checkExistingSession();

    return () => {
      subscription.unsubscribe();

      if (closeTimer) {
        window.clearTimeout(
          closeTimer,
        );
      }
    };
  }, []);

  return (
    <div className="oauth-callback-page">
      <div className="oauth-callback-card">
        <h2>Hũ vàng</h2>
        <p>{message}</p>
      </div>
    </div>
  );
}