import React, { useState, useRef, useEffect } from 'react';
import { FileText, RotateCcw } from 'lucide-react';
import { LoadingButton } from './LoadingButton';
import { ConfirmationModal } from './ConfirmationModal';
import { parseLoadingMessage, validateParsedLoadings } from '../utils/loadingParser';
import { ParsedLoadingEntry } from '../types/loading';
import toast from 'react-hot-toast';

interface LoadingMessageInputProps {
  onProcess: (entries: ParsedLoadingEntry[]) => Promise<void>;
  onReset: () => void;
}

export const LoadingMessageInput: React.FC<LoadingMessageInputProps> = ({ onProcess, onReset }) => {
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.max(120, Math.min(scrollHeight, 400));
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [message]);

  const handleProcess = async () => {
    if (!message.trim()) {
      toast.error('Please enter a WhatsApp message to process');
      return;
    }

    setProcessing(true);

    try {
      const entries = parseLoadingMessage(message);

      if (entries.length === 0) {
        toast.error('No valid loading entries found in the message');
        setProcessing(false);
        return;
      }

      const validation = validateParsedLoadings(entries);
      if (!validation.valid) {
        validation.errors.forEach(error => toast.error(error));
        setProcessing(false);
        return;
      }

      await onProcess(entries);
      setMessage('');

      // Smooth scroll to table
      setTimeout(() => {
        const tableElement = document.getElementById('loadings-table');
        if (tableElement) {
          tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (error: any) {
      // Error already handled by hook
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = async () => {
    setResetting(true);
    setShowResetConfirm(false);
    try {
      await onReset();
      setMessage('');
    } catch (error: any) {
      // Error already handled by hook
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700 flex flex-col min-h-full w-full">
      <div className="mb-4 w-full">
        <textarea
          ref={textareaRef}
          id="loading-message-input"
          className="w-full px-3 py-2 text-gray-100 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-[border-color,box-shadow] duration-200 ease-out textarea-scrollbar overflow-auto"
          style={{ height: '120px' }}
          placeholder="Paste WhatsApp message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </div>

      <div className="flex gap-3">
        <LoadingButton
          onClick={handleProcess}
          loading={processing}
          variant="primary"
          icon={<FileText className="h-5 w-5" />}
        >
          Process
        </LoadingButton>

        <LoadingButton
          onClick={handleReset}
          loading={resetting}
          variant="danger"
          icon={<RotateCcw className="h-5 w-5" />}
        >
          Reset
        </LoadingButton>
      </div>

      <ConfirmationModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={confirmReset}
        title="Reset All Loading Data?"
        message="Are you sure you want to reset all loading data? This action will permanently delete all loading entries and cannot be undone."
        confirmText="Reset All"
        cancelText="Cancel"
        type="danger"
        loading={resetting}
      />
    </div>
  );
};

