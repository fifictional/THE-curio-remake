"use client";

import { useRouter } from 'next/navigation';
import { useSessionContext } from '@/providers/session-provider';
import { useCommonContext } from '@/providers/common-provider';
import { useAnalytics } from '@/providers/analytics-provider';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useFlashSales } from '@/hooks/use-flash-sales';

export default function SatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { track } = useAnalytics();
  const { isUserSubscribed } = useSessionContext();
  const { collapseSidebar, isSidebarOpen, uncollapseSidebar, isMobile, isRightPanelOpen } = useCommonContext();
  const { getFlashSaleForPage } = useFlashSales();

  useEffect(() => {
    collapseSidebar();
    return () => {
      uncollapseSidebar();
    }
  }, []);

  const handleUpgradeClick = () => {
    track('sat_banner_upgrade_clicked', {
      is_subscribed: isUserSubscribed,
      source: 'sticky_banner',
    });
    router.push('/exam-bundles');
  };

  const flashSale = getFlashSaleForPage('satus');

  return (
    <div className={cn("relative", !isUserSubscribed ? 'pt-16' : '')}>
      {/* Fixed Free Version Banner */}
      {!isUserSubscribed && (
        <div className="transition-all duration-300 absolute top-0 left-0 right-0 z-50 bg-linear-to-r from-gray-800 to-gray-900 border-b border-gray-700 shadow-lg">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-yellow-400 text-gray-900">
                  SAT Free
                </span>
                {!isMobile ? <p className="text-sm text-gray-100 font-medium">
                  You're using limited features • Upgrade to unlock full access
                </p> : null}
              </div>
              {/* <button
                onClick={handleUpgradeClick}
                className="shrink-0 cursor-pointer bg-white hover:bg-gray-100 text-gray-900 font-semibold px-4 py-2 rounded-lg transition-all shadow-md text-sm"
              >
                Upgrade Now
              </button> */}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div>
        {children}
      </div>
    </div>
  );
}

