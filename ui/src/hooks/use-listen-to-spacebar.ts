import { useEffect, useState } from "react";

export const useListenToSpacebar = ({ onSpacebarPress }: { onSpacebarPress: () => void }) => {

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        onSpacebarPress();
      }
    };
    window.addEventListener('keypress', handleKeyDown);
    return () => {
      window.removeEventListener('keypress', handleKeyDown);
    };
  }, [onSpacebarPress]);
};