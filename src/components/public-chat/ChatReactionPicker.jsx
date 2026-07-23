import {
  CHAT_REACTIONS,
} from "../../utils/chatConstants";

export default function ChatReactionPicker({
  message,
  currentUserId,
  reactionGroups = {},
  onToggleReaction,
  onShowReactionUsers,
}) {
  function handleToggleReaction(
    reactionType
  ) {
    if (
      typeof onToggleReaction !==
      "function"
    ) {
      return;
    }

    onToggleReaction({
      messageId: message.id,
      reactionType,
    });
  }

  function handleShowUsers(
    event,
    reactionType
  ) {
    event.stopPropagation();

    const reactionInfo =
      reactionGroups[
        reactionType
      ];

    if (
      !reactionInfo ||
      reactionInfo.count <= 0 ||
      typeof onShowReactionUsers !==
        "function"
    ) {
      return;
    }

    onShowReactionUsers(
      reactionType
    );
  }

  return (
    <div className="chat-reaction-picker">
      {CHAT_REACTIONS.map(
        (reaction) => {
          const reactionInfo =
            reactionGroups[
              reaction.type
            ];

          const count =
            reactionInfo?.count ??
            0;

          const selected =
            reactionInfo
              ?.currentUserReacted ??
            false;

          const userNames =
            reactionInfo?.users
              ?.map(
                (user) =>
                  user.displayName
              )
              .filter(Boolean)
              .join(", ") || "";

          return (
            <div
              key={reaction.type}
              className="chat-reaction-item"
            >
              <button
                type="button"
                className={
                  selected
                    ? "chat-reaction-button chat-reaction-button--selected"
                    : "chat-reaction-button"
                }
                title={
                  userNames
                    ? `${reaction.label}: ${userNames}`
                    : reaction.label
                }
                aria-pressed={
                  selected
                }
                onClick={() =>
                  handleToggleReaction(
                    reaction.type
                  )
                }
              >
                <span
                  className="chat-reaction-button__icon"
                  aria-hidden="true"
                >
                  {reaction.icon}
                </span>
              </button>

              {count > 0 && (
                <button
                  type="button"
                  className="chat-reaction-count"
                  title={`Xem ${count} người đã chọn ${reaction.label}`}
                  aria-label={`Xem ${count} người đã chọn ${reaction.label}`}
                  onClick={(event) =>
                    handleShowUsers(
                      event,
                      reaction.type
                    )
                  }
                >
                  {count}
                </button>
              )}
            </div>
          );
        }
      )}
    </div>
  );
}