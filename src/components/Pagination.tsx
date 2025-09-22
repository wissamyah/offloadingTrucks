import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, parseISO, addHours } from 'date-fns';

interface PaginationProps {
  dates: string[];
  currentDate: string;
  onDateChange: (date: string) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ dates, currentDate, onDateChange }) => {
  const currentIndex = dates.indexOf(currentDate);

  const handlePrevious = () => {
    if (currentIndex < dates.length - 1) {
      onDateChange(dates[currentIndex + 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex > 0) {
      onDateChange(dates[currentIndex - 1]);
    }
  };

  const formatDateDisplay = (dateKey: string) => {
    const date = parseISO(dateKey);
    const localDate = addHours(date, 2); // UTC+2
    const today = new Date();
    const todayKey = format(addHours(today, 2), 'yyyy-MM-dd');

    if (dateKey === todayKey) {
      return 'Today';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = format(addHours(yesterday, 2), 'yyyy-MM-dd');

    if (dateKey === yesterdayKey) {
      return 'Yesterday';
    }

    return format(localDate, 'dd MMMM yyyy');
  };

  if (dates.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === dates.length - 1}
          className={`p-2 rounded-md transition-colors ${
            currentIndex === dates.length - 1
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-gray-400" />
          <select
            value={currentDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="px-4 py-2 bg-gray-700 text-gray-100 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
          >
            {dates.map((date) => (
              <option key={date} value={date}>
                {formatDateDisplay(date)}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === 0}
          className={`p-2 rounded-md transition-colors ${
            currentIndex === 0
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};