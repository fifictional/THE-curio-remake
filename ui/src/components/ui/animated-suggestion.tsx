'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Command } from 'lucide-react';

const suggestions = [
  "You can swap documents using CMD+K",
  "You can Zoom in and out using CMD+Plus and CMD+Minus",
  "You can use CMD+1 to toggle the sidebar",
  "You can search text in an image from the document page",
  "You can upload multiple images at once",
  "You can use Shift to change tool in the document page",
  // Add more suggestions here
];

export function AnimatedSuggestion() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % suggestions.length);
        setIsVisible(true);
      }, 500); // Wait for exit animation to complete
    }, 10000); // Change suggestion every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex gap-2 px-3 py-3 min-h-[3rem] bg-primary/5 rounded-lg">
      <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.p
            key={currentIndex}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="text-sm text-gray-600 break-words"
          >
            {suggestions[currentIndex].replaceAll('CMD', '⌘')}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
} 