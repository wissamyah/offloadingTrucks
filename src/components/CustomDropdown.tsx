import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface CustomDropdownProps {
  value: string;
  options: { value: string; label: string; shortLabel?: string }[];
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  isMobile?: boolean;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  options,
  onChange,
  className = '',
  placeholder = 'Select an option',
  isMobile = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && optionsRef.current) {
      const selectedElement = optionsRef.current.querySelector('[data-selected="true"]');
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(options.findIndex(opt => opt.value === value));
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < options.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          onChange(options[highlightedIndex].value);
          setIsOpen(false);
          buttonRef.current?.focus();
        }
        break;
    }
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`
          w-full flex items-center justify-between
          px-2 sm:px-3 py-1.5 sm:py-2
          bg-gray-700 hover:bg-gray-650
          text-gray-100 text-xs sm:text-sm font-medium
          border border-gray-600 rounded-md
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          transition-all duration-200
          ${isOpen ? 'ring-2 ring-blue-500 border-transparent' : ''}
        `}
      >
        <span className="truncate pr-2">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-3 w-3 sm:h-4 sm:w-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div
        ref={optionsRef}
        className={`
          absolute z-[9999] w-full mt-1
          bg-gray-800 border border-gray-700 rounded-md shadow-xl
          max-h-60 overflow-auto
          transition-all duration-200 ease-out
          custom-scrollbar
          ${isOpen
            ? 'opacity-100 transform translate-y-0 scale-100 visible'
            : 'opacity-0 transform -translate-y-2 scale-95 invisible pointer-events-none'
          }
        `}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#4b5563 #1f2937'
        }}
      >

          <div className="py-1">
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  buttonRef.current?.focus();
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                data-selected={option.value === value}
                className={`
                  w-full px-3 py-2 text-left flex items-center justify-between
                  transition-colors duration-150
                  ${option.value === value
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-gray-200 hover:bg-gray-700'
                  }
                  ${highlightedIndex === index ? 'bg-gray-700' : ''}
                `}
              >
                <span className="text-xs sm:text-sm truncate pr-2">
                  {isMobile && option.shortLabel ? option.shortLabel : option.label}
                </span>
                {option.value === value && (
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
    </div>
  );
};