import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CHAT_MAX_LENGTH,
} from "../../utils/chatConstants";

function formatBanUntil(value) {
  if (!value) {
    return "Vĩnh viễn";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Không xác định";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  ).format(date);
}

export default function ChatComposer({
  currentUser,
  replyingTo,
  sending,
  cooldownRemaining,
  activeBan,
  onCancelReply,
  onSend,
}) {
  const [
    content,
    setContent,
  ] = useState("");

  const textareaRef =
    useRef(null);

  const isChatBanned =
    Boolean(activeBan);

  const banReason =
    activeBan?.reason ||
    activeBan?.ban_reason ||
    "Vi phạm quy định trò chuyện";

  const bannedUntil =
    activeBan?.banned_until ??
    activeBan?.expires_at ??
    activeBan?.end_at ??
    null;

  const banPlaceholder =
    isChatBanned
      ? `Bạn đang bị cấm chat. Lý do: ${banReason}`
      : "Nhập nội dung trò chuyện...";

  useEffect(() => {
    if (
      replyingTo &&
      !isChatBanned
    ) {
      textareaRef.current?.focus();
    }
  }, [
    replyingTo,
    isChatBanned,
  ]);

  useEffect(() => {
    if (isChatBanned) {
      setContent("");
    }
  }, [
    isChatBanned,
  ]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      !currentUser ||
      isChatBanned ||
      sending ||
      cooldownRemaining > 0
    ) {
      return;
    }

    const cleanContent =
      content.trim();

    if (!cleanContent) {
      return;
    }

    if (
      typeof onSend !==
      "function"
    ) {
      return;
    }

    const success =
      await onSend({
        content: cleanContent,
        replyToId:
          replyingTo?.id ||
          null,
      });

    if (success) {
      setContent("");

      if (
        typeof onCancelReply ===
        "function"
      ) {
        onCancelReply();
      }
    }
  }

  if (!currentUser) {
    return (
      <div className="chat-login-required">
        Bạn cần đăng nhập để gửi tin
        nhắn và thả cảm xúc.
      </div>
    );
  }

  return (
    <form
      className={
        isChatBanned
          ? "chat-composer chat-composer--banned"
          : "chat-composer"
      }
      onSubmit={handleSubmit}
    >
      {replyingTo &&
        !isChatBanned && (
          <div className="chat-reply-preview">
            <div>
              <span>
                Đang trả lời{" "}

                <strong>
                  {replyingTo.profile
                    ?.display_name ||
                    "Thành viên"}
                </strong>
              </span>

              <p>
                {replyingTo.content}
              </p>
            </div>

            <button
              type="button"
              onClick={
                onCancelReply
              }
              aria-label="Hủy trả lời"
            >
              ×
            </button>
          </div>
        )}

      {isChatBanned && (
        <div
          className="chat-composer-ban"
          role="alert"
        >
          <div className="chat-composer-ban__icon">
            🚫
          </div>

          <div className="chat-composer-ban__content">
            <strong>
              Bạn đang bị cấm chat
            </strong>

            <span>
              Lý do: {banReason}
            </span>

            <span>
              Thời hạn:{" "}
              {formatBanUntil(
                bannedUntil
              )}
            </span>
          </div>
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={content}
        maxLength={CHAT_MAX_LENGTH}
        rows={3}
        disabled={
          sending ||
          isChatBanned
        }
        placeholder={
          banPlaceholder
        }
        className={
          isChatBanned
            ? "chat-composer__textarea chat-composer__textarea--banned"
            : "chat-composer__textarea"
        }
        onChange={(event) =>
          setContent(
            event.target.value
          )
        }
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey
          ) {
            event.preventDefault();

            event.currentTarget
              .form
              ?.requestSubmit();
          }
        }}
      />

      <div className="chat-composer__footer">
        <span>
          {content.length}/
          {CHAT_MAX_LENGTH}
        </span>

        <button
          type="submit"
          disabled={
            sending ||
            isChatBanned ||
            cooldownRemaining > 0 ||
            !content.trim()
          }
        >
          {isChatBanned
            ? "Đang bị cấm chat"
            : sending
              ? "Đang gửi..."
              : cooldownRemaining > 0
                ? `Chờ ${cooldownRemaining}s`
                : "Gửi"}
        </button>
      </div>
    </form>
  );
}