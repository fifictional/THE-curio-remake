'use client';

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAnalytics, useCommonContext } from "@/providers";

export function OnBoardingTopBar() {
  const { isMobile } = useCommonContext();
  const { track } = useAnalytics();

  return (
    <header className="w-full bg-focus">
      <div className={cn('flex items-center justify-between px-4 h-20 w-full', isMobile && 'justify-center')}>
        <div className="flex items-center gap-8 relative w-full">
          <Link href="/" className="flex-shrink-0" onClick={() => {
            track('top-bar-logo-clicked');
          }}>
            <Image src="/logo.svg" alt="Curio Logo" width={100} height={32} className="w-auto h-auto" priority />
          </Link>
        </div>
      </div>
    </header>
  );
} 