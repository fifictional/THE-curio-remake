"use client";

import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalytics } from '@/providers';
import { cn } from '@/lib/utils';
import { FlashSale } from '@/hooks/use-flash-sales';
import Image from 'next/image';
import { useCommonContext } from '@/providers';

interface FlashSaleBannerProps {
  flashSale: FlashSale;
  className?: string;
}

export function FlashSaleBanner({ flashSale, className }: FlashSaleBannerProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const router = useRouter();
  const { track } = useAnalytics();
  const { isMobile } = useCommonContext();

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

  const isLast2Days = useMemo(() => {
    const now = new Date();
    const endDate = new Date(flashSale.endDate);
    return endDate.getTime() - now.getTime() <= 2 * 24 * 60 * 60 * 1000;
  }, [flashSale.endDate]);

  const handleCtaClick = () => {
    track('flash_sale_banner_cta_clicked', { 
      flashSaleId: flashSale.id,
    });
    router.push(`/exam-bundles?discountCode=${flashSale.discountCode}&billingPeriod=${flashSale.defaultBillingPeriod}`);
  };

  // Timer component
  const TimerDisplay = () => (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-1">
        <div className="bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-sm font-bold text-gray-900 shadow-sm min-w-[32px] text-center">
          {String(timeLeft.days).padStart(2, '0')}
        </div>
        <span className="text-sm font-semibold text-white">d</span>
        <div className="bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-sm font-bold text-gray-900 shadow-sm min-w-[32px] text-center">
          {String(timeLeft.hours).padStart(2, '0')}
        </div>
        <span className="text-sm font-semibold text-white">h</span>
        <div className="bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-sm font-bold text-gray-900 shadow-sm min-w-[32px] text-center">
          {String(timeLeft.minutes).padStart(2, '0')}
        </div>
        <span className="text-sm font-semibold text-white">m</span>
        <div className="bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-sm font-bold text-gray-900 shadow-sm min-w-[32px] text-center">
          {String(timeLeft.seconds).padStart(2, '0')}
        </div>
        <span className="text-sm font-semibold text-white">s</span>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "relative overflow-hidden rounded-2xl shadow-lg cursor-pointer",
        className
      )}
      onClick={handleCtaClick}
      style={{
        backgroundImage: `url(${isMobile ? flashSale.bannerBgImageMobile || '' : flashSale.bannerBgImage || ''})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Background Image */}
      {flashSale.bannerBgImage && (
        <div className='w-full relative'>
          <Image
            src={isMobile ? flashSale.bannerBgImageMobile || '' : flashSale.bannerBgImage || ''}
            alt="Flash Sale Background"
            width={1200}
            height={300}
            className="w-full h-auto"
            priority
          />
        </div>
      )}

      {isMobile && isLast2Days && <div className="absolute top-31 left-3 w-full h-full">
        <TimerDisplay />
      </div>}
      {!isMobile && isLast2Days && <div className="absolute top-32 left-5 w-full h-full">
        <TimerDisplay />
      </div>}

      {/* Background Pattern (fallback if no image) */}
      {/* {!flashSale.bannerBgImage && (
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16" />
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12" />
        </div>
      )} */}

      {/* Content */}
      {/* <div className="relative z-10 p-6 text-transparent cursor-pointer" onClick={handleCtaClick}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-5 h-5" />
              <span className="text-sm font-medium">FLASH SALE</span>
            </div>
            
            <h3 className="text-2xl font-bold mb-2">{flashSale.title}</h3>
            <p className="text-lg mb-4 opacity-90">{flashSale.description}</p>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{flashSale.salePrice}</span>
                <span className="text-lg line-through opacity-70">{flashSale.originalPrice}</span>
              </div>
            </div>

          </div>
        </div>
      </div> */}
    </motion.div>
  );
}
