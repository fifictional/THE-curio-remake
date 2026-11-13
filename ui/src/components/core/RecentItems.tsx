'use client';

import { CurioListMenuItem } from "@/design-system/curio-list-menu-item";
import { CurioSidebarSection } from "@/design-system/curio-sidebar-section";
import { Space } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAnalytics, useCommonContext } from "@/providers";
import { BookOpenCheck, FileIcon, FolderIcon, MessageCircleIcon, YoutubeIcon } from "lucide-react";
import { usePathname } from "next/navigation";

export interface RecentElement {
  type: 'document' | 'chat' | 'youtube' | 'mock-exam';
  uuid: string;
  fileName: string;
  createdAt: string;
  spaceUuid?: string | null;
}

const getRecentIcon = (type: RecentElement["type"]) => {
  switch (type) {
    case "youtube":
      return YoutubeIcon;
    case "chat":
      return MessageCircleIcon;
    case "document":
      return FileIcon;
    case "mock-exam":
      return BookOpenCheck;
    default:
      return FileIcon;
  }
};

const isDocumentActive = (documentUuid: string, pathname: string) => {
  return pathname.includes(documentUuid);
}

export const RecentItems = ({ recentElements }: { recentElements: RecentElement[] }) => {
  const { track } = useAnalytics();
  const { closeSidebar, isSidebarOpen } = useCommonContext();
  const pathname = usePathname();

  const buildHrefForRecentItem = (recentItem: RecentElement) => {
    if (recentItem.type === 'document' || recentItem.type === 'youtube') {
      return recentItem.spaceUuid
        ? `/spaces/${recentItem.spaceUuid}/documents/${recentItem.uuid}`
        : `/documents/${recentItem.uuid}`;
    }
    if (recentItem.type === 'chat') {
      return recentItem.spaceUuid
        ? `/spaces/${recentItem.spaceUuid}/chats/${recentItem.uuid}`
        : `/chats/${recentItem.uuid}`;
    }
    if (recentItem.type === 'mock-exam') return `/mock-exams/${recentItem.uuid}`;
    return '/';
  }

  return (
    <div className="text-gray-500 flex flex-col min-h-0 h-full overflow-y-hidden">
      <CurioSidebarSection
        title="Recents"
        isSidebarOpen={isSidebarOpen}
        className="h-full overflow-y-hidden"
      >
        <div className="flex-1 min-h-0 overflow-y-auto">
          {recentElements.map((recentItem) => (
            <CurioListMenuItem
              key={`recent-${recentItem.type}-${recentItem.uuid}`}
              href={buildHrefForRecentItem(recentItem)}
              active={isDocumentActive(recentItem.uuid, pathname)}
              hidden={!isSidebarOpen}
              icon={getRecentIcon(recentItem.type)}
              label={recentItem.fileName}
              title={recentItem.fileName}
              onClick={() => {
                track("sidebar-element-clicked", {
                  documentId: recentItem.uuid,
                });
                closeSidebar();
              }}
            />
          ))}
        </div>
      </CurioSidebarSection>
    </div>
  );
};
