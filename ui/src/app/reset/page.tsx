'use client';

import { useEffect, useState } from 'react';
import { signOut } from '@/lib/local-auth';

/**
 * Emergency reset — /reset
 *
 * Clears the Better Auth session plus any localStorage/sessionStorage left over
 * from the migration experiments (notably `post_auth_redirect`, which could
 * point at a redirect-loop URL and make the app unusable).
 */
export default function ResetPage() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await signOut();
      } catch {
        /* already signed out */
      }
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* storage may be blocked */
      }
      setDone(true);
      window.location.replace('/signin');
    })();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-paragraphs">
        {done ? 'Resetting…' : 'Clearing session and local state…'}
      </p>
    </div>
  );
}
