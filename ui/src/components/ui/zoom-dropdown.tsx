'use client';

import { useListenToZoom } from '@/hooks/use-listen-to-zoom';
import { ZoomIn } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

const ZOOM_LEVELS = [
  { value: 0.5, label: '50%' },
  { value: 0.75, label: '75%' },
  { value: 1, label: '100%' },
  { value: 1.25, label: '125%' },
  { value: 1.5, label: '150%' },
  { value: 2, label: '200%' },
];

interface ZoomDropdownProps {
  value: number;
  onChange: (value: number) => void;
}

export function ZoomDropdown({ value, onChange }: ZoomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentLabel = `${Math.round(value * 100)}%`;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 h-10 rounded-full border border-gray-200 bg-white text-lg font-medium text-gray-500 hover:bg-gray-200"
      >
        <ZoomIn className="h-5 w-5" />
        {currentLabel}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-[120px] rounded-2xl border bg-white shadow-lg z-[1200]">
          <div className="py-1">
            {ZOOM_LEVELS.map((level) => (
              <button
                key={level.value}
                className="w-full px-3 py-1.5 text-medium text-left hover:bg-gray-100 rounded-2xl"
                onClick={() => {
                  onChange(level.value);
                  setIsOpen(false);
                }}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 