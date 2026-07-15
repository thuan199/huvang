import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

function useToast() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    const timer = timersRef.current.get(id);

    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id)
    );
  }, []);

  const addToast = useCallback(
    ({
      title,
      message,
      type = 'success',
      duration = 4500,
    }) => {
      const id = `${Date.now()}-${Math.random()}`;

      const toast = {
        id,
        title,
        message,
        type,
      };

      setToasts((currentToasts) => [
        ...currentToasts,
        toast,
      ]);

      if (duration > 0) {
        const timer = setTimeout(() => {
          removeToast(id);
        }, duration);

        timersRef.current.set(id, timer);
      }

      return id;
    },
    [removeToast]
  );

  const success = useCallback(
    (message, title = 'Thành công') =>
      addToast({
        title,
        message,
        type: 'success',
      }),
    [addToast]
  );

  const error = useCallback(
    (message, title = 'Có lỗi xảy ra') =>
      addToast({
        title,
        message,
        type: 'error',
        duration: 6500,
      }),
    [addToast]
  );

  const info = useCallback(
    (message, title = 'Thông báo') =>
      addToast({
        title,
        message,
        type: 'info',
      }),
    [addToast]
  );

  useEffect(() => {
    const timers = timersRef.current;

    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }

      timers.clear();
    };
  }, []);

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