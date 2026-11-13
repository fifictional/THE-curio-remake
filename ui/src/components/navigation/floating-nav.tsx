'use client';

import { Home, FolderIcon, Upload } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { UploadModal } from '@/components/modals/upload-modal';
import { useAnalytics, useSessionContext, useSpaceContext } from '@/providers';
import { cn } from '@/lib/utils';
import { CurioListMenuAction } from '@/design-system/curio-list-menu-action';

interface FloatingNavProps {
  readOnly?: boolean;
}

export function FloatingNav({ readOnly = false }: FloatingNavProps) {
  const pathname = usePathname();
  const { userAttributes } = useSessionContext();
  const { spaceUuid } = useSpaceContext();
  const { track } = useAnalytics();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const defaultSpaceUuid = spaceUuid || undefined;

  const isHome = pathname === '/';
  const isLibrary = pathname === '/library';

  const handleUpload = () => {
    if (readOnly) return;
    track('floating-nav-upload-clicked', {
      currentPath: pathname,
      spaceUuid: spaceUuid || null,
    });
    setIsUploadModalOpen(true);
  };

  const handleHomeClick = () => {
    if (!isHome) {
      track('floating-nav-home-clicked', {
        currentPath: pathname,
        spaceUuid: spaceUuid || null,
      });
    }
  };

  const handleLibraryClick = () => {
    if (!isLibrary) {
      track('floating-nav-library-clicked', {
        currentPath: pathname,
        spaceUuid: spaceUuid || null,
      });
    }
  };

  const actions = [
    { id: "home", label: "Home", icon: Home, onSelect: handleHomeClick, href: "/" },
    { id: "upload", label: "Upload", icon: Upload, onSelect: handleUpload, disabled: readOnly },
    { id: "library", label: "Library", icon: FolderIcon, onSelect: handleLibraryClick, href: "/library" },
  ];

  return (
    <>
      <div className="flex justify-center absolute bottom-4">
        <CurioListMenuAction
          items={actions}
          value={isHome ? "home" : isLibrary ? "library" : 'upload'}
          defaultValue="upload"
          onChange={(id) => console.log("Active changed:", id)}
        />
      </div>

      <UploadModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        userUuid={userAttributes?.userUuid || ''}
        mode="all"
        defaultSpaceUuid={defaultSpaceUuid}
        onUploadStarted={() => { }}
      />
    </>
  );
}

