import { useCallback, useEffect } from "react";

export const useListenToZoom = ({
  onIncreaseZoom,
  onDecreaseZoom,
}: {
  onIncreaseZoom: () => void;
  onDecreaseZoom: () => void;
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // zoom in is ctrl + = on windows and cmd + = on mac
      // zoom out is ctrl + - on windows and cmd + - on mac
      if (e.key === '=' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onIncreaseZoom();
      }
      if (e.key === '-' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onDecreaseZoom();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onIncreaseZoom, onDecreaseZoom]);
};