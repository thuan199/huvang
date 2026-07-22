import {
  useEffect,
  useRef,
  useState,
} from "react";

import ChatMessageItem from "./ChatMessageItem";

export default function ChatMessageList({
  messages,
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
  const containerRef = useRef(null);
  const bottomRef = useRef(null);

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

  /*
   * Hiện nút khi:
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

    /*
     * Cuộn danh sách chat xuống cuối.
     */
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });

    isAtBottomRef.current = true;
    setIsChatAtBottom(true);

    /*
     * Sau đó cuộn trang trình duyệt
     * để vị trí cuối chat xuất hiện.
     */
    window.setTimeout(() => {
      bottomElement?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }, 150);
  }

  /*
   * Theo dõi xem tin nhắn cuối có đang
   * nằm trong màn hình trình duyệt không.
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
          /*
           * root null:
           * theo dõi viewport trình duyệt.
           */
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
   * Xử lý khi có tin nhắn mới.
   *
   * Chỉ tự động cuộn xuống khi:
   * - Lần tải đầu tiên.
   * - Người dùng đang ở cuối chat.
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
      previousMessageCount === 0;

    if (
      hasNewMessage &&
      (
        isFirstLoad ||
        isAtBottomRef.current
      )
    ) {
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: isFirstLoad
            ? "auto"
            : "smooth",
        });

        isAtBottomRef.current = true;
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
        {messages.map((message) => (
          <ChatMessageItem
            key={message.id}
            message={message}
            currentUserId={currentUserId}
            onlineUserIds={onlineUserIds}
            isAdmin={isAdmin}

            onReply={onReply}
            onDelete={onDelete}

            onReport={onReport}
            onAdmin={onAdmin}
            onRemove={onRemove}

            onToggleReaction={
              onToggleReaction
            }
          />
        ))}

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
    </div>
  );
}