'use client';

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export interface OnboardingPageProps {
  line1: string;
  line2?: string;
  line3?: string;
  withCurio?: boolean;
  curioSuffix?: string;
  bubbleText: string;
  onFinished: () => void;
  isMobile?: boolean;
  bubbleRightMobile?: number;
  bubbleRightDesktop?: number;
}

export const OnboardingPage = ({
  line1,
  line2,
  line3,
  withCurio = true,
  curioSuffix = '',
  bubbleText,
  onFinished,
  isMobile = false,
  bubbleRightMobile = 16,
  bubbleRightDesktop = 16,
}: OnboardingPageProps) => {
  const [showBubble, setShowBubble] = useState(false);
  const [showSecondLine, setShowSecondLine] = useState(false);
  const [showThirdLine, setShowThirdLine] = useState(false);

  useEffect(() => {
    if (!showBubble) return;
    const t = setTimeout(() => onFinished(), 2000);
    return () => clearTimeout(t);
  }, [showBubble, onFinished]);

  return (
    <div className={`relative text-center text-4xl md:text-6xl max-w-[1200px] mx-auto font-semibold leading-tight text-gray-900`}>
      <div
        className={`block type-line`}
        onAnimationEnd={() => {
          if (line2) setShowSecondLine(true); else setShowBubble(true);
        }}
      >
        {withCurio ? (
          <>
            {line1}{' '}
            <span className="relative inline-block text-gray-500 underline decoration-gray-500 underline-offset-8">curio</span>
            {curioSuffix}
          </>
        ) : (
          <>{line1}</>
        )}
      </div>
      {line2 && (
        <div className={`block ${showSecondLine ? 'type-line' : 'hidden'}`} onAnimationEnd={() => { if (line3) setShowThirdLine(true); else setShowBubble(true)}}>{line2}</div>
      )}
      {line3 && (
        <div className={`block ${showThirdLine ? 'type-line' : 'hidden'}`} onAnimationEnd={() => setShowBubble(true)}>{line3}</div>
      )}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={showBubble ? { opacity: 1, y: -165 } : { opacity: 0, y: -140 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="absolute top-35 whitespace-nowrap rounded-full rounded-bl-none border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 shadow"
        style={{ right: `${isMobile ? bubbleRightMobile : bubbleRightDesktop}px` }}
      >
        {bubbleText}
      </motion.div>
      <style jsx>{`
        @keyframes typewriterReveal { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
        @keyframes subtleLRBounce { 0% { transform: translateX(-4px);} 50% { transform: translateX(4px);} 100% { transform: translateX(0);} }
        .type-line { overflow: hidden; will-change: clip-path, transform; animation: typewriterReveal 550ms steps(28, end) both, subtleLRBounce 550ms ease-in-out both; }
      `}</style>
    </div>
  );
};    