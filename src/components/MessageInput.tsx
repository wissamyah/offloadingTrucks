import React, { useState } from 'react';
import { FileText, RotateCcw } from 'lucide-react';
import { LoadingButton } from './LoadingButton';
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to process message');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset all truck data? This action cannot be undone.')) {
      return;
    }

    setResetting(true);
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
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <label htmlFor="message-input" className="block text-sm font-medium text-gray-700 mb-2">
          WhatsApp Message Input
        </label>
        <textarea
          id="message-input"
          className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={10}
          placeholder={`Paste your WhatsApp message here. Example:

Good morning sir,
3 truck rice paddy arrived.

1. Samuel chamblatda 202 bags 21%
   NCH 517 XA
2. Ibrahim kaita 234 bags 13%
   KTG 401 ZZ
3. Mukhtari Sale 343 bags 12%
   GWA 162 YR`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
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
    </div>
  );
};