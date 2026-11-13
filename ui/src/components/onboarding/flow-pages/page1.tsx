import { useCommonContext } from "@/providers/common-provider";
import { OnboardingPage } from "../onboarding-page";
import { PageFlowProps } from "../types";
import { motion } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.4 } },
} as const;

export const Page1 = ({ onFinish }: PageFlowProps) => {
  const { isMobile } = useCommonContext();

  return (
    <motion.div key="p1" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <OnboardingPage 
        line1="Welcome to" 
        withCurio
        curioSuffix=''
        bubbleText="hi, nice to meet you!"
        onFinished={onFinish}
        isMobile={isMobile}
        bubbleRightMobile={-10}
        bubbleRightDesktop={-50} />
    </motion.div>
  );
}