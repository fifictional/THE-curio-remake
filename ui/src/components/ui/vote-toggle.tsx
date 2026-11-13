'use client';

import { cn } from '@/lib/utils';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

type VoteValue = 'up' | 'down' | null;

interface VoteToggleProps {
  value: VoteValue;
  disabled?: boolean;
  variant?: 'icon' | 'button';
  align?: 'left' | 'center' | 'right';
  size?: 'sm' | 'md';
  className?: string;
  onUpClick?: () => void;
  onDownClick?: () => void;
}

export function VoteToggle({
  value,
  disabled = false,
  variant = 'button',
  align = 'left',
  size = 'md',
  className,
  onUpClick,
  onDownClick,
}: VoteToggleProps) {
  const isUp = value === 'up';
  const isDown = value === 'down';

  const handleUp = () => {
    const next = isUp ? null : 'up';
    // Parent handler should infer clear vs set from current value
    onUpClick?.();
  };

  const handleDown = () => {
    const next = isDown ? null : 'down';
    // Parent handler should infer clear vs set from current value
    onDownClick?.();
  };

  const alignClass = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';

  if (variant === 'icon') {
    const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    return (
      <div className={cn('flex items-center gap-2', alignClass, className)}>
        <button
          type="button"
          aria-label="Thumbs up"
          aria-pressed={isUp}
          disabled={disabled}
          data-testid="vote-thumbs-up"
          className={cn('p-1 rounded', isUp ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600')}
          onClick={handleUp}
        >
          <ThumbsUp className={iconSize} />
        </button>
        <button
          type="button"
          aria-label="Thumbs down"
          aria-pressed={isDown}
          disabled={disabled}
          data-testid="vote-thumbs-down"
          className={cn('p-1 rounded', isDown ? 'text-red-600' : 'text-gray-400 hover:text-gray-600')}
          onClick={handleDown}
        >
          <ThumbsDown className={iconSize} />
        </button>
      </div>
    );
  }

  // button variant (with labels)
  return (
    <div className={cn('flex items-center gap-2', alignClass, className)}>
      <button
        type="button"
        aria-label="Thumbs up"
        aria-pressed={isUp}
        disabled={disabled}
        data-testid="vote-thumbs-up"
        className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm transition-colors', isUp ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}
        onClick={handleUp}
      >
        <ThumbsUp className="w-4 h-4" />
        Up
      </button>
      <button
        type="button"
        aria-label="Thumbs down"
        aria-pressed={isDown}
        disabled={disabled}
        data-testid="vote-thumbs-down"
        className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm transition-colors', isDown ? 'border-red-500 text-red-600 bg-red-50' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}
        onClick={handleDown}
      >
        <ThumbsDown className="w-4 h-4" />
        Down
      </button>
    </div>
  );
}


