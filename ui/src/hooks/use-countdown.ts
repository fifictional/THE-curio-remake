import { useSessionContext } from "@/providers/session-provider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const useCountdown = () => {
  const { nextRequestAt } = useSessionContext();
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (nextRequestAt) {
      intervalRef.current = setInterval(() => {
        setCountdown(nextRequestAt.getTime() - Date.now());
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setCountdown(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [nextRequestAt]);

};