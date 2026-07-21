import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "../supabaseClient";

const defaultMaintenance = {
  enabled: false,
  message:
    "Website đang bảo trì. Vui lòng quay lại sau.",
  startedAt: null,
  expectedEndAt: null,
};

export function useMaintenanceMode() {
  const [
    maintenance,
    setMaintenance,
  ] = useState(defaultMaintenance);

  const [
    isAdmin,
    setIsAdmin,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const loadMaintenance = useCallback(
    async () => {
      const {
        data,
        error,
      } = await supabase
        .from("app_settings")
        .select(
          "setting_key, setting_value"
        )
        .eq(
          "setting_key",
          "maintenance"
        )
        .maybeSingle();

      if (error) {
        console.error(
          "Không tải được trạng thái bảo trì:",
          error
        );

        throw error;
      }

      const value =
        data?.setting_value ?? {};

      setMaintenance({
        enabled:
          value.enabled === true,

        message:
          value.message ||
          defaultMaintenance.message,

        startedAt:
          value.started_at ?? null,

        expectedEndAt:
          value.expected_end_at ??
          null,
      });
    },
    []
  );

  const checkAdmin = useCallback(
    async () => {
      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "Không đọc được session:",
          sessionError
        );

        setIsAdmin(false);
        return false;
      }

      const user =
        sessionData.session?.user;

      if (!user) {
        setIsAdmin(false);
        return false;
      }



      const {
        data,
        error,
      } = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error(
          "Không kiểm tra được admin:",
          error
        );

        setIsAdmin(false);
        return false;
      }

      const adminResult =
        Boolean(data?.user_id);

      setIsAdmin(adminResult);

      return adminResult;
    },
    []
  );

  const reloadMaintenance =
    useCallback(async () => {
      await loadMaintenance();
      await checkAdmin();
    }, [
      loadMaintenance,
      checkAdmin,
    ]);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        setLoading(true);

        await Promise.all([
          loadMaintenance(),
          checkAdmin(),
        ]);
      } catch (error) {
        console.error(
          "Lỗi khởi tạo maintenance:",
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initialize();

    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        async (
          _event,
          session
        ) => {
          if (!mounted) {
            return;
          }

          setLoading(true);

          try {
            if (!session?.user) {
              setIsAdmin(false);
            } else {
              await checkAdmin();
            }

            await loadMaintenance();
          } catch (error) {
            console.error(
              "Lỗi cập nhật trạng thái đăng nhập:",
              error
            );
          } finally {
            if (mounted) {
              setLoading(false);
            }
          }
        }
      );

    const channel =
      supabase
        .channel(
          "app-settings-maintenance"
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
          async () => {
            try {
              await loadMaintenance();
            } catch (error) {
              console.error(
                "Không tải lại được maintenance:",
                error
              );
            }
          }
        )
        .subscribe();

    return () => {
      mounted = false;

      authListener.subscription.unsubscribe();

      supabase.removeChannel(
        channel
      );
    };
  }, [
    loadMaintenance,
    checkAdmin,
  ]);

  return {
    maintenance,
    isAdmin,
    loading,
    reloadMaintenance,
  };
}