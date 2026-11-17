"use client";

import { GeneralChat } from '@/components/core/general-chat';
import { motion } from 'framer-motion';
import { FadeSlideToggle, AppearFadeSlide, SwapFadeSlide } from '@/components/ui/animations';
import { useCreateGeneralChatApi } from '@/hooks/api/chats/use-create-general-chat.api';
import { AnimatedHomeUpload, BigTitle } from '@/components/home/common';
import { useState } from 'react';
import { BookOpenCheck, Loader2, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnalytics } from '@/providers';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useFlashSales } from '@/hooks/use-flash-sales';
import { FlashSaleBanner } from '@/components/flash-sales/flash-sale-banner';
import { useSessionContext } from '@/providers/session-provider';
import { FloatingNav } from '@/components/navigation/floating-nav';
import { useIsAndroidBrowser } from '@/hooks/use-is-android-browser';
import { AndroidBanner } from '@/components/home/android-banner';

export default function Home() {
  const { hideExtras, onChatStarted } = useCreateGeneralChatApi({ });
  const [documentUploadStarted, setDocumentUploadStarted] = useState(false);
  const { track } = useAnalytics();
  const router = useRouter();
  const { getBannerFlashSaleForPage } = useFlashSales();
  const { hasFeatureFlag, userAttributes } = useSessionContext();
  const { isAndroidBrowser } = useIsAndroidBrowser();
  
  const flashSale = getBannerFlashSaleForPage('home');

  const onDocumentUploadStarted = () => {
    setDocumentUploadStarted(true);
  }

  // TODO: Get actual user UUID from auth context
  return (
    <main className="relative flex h-full flex-col items-center p-8">
      <div className="max-w-2xl w-full space-y-12 my-auto pb-12">
        {/* Android Browser Banner */}
        {isAndroidBrowser && (
          <AndroidBanner />
        )}

        {/* Flash Sale Banner */}
        {flashSale && (
          <FlashSaleBanner flashSale={flashSale} />
        )}

        {/* Welcome / Analyzing Text */}
        <SwapFadeSlide
          isFirstVisible={!documentUploadStarted}
          first={<BigTitle hideExtras={hideExtras} title={<>
            <div className="text-headers text-center font-regular text-4xl mb-8">
              Hi <span className="font-semibold text-gray-800">{userAttributes?.givenName}</span> 👋
            </div>
            What <span className='text-gray-800'>curio</span>sity do you want to explore today?
          </>} />}
          second={<BigTitle hideExtras={hideExtras} title={<div className="flex flex-col items-center gap-3">
            <span>Analyzing your document...</span>
            <Loader2 className="w-14 h-14 animate-spin" />
          </div>} />}
        />

        <motion.div
          layout
          transition={{ duration: 0.3 }}
          className={hideExtras ? 'absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 z-10' : ''}
        >
          <FadeSlideToggle isVisible={!documentUploadStarted}> 
            {/* General Chat */}
            <AppearFadeSlide>
              <GeneralChat 
                onChatStarted={onChatStarted} 
                disabled={documentUploadStarted}
                onDocumentUploadStarted={onDocumentUploadStarted}
              />
            </AppearFadeSlide>
          </FadeSlideToggle>

        </motion.div>
      </div>
      <FloatingNav />
    </main>
  );
}
