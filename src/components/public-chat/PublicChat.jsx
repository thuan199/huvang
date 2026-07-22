import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useChatPresence,
} from "../../hooks/useChatPresence";

import {
  usePublicChat,
} from "../../hooks/usePublicChat";

import {
  getPendingChatReportCount,
} from "../../services/chatReportService";

import {
  supabase,
} from "../../supabaseClient";

import ChatAdminModal from "./ChatAdminModal";
import ChatComposer from "./ChatComposer";
import ChatMessageList from "./ChatMessageList";
import ChatRemoveModal from "./ChatRemoveModal";
import ChatReportModal from "./ChatReportModal";
import ChatReportsAdmin from "./ChatReportsAdmin";

import "./PublicChat.css";

export default function PublicChat() {
  const {
    messages,
    currentUser,
    currentProfile,
    isAdmin,
    activeBan,
    loading,
    sending,
    error,
    success,
    cooldownRemaining,

    reloadMessages,
    sendMessage,
    deleteMessage,
    toggleReaction,
    submitReport,
    banUser,
    unbanUser,
    clearNotice,
    removeMessageByAdmin,
  } = usePublicChat();

  const [clearToastOpen, setClearToastOpen] =
    useState(false);

  const [
    localNotice,
    setLocalNotice,
  ] = useState(null);

  useEffect(() => {
    if (!localNotice) {
      return undefined;
    }

    const timer =
      window.setTimeout(() => {
        setLocalNotice(null);
      }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [localNotice]);

  const [isClearing, setIsClearing] =
    useState(false);

  const [
    pendingReportCount,
    setPendingReportCount,
  ] = useState(0);

  const [
    isReportsAdminOpen,
    setIsReportsAdminOpen,
  ] = useState(false);

  const [
    removingMessage,
    setRemovingMessage,
  ] = useState(null);

  const [
    replyingTo,
    setReplyingTo,
  ] = useState(null);

  const [
    reportingMessage,
    setReportingMessage,
  ] = useState(null);

  const [
    adminMessage,
    setAdminMessage,
  ] = useState(null);

  const onlineUserIds =
    useChatPresence(currentUser);

  const loadPendingReportCount =
    useCallback(async () => {
      if (!isAdmin) {
        setPendingReportCount(0);
        return;
      }

      try {
        const count =
          await getPendingChatReportCount();

        setPendingReportCount(
          count ?? 0
        );
      } catch (loadError) {
        console.error(
          "Không tải được số báo cáo:",
          loadError
        );
      }
    }, [isAdmin]);

  useEffect(() => {
    loadPendingReportCount();
  }, [
    loadPendingReportCount,
  ]);

  useEffect(() => {
    if (!isAdmin) {
      return undefined;
    }

    const channel = supabase
      .channel(
        "chat-report-count-realtime"
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_reports",
        },
        () => {
          loadPendingReportCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    isAdmin,
    loadPendingReportCount,
  ]);

  useEffect(() => {
    if (!error && !success) {
      return undefined;
    }

    const timer =
      window.setTimeout(() => {
        clearNotice();
      }, 5000);

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    error,
    success,
    clearNotice,
  ]);

  async function handleRemoveViolation(
    report
  ) {
    if (!report?.message?.id) {
      return false;
    }

    const successResult =
      await removeMessageByAdmin({
        messageId:
          report.message.id,

        removalMessage:
          "Tin nhắn đã bị xóa vì vi phạm quy định",
      });

    if (successResult) {
      await loadPendingReportCount();
    }

    return successResult;
  }

  function handleOpenAdminFromReport(
    message
  ) {
    setIsReportsAdminOpen(false);
    setAdminMessage(message);
  }

  function handleCloseReportsAdmin() {
    setIsReportsAdminOpen(false);
    loadPendingReportCount();
  }

  useEffect(() => {
    if (!localNotice) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setLocalNotice(null);
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [localNotice]);

  /**
   * Xóa vĩnh viễn tin nhắn của chính user.
   *
   * Điều kiện:
   * - User phải đăng nhập.
   * - message.user_id phải bằng auth.uid().
   * - Database phải có RLS cho phép user xóa tin của mình.
   */
  /**
 * Xóa toàn bộ tin nhắn do user hiện tại gửi.
 *
 * Tên hiển thị trên giao diện:
 * "Xóa bộ nhớ đệm".
 */
  async function handleClearConversation() {
    if (!currentUser?.id || isClearing) {
      return;
    }

    try {
      setIsClearing(true);

      const { error: deleteError } =
        await supabase
          .from("chat_messages")
          .delete()
          .eq("user_id", currentUser.id);

      if (deleteError) {
        throw deleteError;
      }

      setClearToastOpen(false);

      await reloadMessages();

      setLocalNotice({
        type: "success",
        message:
          "Đã xóa toàn bộ tin nhắn của bạn.",
      });
    } catch (clearError) {
      console.error(
        "Clear conversation error:",
        clearError
      );

      setLocalNotice({
        type: "error",
        message:
          clearError.message ||
          "Không thể xóa bộ nhớ đệm.",
      });
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <section className="public-chat">
      <header className="public-chat__header">
        <div>
          <h2>
            Trò chuyện cộng đồng
          </h2>

          <p>
            Trao đổi công khai giữa
            các thành viên Hũ vàng
          </p>
        </div>

        <div className="public-chat__header-actions">
          {isAdmin && (
            <button
              type="button"
              className="chat-admin-report-button"
              onClick={() =>
                setIsReportsAdminOpen(
                  true
                )
              }
            >
              Báo cáo vi phạm

              {pendingReportCount > 0 && (
                <span className="chat-report-badge">
                  {pendingReportCount > 99
                    ? "99+"
                    : pendingReportCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            className="chat-refresh-button"
            disabled={loading}
            onClick={reloadMessages}
          >
            Làm mới
          </button>
          {currentUser && (
            <button
              type="button"
              className="chat-clear-cache-button"
              disabled={loading || isClearing}
              onClick={() => setClearToastOpen(true)}
            >
              {isClearing
                ? "Đang xóa..."
                : "Xóa bộ nhớ đệm"}
            </button>
          )}
        </div>
      </header>

      {currentUser && (
        <div className="public-chat__current-user">
          Đang đăng nhập với tên:{" "}

          <strong>
            {currentProfile
              ?.display_name ||
              "Thành viên"}
          </strong>

          {isAdmin && (
            <span className="chat-admin-badge">
              Quản trị viên
            </span>
          )}
        </div>
      )}

      {error && (
        <div
          className="chat-notice chat-notice--error"
          role="alert"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="chat-notice chat-notice--success"
          role="status"
        >
          {success}
        </div>
      )}

      {localNotice && (
        <div
          className={`chat-notice ${localNotice.type === "error"
            ? "chat-notice--error"
            : "chat-notice--success"
            }`}
          role={
            localNotice.type === "error"
              ? "alert"
              : "status"
          }
        >
          {localNotice.message}
        </div>
      )}

      {loading ? (
        <div className="chat-loading">
          Đang tải trò chuyện...
        </div>
      ) : (
        <ChatMessageList
          messages={messages}

          currentUserId={
            currentUser?.id
          }

          onlineUserIds={
            onlineUserIds
          }

          isAdmin={isAdmin}

          onReply={
            setReplyingTo
          }

          onDelete={
            deleteMessage
          }

          onReport={
            setReportingMessage
          }

          onAdmin={
            setAdminMessage
          }

          onRemove={
            setRemovingMessage
          }

          onToggleReaction={
            toggleReaction
          }
        />
      )}

      <ChatComposer
        currentUser={currentUser}
        replyingTo={replyingTo}
        sending={sending}
        cooldownRemaining={
          cooldownRemaining
        }
        activeBan={activeBan}
        onCancelReply={() =>
          setReplyingTo(null)
        }
        onSend={sendMessage}
      />

      <ChatReportModal
        message={
          reportingMessage
        }

        onClose={() =>
          setReportingMessage(null)
        }

        onSubmit={async (
          payload
        ) => {
          const result =
            await submitReport(
              payload
            );

          if (
            result &&
            isAdmin
          ) {
            await loadPendingReportCount();
          }

          return result;
        }}
      />

      <ChatAdminModal
        message={adminMessage}

        onClose={() =>
          setAdminMessage(null)
        }

        onBanUser={banUser}
        onUnbanUser={unbanUser}
      />

      <ChatRemoveModal
        message={removingMessage}

        onClose={() =>
          setRemovingMessage(null)
        }

        onRemoveMessage={
          removeMessageByAdmin
        }
      />

      <ChatReportsAdmin
        open={isReportsAdminOpen}

        onClose={
          handleCloseReportsAdmin
        }

        onManageUser={
          handleOpenAdminFromReport
        }

        onRemoveViolation={
          handleRemoveViolation
        }
      />
      {clearToastOpen && (
        <div
          className="chat-confirm-toast"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="clear-chat-toast-title"
        >
          <div className="chat-confirm-toast__icon">
            🗑️
          </div>

          <div className="chat-confirm-toast__content">
            <strong id="clear-chat-toast-title">
              Xóa bộ nhớ đệm?
            </strong>

            <p>
              Toàn bộ tin nhắn do bạn gửi sẽ bị
              xóa vĩnh viễn và không thể khôi phục.
            </p>

            <div className="chat-confirm-toast__actions">
              <button
                type="button"
                className="chat-confirm-toast__cancel"
                disabled={isClearing}
                onClick={() =>
                  setClearToastOpen(false)
                }
              >
                Hủy
              </button>

              <button
                type="button"
                className="chat-confirm-toast__confirm"
                disabled={isClearing}
                onClick={handleClearConversation}
              >
                {isClearing
                  ? "Đang xóa..."
                  : "Xác nhận xóa"}
              </button>
            </div>
          </div>

          <button
            type="button"
            className="chat-confirm-toast__close"
            aria-label="Đóng thông báo"
            disabled={isClearing}
            onClick={() =>
              setClearToastOpen(false)
            }
          >
            ×
          </button>
        </div>
      )}
    </section>


  );


}