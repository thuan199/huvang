import { supabase } from "../supabaseClient";

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

export async function getPendingChatReportCount() {
  const {
    count,
    error,
  } = await supabase
    .from("chat_reports")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("status", "pending");

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function loadAdminChatReports() {
  const {
    data: reports,
    error: reportError,
  } = await supabase
    .from("chat_reports")
    .select(`
      id,
      message_id,
      reporter_id,
      reason,
      description,
      status,
      admin_note,
      created_at,
      handled_at
    `)
    .order("created_at", {
      ascending: false,
    });

  if (reportError) {
    throw reportError;
  }

  if (!reports?.length) {
    return [];
  }

  const messageIds = [
    ...new Set(
      reports
        .map(
          (report) =>
            report.message_id
        )
        .filter(Boolean)
    ),
  ];

  let messages = [];

  if (messageIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from("chat_messages")
      .select(`
        id,
        user_id,
        content,
        is_deleted,
        moderation_message,
        moderated_by,
        created_at
      `)
      .in("id", messageIds);

    if (error) {
      throw error;
    }

    messages = data ?? [];
  }

  const profileIds = [
    ...new Set(
      [
        ...reports.map(
          (report) =>
            report.reporter_id
        ),

        ...messages.map(
          (message) =>
            message.user_id
        ),
      ].filter(Boolean)
    ),
  ];

  let profiles = [];

  if (profileIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from(PROFILE_TABLE)
      .select(`
        id,
        display_name,
        avatar_url
      `)
      .in("id", profileIds);

    if (error) {
      throw error;
    }

    profiles = data ?? [];
  }

  const messageMap = new Map(
    messages.map(
      (message) => [
        message.id,
        message,
      ]
    )
  );

  const profileMap = new Map(
    profiles.map(
      (profile) => [
        profile.id,
        {
          id: profile.id,
          ...normalizeProfile(
            profile
          ),
        },
      ]
    )
  );

  return reports.map(
    (report) => {
      const message =
        messageMap.get(
          report.message_id
        ) ?? null;

      const reporterProfile =
        profileMap.get(
          report.reporter_id
        ) ?? {
          display_name:
            "Thành viên",
          avatar_url: null,
        };

      const reportedProfile =
        message
          ? profileMap.get(
              message.user_id
            ) ?? {
              display_name:
                "Thành viên",
              avatar_url: null,
            }
          : null;

      return {
        ...report,
        reporterProfile,

        message: message
          ? {
              ...message,
              profile:
                reportedProfile,
            }
          : null,
      };
    }
  );
}

export async function updateChatReportStatus({
  reportId,
  status,
  adminNote = "",
}) {
  if (!reportId) {
    throw new Error(
      "Thiếu mã báo cáo."
    );
  }

  const allowedStatuses = [
    "pending",
    "reviewed",
    "resolved",
    "dismissed",
  ];

  if (
    !allowedStatuses.includes(
      status
    )
  ) {
    throw new Error(
      "Trạng thái báo cáo không hợp lệ."
    );
  }

  const { error } =
    await supabase.rpc(
      "admin_update_chat_report",
      {
        target_report_id:
          reportId,

        new_status:
          status,

        new_admin_note:
          adminNote?.trim() ||
          null,
      }
    );

  if (error) {
    throw error;
  }

  return true;
}