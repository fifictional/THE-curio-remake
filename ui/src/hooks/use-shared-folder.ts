'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAmplifyApiClient } from '@/providers/amplify-provider';
import { useSessionContext, useAnalytics } from '@/providers';
import { type Member } from '@/components/modals/folder-share-modal-content';
import { v4 as uuidv4 } from 'uuid';
import { useMoveAllUserResourcesApi } from '@/hooks/api/spaces/use-move-all-user-resources.api';

const mapLevelToRole = (level: number): 'Owner' | 'Editor' | 'Viewer' => {
  switch (level) {
    case 0:
      return 'Owner';
    case 1:
      return 'Editor';
    case 2:
      return 'Viewer';
    default:
      return 'Viewer';
  }
};

const mapRoleToLevel = (role: 'Owner' | 'Editor' | 'Viewer'): number => {
  switch (role) {
    case 'Owner':
      return 0;
    case 'Editor':
      return 1;
    case 'Viewer':
      return 2;
    default:
      return 2;
  }
};

export function useSharedFolder(spaceUuid: string | null) {
  const apiClient = useAmplifyApiClient();
  const { userAttributes, userProfile } = useSessionContext();
  const { track } = useAnalytics();
  const { moveAllUserResources } = useMoveAllUserResourcesApi();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [invitesLeft, setInvitesLeft] = useState(0);
  const [spaceOwnerUuid, setSpaceOwnerUuid] = useState<string | null>(null);

  const fetchSharedFolderData = useCallback(async () => {
    if (!spaceUuid || !userAttributes?.userUuid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch the Space to get the main owner's userUuid
      const spaceResponse = await apiClient.models.Space.get({
        spaceUuid,
      }, {
        selectionSet: ['spaceUuid', 'userUuid'],
      });

      if (spaceResponse.data) {
        setSpaceOwnerUuid(spaceResponse.data.userUuid);
      }

      // Query SpaceUsers for this space
      const spaceUsersResponse = await apiClient.models.SpaceUsers.listSpaceUsersBySpaceUuidAndLevelAndCreatedAt(
        { spaceUuid },
      );

      const spaceUsers = spaceUsersResponse.data || [];

      // If no SpaceUsers entries, return current user as Owner
      if (spaceUsers.length === 0) {
        if (userProfile) {
          const currentUserMember: Member = {
            uuid: userAttributes.userUuid,
            name: `${userProfile.firstName} ${userProfile.lastName}`,
            email: userAttributes.email || '',
            role: 'Owner',
          };
          console.log('No SpaceUsers entries, returning current user as Owner', currentUserMember);
          setMembers([currentUserMember]);
        }
        setIsLoading(false);
        return;
      }

      // Fetch UserProfile for each userUuid in SpaceUsers
      const memberPromises = spaceUsers.map(async (spaceUser) => {
        try {
          const userProfileResponse = await apiClient.models.UserProfile.get({
            userUuid: spaceUser.userUuid,
          }, {
            selectionSet: ['userUuid', 'userEmail', 'firstName', 'lastName'],
          });

          const profile = userProfileResponse.data;
          const name = profile?.firstName && profile?.lastName
            ? `${profile.firstName} ${profile.lastName}`
            : profile?.userEmail || spaceUser.userUuid;

          return {
            uuid: spaceUser.userUuid,
            name,
            email: profile?.userEmail || '',
            role: mapLevelToRole(spaceUser.level),
          } as Member;
        } catch (error) {
          console.error(`Failed to fetch UserProfile for ${spaceUser.userUuid}:`, error);
          // Return member with minimal info if UserProfile fetch fails
          return {
            uuid: spaceUser.userUuid,
            name: spaceUser.userUuid,
            email: '',
            role: mapLevelToRole(spaceUser.level),
          } as Member;
        }
      });

      const fetchedMembers = await Promise.all(memberPromises);
      setMembers(fetchedMembers);

      // TODO: Calculate invites left based on subscription/plan limits
      // For now, set to 0 or a default value
      setInvitesLeft(0);
    } catch (error) {
      console.error('Failed to fetch shared folder data:', error);
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, [spaceUuid, userAttributes?.userUuid, userProfile, apiClient]);

  useEffect(() => {
    fetchSharedFolderData();
  }, [fetchSharedFolderData]);

  const addUser = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!spaceUuid || !email.trim() || !userAttributes?.userUuid) {
      return { success: false, error: 'Email is required' };
    }

    try {
      // Check current SpaceUsers count
      const currentSpaceUsersResponse = await apiClient.models.SpaceUsers.listSpaceUsersBySpaceUuidAndLevelAndCreatedAt(
        { spaceUuid },
      );
      const currentSpaceUsers = currentSpaceUsersResponse.data || [];
      const isFirstUser = currentSpaceUsers.length === 0;

      // Query UserProfile by email using filter (secondary index should make this efficient)
      const userProfileResponse = await apiClient.models.UserProfile.listUserProfileByUserEmail({
        userEmail: email.trim().toLowerCase(),
      });

      if (!userProfileResponse.data || userProfileResponse.data.length === 0) {
        return { success: false, error: 'User with this email does not exist' };
      }

      const targetUserProfile = userProfileResponse.data[0];
      const targetUserUuid = targetUserProfile.userUuid;

      // Check if user is already added to this space
      const existingSpaceUsersResponse = await apiClient.models.SpaceUsers.listSpaceUsersBySpaceUuidAndLevelAndCreatedAt(
        { spaceUuid },
        { filter: { userUuid: { eq: targetUserUuid } } }
      );

      if (existingSpaceUsersResponse.data && existingSpaceUsersResponse.data.length > 0) {
        return { success: false, error: 'User is already added to this folder' };
      }

      // If this is the first user being added, also add current user as Owner
      if (isFirstUser) {
        // Check if current user is already in SpaceUsers (shouldn't be, but check anyway)
        const currentUserSpaceUsersResponse = await apiClient.models.SpaceUsers.listSpaceUsersBySpaceUuidAndLevelAndCreatedAt(
          { spaceUuid },
          { filter: { userUuid: { eq: userAttributes.userUuid } } }
        );

        if (!currentUserSpaceUsersResponse.data || currentUserSpaceUsersResponse.data.length === 0) {
          // Add current user as Owner (level 0)
          await apiClient.models.SpaceUsers.create({
            spaceUsersUuid: uuidv4(),
            spaceUuid,
            userUuid: userAttributes.userUuid,
            level: 0, // Owner
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Add user to SpaceUsers with default level 2 (Viewer)
      await apiClient.models.SpaceUsers.create({
        spaceUsersUuid: uuidv4(),
        spaceUuid,
        userUuid: targetUserUuid,
        level: 2, // Default to Viewer
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Track analytics: user invited another user
      track('folder-user-invited', {
        spaceUuid,
        invitedUserUuid: targetUserUuid,
        invitedUserEmail: email.trim().toLowerCase(),
        role: 'Viewer',
      });

      // Refetch members list
      await fetchSharedFolderData();

      return { success: true };
    } catch (error) {
      console.error('Failed to add user:', error);
      return { success: false, error: 'Failed to add user. Please try again.' };
    }
  }, [spaceUuid, userAttributes?.userUuid, apiClient, fetchSharedFolderData, track]);

  const removeUser = useCallback(async (userUuid: string): Promise<{ success: boolean; error?: string }> => {
    if (!spaceUuid || !userUuid) {
      return { success: false, error: 'Invalid parameters' };
    }

    try {
      // Get all SpaceUsers for this space to check owner count
      const allSpaceUsersResponse = await apiClient.models.SpaceUsers.listSpaceUsersBySpaceUuidAndLevelAndCreatedAt(
        { spaceUuid },
      );

      const allSpaceUsers = allSpaceUsersResponse.data || [];

      // Find the SpaceUsers entry to delete
      const spaceUsersResponse = await apiClient.models.SpaceUsers.listSpaceUsersBySpaceUuidAndLevelAndCreatedAt(
        { spaceUuid },
        { filter: { userUuid: { eq: userUuid } } }
      );

      if (!spaceUsersResponse.data || spaceUsersResponse.data.length === 0) {
        return { success: false, error: 'User not found in this folder' };
      }

      const spaceUser = spaceUsersResponse.data[0];

      // Check if user is an owner (level 0)
      if (spaceUser.level === 0) {
        // Count how many owners exist
        const ownerCount = allSpaceUsers.filter(su => su.level === 0).length;
        
        // Prevent removing the last owner
        if (ownerCount === 1) {
          return { success: false, error: 'Cannot remove the last owner. Please transfer ownership first.' };
        }
      }

      // Move all documents and chats owned by this user out of the folder
      try {
        await moveAllUserResources(userUuid, spaceUuid);
      } catch (error) {
        console.error('Failed to move user resources:', error);
        // Continue with removal even if move fails - the user should still be removed
      }

      // Delete the SpaceUsers entry
      await apiClient.models.SpaceUsers.delete({
        spaceUsersUuid: spaceUser.spaceUsersUuid,
      });

      // Refetch members list
      await fetchSharedFolderData();

      return { success: true };
    } catch (error) {
      console.error('Failed to remove user:', error);
      return { success: false, error: 'Failed to remove user. Please try again.' };
    }
  }, [spaceUuid, apiClient, fetchSharedFolderData]);

  const changePermission = useCallback(async (userUuid: string, newRole: 'Owner' | 'Editor' | 'Viewer'): Promise<{ success: boolean; error?: string }> => {
    if (!spaceUuid || !userUuid) {
      return { success: false, error: 'Invalid parameters' };
    }

    try {
      // Prevent users from changing their own role
      if (userUuid === userAttributes?.userUuid) {
        return { success: false, error: 'You cannot change your own access rights.' };
      }

      // Fetch the Space to get the main owner's userUuid
      const spaceResponse = await apiClient.models.Space.get({
        spaceUuid,
      }, {
        selectionSet: ['spaceUuid', 'userUuid'],
      });

      if (!spaceResponse.data) {
        return { success: false, error: 'Space not found' };
      }

      const mainOwnerUuid = spaceResponse.data.userUuid;

      // Prevent changing the main owner's role (the userUuid on the Space itself)
      if (userUuid === mainOwnerUuid) {
        return { success: false, error: 'Cannot change the main owner\'s role. The folder creator must always remain an owner.' };
      }

      // Get all SpaceUsers for this space to check owner count
      const allSpaceUsersResponse = await apiClient.models.SpaceUsers.listSpaceUsersBySpaceUuidAndLevelAndCreatedAt(
        { spaceUuid },
        { limit: 1000 },
      );

      const allSpaceUsers = allSpaceUsersResponse.data || [];


      const editSpaceUser = allSpaceUsers.find(su => su.userUuid === userUuid);
      if (!editSpaceUser) {
        return { success: false, error: 'User not found in this folder' };
      }

      const newLevel = mapRoleToLevel(newRole);

      // If changing from Owner to non-Owner, check if this is the last owner
      if (editSpaceUser.level === 0 && newLevel !== 0) {
        const ownerCount = allSpaceUsers.filter(su => su.level === 0).length;
        
        // Prevent removing the last owner
        if (ownerCount === 1) {
          return { success: false, error: 'Cannot change the last owner\'s role. Please transfer ownership first.' };
        }
      }

      // Update the SpaceUsers entry
      await apiClient.models.SpaceUsers.update({
        spaceUsersUuid: editSpaceUser.spaceUsersUuid,
        createdAt: editSpaceUser.createdAt, // need to send the createdAt as it's part of the secondary index key
        level: newLevel,
        updatedAt: new Date().toISOString(),
      });

      // Track analytics: user changed permission of another user
      track('folder-permission-changed', {
        spaceUuid,
        targetUserUuid: userUuid,
        oldRole: mapLevelToRole(editSpaceUser.level),
        newRole,
      });

      // Refetch members list
      await fetchSharedFolderData();

      return { success: true };
    } catch (error) {
      console.error('Failed to change permission:', error);
      return { success: false, error: 'Failed to change permission. Please try again.' };
    }
  }, [spaceUuid, apiClient, fetchSharedFolderData, userAttributes?.userUuid, track]);

  return {
    members,
    isLoading,
    invitesLeft,
    spaceOwnerUuid,
    refetch: fetchSharedFolderData,
    addUser,
    removeUser,
    changePermission,
  };
}
