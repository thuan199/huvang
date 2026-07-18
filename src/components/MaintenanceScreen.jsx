import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function MaintenanceScreen({
  maintenance,
}) {
  const [loggingOut, setLoggingOut] =
    useState(false);

  async function handleLogout() {
    try {
      setLoggingOut(true);

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      window.location.reload();
    } catch (error) {
      console.error(
        "Không thể đăng xuất:",
        error
      );

      alert(
        error?.message ||
          "Không thể đăng xuất khỏi hệ thống."
      );

      setLoggingOut(false);
    }
  }

  return (
    <div className="maintenance-page">
      <div className="maintenance-card">
        <div className="maintenance-icon">
          🛠️
        </div>

        <h1>
          Website đang bảo trì
        </h1>

        <p>
          {maintenance?.message ||
            "Hệ thống đang được nâng cấp. Vui lòng quay lại sau."}
        </p>

        {maintenance?.expectedEndAt && (
          <p className="maintenance-time">
            Thời gian dự kiến hoàn thành:{" "}
            {new Date(
              maintenance.expectedEndAt
            ).toLocaleString("vi-VN")}
          </p>
        )}

        <div className="maintenance-actions">
          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
          >
            Thử lại
          </button>

          <button
            type="button"
            className="maintenance-logout-button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut
              ? "Đang đăng xuất..."
              : "Đăng xuất"}
          </button>
        </div>

        <p className="maintenance-login-note">
          Đăng xuất để chuyển sang tài khoản
          quản trị.
        </p>
      </div>
    </div>
  );
}