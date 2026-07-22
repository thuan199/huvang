import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  loadAdminChatReports,
  updateChatReportStatus,
} from "../../services/chatReportService";

function formatReportTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  ).format(date);
}

function getStatusLabel(status) {
  switch (status) {
    case "pending":
      return "Chờ xử lý";

    case "reviewed":
      return "Đã xem";

    case "resolved":
      return "Đã xử lý";

    case "dismissed":
      return "Đã bỏ qua";

    default:
      return "Không xác định";
  }
}

function getMessageContent(message) {
  if (!message) {
    return "Tin nhắn không còn tồn tại";
  }

  if (message.is_deleted) {
    return (
      message.moderation_message ||
      message.content ||
      (
        message.moderated_by
          ? "Tin nhắn đã bị xóa vì vi phạm quy định"
          : "Đã thu hồi tin nhắn"
      )
    );
  }

  return (
    message.content ||
    "Tin nhắn không còn nội dung"
  );
}

export default function ChatReportsAdmin({
  open,
  onClose,
  onManageUser,
  onRemoveViolation,
}) {
  const [
    reports,
    setReports,
  ] = useState([]);

  const [
    selectedReportId,
    setSelectedReportId,
  ] = useState(null);

  const [
    filter,
    setFilter,
  ] = useState("pending");

  const [
    adminNote,
    setAdminNote,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    processing,
    setProcessing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const loadReports =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await loadAdminChatReports();

        setReports(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (loadError) {
        setReports([]);

        setError(
          loadError?.message ||
          "Không tải được danh sách báo cáo."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setError("");
    loadReports();
  }, [
    open,
    loadReports,
  ]);

  const filteredReports =
    useMemo(() => {
      if (filter === "all") {
        return reports;
      }

      return reports.filter(
        (report) =>
          report.status ===
          filter
      );
    }, [
      reports,
      filter,
    ]);

  useEffect(() => {
    if (
      filteredReports.length === 0
    ) {
      setSelectedReportId(null);
      return;
    }

    const selectedStillExists =
      filteredReports.some(
        (report) =>
          report.id ===
          selectedReportId
      );

    if (!selectedStillExists) {
      setSelectedReportId(
        filteredReports[0].id
      );
    }
  }, [
    filteredReports,
    selectedReportId,
  ]);

  const selectedReport =
    useMemo(() => {
      return (
        reports.find(
          (report) =>
            report.id ===
            selectedReportId
        ) ?? null
      );
    }, [
      reports,
      selectedReportId,
    ]);

  useEffect(() => {
    setAdminNote(
      selectedReport
        ?.admin_note ?? ""
    );
  }, [
    selectedReport,
  ]);

  const pendingCount =
    useMemo(() => {
      return reports.filter(
        (report) =>
          report.status ===
          "pending"
      ).length;
    }, [reports]);

  if (!open) {
    return null;
  }

  async function changeStatus(
    report,
    status
  ) {
    if (
      !report?.id ||
      processing
    ) {
      return;
    }

    try {
      setProcessing(true);
      setError("");

      await updateChatReportStatus({
        reportId: report.id,
        status,
        adminNote:
          adminNote.trim(),
      });

      await loadReports();
    } catch (statusError) {
      setError(
        statusError?.message ||
        "Không cập nhật được trạng thái báo cáo."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleRemoveMessage() {
    if (
      processing ||
      !selectedReport?.message
    ) {
      return;
    }

    if (
      selectedReport.message
        .is_deleted
    ) {
      setError(
        "Tin nhắn này đã được xóa hoặc thu hồi."
      );

      return;
    }

    if (
      typeof onRemoveViolation !==
      "function"
    ) {
      setError(
        "Chức năng xóa tin nhắn chưa được cấu hình."
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Bạn có chắc muốn xóa tin nhắn này vì vi phạm?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setProcessing(true);
      setError("");

      const success =
        await onRemoveViolation(
          selectedReport
        );

      if (success !== true) {
        setError(
          "Không thể xóa tin nhắn vi phạm."
        );

        return;
      }

      await updateChatReportStatus({
        reportId:
          selectedReport.id,

        status:
          "resolved",

        adminNote:
          adminNote.trim() ||
          "Đã xóa tin nhắn vi phạm.",
      });

      await loadReports();
    } catch (removeError) {
      setError(
        removeError?.message ||
        "Không xóa được tin nhắn."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleManageUser() {
    if (
      processing ||
      !selectedReport?.message
    ) {
      return;
    }

    if (
      typeof onManageUser !==
      "function"
    ) {
      setError(
        "Chức năng quản lý thành viên chưa được cấu hình."
      );

      return;
    }

    try {
      setProcessing(true);
      setError("");

      if (
        selectedReport.status ===
        "pending"
      ) {
        await updateChatReportStatus({
          reportId:
            selectedReport.id,

          status:
            "reviewed",

          adminNote:
            adminNote.trim(),
        });
      }

      const message =
        selectedReport.message;

      if (
        typeof onClose ===
        "function"
      ) {
        onClose();
      }

      onManageUser(message);
    } catch (manageError) {
      setError(
        manageError?.message ||
        "Không mở được chức năng quản lý thành viên."
      );
    } finally {
      setProcessing(false);
    }
  }

  function handleClose() {
    if (processing) {
      return;
    }

    if (
      typeof onClose ===
      "function"
    ) {
      onClose();
    }
  }

  function selectFilter(
    nextFilter
  ) {
    if (processing) {
      return;
    }

    setFilter(nextFilter);
    setSelectedReportId(null);
    setError("");
  }

  function selectReport(
    reportId
  ) {
    if (processing) {
      return;
    }

    setSelectedReportId(
      reportId
    );

    setError("");
  }

  return (
    <div
      className="chat-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          handleClose();
        }
      }}
    >
      <div
        className="chat-reports-admin"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-reports-title"
      >
        <div className="chat-modal__header">
          <div>
            <h3 id="chat-reports-title">
              Báo cáo vi phạm
            </h3>

            <span className="chat-reports-admin__summary">
              {pendingCount} báo cáo
              chờ xử lý
            </span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={processing}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <div className="chat-reports-admin__filters">
          <button
            type="button"
            className={
              filter === "pending"
                ? "active"
                : ""
            }
            disabled={processing}
            onClick={() =>
              selectFilter(
                "pending"
              )
            }
          >
            Chờ xử lý
          </button>

          <button
            type="button"
            className={
              filter === "reviewed"
                ? "active"
                : ""
            }
            disabled={processing}
            onClick={() =>
              selectFilter(
                "reviewed"
              )
            }
          >
            Đã xem
          </button>

          <button
            type="button"
            className={
              filter === "resolved"
                ? "active"
                : ""
            }
            disabled={processing}
            onClick={() =>
              selectFilter(
                "resolved"
              )
            }
          >
            Đã xử lý
          </button>

          <button
            type="button"
            className={
              filter === "dismissed"
                ? "active"
                : ""
            }
            disabled={processing}
            onClick={() =>
              selectFilter(
                "dismissed"
              )
            }
          >
            Bỏ qua
          </button>

          <button
            type="button"
            className={
              filter === "all"
                ? "active"
                : ""
            }
            disabled={processing}
            onClick={() =>
              selectFilter("all")
            }
          >
            Tất cả
          </button>
        </div>

        {error && (
          <div className="chat-alert chat-alert--error">
            {error}
          </div>
        )}

        <div className="chat-reports-admin__body">
          <div className="chat-reports-admin__list">
            {loading ? (
              <div className="chat-reports-admin__empty">
                Đang tải báo cáo...
              </div>
            ) : filteredReports.length ===
              0 ? (
              <div className="chat-reports-admin__empty">
                Không có báo cáo.
              </div>
            ) : (
              filteredReports.map(
                (report) => (
                  <button
                    key={report.id}
                    type="button"
                    disabled={
                      processing
                    }
                    className={
                      selectedReportId ===
                      report.id
                        ? "chat-report-item active"
                        : "chat-report-item"
                    }
                    onClick={() =>
                      selectReport(
                        report.id
                      )
                    }
                  >
                    <div className="chat-report-item__top">
                      <strong>
                        {report.message
                          ?.profile
                          ?.display_name ||
                          "Thành viên"}
                      </strong>

                      <span
                        className={
                          `chat-report-status ` +
                          `chat-report-status--${report.status}`
                        }
                      >
                        {getStatusLabel(
                          report.status
                        )}
                      </span>
                    </div>

                    <p>
                      {getMessageContent(
                        report.message
                      )}
                    </p>

                    <small>
                      {formatReportTime(
                        report.created_at
                      )}
                    </small>
                  </button>
                )
              )
            )}
          </div>

          <div className="chat-reports-admin__detail">
            {!selectedReport ? (
              <div className="chat-reports-admin__empty">
                Chọn một báo cáo để xem.
              </div>
            ) : (
              <>
                <div className="chat-report-detail__row">
                  <span>
                    Người báo cáo
                  </span>

                  <strong>
                    {selectedReport
                      .reporterProfile
                      ?.display_name ||
                      "Thành viên"}
                  </strong>
                </div>

                <div className="chat-report-detail__row">
                  <span>
                    Người bị báo cáo
                  </span>

                  <strong>
                    {selectedReport
                      .message
                      ?.profile
                      ?.display_name ||
                      "Thành viên"}
                  </strong>
                </div>

                <div className="chat-report-detail__row">
                  <span>
                    Trạng thái
                  </span>

                  <strong>
                    {getStatusLabel(
                      selectedReport.status
                    )}
                  </strong>
                </div>

                <div className="chat-report-detail__row">
                  <span>
                    Lý do
                  </span>

                  <strong>
                    {selectedReport.reason ||
                      "Không có"}
                  </strong>
                </div>

                <div className="chat-report-detail__row">
                  <span>
                    Thời gian
                  </span>

                  <strong>
                    {formatReportTime(
                      selectedReport.created_at
                    )}
                  </strong>
                </div>

                <div className="chat-report-detail__section">
                  <label>
                    Nội dung bị báo cáo
                  </label>

                  <div className="chat-report-detail__message">
                    {getMessageContent(
                      selectedReport.message
                    )}
                  </div>
                </div>

                <div className="chat-report-detail__section">
                  <label>
                    Mô tả của người báo cáo
                  </label>

                  <div className="chat-report-detail__description">
                    {selectedReport.description ||
                      "Không có mô tả."}
                  </div>
                </div>

                <div className="chat-report-detail__section">
                  <label htmlFor="chat-report-note">
                    Ghi chú của admin
                  </label>

                  <textarea
                    id="chat-report-note"
                    value={adminNote}
                    rows={3}
                    maxLength={500}
                    disabled={processing}
                    placeholder="Nhập ghi chú xử lý..."
                    onChange={(event) =>
                      setAdminNote(
                        event.target.value
                      )
                    }
                  />

                  <div className="chat-modal__count">
                    {adminNote.length}/500
                  </div>
                </div>

                <div className="chat-report-detail__actions">
                  <button
                    type="button"
                    className="chat-button chat-button--secondary"
                    disabled={
                      processing ||
                      !selectedReport.message
                    }
                    onClick={
                      handleManageUser
                    }
                  >
                    Quản lý thành viên
                  </button>

                  <button
                    type="button"
                    className="chat-button chat-button--danger"
                    disabled={
                      processing ||
                      !selectedReport.message ||
                      selectedReport
                        .message
                        .is_deleted
                    }
                    onClick={
                      handleRemoveMessage
                    }
                  >
                    {processing
                      ? "Đang xử lý..."
                      : "Xóa tin vi phạm"}
                  </button>

                  <button
                    type="button"
                    className="chat-button chat-button--warning"
                    disabled={
                      processing ||
                      selectedReport
                        .status ===
                        "reviewed"
                    }
                    onClick={() =>
                      changeStatus(
                        selectedReport,
                        "reviewed"
                      )
                    }
                  >
                    Đánh dấu đã xem
                  </button>

                  <button
                    type="button"
                    className="chat-button chat-button--secondary"
                    disabled={
                      processing ||
                      selectedReport
                        .status ===
                        "dismissed"
                    }
                    onClick={() =>
                      changeStatus(
                        selectedReport,
                        "dismissed"
                      )
                    }
                  >
                    Bỏ qua báo cáo
                  </button>

                  <button
                    type="button"
                    className="chat-button chat-button--primary"
                    disabled={
                      processing ||
                      selectedReport
                        .status ===
                        "resolved"
                    }
                    onClick={() =>
                      changeStatus(
                        selectedReport,
                        "resolved"
                      )
                    }
                  >
                    Đánh dấu đã xử lý
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}