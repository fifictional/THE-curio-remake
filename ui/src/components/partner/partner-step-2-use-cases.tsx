'use client';

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { PartnerLogo } from "./partner-logo";

interface PartnerStep2UseCasesProps {
  partnerCode?: string;
  onNext: () => void;
  onBack: () => void;
  imageDecoration?: React.ReactNode;
}

const useCases = [
  {
    title: "Untangle your homework",
    description: "Chat your way out of the \"???\"",
  },
  {
    title: "Make quizzes make sense",
    description: "No trick questions. Unless you want them",
  },
  {
    title: "Prep for exams without the meltdown",
    description: "SATs, tests, finals....bring it on",
  },
  {
    title: "Turn notes into magic",
    description: "Upload -> summaries, flashcards and quizzes",
  },
  {
    title: "Study at 6...7x speed",
    description: "AI powered shortcuts that feel like cheating (they're not)",
  },
];

export function PartnerStep2UseCases({ partnerCode, onNext, onBack, imageDecoration }: PartnerStep2UseCasesProps) {
  return (
    <div className="flex flex-col items-center justify-between h-full w-full max-w-2xl space-y-8">
      {/* Partner Logo */}
      <PartnerLogo partnerCode={partnerCode} />

      {/* Use Cases Grid */}
      <div className="w-full space-y-6 relative">
        {imageDecoration && imageDecoration}
        <h2 className="text-3xl md:text-4xl font-semibold text-center text-gray-900 mb-8">
          Everything you need to succeed
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {useCases.map((useCase, index) => (
            <div key={index} className="space-y-2">
              <h3 className="text-xl font-semibold text-green-600">
                {useCase.title}
              </h3>
              <p className="text-gray-600">
                {useCase.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 w-full justify-center">
        <Button
          onClick={onBack}
          variant="outline"
          className="px-8 py-6"
        >
          <ArrowLeft className="mr-2 w-5 h-5" />
          Back
        </Button>
        <Button
          onClick={onNext}
          className="bg-primary hover:bg-primary/90 text-white px-8 py-6"
        >
          Choose your plan
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

