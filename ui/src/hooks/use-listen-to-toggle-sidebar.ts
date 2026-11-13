import { useEffect } from "react";

export const useListenToToggleSidebar = ({
  onToggleSidebar,
}: {
  onToggleSidebar: () => void;
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onToggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onToggleSidebar]);
};