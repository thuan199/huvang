import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

const INITIAL_STATE = {
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Xác nhận',
  cancelText: 'Hủy',
  type: 'danger',
};

function useConfirm() {
  const [confirmState, setConfirmState] =
    useState(INITIAL_STATE);

  const resolveRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      /*
       * Nếu modal cũ vẫn còn mở, đóng modal cũ trước.
       */
      if (resolveRef.current) {
        resolveRef.current(false);
      }

      resolveRef.current = resolve;

      setConfirmState({
        isOpen: true,
        title: options.title || 'Xác nhận thao tác',
        message:
          options.message ||
          'Bạn có chắc muốn thực hiện thao tác này?',
        confirmText:
          options.confirmText || 'Xác nhận',
        cancelText:
          options.cancelText || 'Hủy',
        type: options.type || 'danger',
      });
    });
  }, []);

  const closeWithResult = useCallback((result) => {
    const resolve = resolveRef.current;

    resolveRef.current = null;
    setConfirmState(INITIAL_STATE);

    if (resolve) {
      resolve(result);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    closeWithResult(true);
  }, [closeWithResult]);

  const handleCancel = useCallback(() => {
    closeWithResult(false);
  }, [closeWithResult]);

  useEffect(() => {
    return () => {
      if (resolveRef.current) {
        resolveRef.current(false);
        resolveRef.current = null;
      }
    };
  }, []);

  return {
    confirm,
    confirmModalProps: {
      ...confirmState,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  };
}

export default useConfirm;