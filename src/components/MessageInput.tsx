import React, { useState, useRef, useEffect } from 'react';
import { FileText, RotateCcw } from 'lucide-react';
import { LoadingButton } from './LoadingButton';
import { ConfirmationModal } from './ConfirmationModal';
import { parseWhatsAppMessage, validateParsedData } from '../utils/parser';
import { ParsedTruckEntry } from '../types/truck';
import toast from 'react-hot-toast';

interface MessageInputProps {
  onProcess: (entries: ParsedTruckEntry[]) => Promise<void>;
  onReset: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onProcess, onReset }) => {
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      // Don't reset to auto for smoother transition
      const minHeight = isFocused ? 100 : 60; // Smaller when not focused

      // Get the scroll height without resetting
      const tempHeight = textareaRef.current.style.height;
      textareaRef.current.style.height = 'auto';
      const contentHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = tempHeight;

      // Smooth transition to new height
      const newHeight = Math.max(minHeight, Math.min(contentHeight, 400));

      // Use requestAnimationFrame for smoother transition
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = `${newHeight}px`;
        }
      });
    }
  }, [message, isFocused]);

  const handleProcess = async () => {
    if (!message.trim()) {
      toast.error('Please enter a WhatsApp message to process');
      return;
    }

    setProcessing(true);

    try {
      const entries = parseWhatsAppMessage(message);

      if (entries.length === 0) {
        toast.error('No valid truck entries found in the message');
        setProcessing(false);
        return;
      }

      const validation = validateParsedData(entries);
      if (!validation.valid) {
        validation.errors.forEach(error => toast.error(error));
        setProcessing(false);
        return;
      }

      await onProcess(entries);
      setMessage('');
      toast.success(`Successfully processed ${entries.length} truck${entries.length > 1 ? 's' : ''}`);

      // Smooth scroll to table
      setTimeout(() => {
        const tableElement = document.getElementById('truck-table');
        if (tableElement) {
          tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (error: any) {
      toast.error(error.message || 'Failed to process message');
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
      toast.success('All truck data has been reset');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset data');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
      <div className="mb-4">
        <label htmlFor="message-input" className="block text-sm font-medium text-gray-300 mb-2">
          WhatsApp Message Input
        </label>
        <textarea
          ref={textareaRef}
          id="message-input"
          className="w-full px-3 py-2 text-gray-100 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-[height,border-color,box-shadow] duration-500 ease-out"
          style={{ minHeight: '60px', overflow: 'hidden' }}
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
        title="Reset All Truck Data?"
        message="Are you sure you want to reset all truck data? This action will permanently delete all truck entries and cannot be undone."
        confirmText="Reset All"
        cancelText="Cancel"
        type="danger"
        loading={resetting}
      />
    </div>
  );
};