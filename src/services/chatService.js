import { supabase } from "../supabaseClient";

import {
  CHAT_MESSAGE_LIMIT,
  CHAT_MAX_LENGTH,
} from "../utils/chatConstants";

const PROFILE_TABLE = "profiles";

function normalizeProfile(profile) {
  return {
    display_name:
      profile?.display_name?.trim() ||
      "Thành viên",

    avatar_url:
      profile?.avatar_url || null,
  };
}

async function loadActiveBans(
  userIds
) {
  const uniqueUserIds = [
    ...new Set(
      userIds.filter(Boolean)
    ),
  ];

  if (
    uniqueUserIds.length === 0
  ) {
    return {};
  }

  const { data, error } =
    await supabase
      .from("chat_bans")
      .select("*")
      .in(
        "user_id",
        uniqueUserIds
      );

  if (error) {
    console.error(
      "loadActiveBans:",
      error
    );

    throw error;
  }

  const now = Date.now();
  const result = {};

  for (const ban of data ?? []) {
    const bannedUntil =
      ban.banned_until ??
      ban.expires_at ??
      ban.end_at ??
      null;

    let isActive = true;

    if (bannedUntil) {
      const endTime =
        new Date(
          bannedUntil
        ).getTime();

      isActive =
        !Number.isNaN(endTime) &&
        endTime > now;
    }

    if (
      isActive &&
      !result[ban.user_id]
    ) {
      result[ban.user_id] =
        ban;
    }
  }

  return result;
}

async function loadProfiles(userIds) {
  const uniqueUserIds = [
    ...new Set(
      userIds.filter(Boolean)
    ),
  ];

  if (uniqueUserIds.length === 0) {
    return {};
  }

  const { data, error } =
    await supabase
      .from(PROFILE_TABLE)
      .select(
        "id, display_name, avatar_url"
      )
      .in("id", uniqueUserIds);

  if (error) {
    throw error;
  }

  return Object.fromEntries(
    (data ?? []).map((profile) => [
      profile.id,
      normalizeProfile(profile),
    ])
  );
}

async function loadReactions(
  messageIds
) {
  if (messageIds.length === 0) {
    return {};
  }

  const { data, error } =
    await supabase
      .from("chat_reactions")
      .select(`
        id,
        message_id,
        user_id,
        reaction_type,
        created_at
      `)
      .in(
        "message_id",
        messageIds
      );

  if (error) {
    throw error;
  }

  return (data ?? []).reduce(
    (result, reaction) => {
      if (
        !result[
        reaction.message_id
        ]
      ) {
        result[
          reaction.message_id
        ] = [];
      }

      result[
        reaction.message_id
      ].push(reaction);

      return result;
    },
    {}
  );
}

export async function adminRemoveMessage({
  messageId,
  removalMessage,
}) {
  const { error } =
    await supabase.rpc(
      "admin_remove_chat_message",
      {
        target_message_id:
          messageId,

        removal_message:
          removalMessage?.trim() ||
          "Tin nhắn đã bị xóa vì vi phạm quy định",
      }
    );

  if (error) {
    throw error;
  }
}

export async function getCurrentChatUser() {
  const { data, error } =
    await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return (
    data.session?.user ??
    null
  );
}

export async function getCurrentProfile(
  userId
) {
  if (!userId) {
    return null;
  }

  const { data, error } =
    await supabase
      .from(PROFILE_TABLE)
      .select(
        "id, display_name, avatar_url"
      )
      .eq("id", userId)
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return {
      id: userId,
      display_name:
        "Thành viên",
      avatar_url: null,
    };
  }

  return {
    id: data.id,
    ...normalizeProfile(data),
  };
}

export async function checkCurrentUserIsAdmin(
  userId
) {
  if (!userId) {
    return false;
  }

  const { data, error } =
    await supabase
      .from("app_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(
    data?.user_id
  );
}

export async function getActiveChatBan(
  userId
) {
  if (!userId) {
    return null;
  }

  const { data, error } =
    await supabase
      .from("chat_bans")
      .select("*")
      .eq("user_id", userId);

  if (error) {
    console.error(
      "getActiveChatBan:",
      error
    );

    throw error;
  }

  const now = Date.now();

  const activeBan =
    (data ?? []).find((ban) => {
      const bannedUntil =
        ban.banned_until ??
        ban.expires_at ??
        ban.end_at ??
        null;

      /*
       * Không có thời hạn:
       * cấm vĩnh viễn.
       */
      if (!bannedUntil) {
        return true;
      }

      const endTime =
        new Date(
          bannedUntil
        ).getTime();

      return (
        !Number.isNaN(endTime) &&
        endTime > now
      );
    });

  return activeBan ?? null;
}

export async function loadChatMessages() {
  const { data, error } =
    await supabase
      .from("chat_messages")
      .select(`
         id,
          user_id,
          content,
          reply_to_id,
          created_at,
          updated_at,
          is_deleted,
          is_recalled,
          recalled_at,
          is_hidden,
          moderation_message,
          moderated_by,
          moderated_at
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(
        CHAT_MESSAGE_LIMIT
      );

  if (error) {
    throw error;
  }

  const rawMessages = (
    data ?? []
  ).reverse();

  const messageIds =
    rawMessages.map(
      (message) =>
        message.id
    );

  const userIds =
    rawMessages.map(
      (message) =>
        message.user_id
    );

  const [
    profilesByUserId,
    reactionsByMessageId,
    bansByUserId,
  ] = await Promise.all([
    loadProfiles(userIds),
    loadReactions(messageIds),
    loadActiveBans(userIds),
  ]);

  const messageMap =
    Object.fromEntries(
      rawMessages.map(
        (message) => [
          message.id,
          message,
        ]
      )
    );

  return rawMessages.map(
    (message) => {
      const repliedRawMessage =
        message.reply_to_id
          ? messageMap[
          message.reply_to_id
          ]
          : null;

      return {
        ...message,

        profile:
          profilesByUserId[
          message.user_id
          ] ?? {
            display_name:
              "Thành viên",
            avatar_url: null,
          },

        active_ban:
          bansByUserId[
          message.user_id
          ] ?? null,

        reactions:
          reactionsByMessageId[
          message.id
          ] ?? [],

        replied_message:
          repliedRawMessage
            ? {
              ...repliedRawMessage,

              profile:
                profilesByUserId[
                repliedRawMessage
                  .user_id
                ] ?? {
                  display_name:
                    "Thành viên",
                  avatar_url:
                    null,
                },

              active_ban:
                bansByUserId[
                repliedRawMessage
                  .user_id
                ] ?? null,
            }
            : null,
      };
    }
  );
}

export async function sendChatMessage({
  userId,
  content,
  replyToId = null,
}) {
  const cleanContent =
    content.trim();

  if (!userId) {
    throw new Error(
      "Bạn phải đăng nhập để gửi tin nhắn."
    );
  }

  if (!cleanContent) {
    throw new Error(
      "Nội dung tin nhắn không được để trống."
    );
  }

  if (
    cleanContent.length >
    CHAT_MAX_LENGTH
  ) {
    throw new Error(
      `Tin nhắn không được vượt quá ${CHAT_MAX_LENGTH} ký tự.`
    );
  }

  const { data, error } =
    await supabase
      .from("chat_messages")
      .insert({
        user_id: userId,
        content: cleanContent,
        reply_to_id:
          replyToId,
      })
      .select(`
        id,
        user_id,
        content,
        reply_to_id,
        created_at
      `)
      .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteOwnMessage(
  messageId
) {
  const { error } =
    await supabase.rpc(
      "delete_own_chat_message",
      {
        target_message_id:
          messageId,
      }
    );

  if (error) {
    throw error;
  }
}

export async function addReaction({
  messageId,
  userId,
  reactionType,
}) {
  const { error } =
    await supabase
      .from("chat_reactions")
      .insert({
        message_id:
          messageId,

        user_id:
          userId,

        reaction_type:
          reactionType,
      });

  if (error) {
    throw error;
  }
}

export async function removeReaction({
  messageId,
  userId,
  reactionType,
}) {
  const { error } =
    await supabase
      .from("chat_reactions")
      .delete()
      .eq(
        "message_id",
        messageId
      )
      .eq(
        "user_id",
        userId
      )
      .eq(
        "reaction_type",
        reactionType
      );

  if (error) {
    throw error;
  }
}

export async function reportMessage({
  messageId,
  reporterId,
  reason,
  description = null,
}) {
  const { error } =
    await supabase
      .from("chat_reports")
      .insert({
        message_id:
          messageId,

        reporter_id:
          reporterId,

        reason,

        description:
          description?.trim() ||
          null,
      });

  if (error) {
    throw error;
  }
}

export async function adminHideMessage({
  messageId,
  hidden,
}) {
  const { error } =
    await supabase.rpc(
      "admin_hide_chat_message",
      {
        target_message_id:
          messageId,

        should_hide:
          hidden,
      }
    );

  if (error) {
    throw error;
  }
}

export async function adminBanUser({
  userId,
  duration,
  reason = null,
}) {
  const { error } =
    await supabase.rpc(
      "admin_ban_chat_user",
      {
        target_user_id:
          userId,

        duration_code:
          duration,

        ban_reason:
          reason?.trim() ||
          null,
      }
    );

  if (error) {
    throw error;
  }
}

export async function adminUnbanUser(
  userId
) {
  const { error } =
    await supabase.rpc(
      "admin_unban_chat_user",
      {
        target_user_id:
          userId,
      }
    );

  if (error) {
    throw error;
  }
}

export async function syncCurrentUserProfile(
  user
) {
  if (!user?.id) {
    return null;
  }

  const metadata =
    user.user_metadata ?? {};

  const displayName =
    metadata.display_name ||
    metadata.full_name ||
    metadata.name ||
    "Thành viên";

  const avatarUrl =
    metadata.custom_avatar_url ||
    metadata.avatar_url ||
    metadata.picture ||
    null;

  const { data, error } =
    await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          display_name:
            displayName,

          avatar_url:
            avatarUrl,

          updated_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict: "id",
        }
      )
      .select(
        "id, display_name, avatar_url"
      )
      .single();

  if (error) {
    throw error;
  }

  return data;
}