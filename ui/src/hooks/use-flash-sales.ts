import { useSessionContext } from '@/providers';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

export interface FlashSale {
  id: string;
  title: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  isActive: boolean;
  pages: string[]; // Pages where this flash sale should be shown
  bannerPages: string[]; // Pages where this flash sale should be shown as a banner
  bannerBgImage?: string; // Background image for the visual banner
  barBgImage?: string; // Background image for the text bar
  barBgImageMobile?: string; // Background image for the text bar on mobile
  bannerBgImageMobile?: string; // Background image for the visual banner on mobile
  discountCode?: string;
  defaultBillingPeriod?: 'monthly' | 'annually';
}

export function useFlashSales() {
  const path = usePathname();
  const { isUserSubscribed } = useSessionContext();
  
  const flashSales: FlashSale[] = useMemo(() => [
    {
      id: 'black-friday-2025',
      title: 'Black Friday Sale',
      startDate: '2025-11-24T00:00:00.000Z',
      endDate: '2025-11-30T23:59:59.999Z',
      isActive: true,
      pages: ['exam-bundles', 'library', 'spaces', 'chats', 'documents'],
      bannerPages: ['home'],
      bannerBgImage: '/flash-sale/bf_25_desktop.jpg',
      barBgImage: '/flash-sale/bf_25_bar_desktop.jpg',
      barBgImageMobile: '/flash-sale/bf_25_bar_mobile.jpg',
      bannerBgImageMobile: '/flash-sale/bf_25_mobile.jpg',
      discountCode: 'BLACKFRIDAY50',
      defaultBillingPeriod: 'annually',
    },
  ], []);

  // Determine current page for flash sale targeting
  const currentPage = useMemo(() => {
    if (path === '/') return 'home';
    if (path.includes('/exam-bundles')) return 'exam-bundles';
    if (path.includes('/documents')) return 'documents';
    if (path.includes('/chats')) return 'chats';
    return 'home';
  }, [path]);

  const getActiveFlashSales = useMemo(() => {
    if (isUserSubscribed) {
      return [];
    }
    const now = new Date();
    return flashSales.filter(sale => {
      const startDate = new Date(sale.startDate);
      const endDate = new Date(sale.endDate);
      return sale.isActive && now >= startDate && now <= endDate;
    });
  }, [flashSales, isUserSubscribed, isUserSubscribed]);

  const getFlashSaleForPage = (page?: string) => {
    return getActiveFlashSales.find(sale => sale.pages.includes(page || currentPage));
  };

  const getBannerFlashSaleForPage = (page?: string) => {
    return getActiveFlashSales.find(sale => sale.bannerPages.includes(page || currentPage));
  };

  const hasActiveFlashSale = (page: string) => {
    return !!getFlashSaleForPage(page) && !isUserSubscribed
  };

  return {
    flashSales,
    getActiveFlashSales,
    getFlashSaleForPage,
    getBannerFlashSaleForPage,
    hasActiveFlashSale,
  };
}
