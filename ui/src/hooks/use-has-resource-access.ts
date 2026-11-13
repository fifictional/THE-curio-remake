'use client';

import { useSessionContext } from '@/providers/session-provider';

/**
 * Checks if the current user has access to a resource (document or chat)
 * For resources not in a space, only the owner has access.
 * For resources in a space, access is controlled by space permissions (handled separately).
 */
export function useHasResourceAccess(resource: { userUuid?: string | null; spaceUuid?: string | null } | null) {
  const { userAttributes } = useSessionContext();
  const currentUserUuid = userAttributes?.userUuid;

  // If resource is null or still loading, we can't determine access yet
  if (!resource || !currentUserUuid) {
    return {
      hasAccess: false,
      isLoading: true,
    };
  }

  // If resource is in a space, access is controlled by space permissions
  // This hook only checks ownership for non-space resources
  if (resource.spaceUuid) {
    // Space resources are handled by space access check
    // This hook assumes space access has already been verified
    return {
      hasAccess: true,
      isLoading: false,
    };
  }

  // For resources not in a space, only the owner has access
  const hasAccess = resource.userUuid === currentUserUuid;

  return {
    hasAccess,
    isLoading: false,
  };
}
