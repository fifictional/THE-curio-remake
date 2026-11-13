import { useEffect, useState } from "react";

export type WindowResizeProps = {
  onResize: () => void;
}

export function useWindowResize({ onResize }: WindowResizeProps) {
  useEffect(() => {
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [onResize]);
}