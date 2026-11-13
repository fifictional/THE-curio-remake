'use client';

import Image from "next/image";
import { ArrowLeft, Clock, Crown, Menu } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { useDocumentRename } from "@/hooks/use-document-rename";
import { useDocumentMove } from "@/hooks/use-document-move";
import { useDocumentDelete } from "@/hooks/use-document-delete";
import { InvisibleInput } from "@/components/ui/invisible-input";
import { ActionMenu } from "@/components/ui/action-menu";
import { MoveToSpaceModal } from "@/components/modals/move-to-space-modal";
import { useAnalytics, useChatContext, useCommonContext, useCoreContext, useSessionContext, useSpaceContext } from "@/providers";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { useFlashSales } from "@/hooks/use-flash-sales";
import FullPageLoader from "../ui/full-page-loader";
import { useHasResourceAccess } from "@/hooks/use-has-resource-access";

export function TopBar({ title, noUpgrade }: { title?: string, noUpgrade?: boolean }) {
  const [showTimer, setShowTimer] = useState(false);
  const { isUserSubscribed, getUserSubscriptionLevel } = useSessionContext();
  const { isSidebarOpen, isMobile, openSidebar, closeSidebar, pageTitle, setPageTitle } = useCommonContext();

  const { chat } = useChatContext();
  const { document } = useCoreContext();
  const { spaceName, spaceUuid: spaceUuidProp, canWrite, hasAccess: hasSpaceAccess } = useSpaceContext();
  const { userAttributes } = useSessionContext();
  
  const path = usePathname();
  const isInChatPage = path.includes('/chats');
  const isInSpacePage = path.includes('/spaces') && !path.includes('/chats') && !path.includes('/documents');
  const isInSubSpacePage = path.includes('/spaces');
  const isInCorePage = path.includes('/documents');
  const isInMockExamsPage = path.includes('/mock-exams');
  const isInExamBundlesPage = path.includes('/exam-bundles');

  // Check access for documents/chats
  const resourceToCheck = isInChatPage ? chat : document;
  const { hasAccess: hasResourceAccess } = useHasResourceAccess(resourceToCheck);
  const hasAccess = isInSubSpacePage ? hasSpaceAccess : hasResourceAccess;

  // Determine if we should show names based on access
  const shouldShowSpaceName = isInSpacePage ? hasSpaceAccess : (hasAccess && !!spaceName);
  const shouldShowFileName = (isInChatPage || isInCorePage || isInSubSpacePage) ? hasAccess : true;
  
  const fileName = isInChatPage
    ? (shouldShowFileName ? (chat?.name || 'Chat') : 'Chat')
    : isInSpacePage
      ? (shouldShowSpaceName ? (spaceName || 'Space') : 'Space')
      : isInCorePage
        ? (shouldShowFileName ? (document?.fileName || 'Document') : 'Document')
        : 'Home';

  const pageType = isInChatPage ? 'chat' : 'document';
  const isEditable = isInCorePage || isInChatPage;
  const documentUuid = isInChatPage ? chat?.chatUuid || '' : document?.documentUuid || '';
  const spaceUuid = isInChatPage ? chat?.spaceUuid || null : document?.spaceUuid || null;
  
  // Check if the resource belongs to the current user
  const resourceUserUuid = isInChatPage ? chat?.userUuid : document?.userUuid;
  const isOwnResource = resourceUserUuid === userAttributes?.userUuid;
  const isOwnChat = isInChatPage && isOwnResource;
  
  // Check if we're in a space and if user has write access
  const isInSpace = !!spaceUuid;
  // Allow rename/delete/move for user's own chats even in read-only spaces
  const canRenameInSpace = isInSpace ? (isOwnChat ? true : canWrite) : true;
  const canDeleteInSpace = isInSpace ? (isOwnChat ? true : canWrite) : true;
  const canMoveInSpace = isInSpace ? (isOwnChat ? true : canWrite) : true;

  const {
    startRenaming,
    finishRenaming,
    handleNameChange,
    handleKeyDown,
    isRenaming,
    editedName,
  } = useDocumentRename({ type: pageType });

  const {
    handleMove,
    handleSpaceSelect,
    handleCloseMoveToSpaceModal,
    moveContext,
    isMoveToSpaceModalOpen,
  } = useDocumentMove({ type: pageType });

  const {
    handleDelete,
    isDeleting
  } = useDocumentDelete({ type: pageType });

  const { track } = useAnalytics();
  const router = useRouter();

  const toggleSidebar = useCallback(() => {
    if (isSidebarOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }, [isSidebarOpen, openSidebar, closeSidebar]);

  const { getFlashSaleForPage } = useFlashSales();
  const flashSale = getFlashSaleForPage('exam-bundles');

  const handleUpgradeClick = useCallback(() => {
    // Determine utm_source based on current page
    let utmSource = 'topbar';
    if (path.includes('/chats')) {
      utmSource = 'topbar-chat';
    } else if (path.includes('/documents')) {
      utmSource = 'topbar-document';
    } else if (path.includes('/spaces')) {
      utmSource = 'topbar-space';
    } else if (path.includes('/mock-exams')) {
      utmSource = 'topbar-mockexam';
    } else if (path === '/') {
      utmSource = 'topbar-home';
    }

    track('topbar-upgrade-clicked', { utm_source: utmSource });
    router.push(`/exam-bundles?discountCode=${flashSale?.discountCode}&utm_source=${utmSource}`);
  }, [path, track, router]);

  return (
    <header className="relative w-full bg-focus h-13">
      <div className={cn('flex items-center justify-between px-4 h-13 w-full')}>
        {isMobile && !noUpgrade && (
          <div className={cn("flex shrink-0 items-start gap-2 w-35", isMobile && 'w-10')}>
            <Menu className="w-6 h-6 text-gray-700" onClick={toggleSidebar} />
          </div>
        )}
        <div className={cn("flex flex-1 min-w-0 items-center justify-center")}>
          {isEditable ? (
            <>
              <div className="flex-1 min-w-0 overflow-hidden">
                {isRenaming ? (
                  <InvisibleInput
                    value={editedName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value)}
                    onBlur={() => finishRenaming(true)}
                    onKeyDown={handleKeyDown}
                    className="text-3xl h-8 font-semibold text-headers max-w-full w-full"
                    wrapperClassName="w-full max-w-full"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center gap-2 text-headers font-semibold text-xl overflow-hidden">
                    {shouldShowSpaceName && spaceName ? <>
                      <Link href={`/spaces/${spaceUuid}`} className="underline flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
                        <span className="whitespace-nowrap">{spaceName}</span>
                      </Link> <span className="whitespace-nowrap">/</span>
                    </> : ''} <span className="truncate block">{fileName}</span>
                  </div>
                )}
              </div>
              {!isRenaming && (
                <div className="shrink-0 w-10 ml-4">
                  <ActionMenu
                    actions={['rename', 'move', 'delete']}
                    item={{ documentUuid, fileName, spaceUuid }}
                    canRename={canRenameInSpace}
                    canMove={canMoveInSpace}
                    canDelete={canDeleteInSpace}
                    onRename={startRenaming}
                    onMove={handleMove}
                    onDelete={handleDelete}
                    testIdPrefix="top-bar-action-menu"
                  />
                </div>
              )}
            </>
          ) : isInSpacePage ? (
            <span className="text-headers font-semibold text-xl truncate block max-w-full">
              {shouldShowSpaceName ? spaceName : 'Space'}
            </span>
          ) : (
            <span className="text-headers font-semibold text-xl truncate block max-w-full">
              {title ? title : pageTitle ? pageTitle : isMobile ? <Image src="/logo.svg" alt="Curio Logo" width={100} height={32} className="w-auto h-8" priority /> : ''}
            </span>
          )}
        </div>
        <div className={cn("flex items-center gap-6 justify-end shrink-0 w-35", isMobile && 'w-10', isUserSubscribed && 'w-0')}>
          {(!noUpgrade && !isUserSubscribed) && (
            <Button
              onClick={handleUpgradeClick}
              variant="default"
              size="sm"
              className="font-semibold bg-gray-800 hover:bg-gray-600"
            >
              {isMobile ? <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" /> : <div className="flex items-center gap-2"><Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" /> Upgrade</div>}
            </Button>
          )}
        </div>
        {showTimer && (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-curio-timer">
              <span className="text-xl bg-curio-light-grey rounded-full px-5 py-4 flex items-center gap-2 font-bold">
                <Clock className="w-5 h-5" />
                00:25
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Move to Space Modal */}
      {isEditable && (
        <MoveToSpaceModal
          isOpen={isMoveToSpaceModalOpen}
          closeModal={handleCloseMoveToSpaceModal}
          onSpaceSelect={handleSpaceSelect}
          fileName={moveContext?.fileName || fileName}
        />
      )}
      {
        isDeleting && <FullPageLoader message="Please wait… Your document is being deleted." />
      }

    </header>
  );
} 