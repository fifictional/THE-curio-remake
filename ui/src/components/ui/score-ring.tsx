'use client';

import React, { useEffect, useRef, useState } from 'react';

export function ScoreRing({ percent }: { percent: number }) {
  const clamped = Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : 0;
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [showLabel, setShowLabel] = useState(clamped === 0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset animation state
    setShowLabel(clamped === 0);
    setAnimatedPercent(0);

    // Kick off animation on next frame for reliable transition
    const raf = requestAnimationFrame(() => {
      setAnimatedPercent(clamped);
    });

    // Fallback in case transitionend doesn't fire on some browsers
    if (clamped > 0) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setShowLabel(true), 2100);
    }

    return () => {
      cancelAnimationFrame(raf);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [clamped]);

  return (
    <div className="relative h-40 w-40">
      <svg viewBox="0 0 36 36" className="h-full w-full">
        <path
          className="text-gray-200"
          d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          pathLength={100}
          transform="rotate(-90 18 18)"
        />
        <path
          className="text-emerald-500"
          d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          pathLength={100}
          style={{ transition: 'stroke-dasharray 2000ms ease-in-out' }}
          strokeDasharray={`${animatedPercent} 100`}
          onTransitionEnd={() => setShowLabel(true)}
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center text-xl font-semibold transition-opacity duration-300 ${showLabel ? 'opacity-100' : 'opacity-0'}`}>
        {clamped}%
      </div>
    </div>
  );
}


