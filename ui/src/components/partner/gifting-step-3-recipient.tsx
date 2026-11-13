'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PartnerLogo } from "./partner-logo";

interface GiftingStep3RecipientProps {
  recipientEmail: string;
  recipientMessage: string;
  subscriptionStartDate: string;
  onRecipientEmailChange: (email: string) => void;
  onRecipientMessageChange: (message: string) => void;
  onSubscriptionStartDateChange: (date: string) => void;
  onNext: () => void;
  onBack?: () => void;
  imageDecoration?: React.ReactNode;
}

export function GiftingStep3Recipient({ 
  recipientEmail,
  recipientMessage,
  subscriptionStartDate,
  onRecipientEmailChange,
  onRecipientMessageChange,
  onSubscriptionStartDateChange,
  onNext,
  onBack,
  imageDecoration
}: GiftingStep3RecipientProps) {
  const [emailError, setEmailError] = useState<string>('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (value: string) => {
    onRecipientEmailChange(value);
    if (value && !validateEmail(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleNext = () => {
    if (!recipientEmail) {
      setEmailError('Email is required');
      return;
    }
    if (!validateEmail(recipientEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    onNext();
  };

  return (
    <div className="flex flex-col items-center justify-between h-full w-full max-w-2xl space-y-8">
      {/* Header */}
      <PartnerLogo />
      
      {/* Form */}
      <div className="w-full text-center space-y-3 relative">
        {imageDecoration && imageDecoration}
        <div className="space-y-2 text-left">
          <Label htmlFor="recipient-email" className="text-xl font-semibold text-gray-900 mb-0">Who do you want gift Curio to?</Label>
          <div className="text-xs italic text-gray-900">Can you handle being the coolest parent / uncle / aunt / grandparent ever?</div>
          <Input
            id="recipient-email"
            type="email"
            placeholder="friend@example.com"
            value={recipientEmail}
            onChange={(e) => handleEmailChange(e.target.value)}
            className={emailError ? 'border-red-500' : ''}
          />
          {emailError && (
            <p className="text-sm text-red-500">{emailError}</p>
          )}
          <p className="text-xs text-gray-500">
            We'll send the gift to this email address
          </p>
        </div>

        <div className="space-y-2 text-left">
          <Label htmlFor="recipient-message" className="text-md font-semibold text-gray-900">
            Would you like to add a personal message?
          </Label>
          <Textarea
            id="recipient-message"
            placeholder="Add a personal message to your gift..."
            value={recipientMessage}
            onChange={(e) => onRecipientMessageChange(e.target.value)}
            rows={4}
            className="resize-none min-h-30 h-30"
          />
        </div>

        <div className="space-y-2 text-left">
          <Label htmlFor="subscription-start-date" className="text-md font-semibold text-gray-900">
            When should the subscription start?
          </Label>
          <Input
            id="subscription-start-date"
            type="date"
            value={subscriptionStartDate}
            onChange={(e) => onSubscriptionStartDateChange(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full"
          />
          <p className="text-xs text-gray-500">
            The subscription will begin on this date
          </p>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className={`flex gap-4 w-full ${onBack ? 'justify-center' : 'justify-center'}`}>
        {onBack && (
          <Button
            onClick={onBack}
            variant="outline"
            className="px-8 py-6"
          >
            <ArrowLeft className="mr-2 w-5 h-5" />
            Back
          </Button>
        )}
        <Button
          onClick={handleNext}
          disabled={!recipientEmail || !!emailError}
          className="bg-primary hover:bg-primary/90 text-white px-8 py-6"
        >
          Choose Plan
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

