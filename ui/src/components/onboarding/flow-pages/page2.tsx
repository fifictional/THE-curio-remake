import { PageFlowProps } from "../types";
import { useCommonContext } from "@/providers/common-provider";
import { useState } from "react";
import { useAnalytics } from "@/providers";
import { useCallback } from "react";
import { OnboardingPage } from "../onboarding-page";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.4 } },
} as const;

export const Page2 = ({ onFinish, onSkip }: PageFlowProps) => {
  const { isMobile } = useCommonContext();
  const [formIndex, setFormIndex] = useState(0);
  const { track } = useAnalytics();

  const onUpdateUserProfile = useCallback(async (userDescription?: string, userHelp?: string) => {
    if (userDescription) {
      track('onboarding_user_description_updated', { userDescription });
      // store in local storage
      localStorage.setItem('userDescription', userDescription);
    }
    if (userHelp) {
      track('onboarding_user_help_updated', { userHelp });
      localStorage.setItem('userHelp', userHelp);
    }
  }, []);

  return (<div className='flex flex-col justify-between max-w-[700px]'>
    <motion.div key="p2" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <OnboardingPage 
        line1="Lets"
        line2="your experience"
        withCurio
        curioSuffix="ate"
        bubbleText="takes 20 secs only"
        onFinished={() => {}} isMobile={isMobile} bubbleRightMobile={10} bubbleRightDesktop={100} />
      <AnimatePresence mode="wait">
        <motion.div
          key={`form-${formIndex}`}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.4 }}
          className="mt-8 px-4"
        >
          {formIndex === 0 && (
            <div>
              <div className="text-xl font-semibold rounded-full border-2 border-gray-600/20 bg-transparent px-6 py-4 text-center text-gray-900 placeholder:text-gray-600 shadow-sm backdrop-blur-sm">
                What else describes you other than amazing human/genius?
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-3 max-w-[600px]">
                {['High school student', 'Undergraduate', 'Post grad / Masters', 'I teach', "I'm working", "I'm different"].map((label) => (
                  <button
                    key={label}
                    onClick={() => { onUpdateUserProfile(label, ''); setFormIndex(1); }}
                    className={`rounded-full px-4 py-2 text-sm transition-colors border bg-gray-800 border-gray-600/30 text-gray-100 hover:bg-gray-700 hover:text-gray-200 hover:border-gray-600 hover:cursor-pointer`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {formIndex === 1 && (
            <div>
              <div className="text-xl font-semibold rounded-full border-2 border-gray-600/20 bg-transparent px-6 py-4 text-center text-gray-900 placeholder:text-gray-600 shadow-sm backdrop-blur-sm">
                What can Curio help you do best?
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-3 max-w-[600px]">
                {['Ace my exams', 'Learn new things', 'Finish assignments', 'Clear doubts', 'Research', 'Organise my mess'].map((label) => (
                  <button
                    key={label}
                    onClick={() => { onUpdateUserProfile('', label); onFinish(); }}
                    className={`rounded-full px-4 py-2 text-sm transition-colors border bg-gray-800 border-gray-600/30 text-gray-100 hover:bg-gray-700 hover:text-gray-200 hover:border-gray-600 hover:cursor-pointer`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut', delay: 0.6 }}
      className="mt-8 px-4"
    >
      <div className="mt-10 justify-end">
        <button className="rounded-full border border-gray-900/30 px-4 py-2 text-xs text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors" onClick={() => onSkip?.({ skipAll: true })}>
          I don't have time for this
        </button>
      </div>
      <div className="mt-10 justify-end">
        <button className="rounded-full border border-gray-900/30 px-4 py-2 text-xs text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors" onClick={() => onSkip?.({ skipAll: true })}>
          I already have an account
        </button>
      </div>
    </motion.div>
  </div>)
}