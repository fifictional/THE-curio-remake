'use client';

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { PartnerLogo } from "@/components/partner/partner-logo";

interface PartnerStep1HeroProps {
  partnerCode?: string;
  onNext: () => void;
}

export function PartnerStep1Hero({ partnerCode, onNext }: PartnerStep1HeroProps) {
  return (
    <div className="flex flex-col items-center justify-between h-full w-full max-w-2xl space-y-8">
      {/* Partner Logo */}
      <PartnerLogo partnerCode={partnerCode} />

      {/* Hero Message */}
      <div className="text-center space-y-4">
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

