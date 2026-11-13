'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Button } from '../ui/button';

interface SurveyBannerProps {
  isMobile: boolean;
  onSurveyClick: () => void;
}

const bannerInfo = {
  mobile: 'Any feedback on Curio?',
  desktop: `<p>Want to help make Curio <strong>better</strong>? Take our 5-minutes survey!</p>`,
  buttonText: {
      mobile: 'Tell us',
      desktop: 'Take the survey',
  },
  image: '/curio-confused.png',
}

export function SurveyBanner({ isMobile, onSurveyClick }: SurveyBannerProps) {
  return (
    <AnimatePresence>
      <div className="shrink-0 w-full h-15 overflow-hidden">
        <motion.div
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          exit={{ scaleY: 0, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ transformOrigin: 'top' }}
          className="flex pl-8 pr-3 py-2 z-0 flex-row w-full h-full bg-blue-300 items-center justify-between"
        >
          <span className="text-gray-900 italic" dangerouslySetInnerHTML={{ __html: isMobile ? bannerInfo.mobile : bannerInfo.desktop }} />
          <span className="text-gray-900 flex flex-row items-center gap-2 h-full">
            <Button color="primary" variant="outline" size="sm" onClick={onSurveyClick}>
              {isMobile ? bannerInfo.buttonText.mobile : bannerInfo.buttonText.desktop}
            </Button>
            <Image
              src={bannerInfo.image}
              alt="Curio Logo"
              width={100}
              height={100}
              className="w-auto h-full"
              priority
            />
          </span>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

