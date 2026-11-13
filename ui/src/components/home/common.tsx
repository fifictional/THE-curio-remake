import { AnimatePresence, motion } from "framer-motion";
import { HomeUploadSmall } from "../upload/home-upload-small";

export function BigTitle({ hideExtras, title }: { hideExtras: boolean, title: React.ReactNode }) {
  return (
    <AnimatePresence>
      {!hideExtras && (
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
        >
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-headers font-bold tracking-tight">
            {title}
          </h1>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface AnimatedHomeUploadProps {
  hideExtras: boolean;
  defaultSpaceUuid?: string;
  disabled: boolean;
  onDocumentUploadStarted: () => void;
}

export function AnimatedHomeUpload({ hideExtras, defaultSpaceUuid, disabled, onDocumentUploadStarted }: AnimatedHomeUploadProps) {
  return (
    <AnimatePresence>
      {!hideExtras && (
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25 }}
        >
          <HomeUploadSmall defaultSpaceUuid={defaultSpaceUuid} disabled={disabled} onDocumentUploadStarted={onDocumentUploadStarted} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function AnimatedFileBrowser({ hideExtras, children, title }: { hideExtras: boolean, children: React.ReactNode, title: string }) {
  return (
    <AnimatePresence>
      {!hideExtras && (
        <motion.div
          className="flex flex-col gap-4 w-full max-w-3xl mt-12"
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25 }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl text-headers font-semibold tracking-tight text-left">
            {title}
          </h2>
          <div className="flex flex-row gap-4 min-h-48 mt-4">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
