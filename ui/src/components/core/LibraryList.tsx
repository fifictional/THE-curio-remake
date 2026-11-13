'use client';

import { CurioListMenuItem } from "@/design-system/curio-list-menu-item";
import { CurioSidebarSection } from "@/design-system/curio-sidebar-section";
import { Space } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAnalytics, useCommonContext } from "@/providers";
import { FolderIcon, Users2 } from "lucide-react";

export const LibraryList = ({
  spaces,
  totalSpaces,
}: {
  spaces: (Space & { isShared?: boolean })[];
  totalSpaces: number;
}) => {
  const { track } = useAnalytics();
  const { closeSidebar, isSidebarOpen } = useCommonContext();

  return (
    <div className={cn("flex flex-col w-full", !isSidebarOpen && "hidden")}>
      <CurioSidebarSection
        title="Your Library"
        isSidebarOpen={isSidebarOpen}
        rightLink={
          spaces.length === 0
            ? { label: "...create a folder", href: "/library" }
            : totalSpaces > 0
              ? { label: "...see all", href: "/library" }
              : undefined
        }
      >
        {spaces.map((space) => (
          <CurioListMenuItem
            key={space.spaceUuid}
            href={`/spaces/${space.spaceUuid}`}
            icon={space.isShared ? Users2 : FolderIcon}
            label={space.name}
            title={space.name}
            onClick={() => {
              track("sidebar-space-clicked", {
                spaceId: space.spaceUuid,
                spaceName: space.name,
              });
              closeSidebar();
            }}
            data-testid={`sidebar-space-${space.spaceUuid}`}
          />
        ))}

        {spaces.length === 0 && (
          <p className="text-sm text-gray-600 ml-3">
            No folders found.
          </p>
        )}
      </CurioSidebarSection>
    </div>
  );
};