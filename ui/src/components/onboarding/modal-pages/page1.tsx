import { useCommonContext } from "@/providers/common-provider";
import { OnboardingPage } from "../onboarding-page";
import { useSessionContext } from "@/providers/session-provider";
import { motion } from "framer-motion";
import { PageFlowProps } from "../types";

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.4 } },
} as const;

export const Page1 = ({ onFinish }: PageFlowProps) => {
  const { isMobile } = useCommonContext();
  const { userAttributes } = useSessionContext();
  const name = userAttributes?.givenName || 'Alex';

  return (
    <motion.div key="p1" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <OnboardingPage 
        line1="We're super"
        line2={`about you, ${name}.`}
        withCurio
        curioSuffix='us'
        bubbleText="hi, nice to meet you!"
        onFinished={onFinish}
        isMobile={isMobile}
        bubbleRightMobile={-10}
        bubbleRightDesktop={-50} />
    </motion.div>
  );
}