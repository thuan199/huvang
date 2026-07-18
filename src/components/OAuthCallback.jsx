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
    async function finishLogin() {
      try {
        const {
          data,
          error,
        } =
          await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!data?.session) {
          setMessage(
            "Không lấy được phiên đăng nhập."
          );
          return;
        }

        setMessage(
          "Đăng nhập thành công. Đang đóng cửa sổ..."
        );

        window.opener?.postMessage(
          {
            type: "GOOGLE_LOGIN_SUCCESS",
          },
          window.location.origin
        );

        window.close();
      } catch (err) {
        console.error(
          "Lỗi xử lý OAuth callback:",
          err
        );

        setMessage(
          err?.message ||
            "Không thể hoàn tất đăng nhập."
        );
      }
    }

    finishLogin();
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