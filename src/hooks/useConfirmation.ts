import { useState, useCallback } from 'react';

interface ConfirmationState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: 'warning' | 'danger' | 'info';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export const useConfirmation = () => {
  const [state, setState] = useState<ConfirmationState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'warning',
    onConfirm: () => {},
  });

  const confirm = useCallback((
    options: Omit<ConfirmationState, 'isOpen'>
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        ...options,
        isOpen: true,
        onConfirm: async () => {
          if (options.onConfirm) {
            await options.onConfirm();
          }
          setState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          if (options.onCancel) {
            options.onCancel();
          }
          setState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  }, []);

  const close = useCallback(() => {
    if (state.onCancel) {
      state.onCancel();
    } else {
      setState(prev => ({ ...prev, isOpen: false }));
    }
  }, [state.onCancel]);

  return {
    confirmationState: state,
    confirm,
    close,
  };
};