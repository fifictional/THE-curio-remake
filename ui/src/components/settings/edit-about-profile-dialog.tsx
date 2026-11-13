'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAmplifyApiClient } from '@/providers';
import { useSessionContext } from '@/providers/session-provider';
import type { UserProfile } from '@/lib/types/user-profile';
import {
  LIFESTAGE_OPTIONS,
  parseCuriousAboutTopics,
  parseMajorAndYear,
  parseProfileIntents,
  resolveLifestageSlug,
} from '@/lib/utils/user-profile-display';

type AboutProfileForm = {
  lifestage: string;
  academicYear: string;
  major: string;
  mainGoal: string;
  curiousAbout: string;
};

function profileToForm(profile: UserProfile | null | undefined): AboutProfileForm {
  const intents = profile ? parseProfileIntents(profile) : [];
  const { major, year } = profile
    ? parseMajorAndYear(profile.course, profile.academicYear)
    : { major: '', year: '' };

  return {
    lifestage: resolveLifestageSlug(profile?.lifestage, profile?.userDescription) ?? '',
    academicYear:
      profile?.academicYear ??
      (year !== 'Not set' ? year : ''),
    major: major !== 'Not set' ? major : profile?.course ?? '',
    mainGoal: intents.join(', '),
    curiousAbout: parseCuriousAboutTopics(profile?.userTopics).join(', '),
  };
}

export function EditAboutProfileDialog({
  open,
  onOpenChange,
  userProfile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile | null | undefined;
}) {
  const apiClient = useAmplifyApiClient();
  const queryClient = useQueryClient();
  const { userAttributes } = useSessionContext();
  const [form, setForm] = useState<AboutProfileForm>(() => profileToForm(userProfile));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(profileToForm(userProfile));
      setError(null);
    }
  }, [open, userProfile]);

  const handleSave = async () => {
    if (!userAttributes?.userUuid) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const intents = form.mainGoal
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const lifestageLabel =
        LIFESTAGE_OPTIONS.find((option) => option.value === form.lifestage)?.label ??
        form.lifestage;
      const isProfessional = form.lifestage === 'professional';

      await apiClient.models.UserProfile.update({
        userUuid: userAttributes.userUuid,
        lifestage: form.lifestage || null,
        userDescription: lifestageLabel || null,
        // Year doesn't apply to lifelong learners / professionals
        academicYear: isProfessional ? null : form.academicYear.trim() || null,
        course: form.major.trim() || null,
        intents,
        userHelp: intents.length > 0 ? JSON.stringify(intents) : null,
        userTopics: form.curiousAbout.trim() || null,
      });

      await queryClient.invalidateQueries({
        queryKey: ['user-profile', userAttributes.userUuid],
      });
      onOpenChange(false);
    } catch (saveError) {
      console.error('Failed to update profile', saveError);
      setError('Could not save your profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl focus:outline-none">
          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute right-4 top-4 text-gray-500 transition hover:text-gray-800"
              aria-label="Close"
              disabled={isSaving}
            >
              <X className="h-5 w-5" />
            </button>
          </Dialog.Close>

          <Dialog.Title className="text-xl font-semibold text-gray-900">
            Edit About You
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-gray-500">
            Update your learning profile so Curio can personalize your experience.
          </Dialog.Description>

          <div className="mt-6 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-700">Education Level</span>
              <select
                value={form.lifestage}
                onChange={(event) =>
                  setForm((current) => ({ ...current, lifestage: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                <option value="">Select education level</option>
                {LIFESTAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {form.lifestage !== 'professional' && (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Year</span>
                <input
                  type="text"
                  value={form.academicYear}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, academicYear: event.target.value }))
                  }
                  placeholder="e.g. Sophomore (2nd year)"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </label>
            )}

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-700">
                {form.lifestage === 'professional' ? 'Field / Industry' : 'Major'}
              </span>
              <input
                type="text"
                value={form.major}
                onChange={(event) =>
                  setForm((current) => ({ ...current, major: event.target.value }))
                }
                placeholder={
                  form.lifestage === 'professional'
                    ? 'e.g. Software engineering, Finance'
                    : 'e.g. Biology, Pre-Med'
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-700">Main Goal</span>
              <input
                type="text"
                value={form.mainGoal}
                onChange={(event) =>
                  setForm((current) => ({ ...current, mainGoal: event.target.value }))
                }
                placeholder="e.g. Ace MCAT prep, Finish homework"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
              <span className="text-xs text-gray-500">Separate multiple goals with commas.</span>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-700">Curious About</span>
              <input
                type="text"
                value={form.curiousAbout}
                onChange={(event) =>
                  setForm((current) => ({ ...current, curiousAbout: event.target.value }))
                }
                placeholder="e.g. Behavioral economics, Astronomy, Psychology"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
              <span className="text-xs text-gray-500">Separate topics with commas.</span>
            </label>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
              className="inline-flex h-9 items-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleSave()}
              className="inline-flex h-9 items-center rounded-lg bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
