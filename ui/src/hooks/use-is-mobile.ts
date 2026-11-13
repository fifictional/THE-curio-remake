import { useEffect, useState } from "react";

export const useIsMobile = () => {
const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1024px)');
    
    const handleChange = (e: MediaQueryList | MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    // Initial check
    handleChange(mediaQuery);

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } 
    // Fallback for Safari < 14
    else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return { isMobile };
}