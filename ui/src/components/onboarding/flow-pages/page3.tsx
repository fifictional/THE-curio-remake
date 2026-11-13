"use client";

import { useCommonContext } from "@/providers/common-provider";
import { motion } from "framer-motion";
import { PageFlowProps } from "../types";
import { OnboardingPage } from "../onboarding-page";
import { useCallback } from "react";
import { useAnalytics } from "@/providers";

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.4 } },
} as const;

const COUNTRY_OPTIONS = [
  { label: "United Kingdom", code: "GB" },
  { label: "United States", code: "US" },
  { label: "South Africa", code: "ZA" },
  { label: "Philippines", code: "PH" },
  { label: "Saudi Arabia", code: "SA" },
  { label: "UAE", code: "AE" },
  { label: "India", code: "IN" },
  { label: "Other", code: null },
];

export const Page3 = ({ onFinish, onSkip }: PageFlowProps) => {
  const { isMobile } = useCommonContext();
  const { track } = useAnalytics();

  const handleCountrySelect = useCallback((countryCode: string | null) => {
    track('onboarding_user_country_updated', { country: countryCode || "Other" });
    if (countryCode) {
      localStorage.setItem('country', countryCode);
    }
    onFinish();
  }, [onFinish, track]);

  return (
    <div className="flex flex-col justify-between max-w-[700px]">
      <motion.div key="p3" variants={pageVariants} initial="initial" animate="animate" exit="exit">
        <OnboardingPage 
          line1="Help us tailor your experience"
          line2=" to your region"
          withCurio={false}
          bubbleText="we'll personalize for you"
          onFinished={() => {}} 
          isMobile={isMobile} 
          bubbleRightMobile={-10} 
          bubbleRightDesktop={-50} 
        />
        
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.4 }}
          className="mt-8 px-4"
        >
          <div>
            <div className="text-xl font-semibold rounded-full border-2 border-gray-600/20 bg-transparent px-6 py-4 text-center text-gray-900 placeholder:text-gray-600 shadow-sm backdrop-blur-sm">
            Where are you from?
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-3 max-w-[600px]">
              {COUNTRY_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  onClick={() => handleCountrySelect(option.code)}
                  className="rounded-full px-4 py-2 text-sm transition-colors border bg-gray-800 border-gray-600/30 text-gray-100 hover:bg-gray-700 hover:text-gray-200 hover:border-gray-600 hover:cursor-pointer"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut', delay: 0.6 }}
        className="mt-8 px-4"
      >
        <div className="mt-10 justify-end">
          <button 
            className="rounded-full border border-gray-900/30 px-4 py-2 text-xs text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors" 
            onClick={() => onSkip?.({ skipAll: false })}
          >
            I don't have time for this
          </button>
        </div>
      </motion.div>
    </div>
  );
};
