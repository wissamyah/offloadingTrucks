import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, parseISO, startOfDay, isSameDay } from 'date-fns';
import { CustomDropdown } from './CustomDropdown';

interface PaginationProps {
  dates: string[];
  currentDate: string;
  onDateChange: (date: string) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ dates, currentDate, onDateChange }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const formatDateDisplay = (dateKey: string, isMobile: boolean = false) => {
    if (!dateKey) return 'No date';

    try {
      const date = parseISO(dateKey);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }

      const today = startOfDay(new Date());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (isSameDay(date, today)) {
        // On mobile: "Today - Sep 22"
        // On desktop: "Today - Monday, Sep 22"
        return isMobile
          ? `Today - ${format(date, 'MMM d')}`
          : `Today - ${format(date, 'EEEE, MMM d')}`;
      }

      if (isSameDay(date, yesterday)) {
        // On mobile: "Yesterday - Sep 21"
        // On desktop: "Yesterday - Sunday, Sep 21"
        return isMobile
          ? `Yesterday - ${format(date, 'MMM d')}`
          : `Yesterday - ${format(date, 'EEEE, MMM d')}`;
      }

      // On mobile: "Sep 20, 2025"
      // On desktop: "Saturday, Sep 20"
      return isMobile
        ? format(date, 'MMM d, yyyy')
        : format(date, 'EEEE, MMM d');
    } catch (error) {
      console.error('Error formatting date:', dateKey, error);
      return 'Invalid date';
    }
  };

  // Prepare options for the dropdown
  const dropdownOptions = useMemo(() => {
    return dates.map(date => ({
      value: date,
      label: formatDateDisplay(date, false),
      shortLabel: formatDateDisplay(date, true)
    }));
  }, [dates, isMobile]);

  if (dates.length === 0 || !currentDate) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-2 sm:p-4">
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === dates.length - 1}
          className={`p-1 sm:p-2 rounded-md transition-colors flex-shrink-0 ${
            currentIndex === dates.length - 1
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        <div className="flex items-center gap-1 sm:gap-3 min-w-0 flex-1 justify-center">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hidden sm:block flex-shrink-0" />
          <div className="min-w-0 max-w-[180px] sm:max-w-[280px]">
            <CustomDropdown
              value={currentDate}
              options={dropdownOptions}
              onChange={onDateChange}
              isMobile={isMobile}
            />
          </div>
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === 0}
          className={`p-1 sm:p-2 rounded-md transition-colors flex-shrink-0 ${
            currentIndex === 0
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>
    </div>
  );
};