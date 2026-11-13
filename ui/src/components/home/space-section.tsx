import { useSpacesByUserApi, useSpacesSharedWithMeApi } from "@/hooks/api/spaces";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAnalytics, useSessionContext, useAmplifyApiClient } from "@/providers";
import { CurioPanel } from "@/design-system/curio-panel";
import { SpaceCard } from "../ui/space-card";
import { CurioPanelContent } from "@/design-system/curio-panel-content";
import { CurioPanelHeader, CurioPanelTitle, CurioPanelSubtitle, CurioPanelAction } from "@/design-system/curio-panel-header";
import { CurioButton } from "@/design-system/curio-button";
import { CurioSlideIn } from "@/design-system/curio-slide-in";
import { AnimatePresence } from "framer-motion";
import { PlusIcon } from "lucide-react";
import { FolderShareModal } from "../modals/folder-share-modal";

export const SpaceSection = () => {
  const { userAttributes } = useSessionContext();
  const apiClient = useAmplifyApiClient();
  const { spaces: userSpaces, isLoading: isLoadingUserSpaces } = useSpacesByUserApi({ 
    userUuid: userAttributes?.userUuid || null, 
    options: {
      subscriptions: 'all',
      perPage: 100,
    } 
  });
  const { spaces: sharedSpaces, isLoading: isLoadingSharedSpaces } = useSpacesSharedWithMeApi({ 
    userUuid: userAttributes?.userUuid || null, 
    options: {
      subscriptions: 'all',
      perPage: 100,
    } 
  });

  // Map of spaceUuid -> permission level (0: Owner, 1: Editor, 2: Viewer)
  const [spacePermissionLevels, setSpacePermissionLevels] = useState<Map<string, number>>(new Map());
  // Map of spaceUuid -> hasSharedMembers (true if space has any SpaceUsers entries, meaning it's been shared)
  const [spaceHasSharedMembers, setSpaceHasSharedMembers] = useState<Map<string, boolean>>(new Map());

  // Fetch permission levels for shared spaces and check which spaces have been shared
  useEffect(() => {
    if (!userAttributes?.userUuid) {
      setSpacePermissionLevels(new Map());
      setSpaceHasSharedMembers(new Map());
      return;
    }

    const fetchSpaceData = async () => {
      try {
        // Get all spaces (user-owned + shared)
        const allSpaceUuids = new Set<string>();
        userSpaces.forEach(space => allSpaceUuids.add(space.spaceUuid));
        sharedSpaces.forEach(space => allSpaceUuids.add(space.spaceUuid));

        if (allSpaceUuids.size === 0) {
          setSpacePermissionLevels(new Map());
          setSpaceHasSharedMembers(new Map());
          return;
        }

        // Fetch SpaceUsers entries for all spaces to check if they've been shared
        const spaceUsersPromises = Array.from(allSpaceUuids).map(async (spaceUuid) => {
          const spaceUsersResponse = await apiClient.models.SpaceUsers.listSpaceUsersBySpaceUuidAndLevelAndCreatedAt({
            spaceUuid,
          }, { limit: 1000 });
          return { spaceUuid, spaceUsers: spaceUsersResponse.data || [] };
        });

        const spaceUsersResults = await Promise.all(spaceUsersPromises);

        const levelsMap = new Map<string, number>();
        const hasSharedMembersMap = new Map<string, boolean>();

        // Process results
        spaceUsersResults.forEach(({ spaceUuid, spaceUsers }) => {
          // Check if space has been shared (has any SpaceUsers entries)
          hasSharedMembersMap.set(spaceUuid, spaceUsers.length > 0);

          // Find the current user's permission level in this space
          const userSpaceUser = spaceUsers.find(su => su.userUuid === userAttributes.userUuid);
          if (userSpaceUser) {
            levelsMap.set(spaceUuid, userSpaceUser.level);
          }
        });

        setSpacePermissionLevels(levelsMap);
        setSpaceHasSharedMembers(hasSharedMembersMap);
      } catch (error) {
        console.error('Failed to fetch space data:', error);
      }
    };

    fetchSpaceData();
  }, [userSpaces, sharedSpaces, userAttributes?.userUuid, apiClient]);

  // Merge user spaces and shared spaces, removing duplicates by spaceUuid
  // User spaces take precedence over shared spaces if duplicate
  const spaces = useMemo(() => {
    const uniqueSpaces = new Map<string, typeof userSpaces[0]>();
    
    // Add user spaces first (they take precedence)
    userSpaces.forEach(space => {
      uniqueSpaces.set(space.spaceUuid, space);
    });
    
    // Add shared spaces (only if not already present)
    sharedSpaces.forEach(space => {
      if (!uniqueSpaces.has(space.spaceUuid)) {
        uniqueSpaces.set(space.spaceUuid, space);
      }
    });
    
    // Sort by updatedAt descending (most recent first)
    return Array.from(uniqueSpaces.values()).sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });
  }, [userSpaces, sharedSpaces]);

  const isLoadingSpaces = isLoadingUserSpaces || isLoadingSharedSpaces;

  const [isCreatingTempSpace, setIsCreatingTempSpace] = useState(false);
  const [tempSpaceName, setTempSpaceName] = useState<string>('');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedSpaceForShare, setSelectedSpaceForShare] = useState<{ uuid: string; name: string } | null>(null);
  const { track } = useAnalytics();

  const createSpace = useCallback(() => {
    track('create-space-clicked');
    setTempSpaceName('');
    setIsCreatingTempSpace(true);
  }, []);

  const handleAddSpaceCancel = useCallback(() => {
    track('add-space-canceled');
    setIsCreatingTempSpace(false);
    setTempSpaceName('');
  }, []);

  const handleAddSpaceSave = useCallback(() => {
    setIsCreatingTempSpace(false);
    setTempSpaceName('');
  }, []);

  const handleInviteSpace = useCallback((spaceUuid: string, spaceName: string) => {
    track('folder-invite-button-clicked', {
      spaceUuid,
      spaceName,
    });
    setSelectedSpaceForShare({ uuid: spaceUuid, name: spaceName });
    setShareModalOpen(true);
  }, [track]);

  return (
    <CurioPanel border={true} padding="md" className="w-full items-start">
      <CurioPanelHeader>
        <CurioPanelTitle>Folders</CurioPanelTitle>
        <CurioPanelSubtitle>Access and manage your folders.</CurioPanelSubtitle>
        <CurioPanelAction>
          <CurioButton size="sm" onClick={createSpace} data-testid="create-space-button">
            New folder <PlusIcon className="w-4 h-4 ml-2" />
          </CurioButton>
        </CurioPanelAction>
      </CurioPanelHeader>
      <CurioPanelContent>
        {isLoadingSpaces && (
          <div className="flex flex-col items-center justify-center w-full h-full">
            <p className="text-lg text-gray-500">
              Loading folders...
            </p>
          </div>
        )}
        {spaces.length === 0 && !isCreatingTempSpace && !isLoadingSpaces && (
          <div className="flex flex-col items-center justify-center w-full h-full">
            <p className="text-lg text-gray-500">
              No folders yet. Create one to get started.
            </p>
          </div>
        )}
        <div className="flex flex-row gap-4 flex-wrap w-full"> 
          <AnimatePresence mode="popLayout">
            {isCreatingTempSpace && (
              <CurioSlideIn key="temp-space" direction="horizontal">
                <SpaceCard
                  spaceUuid={null}
                  spaceName={tempSpaceName}
                  documentCount={0}
                  onEditCancel={handleAddSpaceCancel}
                  onEditSave={handleAddSpaceSave}
                  canDelete={false}
                  canRename={false}
                  isEditing={true}
                />
              </CurioSlideIn>
            )}
            {spaces.map((space, index) => {
              const isOwnedByUser = space.userUuid === userAttributes?.userUuid;
              const hasSharedMembers = spaceHasSharedMembers.get(space.spaceUuid) || false;
              const isShared = !isOwnedByUser; // Shared with me (not owned by me)
              const isSuperOwner = isOwnedByUser && hasSharedMembers; // Owned by me AND has been shared
              const permissionLevel = spacePermissionLevels.get(space.spaceUuid);
              const canInvite = isShared ? permissionLevel === 0 : true; // Only owners can invite in shared spaces
              
              // Determine delete/rename permissions based on access level
              // Level 0: Owner - can delete and rename
              // Level 1: Editor - can rename, cannot delete
              // Level 2: Viewer - cannot delete or rename
              // For user's own spaces: can delete (if empty) and rename
              const canRename = isShared 
                ? (permissionLevel === 0 || permissionLevel === 1) // Owner or Editor can rename
                : true; // User's own spaces can always rename
              
              const canDelete = isShared
                ? (permissionLevel === 0 && space.documentsCount === 0) // Only owners can delete, and only if empty
                : (space.documentsCount === 0); // User's own spaces can delete if empty
              
              return (
                <CurioSlideIn 
                  key={space.spaceUuid} 
                  direction="horizontal" 
                  delay={index * 0.05}
                >
                  <SpaceCard 
                    spaceName={space.name}
                    documentCount={space.documentsCount}
                    spaceUuid={space.spaceUuid}
                    onEditCancel={() => {}}
                    onEditSave={() => {}}
                    canDelete={canDelete}
                    canRename={canRename}
                    isEditing={false}
                    onInvite={canInvite ? () => handleInviteSpace(space.spaceUuid, space.name) : undefined}
                    isShared={isShared || hasSharedMembers} // Show icon if shared with me OR if I own it and it's been shared
                    isSuperOwner={isSuperOwner} // Indicate if user is the super owner
                    canInvite={canInvite}
                  />
                </CurioSlideIn>
              );
            })}
          </AnimatePresence>
        </div>
      </CurioPanelContent>
      {selectedSpaceForShare && (
        <FolderShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          spaceUuid={selectedSpaceForShare.uuid}
          spaceName={selectedSpaceForShare.name}
        />
      )}
    </CurioPanel>
  )
}