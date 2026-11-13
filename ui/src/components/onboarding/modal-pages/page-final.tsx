import { useCommonContext } from "@/providers/common-provider";
import { motion } from "framer-motion";
import { PageFlowProps } from "../types";
import { OnboardingPage } from "../onboarding-page";
import { useSessionContext } from "@/providers/session-provider";

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.4 } },
} as const;

export const PageFinal = ({ onFinish }: PageFlowProps) => {
  const { isMobile } = useCommonContext();
  const { userAttributes } = useSessionContext();
  const name = userAttributes?.givenName || 'Alex';

  return (<motion.div key="p-final" variants={pageVariants} initial="initial" animate="animate" exit="exit">
    <OnboardingPage line1={`You're all set, ${name}.`} withCurio={false} bubbleText="thank you so much" onFinished={onFinish} isMobile={isMobile} bubbleRightMobile={-10} bubbleRightDesktop={-50} />
  </motion.div>)
}

