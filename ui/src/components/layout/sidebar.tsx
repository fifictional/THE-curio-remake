'use client';

import { LogOut, SettingsIcon, FileIcon, HeartPlus, Info, YoutubeIcon, MessageCircleIcon, FolderIcon, BookOpenCheck, SquareArrowOutUpRight, Target, CrownIcon, Gift } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAnalytics, useCommonContext, useSessionContext } from "@/providers";
import { signOut } from "@/lib/local-auth";
import { cn } from "@/lib/utils";
import { useDocumentsByUserApi } from "@/hooks/api/documents";
import { useChatsByUserApi } from "@/hooks/api/chats";
import { useSpacesByUserApi, useSpacesSharedWithMeApi } from "@/hooks/api/spaces";
import { useFlashSales } from "@/hooks/use-flash-sales";
import { useMemo, useEffect, useState } from "react";
import { useAmplifyApiClient } from "@/providers";
import { YoutubeModal } from "../core/youtube-modal";
import { Crown } from "lucide-react";
import { Space } from "@/lib/types";
import { FeedbackModal } from "../core/feedback-modal";
import { CurioLogo } from "@/design-system/curio-logo";
import { CurioUserInfo } from "@/design-system/curio-user-info";
import { LibraryList } from "../core/LibraryList";
import { RecentElement, RecentItems } from "../core/RecentItems";


export function Sidebar() {
  const { openSidebar, closeSidebar, isSidebarOpen, isMobile } = useCommonContext();
  const { userAttributes } = useSessionContext();
  const apiClient = useAmplifyApiClient();
  const { documents } = useDocumentsByUserApi({ userUuid: userAttributes?.userUuid || null, options: { perPage: 25, subscriptions: 'all', key: 'sidebar' } });
  const { chats } = useChatsByUserApi({ userUuid: userAttributes?.userUuid || null, options: { perPage: 25, key: 'sidebar', subscriptions: 'all' }, noDocumentOnly: true });
  const { spaces: userSpaces } = useSpacesByUserApi({ userUuid: userAttributes?.userUuid || null, options: { perPage: 1000, key: 'sidebar', subscriptions: 'all' } });
  const { spaces: sharedSpaces } = useSpacesSharedWithMeApi({ userUuid: userAttributes?.userUuid || null, options: { perPage: 1000, key: 'sidebar', subscriptions: 'all' } });

  // Map of spaceUuid -> hasSharedMembers (true if space has any SpaceUsers entries)
  const [spaceHasSharedMembers, setSpaceHasSharedMembers] = useState<Map<string, boolean>>(new Map());

  // Check which spaces have been shared (have SpaceUsers entries)
  useEffect(() => {
    if (!userAttributes?.userUuid) {
      setSpaceHasSharedMembers(new Map());
      return;
    }

    const fetchSharedStatus = async () => {
      try {
        // Get all spaces (user-owned + shared)
        const allSpaceUuids = new Set<string>();
        userSpaces.forEach(space => allSpaceUuids.add(space.spaceUuid));
        sharedSpaces.forEach(space => allSpaceUuids.add(space.spaceUuid));

        if (allSpaceUuids.size === 0) {
          setSpaceHasSharedMembers(new Map());
          return;
        }

        // Fetch SpaceUsers entries for all spaces to check if they've been shared
        const spaceUsersPromises = Array.from(allSpaceUuids).map(async (spaceUuid) => {
          const spaceUsersResponse = await apiClient.models.SpaceUsers.listSpaceUsersBySpaceUuidAndLevelAndCreatedAt({
            spaceUuid,
          }, { limit: 1 }); // Just check if any exist
          return { spaceUuid, hasSharedMembers: (spaceUsersResponse.data || []).length > 0 };
        });

        const spaceUsersResults = await Promise.all(spaceUsersPromises);

        const hasSharedMembersMap = new Map<string, boolean>();
        spaceUsersResults.forEach(({ spaceUuid, hasSharedMembers }) => {
          hasSharedMembersMap.set(spaceUuid, hasSharedMembers);
        });

        setSpaceHasSharedMembers(hasSharedMembersMap);
      } catch (error) {
        console.error('Failed to fetch shared status:', error);
      }
    };

    fetchSharedStatus();
  }, [userSpaces, sharedSpaces, userAttributes?.userUuid, apiClient]);

  // Merge user spaces and shared spaces, removing duplicates by spaceUuid
  // User spaces take precedence over shared spaces if duplicate
  const spaces = useMemo(() => {
    const uniqueSpaces = new Map<string, Space & { isShared?: boolean }>();
    
    // Add user spaces first (they take precedence)
    userSpaces.forEach(space => {
      const hasSharedMembers = spaceHasSharedMembers.get(space.spaceUuid) || false;
      const isOwnedByUser = space.userUuid === userAttributes?.userUuid;
      // Show as shared if it's been shared with others (has SpaceUsers entries) OR if it's not owned by user
      const isShared = !isOwnedByUser || hasSharedMembers;
      uniqueSpaces.set(space.spaceUuid, { ...space, isShared });
    });
    
    // Add shared spaces (only if not already present)
    sharedSpaces.forEach(space => {
      if (!uniqueSpaces.has(space.spaceUuid)) {
        uniqueSpaces.set(space.spaceUuid, { ...space, isShared: true });
      }
    });
    
    // Sort by updatedAt descending (most recent first)
    return Array.from(uniqueSpaces.values()).sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });
  }, [userSpaces, sharedSpaces, spaceHasSharedMembers, userAttributes?.userUuid]);

  const mappedChats: RecentElement[] = chats.map((chat) => ({
    type: 'chat',
    uuid: chat.chatUuid,
    fileName: chat.name,
    createdAt: chat.createdAt,
    spaceUuid: chat.spaceUuid || null,
  }));
  const mappedDocuments: RecentElement[] = documents.map((document) => ({
    type: document.type === 'youtube' ? 'youtube' : 'document',
    uuid: document.documentUuid,
    fileName: document.fileName,
    createdAt: document.createdAt,
    spaceUuid: document.spaceUuid || null,
  }));

  const recentElements = [...mappedDocuments, ...mappedChats].sort((a, b) => new Date(b.createdAt || new Date()).getTime() - new Date(a.createdAt || new Date()).getTime());

  return (
    <aside onMouseOver={openSidebar} onMouseLeave={closeSidebar} className={cn("relative w-65 flex flex-col px-3 h-full transition-all duration-300", !isSidebarOpen && 'w-12 px-3')}>

      <div className="shrink-0 h-15 mb-2">
        <SidebarLogo />
      </div>

      <Divider hidden />

      <div className="w-full mb-4 text-sm">
        <SidebarLinks />
      </div>

      {isSidebarOpen && <Divider />}

      <div className="mt-2 mb-4">
        <LibraryList spaces={spaces.slice(0, 3)} totalSpaces={spaces.length} />
      </div>

      {isSidebarOpen && <Divider />}

      <div className={cn("mt-2 flex-1 w-full h-full overflow-y-hidden mb-4", !isSidebarOpen && 'hidden')}>
        <RecentItems recentElements={recentElements} />
      </div>

      <div className="w-full mb-3 mt-auto">
        <UserInfo />
      </div>

    </aside>
  );
}

const SidebarLogo = () => {
  const { getUserSubscriptionLevel } = useSessionContext();
  const { track } = useAnalytics();
  const { isSidebarOpen } = useCommonContext();

  const subscriptionLevel = getUserSubscriptionLevel() as 'none' | 'super' | 'ultra';

  return (
    <CurioLogo
      subscriptionLevel={subscriptionLevel}
      collapsed={!isSidebarOpen}
      onLogoClick={() => {
        track('top-bar-logo-clicked');
      }}
    />
  );
};

const SidebarLinks = () => {
  const { track } = useAnalytics();
  const { isAdmin } = useSessionContext();
  const { isUserSubscribed } = useSessionContext();
  const { hasFeatureFlag } = useSessionContext();
  const { closeSidebar } = useCommonContext();
  const { isSidebarOpen } = useCommonContext();
  const { getFlashSaleForPage } = useFlashSales();

  const flashSale = getFlashSaleForPage('exam-bundles');

  return (
    <div className="flex flex-col gap-3">
      {isAdmin && (
        <Link onClick={() => { track('sidebar-admin-clicked'); closeSidebar(); }} href="/admin" className={cn("flex gap-2 font-bold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer truncate")}>
          <SettingsIcon className="w-5 h-5" />
          {isSidebarOpen && <span className="truncate">Admin</span>}
        </Link>
      )}
      <Link onClick={() => { track('sidebar-home-clicked'); closeSidebar(); }} href="/" className={cn("flex gap-2 font-bold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer truncate")}>
        <MessageCircleIcon className="w-5 h-5" />
        {isSidebarOpen && <span className="truncate">New Chat</span>}
      </Link>
      {/* Remake: the "Upgrade to SuperCurio" upsell is removed. */}

      {/* <Link onClick={() => { track('sidebar-gifting-clicked'); closeSidebar(); }} href="/gifting" className={cn("flex gap-2 font-bold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer truncate")}>
        <Gift className="w-5 h-5" />
        {isSidebarOpen && <span className="truncate">Gift Curio</span>}
      </Link> */}

      <FeedbackModal
        src="https://docs.google.com/forms/d/e/1FAIpQLScx4u4uimLIbuWmCBll3i_n9dMZDk5ltlVRqFC6C8hRQT7V1Q/viewform?usp=dialog"
        trigger={
          <button
            onClick={() => { track('sidebar-how-to-use-clicked'); closeSidebar(); }}
            className={cn("flex items-center gap-2 rounded-full px-0 py-0 text-base !font-bold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer", !isSidebarOpen && 'justify-center')}
          >
            <HeartPlus className="w-5 h-5" />
            {isSidebarOpen && <span className="truncate">Feedback</span>}
          </button>
        }
      />
      <YoutubeModal
        youtubeVideoUuid="5_KObyprYrY"
        trigger={
          <button
            onClick={() => { track('sidebar-how-to-use-clicked'); closeSidebar(); }}
            className={cn("flex items-center gap-2 rounded-full px-0 py-0 !font-bold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer", !isSidebarOpen && 'justify-center')}
          >
            <Info className="w-5 h-5" />
            {isSidebarOpen && <span className="truncate">How to use Curio</span>}
          </button>
        }
      />
    </div>
  );
};

const Divider = ({ hidden }: { hidden?: boolean }) => {
  return <div className={cn("h-px shrink-0 bg-gray-300 w-full", hidden && 'bg-transparent')} />;
};






const UserInfo = () => {
  const { track } = useAnalytics();
  const { closeSidebar } = useCommonContext();
  const { isSidebarOpen } = useCommonContext();
  const { userAttributes } = useSessionContext();
  const clearStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
  };

  const fullName = `${userAttributes?.givenName || ''} ${userAttributes?.familyName || ''}`.trim();

  return (
    <CurioUserInfo
      name={fullName}
      href="/profile"
      collapsed={!isSidebarOpen}
      onNameClick={() => {
        track('sidebar-profile-clicked');
        closeSidebar();
      }}
      rightButton={
        isSidebarOpen ? (
          <LogOut
            data-testid="logout-button"
            className="w-5 h-5 cursor-pointer text-gray-600 hover:text-gray-800 transition-colors"
            onClick={() => {
              track('sidebar-sign-out-clicked');
              closeSidebar();
              clearStorage();
              signOut();
            }}
          />
        ) : undefined
      }
    />
  );
};