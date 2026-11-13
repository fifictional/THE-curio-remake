import { LoadingRow } from "./loading-row"

export const LoadingPart = ({ hideSpaceColumn, isMobile }: { hideSpaceColumn: boolean, isMobile: boolean }) => {
    return (
      <>
        <LoadingRow hideSpaceColumn={hideSpaceColumn} isMobile={isMobile} />
        <LoadingRow hideSpaceColumn={hideSpaceColumn} isMobile={isMobile} />
        <LoadingRow hideSpaceColumn={hideSpaceColumn} isMobile={isMobile} />
      </>
    )
  }