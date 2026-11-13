'use client';

import { useState, useEffect } from 'react';
import { useAmplifyApiClient } from '@/providers/amplify-provider';
import { useSessionContext } from '@/providers/session-provider';
import { useSpaceApi } from '@/hooks/api/spaces';

/**
 * Access levels:
 * 0 - Owner
 * 1 - Editor (write access)
 * 2 - Viewer (read-only access)
 * 3 - No access
 */
export type SpaceAccessLevel = 0 | 1 | 2 | 3;

export function useHasSpaceAccess(spaceUuid: string | null) {
  const apiClient = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();
  const { space, isLoading: isLoadingSpace } = useSpaceApi(spaceUuid);
  const [accessLevel, setAccessLevel] = useState<SpaceAccessLevel>(3);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!spaceUuid || !userAttributes?.userUuid) {
        setAccessLevel(3);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // First, check if user owns the space
        if (space?.userUuid === userAttributes.userUuid) {
          setAccessLevel(0); // Owner
          setIsLoading(false);
          return;
        }

        // If space doesn't exist or is still loading, wait
        if (isLoadingSpace || !space) {
          return;
        }

        // Check SpaceUsers table for shared access
        const spaceUsersResponse = await apiClient.models.SpaceUsers.listSpaceUsersBySpaceUuidAndLevelAndCreatedAt(
          { spaceUuid },
          { filter: { userUuid: { eq: userAttributes.userUuid } } }
        );

        const spaceUsers = spaceUsersResponse.data || [];

        if (spaceUsers.length === 0) {
          // No SpaceUsers entry found - user doesn't have shared access
          setAccessLevel(3); // No access
        } else {
          // User has access - map level to access level
          const userSpaceEntry = spaceUsers[0];
          const level = userSpaceEntry.level;

          // Map SpaceUsers level to access level
          // 0 = owner, 1 = editor, 2 = viewer
          if (level === 0) {
            setAccessLevel(0); // Owner
          } else if (level === 1) {
            setAccessLevel(1); // Editor (write)
          } else {
            setAccessLevel(2); // Viewer (read-only)
          }
        }
      } catch (error) {
        console.error('Failed to check space access:', error);
        setAccessLevel(3); // No access on error
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [spaceUuid, userAttributes?.userUuid, space, isLoadingSpace, apiClient]);

  return {
    accessLevel,
    isLoading: isLoading || isLoadingSpace,
    hasAccess: accessLevel !== 3,
    isOwner: accessLevel === 0,
    canWrite: accessLevel === 0 || accessLevel === 1,
    canRead: accessLevel === 0 || accessLevel === 1 || accessLevel === 2,
  };
}
