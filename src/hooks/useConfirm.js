import {
  useCallback,
  useRef,
  useState,
} from "react";

const initialConfirmState = {
  isOpen: false,
  title: "",
  message: "",
  confirmText: "Xác nhận",
  cancelText: "Hủy",
  type: "default",
  icon: null,
};

export default function useConfirm() {
  const [
    confirmState,
    setConfirmState,
  ] = useState(initialConfirmState);

  const resolverRef =
    useRef(null);

  const confirm =
    useCallback((options = {}) => {
      return new Promise(
        (resolve) => {
          resolverRef.current =
            resolve;

          setConfirmState({
            ...initialConfirmState,
            ...options,
            isOpen: true,

            /*
             * Bảo đảm icon được giữ lại.
             */
            icon:
              options.icon ??
              null,
          });
        },
      );
    }, []);

  const handleConfirm =
    useCallback(() => {
      resolverRef.current?.(true);
      resolverRef.current = null;

      setConfirmState(
        initialConfirmState,
      );
    }, []);

  const handleCancel =
    useCallback(() => {
      resolverRef.current?.(false);
      resolverRef.current = null;

      setConfirmState(
        initialConfirmState,
      );
    }, []);

  const confirmModalProps = {
    ...confirmState,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
  };

  return {
    confirm,
    confirmModalProps,
  };
}