import React, { useState, useEffect } from 'react';
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

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
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out ${
        isAnimating ? 'bg-black bg-opacity-70' : 'bg-black bg-opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 transform border border-gray-700 transition-all duration-300 ease-out ${
          isAnimating
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
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