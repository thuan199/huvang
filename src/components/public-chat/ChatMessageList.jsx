import {
  useEffect,
  useRef,
  useState,
} from "react";

import ChatMessageItem from "./ChatMessageItem";

/**
 * Chuẩn hóa dữ liệu reaction của một tin nhắn.
 *
 * Hỗ trợ dữ liệu dạng:
 *
 * message.reactions = [
 *   {
 *     id,
 *     user_id,
 *     reaction,
 *     profile: {
 *       display_name,
 *       avatar_url
 *     }
 *   }
 * ]
 *
 * Hoặc:
 *
 * message.reactions = [
 *   {
 *     id,
 *     user_id,
 *     reaction_type,
 *     profiles: {
 *       display_name,
 *       avatar_url
 *     }
 *   }
 * ]
 */
function groupMessageReactions(message) {
  const reactionRows =
    Array.isArray(message?.reactions)
      ? message.reactions
      : Array.isArray(
        message?.chat_message_reactions
      )
        ? message.chat_message_reactions
        : Array.isArray(
          message?.chat_reactions
        )
          ? message.chat_reactions
          : [];

  return reactionRows.reduce(
    (result, row) => {
      const reactionType =
        row?.reaction ||
        row?.reaction_type ||
        row?.emoji;

      if (!reactionType) {
        return result;
      }

      if (!result[reactionType]) {
        result[reactionType] = {
          reactionType,
          count: 0,
          users: [],
          currentUserReacted: false,
        };
      }

      const profile =
        row?.profile ||
        row?.profiles ||
        row?.user_profile ||
        row?.user ||
        null;

      const userId =
        row?.user_id ||
        profile?.id ||
        null;

      const displayName =
        profile?.display_name ||
        profile?.full_name ||
        profile?.username ||
        row?.display_name ||
        "Thành viên";

      const avatarUrl =
        profile?.avatar_url ||
        row?.avatar_url ||
        null;

      result[reactionType].count += 1;

      result[reactionType].users.push({
        reactionId:
          row?.id ?? null,

        userId,

        displayName,

        avatarUrl,

        createdAt:
          row?.created_at ??
          null,
      });

      return result;
    },
    {}
  );
}

export default function ChatMessageList({
  messages = [],
  currentUserId,
  onlineUserIds,
  isAdmin,
  onReply,
  onDelete,
  onReport,
  onAdmin,
  onRemove,
  onToggleReaction,
}) {
  const containerRef =
    useRef(null);

  const bottomRef =
    useRef(null);

  const previousMessageCountRef =
    useRef(0);

  const isAtBottomRef =
    useRef(true);

  const [
    isChatAtBottom,
    setIsChatAtBottom,
  ] = useState(true);

  const [
    isLatestVisibleOnPage,
    setIsLatestVisibleOnPage,
  ] = useState(true);

  const [
    selectedReaction,
    setSelectedReaction,
  ] = useState(null);

  /*
   * Hiện nút cuộn xuống cuối khi:
   * 1. Danh sách chat không ở cuối.
   * 2. Tin nhắn cuối không nằm trong
   *    vùng nhìn thấy của trình duyệt.
   */
  const showScrollToBottom =
    !isChatAtBottom ||
    !isLatestVisibleOnPage;

  function checkScrollPosition() {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    const isAtBottom =
      distanceFromBottom <= 10;

    isAtBottomRef.current =
      isAtBottom;

    setIsChatAtBottom(
      isAtBottom
    );
  }

  function scrollToLatestMessage() {
    const container =
      containerRef.current;

    const bottomElement =
      bottomRef.current;

    if (!container) {
      return;
    }

    container.scrollTo({
      top:
        container.scrollHeight,
      behavior: "smooth",
    });

    isAtBottomRef.current =
      true;

    setIsChatAtBottom(true);

    window.setTimeout(() => {
      bottomElement?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }, 150);
  }

  function handleShowReactionUsers({
    messageId,
    reactionType,
    users = [],
  }) {
    if (
      !reactionType ||
      users.length === 0
    ) {
      return;
    }

    setSelectedReaction({
      messageId,
      reactionType,
      users,
    });
  }

  function handleCloseReactionUsers() {
    setSelectedReaction(null);
  }

  /*
   * Đóng popup khi nhấn Escape.
   */
  useEffect(() => {
    if (!selectedReaction) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        handleCloseReactionUsers();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [selectedReaction]);

  /*
   * Theo dõi xem tin nhắn cuối có nằm
   * trong viewport trình duyệt hay không.
   */
  useEffect(() => {
    const bottomElement =
      bottomRef.current;

    if (!bottomElement) {
      return undefined;
    }

    const observer =
      new IntersectionObserver(
        ([entry]) => {
          setIsLatestVisibleOnPage(
            entry.isIntersecting
          );
        },
        {
          root: null,
          threshold: 0.1,
        }
      );

    observer.observe(
      bottomElement
    );

    return () => {
      observer.disconnect();
    };
  }, [messages.length]);

  /*
   * Tự cuộn xuống khi có tin nhắn mới,
   * nhưng chỉ khi user đang ở cuối chat.
   */
  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    const currentMessageCount =
      messages.length;

    const previousMessageCount =
      previousMessageCountRef.current;

    const hasNewMessage =
      currentMessageCount >
      previousMessageCount;

    const isFirstLoad =
      previousMessageCount ===
      0;

    if (
      hasNewMessage &&
      (
        isFirstLoad ||
        isAtBottomRef.current
      )
    ) {
      requestAnimationFrame(() => {
        container.scrollTo({
          top:
            container.scrollHeight,

          behavior:
            isFirstLoad
              ? "auto"
              : "smooth",
        });

        isAtBottomRef.current =
          true;

        setIsChatAtBottom(true);
      });
    } else {
      requestAnimationFrame(
        checkScrollPosition
      );
    }

    previousMessageCountRef.current =
      currentMessageCount;
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="chat-empty">
        Chưa có tin nhắn nào. Hãy bắt
        đầu cuộc trò chuyện.
      </div>
    );
  }

  return (
    <div className="chat-message-list-wrapper">
      <div
        ref={containerRef}
        className="chat-message-list"
        onScroll={
          checkScrollPosition
        }
      >
        {messages.map(
          (message) => {
            const reactionGroups =
              groupMessageReactions(
                message
              );

            Object.values(
              reactionGroups
            ).forEach(
              (reactionGroup) => {
                reactionGroup.currentUserReacted =
                  reactionGroup.users
                    .some(
                      (user) =>
                        user.userId ===
                        currentUserId
                    );
              }
            );

            return (
              <ChatMessageItem
                key={message.id}
                message={message}
                currentUserId={
                  currentUserId
                }
                onlineUserIds={
                  onlineUserIds
                }
                isAdmin={isAdmin}

                reactionGroups={
                  reactionGroups
                }

                onReply={
                  onReply
                }
                onDelete={
                  onDelete
                }
                onReport={
                  onReport
                }
                onAdmin={
                  onAdmin
                }
                onRemove={
                  onRemove
                }

                onToggleReaction={
                  onToggleReaction
                }

                onShowReactionUsers={
                  handleShowReactionUsers
                }
              />
            );
          }
        )}

        <div
          ref={bottomRef}
          className="chat-message-list__bottom"
          aria-hidden="true"
        />
      </div>

      {showScrollToBottom && (
        <button
          type="button"
          className="chat-scroll-to-bottom"
          onClick={
            scrollToLatestMessage
          }
          aria-label="Xem tin nhắn mới nhất"
          title="Xem tin nhắn mới nhất"
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden="true"
          >
            <path
              d="M12 4v14m0 0 6-6m-6 6-6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {selectedReaction && (
        <div
          className="chat-reaction-users-overlay"
          role="presentation"
          onMouseDown={
            handleCloseReactionUsers
          }
        >
          <div
            className="chat-reaction-users-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-reaction-users-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <header className="chat-reaction-users-modal__header">
              <h3 id="chat-reaction-users-title">
                {
                  selectedReaction
                    .users.length
                }{" "}

                người đã bày tỏ cảm xúc
              </h3>

              <button
                type="button"
                className="chat-reaction-users-modal__close"
                onClick={
                  handleCloseReactionUsers
                }
                aria-label="Đóng danh sách cảm xúc"
              >
                ×
              </button>
            </header>

            <div className="chat-reaction-users-list">
              {selectedReaction.users.map(
                (user, index) => (
                  <div
                    key={
                      user.reactionId ||
                      user.userId ||
                      `${user.displayName}-${index}`
                    }
                    className="chat-reaction-user"
                  >
                    {user.avatarUrl ? (
                      <img
                        src={
                          user.avatarUrl
                        }
                        alt=""
                        className="chat-reaction-user__avatar"
                      />
                    ) : (
                      <div
                        className="chat-reaction-user__avatar chat-reaction-user__avatar--fallback"
                        aria-hidden="true"
                      >
                        {user.displayName
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}

                    <span className="chat-reaction-user__name">
                      {
                        user.displayName
                      }

                      {user.userId ===
                        currentUserId && (
                          <small>
                            {" "}
                            (Bạn)
                          </small>
                        )}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}