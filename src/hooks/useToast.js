import {
  useCallback,
  useState,
} from "react";

function useToast() {
  const [toasts, setToasts] =
    useState([]);

  const removeToast = useCallback(
    (id) => {
      setToasts(
        (currentToasts) =>
          currentToasts.filter(
            (toast) =>
              toast.id !== id
          )
      );
    },
    []
  );

  const addToast = useCallback(
    ({
      title,
      message,
      type = "success",
      duration = 4500,
    }) => {
      const normalizedMessage =
        String(message ?? "").trim();

      if (!normalizedMessage) {
        return null;
      }

      const id =
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

      const toast = {
        id,
        title:
          title ?? "",
        message:
          normalizedMessage,
        type,
        duration,
      };

      setToasts(
        (currentToasts) => [
          ...currentToasts,
          toast,
        ]
      );

      return id;
    },
    []
  );

  const success = useCallback(
    (
      message,
      title = "Thành công"
    ) =>
      addToast({
        title,
        message,
        type: "success",
        duration: 4500,
      }),
    [addToast]
  );

  const error = useCallback(
    (
      message,
      title = "Có lỗi xảy ra"
    ) =>
      addToast({
        title,
        message,
        type: "error",
        duration: 6500,
      }),
    [addToast]
  );

  const info = useCallback(
    (
      message,
      title = "Thông báo"
    ) =>
      addToast({
        title,
        message,
        type: "info",
        duration: 4500,
      }),
    [addToast]
  );

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
  };
}

export default useToast;
