'use client';

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { PartnerLogo } from "@/components/partner/partner-logo";
import Image from "next/image";
import { useCommonContext } from "@/providers";

interface GiftingStep1HeroProps {
  partnerCode?: string;
  onNext: () => void;
}

export function GiftingStep1Hero({ partnerCode, onNext }: GiftingStep1HeroProps) {
  const { isMobile } = useCommonContext();
  
  return (
    <div className="flex flex-col items-center justify-between h-full w-full max-w-2xl space-y-8">
      {/* Partner Logo */}
      <PartnerLogo partnerCode={partnerCode} />

      {/* Hero Message */}
      <div className="text-center space-y-4 relative">
        <Image src="/xmas-hat.png" alt="Gifting" width={isMobile ? 75 : 100} height={isMobile ? 75 : 100} className={`absolute ${isMobile ? '-top-14 left-39' : '-top-20 left-67'}`} />
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
          Better grades
        </h1>
        <h1 className="text-4xl md:text-7xl font-bold text-primary">in half the time</h1>
        <p className="text-lg text-gray-600 max-w-xl mx-auto">
          Practice questions, get answers, flashcards and quizzes, import videos to make studying stress-free.
        </p>
      </div>

      {/* CTA Button */}
      <Button
        onClick={onNext}
        className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg"
      >
        Get started
        <ArrowRight className="ml-2 w-5 h-5" />
      </Button>
    </div>
  );
}

