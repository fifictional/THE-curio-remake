"use client";

import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useAnalytics } from '@/providers';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=to.flylane.curio';

export function AndroidBanner() {
  const { track } = useAnalytics();

  useEffect(() => {
    track('android_banner_shown');
  }, [track]);

  const handleLinkClick = () => {
    track('android_banner_get_it_now_clicked');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full rounded-2xl shadow-lg p-6 relative overflow-hidden"
      style={{ backgroundColor: '#AAC148' }}
    >
      <div className="z-10 flex flex-col justify-between h-full min-h-[120px] relative">
        <div className="absolute top-10 right-10 w-10 h-10">
          <div className="relative">
            {/* FIRST ROW */}
            <Image src="/icons8-android.svg" alt="Android Icon" width={24} height={24} className="-top-4 -right-12 absolute" />

            {/* SECOND ROW */}
            <Image src="/icons8-android.svg" alt="Android Icon" width={24} height={24} className="top-0 -right-4 absolute" />
            
            {/* THIRD ROW */}
            <Image src="/icons8-android.svg" alt="Android Icon" width={24} height={24} className="top-4 right-4 absolute" />
            <Image src="/icons8-android.svg" alt="Android Icon" width={24} height={24} className="top-4 -right-12 absolute" />
            
            {/* FOURTH ROW */}
            <Image src="/icons8-android.svg" alt="Android Icon" width={24} height={24} className="top-8 -right-4 absolute" />

            {/* FIFTH ROW */}
            <Image src="/icons8-android.svg" alt="Android Icon" width={24} height={24} className="top-12 -right-12 absolute" />
          </div>
        </div>
        <div className="text-white mb-4">
          <p className="text-lg font-semibold">Curio for Android is here. Time to level up!</p>
        </div>
        <div className="flex justify-start">
          <Link
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLinkClick}
            className={cn(
              buttonVariants({ size: 'sm' }),
              "bg-black text-white hover:bg-gray-800 font-semibold"
            )}
          >
            Get it now
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

