'use client';

import { useState } from 'react';
import { OnboardingHeader } from '@/design-system/onboarding-header';
import { MultiSelectMenu } from '@/components/ui/multi-select-menu';
import { CurioButton } from '@/design-system/curio-button';
import { FileText, PlayCircle, FileCheck, MailCheck, Building2, Search, Theater } from 'lucide-react';
import { useAnalytics } from '@/providers';

export interface OnboardingIntentOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface OnboardingIntentProps {
  userName?: string;
  variant?: string;
  title?: string;
  options?: OnboardingIntentOption[];
  onFinish?: (selectedValues: string[]) => void;
}

const defaultOptions: OnboardingIntentOption[] = [
  { value: 'exam-prep', label: 'Prep for an upcoming exam', icon: <FileText className="h-5 w-5" /> },
  { value: 'summarize-video', label: 'Summarize a video', icon: <PlayCircle className="h-5 w-5" /> },
  { value: 'summarize-test', label: 'Summarize a test / paper', icon: <FileCheck className="h-5 w-5" /> },
  { value: 'notes-to-tools', label: 'Turn my notes into study tools', icon: <MailCheck className="h-5 w-5" /> },
  // { value: 'sat-prep', label: 'Study for my SATs', icon: <Building2 className="h-5 w-5" /> },
  { value: 'dive-deeper', label: 'Dive deeper into a topic', icon: <Search className="h-5 w-5" /> },
  { value: 'something-else', label: 'Something Else', icon: <Theater className="h-5 w-5" /> },
];

export function OnboardingIntent({ userName, variant, title, options, onFinish }: OnboardingIntentProps) {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const { track } = useAnalytics();

  const effectiveOptions = options ?? defaultOptions;
  const effectiveTitle = title ?? 'What can Curio help you do best?';

  const handleFinish = () => {
    if (onFinish && selectedValues.length > 0) {
      const selectedLabels = selectedValues
        .map(value => effectiveOptions.find(opt => opt.value === value)?.label)
        .filter((label): label is string => !!label);

      // Legacy single-value tracking kept for Variant A; callers that need the
      // Variant B `onboarding_user_intents_updated` array event should track it
      // themselves before invoking onFinish.
      const userHelp = selectedLabels[0] || selectedValues[0];

      track('onboarding_user_help_updated', {
        userHelp,
        ...(variant ? { variant } : {})
      });

      onFinish(selectedValues);
    }
  };

  return (
    <div className="w-full max-w-96 flex flex-col justify-start items-center gap-6">
      <div className="self-stretch flex flex-col justify-start items-start gap-3">
        <OnboardingHeader>
          {userName ? (
            <>
              <span>{userName}, this is great.</span><br/><span>One more thing:</span>
            </>
          ) : (
            <>
              <span>This is great.</span><br/><span>One more thing:</span>
            </>
          )}
        </OnboardingHeader>
      </div>

      <div className="self-stretch flex flex-col justify-start items-start gap-6">
        <MultiSelectMenu
          title={effectiveTitle}
          options={effectiveOptions}
          values={selectedValues}
          onValuesChange={setSelectedValues}
        />

        <CurioButton
          size="full"
          onClick={handleFinish}
          disabled={selectedValues.length === 0}
        >
          Continue
        </CurioButton>
      </div>
    </div>
  );
}
