'use client';

import { useState } from 'react';
import { OnboardingHeader } from '@/design-system/onboarding-header';
import { OnboardingSubtitle } from '@/design-system/onboarding-subtitle';
import { SelectMenu } from '@/components/ui/select-menu';
import { CurioButton } from '@/design-system/curio-button';
import { School, GraduationCap, Building2, User, BookOpen, ShieldCheck } from 'lucide-react';
import { useAnalytics } from '@/providers';

export interface OnboardingLifestageProps {
  userName?: string;
  variant?: string;
  onContinue?: (selectedValue: string) => void;
}

export function OnboardingLifestage({ userName, variant, onContinue }: OnboardingLifestageProps) {
  const [selectedValue, setSelectedValue] = useState<string>('');
  const { track } = useAnalytics();

  const options = [
    { value: 'high-school', label: 'High School Student', icon: <School className="h-5 w-5" /> },
    { value: 'college', label: 'College / Undergraduate', icon: <GraduationCap className="h-5 w-5" /> },
    { value: 'graduate', label: 'Graduate / Phd', icon: <Building2 className="h-5 w-5" /> },
    { value: 'teacher', label: 'Teacher', icon: <User className="h-5 w-5" /> },
    { value: 'professional', label: 'Lifelong Learner / Professional', icon: <BookOpen className="h-5 w-5" /> },
    { value: 'other', label: 'Something Else', icon: <ShieldCheck className="h-5 w-5" /> },
  ];

  const handleContinue = () => {
    if (selectedValue && onContinue) {
      const selectedOption = options.find(opt => opt.value === selectedValue);
      const userDescription = selectedOption?.label || selectedValue;
      
      track('onboarding_user_description_updated', { 
        userDescription,
        ...(variant ? { variant } : {})
      });
      
      onContinue(selectedValue);
    }
  };

  return (
    <div className="w-full max-w-96 flex flex-col justify-start items-center gap-6">
      <div className="self-stretch flex flex-col justify-start items-start gap-3">
        <OnboardingHeader>
          {userName ? (
            <>
              <span>Hey {userName} 👋</span><br/><span>Welcome to Curio!</span>
            </>
          ) : (
            <>
              <span>Hey 👋</span><br/><span>Welcome to Curio!</span>
            </>
          )}
        </OnboardingHeader>
        <OnboardingSubtitle>
          Set up your classroom by answering a few questions about you and your goals.
        </OnboardingSubtitle>
      </div>

      <div className="self-stretch flex flex-col justify-start items-start gap-6">
        <SelectMenu
          title="What else describes you other than amazing human/genius?"
          options={options}
          value={selectedValue}
          onValueChange={setSelectedValue}
        />

        <CurioButton
          size="full"
          color="primary"
          onClick={handleContinue}
          disabled={!selectedValue}
        >
          Continue
        </CurioButton>
      </div>
    </div>
  );
}
