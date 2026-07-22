import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "../supabaseClient";

import {
  addReaction,
  adminBanUser,
  adminHideMessage,
  adminRemoveMessage,
  adminUnbanUser,
  checkCurrentUserIsAdmin,
  getActiveChatBan,
  deleteOwnMessage,
  getCurrentChatUser,
  loadChatMessages,
  removeReaction,
  reportMessage,
  sendChatMessage,
  syncCurrentUserProfile,
} from "../services/chatService";

import {
  CHAT_SEND_COOLDOWN,
} from "../utils/chatConstants";

function getFriendlyError(error) {
  const message =
    error?.message ||
    String(error);

  if (
    message.includes(
      "Bạn đang gửi tin nhắn quá nhanh"
    )
  ) {
    return "Bạn đang gửi quá nhanh. Vui lòng chờ vài giây.";
  }

  if (
    message.includes(
      "Tài khoản đang bị khóa"
    )
  ) {
    return "Tài khoản của bạn đang bị khóa chức năng chat.";
  }

  if (
    message.includes(
      "duplicate key"
    )
  ) {
    return "Thao tác này đã được thực hiện trước đó.";
  }

  return message;
}

export function usePublicChat() {
  const [
    messages,
    setMessages,
  ] = useState([]);

  const [
    currentUser,
    setCurrentUser,
  ] = useState(null);

  const [
    currentProfile,
    setCurrentProfile,
  ] = useState(null);

  const [
    isAdmin,
    setIsAdmin,
  ] = useState(false);

  const [
    activeBan,
    setActiveBan,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    cooldownRemaining,
    setCooldownRemaining,
  ] = useState(0);

  const lastSendTimeRef =
    useRef(0);

  const mountedRef =
    useRef(true);

  const reloadMessages =
    useCallback(async () => {
      try {
        const data =
          await loadChatMessages();

        if (mountedRef.current) {
          setMessages(
            data ?? []
          );
        }

        return data ?? [];
      } catch (loadError) {
        if (mountedRef.current) {
          setError(
            getFriendlyError(
              loadError
            )
          );
        }

        return [];
      }
    }, []);

  const reloadActiveBan =
    useCallback(
      async (userId) => {
        if (!userId) {
          if (
            mountedRef.current
          ) {
            setActiveBan(null);
          }

          return null;
        }

        try {
          const ban =
            await getActiveChatBan(
              userId
            );

          if (
            mountedRef.current
          ) {
            setActiveBan(
              ban ?? null
            );
          }

          return ban ?? null;
        } catch (banError) {
          if (
            mountedRef.current
          ) {
            setActiveBan(null);

            setError(
              getFriendlyError(
                banError
              )
            );
          }

          return null;
        }
      },
      []
    );

  const refreshBanData =
    useCallback(
      async (userId) => {
        const tasks = [
          reloadMessages(),
        ];

        if (userId) {
          tasks.push(
            reloadActiveBan(
              userId
            )
          );
        } else {
          setActiveBan(null);
        }

        await Promise.all(
          tasks
        );
      },
      [
        reloadActiveBan,
        reloadMessages,
      ]
    );

  const initializeUser =
    useCallback(async () => {
      const user =
        await getCurrentChatUser();

      if (
        !mountedRef.current
      ) {
        return null;
      }

      setCurrentUser(user);

      if (!user) {
        setCurrentProfile(null);
        setIsAdmin(false);
        setActiveBan(null);

        return null;
      }

      const [
        profile,
        adminResult,
        banResult,
      ] = await Promise.all([
        syncCurrentUserProfile(
          user
        ),

        checkCurrentUserIsAdmin(
          user.id
        ),

        getActiveChatBan(
          user.id
        ),
      ]);

      if (
        !mountedRef.current
      ) {
        return user;
      }

      setCurrentProfile(
        profile
      );

      setIsAdmin(
        Boolean(adminResult)
      );

      setActiveBan(
        banResult ?? null
      );

      return user;
    }, []);

  /*
   * Khởi tạo dữ liệu,
   * theo dõi đăng nhập,
   * tin nhắn và cảm xúc.
   */
  useEffect(() => {
    mountedRef.current =
      true;

    async function initialize() {
      try {
        setLoading(true);
        setError("");

        await Promise.all([
          initializeUser(),
          reloadMessages(),
        ]);
      } catch (
        initializeError
      ) {
        if (
          mountedRef.current
        ) {
          setError(
            getFriendlyError(
              initializeError
            )
          );
        }
      } finally {
        if (
          mountedRef.current
        ) {
          setLoading(false);
        }
      }
    }

    initialize();

    const {
      data: authListener,
    } =
      supabase.auth
        .onAuthStateChange(
          async () => {
            try {
              const user =
                await initializeUser();

              await reloadMessages();

              if (user?.id) {
                await reloadActiveBan(
                  user.id
                );
              }
            } catch (
              authError
            ) {
              if (
                mountedRef.current
              ) {
                setError(
                  getFriendlyError(
                    authError
                  )
                );
              }
            }
          }
        );

    const channel =
      supabase
        .channel(
          "public-chat-realtime"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "chat_messages",
          },
          () => {
            reloadMessages();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "chat_reactions",
          },
          () => {
            reloadMessages();
          }
        )
        .subscribe();

    return () => {
      mountedRef.current =
        false;

      authListener
        ?.subscription
        ?.unsubscribe();

      supabase.removeChannel(
        channel
      );
    };
  }, [
    initializeUser,
    reloadActiveBan,
    reloadMessages,
  ]);

  /*
   * Theo dõi bảng chat_bans.
   *
   * Khi khóa hoặc mở khóa:
   * - cập nhật activeBan của user hiện tại;
   * - tải lại messages để xóa/thêm dấu đỏ trên avatar.
   */
  useEffect(() => {
    const userId =
      currentUser?.id;

    if (!userId) {
      setActiveBan(null);
      return undefined;
    }

    let refreshing = false;

    const refresh =
      async () => {
        if (refreshing) {
          return;
        }

        refreshing = true;

        try {
          await refreshBanData(
            userId
          );
        } finally {
          refreshing = false;
        }
      };

    /*
     * Kiểm tra lại ngay khi user
     * vừa đăng nhập hoặc đổi tài khoản.
     */
    refresh();

    const channel =
      supabase
        .channel(
          `chat-bans-realtime-${userId}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "chat_bans",
          },
          () => {
            refresh();
          }
        )
        .subscribe();

    /*
     * Realtime đôi khi không nhận được
     * DELETE do cấu hình publication/RLS.
     * Kiểm tra định kỳ để trạng thái
     * mở khóa không bị giữ lại.
     */
    const pollingTimer =
      window.setInterval(
        refresh,
        5000
      );

    /*
     * Khi user quay lại tab,
     * tải trạng thái mới ngay lập tức.
     */
    const handleWindowFocus =
      () => {
        refresh();
      };

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          refresh();
        }
      };

    window.addEventListener(
      "focus",
      handleWindowFocus
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.clearInterval(
        pollingTimer
      );

      window.removeEventListener(
        "focus",
        handleWindowFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      supabase.removeChannel(
        channel
      );
    };
  }, [
    currentUser?.id,
    refreshBanData,
  ]);

  /*
   * Bộ đếm thời gian chờ
   * giữa hai lần gửi tin.
   */
  useEffect(() => {
    if (
      cooldownRemaining <= 0
    ) {
      return undefined;
    }

    const timer =
      window.setInterval(() => {
        const elapsed =
          Date.now() -
          lastSendTimeRef.current;

        const remaining =
          Math.max(
            0,
            CHAT_SEND_COOLDOWN -
              elapsed
          );

        setCooldownRemaining(
          Math.ceil(
            remaining / 1000
          )
        );
      }, 250);

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    cooldownRemaining,
  ]);

  const sendMessage =
    useCallback(
      async ({
        content,
        replyToId = null,
      }) => {
        if (!currentUser) {
          setError(
            "Bạn phải đăng nhập để gửi tin nhắn."
          );

          return false;
        }

        /*
         * Kiểm tra lại trạng thái cấm
         * trước mỗi lần gửi.
         */
        const latestBan =
          await reloadActiveBan(
            currentUser.id
          );

        if (latestBan) {
          setError(
            latestBan.reason
              ? `Bạn đang bị cấm chat. Lý do: ${latestBan.reason}`
              : "Bạn đang bị cấm chức năng chat."
          );

          return false;
        }

        const elapsed =
          Date.now() -
          lastSendTimeRef.current;

        if (
          elapsed <
          CHAT_SEND_COOLDOWN
        ) {
          setCooldownRemaining(
            Math.ceil(
              (
                CHAT_SEND_COOLDOWN -
                elapsed
              ) / 1000
            )
          );

          setError(
            "Vui lòng chờ trước khi gửi tin tiếp theo."
          );

          return false;
        }

        try {
          setSending(true);
          setError("");
          setSuccess("");

          await sendChatMessage({
            userId:
              currentUser.id,

            content,
            replyToId,
          });

          lastSendTimeRef.current =
            Date.now();

          setCooldownRemaining(
            Math.ceil(
              CHAT_SEND_COOLDOWN /
                1000
            )
          );

          await reloadMessages();

          return true;
        } catch (sendError) {
          setError(
            getFriendlyError(
              sendError
            )
          );

          await reloadActiveBan(
            currentUser.id
          );

          return false;
        } finally {
          setSending(false);
        }
      },
      [
        currentUser,
        reloadActiveBan,
        reloadMessages,
      ]
    );

  const deleteMessage =
  useCallback(
    async (messageId) => {
      try {
        setError("");
        setSuccess("");

        await deleteOwnMessage(
          messageId
        );

        setSuccess(
          "Đã thu hồi tin nhắn."
        );

        await reloadMessages();

        return true;
      } catch (
        deleteError
      ) {
        setError(
          getFriendlyError(
            deleteError
          )
        );

        return false;
      }
    },
    [
      reloadMessages,
    ]
  );  

  const removeMessageByAdmin =
    useCallback(
      async ({
        messageId,
        removalMessage,
      }) => {
        try {
          setError("");
          setSuccess("");

          await adminRemoveMessage({
            messageId,
            removalMessage,
          });

          setSuccess(
            "Đã xóa tin nhắn vi phạm."
          );

          await reloadMessages();

          return true;
        } catch (
          removeError
        ) {
          setError(
            getFriendlyError(
              removeError
            )
          );

          return false;
        }
      },
      [
        reloadMessages,
      ]
    );

  const toggleReaction =
    useCallback(
      async ({
        messageId,
        reactionType,
      }) => {
        if (!currentUser) {
          setError(
            "Bạn phải đăng nhập để thả cảm xúc."
          );

          return false;
        }

        const message =
          messages.find(
            (item) =>
              item.id ===
              messageId
          );

        const alreadyReacted =
          message
            ?.reactions
            ?.some(
              (reaction) =>
                reaction.user_id ===
                  currentUser.id &&
                reaction.reaction_type ===
                  reactionType
            );

        try {
          setError("");
          setSuccess("");

          if (alreadyReacted) {
            await removeReaction({
              messageId,

              userId:
                currentUser.id,

              reactionType,
            });
          } else {
            await addReaction({
              messageId,

              userId:
                currentUser.id,

              reactionType,
            });
          }

          await reloadMessages();

          return true;
        } catch (
          reactionError
        ) {
          setError(
            getFriendlyError(
              reactionError
            )
          );

          return false;
        }
      },
      [
        currentUser,
        messages,
        reloadMessages,
      ]
    );

  const submitReport =
    useCallback(
      async ({
        messageId,
        reason,
        description,
      }) => {
        if (!currentUser) {
          setError(
            "Bạn phải đăng nhập để báo cáo."
          );

          return false;
        }

        try {
          setError("");
          setSuccess("");

          await reportMessage({
            messageId,

            reporterId:
              currentUser.id,

            reason,
            description,
          });

          setSuccess(
            "Đã gửi báo cáo đến quản trị viên."
          );

          return true;
        } catch (
          reportError
        ) {
          setError(
            getFriendlyError(
              reportError
            )
          );

          return false;
        }
      },
      [
        currentUser,
      ]
    );

  const hideMessage =
    useCallback(
      async ({
        messageId,
        hidden,
      }) => {
        try {
          setError("");
          setSuccess("");

          await adminHideMessage({
            messageId,
            hidden,
          });

          setSuccess(
            hidden
              ? "Đã ẩn tin nhắn."
              : "Đã hiện lại tin nhắn."
          );

          await reloadMessages();

          return true;
        } catch (
          hideError
        ) {
          setError(
            getFriendlyError(
              hideError
            )
          );

          return false;
        }
      },
      [
        reloadMessages,
      ]
    );

  const banUser =
    useCallback(
      async ({
        userId,
        duration,
        reason,
      }) => {
        try {
          setError("");
          setSuccess("");

          await adminBanUser({
            userId,
            duration,
            reason,
          });

          /*
           * Tải lại cả trạng thái user
           * và dấu cấm trên avatar.
           */
          await refreshBanData(
            currentUser?.id
          );

          setSuccess(
            "Đã khóa chức năng chat của thành viên."
          );

          return true;
        } catch (banError) {
          setError(
            getFriendlyError(
              banError
            )
          );

          return false;
        }
      },
      [
        currentUser?.id,
        refreshBanData,
      ]
    );

  const unbanUser =
    useCallback(
      async (userId) => {
        try {
          setError("");
          setSuccess("");

          await adminUnbanUser(
            userId
          );

          /*
           * Xóa dấu cấm trong messages
           * ngay lập tức, không cần chờ
           * request hoặc Realtime.
           */
          setMessages(
            (
              currentMessages
            ) =>
              currentMessages.map(
                (message) => ({
                  ...message,

                  active_ban:
                    message.user_id ===
                    userId
                      ? null
                      : message.active_ban,

                  replied_message:
                    message
                      .replied_message
                      ? {
                          ...message
                            .replied_message,

                          active_ban:
                            message
                              .replied_message
                              .user_id ===
                            userId
                              ? null
                              : message
                                  .replied_message
                                  .active_ban,
                        }
                      : null,
                })
              )
          );

          /*
           * Nếu chính user đang đăng nhập
           * vừa được mở khóa thì bỏ khung đỏ
           * ngay lập tức.
           */
          if (
            currentUser?.id ===
            userId
          ) {
            setActiveBan(null);
          }

          /*
           * Đọc lại từ database để
           * đồng bộ dữ liệu chính xác.
           */
          await refreshBanData(
            currentUser?.id
          );

          setSuccess(
            "Đã mở khóa thành viên."
          );

          return true;
        } catch (
          unbanError
        ) {
          setError(
            getFriendlyError(
              unbanError
            )
          );

          return false;
        }
      },
      [
        currentUser?.id,
        refreshBanData,
      ]
    );

  const clearNotice =
    useCallback(() => {
      setError("");
      setSuccess("");
    }, []);

  return {
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
    reloadActiveBan,
    refreshBanData,
    sendMessage,
    deleteMessage,
    removeMessageByAdmin,
    toggleReaction,
    submitReport,
    hideMessage,
    banUser,
    unbanUser,
    clearNotice,
  };
}