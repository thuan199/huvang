import { supabase } from "../supabaseClient";


export async function getMaintenanceStatus() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("setting_value, updated_at")
    .eq("setting_key", "maintenance")
    .single();

  if (error) {
    throw error;
  }

  return {
    enabled: data?.setting_value?.enabled === true,
    message:
      data?.setting_value?.message ||
      "Website đang bảo trì. Vui lòng quay lại sau.",
    startedAt: data?.setting_value?.started_at ?? null,
    expectedEndAt: data?.setting_value?.expected_end_at ?? null,
    updatedAt: data?.updated_at ?? null,
  };
}

export async function updateMaintenanceStatus({
  enabled,
  message,
  expectedEndAt = null,
}) {
  const settingValue = {
    enabled,
    message:
      message?.trim() ||
      "Website đang bảo trì. Vui lòng quay lại sau.",
    started_at: enabled ? new Date().toISOString() : null,
    expected_end_at: enabled ? expectedEndAt : null,
  };

  const { data, error } = await supabase
    .from("app_settings")
    .update({
      setting_value: settingValue,
      updated_at: new Date().toISOString(),
    })
    .eq("setting_key", "maintenance")
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function checkCurrentUserIsAdmin() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return false;
  }

  const { data, error } = await supabase
    .from("app_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}