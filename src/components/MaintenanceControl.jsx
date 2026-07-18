import { useEffect, useState } from "react";
import { updateMaintenanceStatus } from "../services/appSettingsService";

export default function MaintenanceControl({
  maintenance,
  reloadMaintenance,
}) {
  const [message, setMessage] = useState(
    maintenance?.message ||
      "Website đang bảo trì. Vui lòng quay lại sau."
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMessage(
      maintenance?.message ||
        "Website đang bảo trì. Vui lòng quay lại sau."
    );
  }, [maintenance?.message]);

  const handleToggleMaintenance = async () => {
    try {
      setSaving(true);
      setError("");

      await updateMaintenanceStatus({
        enabled: !maintenance.enabled,
        message,
      });

      await reloadMaintenance();
    } catch (err) {
      console.error("Lỗi cập nhật chế độ bảo trì:", err);

      setError(
        err?.message ||
          "Không thể thay đổi trạng thái bảo trì."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="maintenance-control">
      <div className="maintenance-control__header">
        <div>
          <h3>🛠 Bảo trì hệ thống</h3>

          <p>
            Bật chế độ này trước khi sửa table, function hoặc
            Edge Function trên Supabase.
          </p>
        </div>

        <span
          className={
            maintenance.enabled
              ? "maintenance-status maintenance-status--on"
              : "maintenance-status maintenance-status--off"
          }
        >
          {maintenance.enabled
            ? "Đang bảo trì"
            : "Đang hoạt động"}
        </span>
      </div>

      <label className="maintenance-control__label">
        Nội dung thông báo
      </label>

      <textarea
        className="maintenance-control__textarea"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={3}
        disabled={saving}
        placeholder="Nhập nội dung thông báo bảo trì"
      />

      {error && (
        <div className="maintenance-control__error">
          {error}
        </div>
      )}

      <button
        type="button"
        className={
          maintenance.enabled
            ? "maintenance-button maintenance-button--disable"
            : "maintenance-button maintenance-button--enable"
        }
        onClick={handleToggleMaintenance}
        disabled={saving}
      >
        {saving
          ? "Đang xử lý..."
          : maintenance.enabled
            ? "Tắt bảo trì"
            : "Bật bảo trì"}
      </button>
    </div>
  );
}