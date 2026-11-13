'use client';

import { useState, type ReactNode } from 'react';
import {
  Calendar,
  GraduationCap,
  Layers,
  Lightbulb,
  Pencil,
  Target,
  User,
} from 'lucide-react';
import type { UserProfile } from '@/lib/types/user-profile';
import { toDisplayUserProfile } from '@/lib/utils/user-profile-display';
import { EditAboutProfileDialog } from '@/components/settings/edit-about-profile-dialog';

const profileBorderClass = 'border-chat-panel-border';
const profileDividerClass = 'border-chat-panel-border/50';
const profileDivideClass = 'divide-chat-panel-border/50';

function ProfilePillField({
  icon,
  label,
  items,
  emptyLabel = 'Not set',
}: {
  icon: ReactNode;
  label: string;
  items: string[];
  emptyLabel?: string;
}) {
  return (
    <div className="flex gap-3 px-6 py-5">
      <div className="mt-0.5 shrink-0 text-gray-400">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {label}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {items.length > 0 ? (
            items.map((item) => (
              <span
                key={item}
                className="rounded-full bg-curio-light-grey px-3 py-1 text-sm text-gray-800"
              >
                {item}
              </span>
            ))
          ) : (
            <span className="text-sm font-semibold text-gray-900">{emptyLabel}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileField({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 px-6 py-5">
      <div className="mt-0.5 shrink-0 text-gray-400">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {label}
        </p>
        <p className="mt-1 text-sm font-semibold leading-snug text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export function PersonalizedProfileSection({
  userProfile,
  showHeader = true,
  showActions = true,
  className = '',
}: {
  userProfile: UserProfile | null | undefined;
  showHeader?: boolean;
  showActions?: boolean;
  className?: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const display = toDisplayUserProfile(userProfile);

  return (
    <>
      <section
        className={`overflow-hidden rounded-xl border bg-white ${profileBorderClass} ${className}`}
      >
        {showHeader && (
          <div className="flex flex-wrap items-start justify-between gap-3 px-6 pb-4 pt-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Personalized Profile</h2>
              <p className="mt-1 text-sm text-gray-500">
                Your learning history and patterns across all study sessions.
              </p>
            </div>
            {showActions && (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 ${profileBorderClass}`}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edit
              </button>
            )}
          </div>
        )}

        <div
          className={`flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4 ${profileDividerClass} ${
            showHeader ? '' : 'border-t-0 pt-6'
          }`}
        >
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <p className="text-sm font-semibold text-gray-900">About You</p>
          </div>
          {showActions && !showHeader && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg border bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 ${profileBorderClass}`}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit
            </button>
          )}
        </div>

        <div className={`border-t ${profileDividerClass}`}>
          {display.lifestageSlug === 'professional' ? (
            // Year and Major don't apply to lifelong learners / professionals —
            // show their field of work instead.
            <>
              <div className={`grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 ${profileDivideClass}`}>
                <ProfileField
                  icon={<GraduationCap className="h-4 w-4" />}
                  label="Education Level"
                  value={display.educationLevel}
                />
                <ProfileField
                  icon={<Layers className="h-4 w-4" />}
                  label="Field / Industry"
                  value={display.major}
                />
              </div>
              <div className={`border-t ${profileDividerClass}`}>
                <ProfilePillField
                  icon={<Target className="h-4 w-4" />}
                  label="Main Goal"
                  items={display.mainGoals}
                />
              </div>
            </>
          ) : (
            <>
              <div className={`grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 ${profileDivideClass}`}>
                <ProfileField
                  icon={<GraduationCap className="h-4 w-4" />}
                  label="Education Level"
                  value={display.educationLevel}
                />
                <ProfileField
                  icon={<Calendar className="h-4 w-4" />}
                  label="Year"
                  value={display.year}
                />
              </div>
              <div className={`grid grid-cols-1 divide-y border-t sm:grid-cols-2 sm:divide-x sm:divide-y-0 ${profileDividerClass} ${profileDivideClass}`}>
                <ProfileField
                  icon={<Layers className="h-4 w-4" />}
                  label="Major"
                  value={display.major}
                />
                <ProfilePillField
                  icon={<Target className="h-4 w-4" />}
                  label="Main Goal"
                  items={display.mainGoals}
                />
              </div>
            </>
          )}
        </div>

        <div className={`border-t px-6 py-5 ${profileDividerClass}`}>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-gray-400" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Curious About
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {display.curiousAbout.length > 0 ? (
              display.curiousAbout.map((topic) => (
                <span
                  key={topic}
                  className="rounded-full bg-curio-light-grey px-3 py-1 text-sm text-gray-800"
                >
                  {topic}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-500">No topics added yet</span>
            )}
            {showActions && (
              <button
                type="button"
                aria-label="Add curious about topics"
                onClick={() => setEditOpen(true)}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full border bg-white text-base leading-none text-gray-600 hover:bg-gray-50 ${profileBorderClass}`}
              >
                +
              </button>
            )}
          </div>
        </div>
      </section>

      <EditAboutProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        userProfile={userProfile}
      />
    </>
  );
}
