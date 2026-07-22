import {
  useEffect,
  useState,
} from "react";

import {
  formatChatTime,
} from "../../utils/formatChatTime";

import ChatReactionPicker from "./ChatReactionPicker";

export default function ChatMessageItem({
  message,
  currentUserId,
  isAdmin,
  onReply,
  onDelete,
  onReport,
  onAdmin,
  onRemove,
  onToggleReaction,
}) {
  const [, forceTimeUpdate] =
    useState(0);
  

  const formatRecallTime = (recalledAt) => {
    if (!recalledAt) {
      return "";
    }

    return new Date(
      recalledAt
    ).toLocaleTimeString(
      "vi-VN",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }
    );
  };

  useEffect(() => {
    const timer =
      window.setInterval(() => {
        forceTimeUpdate(
          (value) => value + 1
        );
      }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const isOwnMessage =
    currentUserId ===
    message.user_id;

  const isUserBanned =
    Boolean(
      message.active_ban
    );

  const displayName =
    isOwnMessage
      ? "Bạn"
      : message.profile
        ?.display_name ||
      "Thành viên";

  const avatarText =
    message.profile
      ?.display_name
      ?.charAt(0)
      ?.toUpperCase() ||
    "T";

  const recalledMessageText =
    message.is_deleted
      ? (
        message.moderation_message ||
        "Tin nhắn đã bị xóa vì vi phạm quy định"
      )
      : message.is_recalled
        ? `↺ Đã thu hồi tin nhắn${message.recalled_at
          ? ` • ${formatRecallTime(
            message.recalled_at
          )}`
          : ""
        }`
        : "";

  const isRecalled =
    Boolean(message.is_recalled);

  const isDeleted =
    Boolean(message.is_deleted);

  const isUnavailable =
    isDeleted || isRecalled;

  function jumpToOriginalMessage() {
    if (
      !message.reply_to_id
    ) {
      return;
    }

    const target =
      document.getElementById(
        `chat-message-${message.reply_to_id}`
      );

    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    target.classList.add(
      "chat-message--highlight"
    );

    window.setTimeout(() => {
      target.classList.remove(
        "chat-message--highlight"
      );
    }, 1600);
  }

  async function handleDelete() {
    if (
      typeof onDelete !==
      "function"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Bạn có chắc muốn thu hồi tin nhắn này?"
      );

    if (!confirmed) {
      return;
    }

    await onDelete(message.id);
  }

  function handleReply() {
    if (
      typeof onReply ===
      "function"
    ) {
      onReply(message);
    }
  }

  function handleReport() {
    if (
      typeof onReport ===
      "function"
    ) {
      onReport(message);
    }
  }

  function handleAdmin() {
    if (
      typeof onAdmin ===
      "function"
    ) {
      onAdmin(message);
    }
  }

  function handleRemove() {
    if (
      typeof onRemove ===
      "function"
    ) {
      onRemove(message);
    }
  }

  function renderAvatar() {
    return (
      <div className="chat-message__avatar-wrapper">
        <div className="chat-message__avatar">
          {message.profile
            ?.avatar_url ? (
            <img
              src={
                message.profile
                  .avatar_url
              }
              alt={displayName}
            />
          ) : (
            <span>
              {avatarText}
            </span>
          )}
        </div>

        {isAdmin &&
          isUserBanned && (
            <span
              className="chat-user-ban-badge"
              title={
                message.active_ban
                  ?.reason
                  ? `Đang bị cấm chat: ${message.active_ban.reason}`
                  : "Đang bị cấm chat"
              }
              aria-label="Đang bị cấm chat"
            >
              🚫
            </span>
          )}
      </div>
    );
  }

  return (
    <article
      id={`chat-message-${message.id}`}
      className={
        isOwnMessage
          ? "chat-message chat-message--own"
          : "chat-message chat-message--other"
      }
    >
      {!isOwnMessage &&
        renderAvatar()}

      <div className="chat-message__column">
        <div className="chat-message__meta">
          <div className="chat-message__name-row">
            <strong>
              {displayName}
            </strong>

            {isAdmin &&
              isUserBanned && (
                <span className="chat-user-ban-label">
                  Đang bị cấm chat
                </span>
              )}
          </div>

          <time
            dateTime={
              message.created_at
            }
            title={
              new Date(
                message.created_at
              ).toLocaleString(
                "vi-VN"
              )
            }
          >
            {formatChatTime(
              message.created_at
            )}
          </time>
        </div>

        <div className="chat-message__bubble">
          {message.reply_to_id && (
            <button
              type="button"
              className="chat-message__quote"
              onClick={
                jumpToOriginalMessage
              }
            >
              {message.replied_message ? (
                <>
                  <strong>
                    {message
                      .replied_message
                      .profile
                      ?.display_name ||
                      "Thành viên"}
                  </strong>

                  <span>
                    {message.replied_message.is_deleted ? (
                      message.replied_message.moderation_message ||
                      "Tin nhắn đã bị xóa vì vi phạm quy định"
                    ) : message.replied_message.is_recalled ? (
                      <>
                        ↺ Đã thu hồi tin nhắn
                        {message.replied_message.recalled_at && (
                          <>
                            {" • "}
                            {formatRecallTime(
                              message.replied_message.recalled_at
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      message.replied_message.content
                    )}
                  </span>
                </>
              ) : (
                <span>
                  Tin nhắn gốc không còn
                  trong danh sách
                </span>
              )}
            </button>
          )}

          {isUnavailable ? (
            <p className="chat-message__deleted">
              {recalledMessageText}
            </p>
          ) : (
            <p className="chat-message__content">
              {message.content}
            </p>
          )}
        </div>

        {!(message.is_deleted || message.is_recalled) && (
          <>
            {/* Chỉ cho thả cảm xúc khi tin nhắn còn bình thường */}
            {!isUnavailable && (
              <ChatReactionPicker
                message={message}
                currentUserId={currentUserId}
                onToggleReaction={onToggleReaction}
              />
            )}

            <div className="chat-message__actions">
              {/* Có thể trả lời cả tin đã thu hồi */}
              {!isDeleted && (
                <button
                  type="button"
                  onClick={handleReply}
                >
                  Trả lời
                </button>
              )}

              {/* Chỉ báo cáo tin nhắn còn nội dung */}
              {!isOwnMessage && !isUnavailable && (
                <button
                  type="button"
                  onClick={handleReport}
                >
                  Báo cáo
                </button>
              )}

              {/* Chỉ người gửi được thu hồi tin chưa thu hồi */}
              {isOwnMessage && !isUnavailable && (
                <button
                  type="button"
                  onClick={handleDelete}
                >
                  Xóa
                </button>
              )}

              {/* Quản trị viên vẫn thấy nút quản lý */}
              {isAdmin && !isOwnMessage && (
                <button
                  type="button"
                  className="chat-action-admin"
                  onClick={handleAdmin}
                >
                  Quản lý
                </button>
              )}

              {/* Admin chỉ xóa tin nhắn chưa bị xóa */}
              {isAdmin &&
                !isOwnMessage &&
                !isDeleted && (
                  <button
                    type="button"
                    className="chat-action-delete"
                    onClick={handleRemove}
                  >
                    Xóa
                  </button>
                )}
            </div>
          </>
        )}
      </div>

      {isOwnMessage &&
        renderAvatar()}
    </article>
  );
}