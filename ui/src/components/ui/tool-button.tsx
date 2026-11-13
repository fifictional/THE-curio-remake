'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToolButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  isActive?: boolean;
  showShortcut?: boolean;
  shortcutIcon?: React.ReactNode;
}

export function ToolButton({ icon: Icon, label, onClick, disabled, isActive, showShortcut, shortcutIcon }: ToolButtonProps) {
  return (
    <button
      onClick={() => {
        if (disabled) return;
        onClick?.();
      }}
      className={cn("flex transition-colors relative cursor-pointer items-center gap-2 px-4 h-10 rounded-full border border-gray-200 bg-white text-sm font-medium hover:bg-primary hover:text-white", disabled && "opacity-50 cursor-not-allowed", isActive && "bg-primary text-white")}
      title={label}
    >
      {/* {label} */}
      <Icon className="h-4 w-4" />
      <AnimatePresence>
        {showShortcut && (
          <motion.span 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              transition: {
                type: "spring",
                stiffness: 400,
                damping: 15,
              }
            }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="absolute -bottom-2 -left-2 bg-white text-gray-500 border border-gray-200 p-1 rounded-full text-xs"
          >
            {shortcutIcon}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
} 