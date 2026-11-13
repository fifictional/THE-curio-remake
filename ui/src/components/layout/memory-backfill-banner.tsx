'use client';

import { X } from 'lucide-react';
import { useMemoryBackfillBannerApi } from '@/hooks/api/memory/use-memory-backfill-banner.api';

export function MemoryBackfillBanner() {
  const { banner, dismissBanner } = useMemoryBackfillBannerApi();

  if (!banner || (banner.gaps === 0 && banner.mastered === 0)) {
    return null;
  }

  return (
    <div
      role="status"
      className="relative flex items-center justify-center gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-sm text-emerald-900"
    >
      <span>
        We found {banner.gaps} knowledge gap{banner.gaps === 1 ? '' : 's'} and{' '}
        {banner.mastered} mastered topic{banner.mastered === 1 ? '' : 's'} from your quiz
        history.{' '}
        <a href="/settings" className="font-medium underline">
          View profile
        </a>
      </span>
      <button
        type="button"
        onClick={() => void dismissBanner()}
        className="absolute right-3 rounded p-1 hover:bg-emerald-100"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
