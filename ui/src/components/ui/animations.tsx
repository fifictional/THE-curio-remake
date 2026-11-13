'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';

interface FadeSlideToggleProps {
  isVisible: boolean;
  children: ReactNode;
  duration?: number;
  delay?: number;
  y?: number;
  className?: string;
}

export function FadeSlideToggle({
  isVisible,
  children,
  duration = 0.4,
  delay = 0,
  y = 24,
  className,
}: FadeSlideToggleProps) {
  return (
    <motion.div
      className={className}
      initial={false}
      animate={{
        opacity: isVisible ? 1 : 0,
        y: isVisible ? 0 : y,
        height: isVisible ? 'auto' : 0,
      }}
      transition={{ duration, ease: 'easeOut', delay }}
      style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
      aria-hidden={!isVisible}
    >
      {children}
    </motion.div>
  );
}

interface AppearFadeSlideProps {
  children: ReactNode;
  duration?: number;
  delay?: number;
  y?: number;
  className?: string;
}

export function AppearFadeSlide({ children, duration = 0.4, delay = 0, y = 20, className }: AppearFadeSlideProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  );
}

interface SwapFadeSlideProps {
  isFirstVisible: boolean;
  first: ReactNode;
  second: ReactNode;
  duration?: number;
  yEnter?: number;
  yExit?: number;
  className?: string;
}

export function SwapFadeSlide({
  isFirstVisible,
  first,
  second,
  duration = 0.35,
  yEnter = 10,
  yExit = -10,
  className,
}: SwapFadeSlideProps) {
  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {isFirstVisible ? (
          <motion.div
            key="first"
            initial={{ opacity: 0, y: yEnter }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: yExit }}
            transition={{ duration, ease: 'easeOut' }}
          >
            {first}
          </motion.div>
        ) : (
          <motion.div
            key="second"
            initial={{ opacity: 0, y: yEnter }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: yExit }}
            transition={{ duration, ease: 'easeOut' }}
          >
            {second}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


