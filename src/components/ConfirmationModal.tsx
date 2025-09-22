import React from 'react';
import { AlertTriangle, Info, XCircle } from 'lucide-react';
import { LoadingButton } from './LoadingButton';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
  loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  loading = false,
}) => {
  if (!isOpen) return null;

  const icons = {
    warning: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
    danger: <XCircle className="h-6 w-6 text-red-500" />,
    info: <Info className="h-6 w-6 text-blue-500" />,
  };

  const confirmVariants = {
    warning: 'primary' as const,
    danger: 'danger' as const,
    info: 'primary' as const,
  };

  const handleConfirm = async () => {
    const result = onConfirm();
    if (result instanceof Promise) {
      await result;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 transform transition-all border border-gray-700">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 pt-0.5">
            {icons[type]}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-100 mb-2">
              {title}
            </h3>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">
              {message}
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <LoadingButton
            onClick={onClose}
            variant="secondary"
            disabled={loading}
          >
            {cancelText}
          </LoadingButton>
          <LoadingButton
            onClick={handleConfirm}
            loading={loading}
            variant={confirmVariants[type]}
          >
            {confirmText}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
};