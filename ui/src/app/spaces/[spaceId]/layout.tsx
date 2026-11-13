'use client';

import { useSpaceContext } from '@/providers';
import { CurioLoading } from '@/components/ui/curio-loading';
import { AccessDenied } from '@/design-system/access-denied';

export default function SpaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { accessLevel, hasAccess, isAccessLoading } = useSpaceContext();

  if (isAccessLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <CurioLoading />
      </div>
    );
  }

  if (!hasAccess || accessLevel === 3) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
