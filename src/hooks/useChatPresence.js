import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../supabaseClient";

export function useChatPresence(
  currentUser
) {
  const [
    onlineUserIds,
    setOnlineUserIds,
  ] = useState([]);

  useEffect(() => {
    const userId =
      currentUser?.id;

    if (!userId) {
      setOnlineUserIds([]);
      return undefined;
    }

    let isMounted = true;
    let isSubscribed = false;

    const channel =
      supabase.channel(
        "public-chat-presence",
        {
          config: {
            presence: {
              key: userId,
            },
          },
        }
      );

    function updateOnlineUsers() {
      if (!isMounted) {
        return;
      }

      const presenceState =
        channel.presenceState();

      const userIds =
        Object.keys(
          presenceState
        );

      setOnlineUserIds(userIds);
    }

    channel
      .on(
        "presence",
        {
          event: "sync",
        },
        updateOnlineUsers
      )
      .on(
        "presence",
        {
          event: "join",
        },
        updateOnlineUsers
      )
      .on(
        "presence",
        {
          event: "leave",
        },
        updateOnlineUsers
      )
      .subscribe(
        async (status) => {
          if (
            status !==
            "SUBSCRIBED"
          ) {
            return;
          }

          isSubscribed = true;

          try {
            await channel.track({
              user_id: userId,
              online_at:
                new Date()
                  .toISOString(),
            });
          } catch (trackError) {
            console.error(
              "Không thể cập nhật trạng thái online:",
              trackError
            );
          }
        }
      );

    return () => {
      isMounted = false;
      setOnlineUserIds([]);

      if (isSubscribed) {
        channel.untrack();
      }

      supabase.removeChannel(
        channel
      );
    };
  }, [
    currentUser?.id,
  ]);

  return onlineUserIds;
}