import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import type { SessionUser } from '../types';

/** Header shared by every screen: brand, navigation, who is signed in. */
export function Shell({
  user,
  children,
  wide = false,
}: {
  user: SessionUser | null;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={[
        'mx-auto flex min-h-screen w-full flex-col px-4 pb-8',
        wide ? 'max-w-5xl' : 'max-w-3xl',
      ].join(' ')}
    >
      <header className="flex items-center justify-between gap-3 py-5">
        <div className="flex items-baseline gap-4">
          <Link to="/" className="font-roca text-xl text-foreground">
            Curio
          </Link>
          <nav className="flex items-center gap-3 text-sm text-headers">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: 'text-foreground font-medium' }}
              className="hover:text-foreground"
            >
              Chat
            </Link>
            <Link
              to="/library"
              activeProps={{ className: 'text-foreground font-medium' }}
              className="hover:text-foreground"
            >
              Library
            </Link>
          </nav>
        </div>
        {user?.email && <span className="text-xs text-headers">{user.email}</span>}
      </header>
      {children}
    </div>
  );
}
