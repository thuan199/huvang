import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "../supabaseClient";

const defaultMaintenance = {
  enabled: false,
  message: "Website đang bảo trì. Vui lòng quay lại sau.",
  startedAt: null,
  expectedEndAt: null,
};

const REQUEST_TIMEOUT_MS = 10000;

async function withTimeout(promise, timeoutMs = REQUEST_TIMEOUT_MS) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error("Yêu cầu Supabase quá thời gian chờ."));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      promise,
      timeoutPromise,
    ]);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function useMaintenanceMode() {
  const [maintenance, setMaintenance] =
    useState(defaultMaintenance);

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const loadMaintenance = useCallback(async () => {
    try {
      const request =
        supabase
          .from("app_settings")
          .select("setting_key, setting_value")
          .eq("setting_key", "maintenance")
          .maybeSingle();

      const { data, error } =
        await withTimeout(request);

      if (error) {
        throw error;
      }

      const value =
        data?.setting_value ?? {};

      setMaintenance({
        enabled: value.enabled === true,
        message:
          value.message ||
          defaultMaintenance.message,
        startedAt:
          value.started_at ?? null,
        expectedEndAt:
          value.expected_end_at ?? null,
      });
    } catch (error) {
      console.error(
        "Không tải được trạng thái bảo trì:",
        error,
      );

      setMaintenance(
        defaultMaintenance,
      );
    }
  }, []);

  const checkAdminByUser =
    useCallback(async (user) => {
      if (!user?.id) {
        setIsAdmin(false);
        return false;
      }

      try {
        const request =
          supabase
            .from("app_admins")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();

        const { data, error } =
          await withTimeout(request);

        if (error) {
          throw error;
        }

        const adminResult =
          data?.user_id === user.id;

        setIsAdmin(adminResult);

        return adminResult;
      } catch (error) {
        console.error(
          "Không kiểm tra được admin:",
          error,
        );

        setIsAdmin(false);
        return false;
      }
    }, []);

  const checkAdmin =
    useCallback(async () => {
      try {
        const { data, error } =
          await withTimeout(
            supabase.auth.getSession(),
          );

        if (error) {
          throw error;
        }

        return checkAdminByUser(
          data.session?.user ?? null,
        );
      } catch (error) {
        console.error(
          "Không đọc được session:",
          error,
        );

        setIsAdmin(false);
        return false;
      }
    }, [checkAdminByUser]);

  const reloadMaintenance =
    useCallback(async () => {
      await Promise.allSettled([
        loadMaintenance(),
        checkAdmin(),
      ]);
    }, [
      loadMaintenance,
      checkAdmin,
    ]);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      setLoading(true);

      try {
        await Promise.allSettled([
          loadMaintenance(),
          checkAdmin(),
        ]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initialize();

    const { data: authListener } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!mounted) {
            return;
          }

          window.setTimeout(async () => {
            if (!mounted) {
              return;
            }

            setLoading(true);

            try {
              await Promise.allSettled([
                loadMaintenance(),
                checkAdminByUser(
                  session?.user ?? null,
                ),
              ]);
            } finally {
              if (mounted) {
                setLoading(false);
              }
            }
          }, 0);
        },
      );

    const channel =
      supabase
        .channel(
          "app-settings-maintenance",
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "app_settings",
            filter:
              "setting_key=eq.maintenance",
          },
          () => {
            loadMaintenance();
          },
        )
        .subscribe();

    return () => {
      mounted = false;

      authListener
        .subscription
        .unsubscribe();

      supabase.removeChannel(
        channel,
      );
    };
  }, [
    loadMaintenance,
    checkAdmin,
    checkAdminByUser,
  ]);

  return {
    maintenance,
    isAdmin,
    loading,
    reloadMaintenance,
  };
}