import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

export type SlideDirection = "horizontal" | "vertical";

export interface CurioSlideInProps extends Omit<HTMLMotionProps<"div">, "initial" | "animate" | "exit" | "variants" | "transition"> {
  children: React.ReactNode;
  direction?: SlideDirection;
  delay?: number;
  duration?: number;
  exitDuration?: number;
}

const getInitialAndAnimate = (direction: SlideDirection) => {
  if (direction === "horizontal") {
    return {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
    };
  }
  return {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
  };
};

const getExit = (direction: SlideDirection) => {
  if (direction === "horizontal") {
    return { opacity: 0, x: -20 };
  }
  return { opacity: 0, y: -20 };
};

export const CurioSlideIn = ({
  children,
  direction = "vertical",
  delay = 0,
  duration = 0.3,
  exitDuration = 0.2,
  className,
  ...props
}: CurioSlideInProps) => {
  const { initial, animate } = getInitialAndAnimate(direction);
  const exit = getExit(direction);

  return (
    <motion.div
      initial={initial}
      animate={animate}
      exit={{
        ...exit,
        transition: {
          duration: exitDuration,
          ease: "easeIn",
        },
      }}
      transition={{
        duration,
        delay,
        ease: "easeOut",
      }}
      layout
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
};
