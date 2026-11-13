import { useEffect } from "react";

export const useListenToEnter = ({ onEnterPress }: { onEnterPress: () => void }) => {

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        onEnterPress();
      }
    };
    window.addEventListener('keypress', handleKeyDown);
    return () => {
      window.removeEventListener('keypress', handleKeyDown);
    };
  }, [onEnterPress]);
};