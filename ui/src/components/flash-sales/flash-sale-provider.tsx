"use client";

import { useFlashSales } from '@/hooks/use-flash-sales';
import { FlashSaleTextBanner } from '@/components/flash-sales/flash-sale-text-banner';
import { useCommonContext } from '@/providers';
import { usePathname } from 'next/navigation';

interface FlashSaleProviderProps {
  children: React.ReactNode;
}

export function FlashSaleProvider({ children }: FlashSaleProviderProps) {
  const { getFlashSaleForPage } = useFlashSales();
  const { isMobile } = useCommonContext();
  const path = usePathname();

  const flashSale = getFlashSaleForPage();

  return (
    <>
      {children}
      {/* Mobile Flash Sale Banner - positioned below topbar */}
      {isMobile && flashSale && (
        <div className="fixed top-20 left-0 right-0 z-40">
          <FlashSaleTextBanner flashSale={flashSale} />
        </div>
      )}
    </>
  );
}
