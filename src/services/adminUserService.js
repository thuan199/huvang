import { supabase } from "../supabaseClient";

async function invokeAdminUsers({
  method = "GET",
  query = "",
  body,
} = {}) {
  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const accessToken =
    sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error(
      "Bạn chưa đăng nhập.",
    );
  }

  const functionUrl =
    `${import.meta.env.VITE_SUPABASE_URL}` +
    `/functions/v1/admin-users${query}`;

  const response =
    await fetch(functionUrl, {
      method,
      headers: {
        Authorization:
          `Bearer ${accessToken}`,
        apikey:
          import.meta.env
            .VITE_SUPABASE_ANON_KEY,
        "Content-Type":
          "application/json",
      },
      body:
        body !== undefined
          ? JSON.stringify(body)
          : undefined,
    });

  const result =
    await response.json();

  if (!response.ok) {
    throw new Error(
      result?.error ||
        "Không thể xử lý quản lý người dùng.",
    );
  }

  return result;
}

export async function getAdminUsers({
  page = 1,
  perPage = 50,
} = {}) {
  return invokeAdminUsers({
    method: "GET",
    query:
      `?page=${page}` +
      `&perPage=${perPage}`,
  });
}

export async function lockAdminUser(
  userId,
  banDuration,
) {
  return invokeAdminUsers({
    method: "POST",
    body: {
      userId,
      action: "lock",
      banDuration,
    },
  });
}

export async function unlockAdminUser(
  userId,
) {
  return invokeAdminUsers({
    method: "POST",
    body: {
      userId,
      action: "unlock",
    },
  });
}