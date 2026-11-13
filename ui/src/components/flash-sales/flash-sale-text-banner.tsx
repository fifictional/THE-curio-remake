"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalytics } from '@/providers';
import { cn } from '@/lib/utils';
import { FlashSale } from '@/hooks/use-flash-sales';
import { useCommonContext } from '@/providers/common-provider';

interface FlashSaleTextBannerProps {
  flashSale: FlashSale;
  className?: string;
}

export function FlashSaleTextBanner({ flashSale, className }: FlashSaleTextBannerProps) {
  const { isMobile } = useCommonContext();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const router = useRouter();
  const { track } = useAnalytics();

  // Countdown timer effect
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const endTime = new Date(flashSale.endDate).getTime();
      const difference = endTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [flashSale.endDate]);

  const handleCtaClick = () => {
    track('flash_sale_text_banner_cta_clicked', { 
      flashSaleId: flashSale.id,
    });
    router.push(`/exam-bundles?discountCode=${flashSale.discountCode || ''}&billingPeriod=${flashSale.defaultBillingPeriod}`);
  };

  // Timer component
  const TimerDisplay = () => (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-1">
        <div className="bg-white/90 backdrop-blur-sm rounded px-1.5 py-0.5 text-xs font-bold text-gray-900 shadow-sm">
          {timeLeft.days.toString().padStart(2, '0')}
        </div>
        <span className="text-xs">d</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="bg-white/90 backdrop-blur-sm rounded px-1.5 py-0.5 text-xs font-bold text-gray-900 shadow-sm">
          {timeLeft.hours.toString().padStart(2, '0')}
        </div>
        <span className="text-xs">h</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="bg-white/90 backdrop-blur-sm rounded px-1.5 py-0.5 text-xs font-bold text-gray-900 shadow-sm">
          {timeLeft.minutes.toString().padStart(2, '0')}
        </div>
        <span className="text-xs">m</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="bg-white/90 backdrop-blur-sm rounded px-1.5 py-0.5 text-xs font-bold text-gray-900 shadow-sm">
          {timeLeft.seconds.toString().padStart(2, '0')}
        </div>
        <span className="text-xs">s</span>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <div className={cn("shrink-0 w-full h-15 overflow-hidden", className)}>
        <motion.div
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          exit={{ scaleY: 0, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          onClick={handleCtaClick}
          className="cursor-pointer w-full h-full px-4 py-3 flex items-center justify-between"
          style={{
            transformOrigin: 'top',
            backgroundImage: `url(${isMobile ? flashSale.barBgImageMobile : flashSale.barBgImage})`,
            backgroundSize: isMobile ? '100% 100%' : 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="flex items-center justify-between max-w-5xl mx-auto gap-3 text-white w-full">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm font-semibold">{flashSale.title}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <TimerDisplay />
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
