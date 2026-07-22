import {
  CHAT_REACTIONS,
} from "../../utils/chatConstants";

export default function ChatReactionPicker({
  message,
  currentUserId,
  onToggleReaction,
}) {
  return (
    <div className="chat-reaction-picker">
      {CHAT_REACTIONS.map(
        (reaction) => {
          const reactionsOfType =
            message.reactions.filter(
              (item) =>
                item.reaction_type ===
                reaction.type
            );

          const count =
            reactionsOfType.length;

          const selected =
            reactionsOfType.some(
              (item) =>
                item.user_id ===
                currentUserId
            );

          return (
            <button
              key={reaction.type}
              type="button"
              className={
                selected
                  ? "chat-reaction-button chat-reaction-button--selected"
                  : "chat-reaction-button"
              }
              title={reaction.label}
              onClick={() =>
                onToggleReaction({
                  messageId:
                    message.id,
                  reactionType:
                    reaction.type,
                })
              }
            >
              <span>
                {reaction.icon}
              </span>

              {count > 0 && (
                <strong>{count}</strong>
              )}
            </button>
          );
        }
      )}
    </div>
  );
}