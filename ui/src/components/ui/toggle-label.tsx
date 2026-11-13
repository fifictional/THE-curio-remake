'use client';

import React from 'react';

export interface ToggleLabelProps {
  text: string;
  icon?: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function ToggleLabel({ text, icon, selected, onClick, className, size = 'md' }: ToggleLabelProps) {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={text}
      className={
        `inline-flex items-center gap-2 rounded-full ${sizeClasses} transition-colors cursor-pointer ` +
        (selected
          ? 'bg-gray-700 text-white hover:bg-gray-600 '
          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-300 ') +
        (className || '')
      }
    >
      {icon}
      <span>{text}</span>
    </button>
  );
}


