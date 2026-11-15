'use client';

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePartnershipByCode } from "@/hooks/api/partnerships/use-partnerships.api";
import { getUrl } from "@/lib/local-storage";

interface PartnerLogoProps {
  partnerCode?: string;
  className?: string;
}

export function PartnerLogo({ partnerCode, className = "" }: PartnerLogoProps) {
  const [partnerLogoUrl, setPartnerLogoUrl] = useState<string | null>(null);
  
  // Fetch partnership by code (only if partnerCode is provided)
  const { data: partnership } = usePartnershipByCode(partnerCode || null);

  // Load logo URL when partnership is fetched (only if partnerCode is provided)
  useEffect(() => {
    if (!partnerCode) {
      setPartnerLogoUrl(null);
      return;
    }

    const loadLogoUrl = async () => {
      if (!partnership?.logoS3Key) {
        setPartnerLogoUrl(null);
        return;
      }

      try {
        const url = await getUrl({ path: partnership.logoS3Key });
        setPartnerLogoUrl(url.url.toString());
      } catch (error) {
        console.error('Error loading partner logo:', error);
        setPartnerLogoUrl(null);
      }
    };

    loadLogoUrl();
  }, [partnership, partnerCode]);

  return (
    <div className={`flex flex-row items-center gap-4 max-w-md w-full ${className}` + (partnerLogoUrl ? ' justify-between' : ' justify-center')}>
      <Image src="/logo.svg" alt="Curio Logo" width={30} height={30} className="w-30 h-15" priority />
      {partnerLogoUrl && (
        <>
          <span className="text-4xl font-bold">x</span>
          <Image 
            src={partnerLogoUrl}
            alt="Partner logo"
            width={100}
            height={100}
            className="w-30 h-auto"
          />
        </>
      )}
    </div>
  );
}

