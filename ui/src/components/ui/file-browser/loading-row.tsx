import Skeleton from "react-loading-skeleton";
import 'react-loading-skeleton/dist/skeleton.css';

export function LoadingRow({ hideSpaceColumn, isMobile }: { hideSpaceColumn: boolean, isMobile: boolean }) {
  return (
    <tr className="animate-pulse">
      {/* <td className="w-8 py-3 pl-4">
        <Skeleton circle width={16} height={16} />
      </td> */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Skeleton circle width={20} height={20} />
          <div>
            <Skeleton width={150} className="h-4 mb-1" />
            <Skeleton width={100} className="h-3" />
          </div>
        </div>
      </td>
      {!hideSpaceColumn && !isMobile && <td className="w-32 px-4 py-3">
        <Skeleton width={80} />
      </td>}
      {!isMobile && <td className="w-32 px-4 py-3">
        <div className="flex gap-1">
          <Skeleton width={40} height={20} />
          <Skeleton width={40} height={20} />
        </div>
      </td>}
      <td className="w-20 px-4 py-3">
        <div className="flex justify-end">
          <Skeleton circle width={32} height={32} />
        </div>
      </td>
    </tr>
  );
}