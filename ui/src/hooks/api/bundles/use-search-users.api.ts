import { useAmplifyUserApiClient } from "@/providers";
import { useCallback, useMemo, useState } from "react";

export type UserSummary = {
  userId: string;
  email: string;
  givenName?: string | null;
  familyName?: string | null;
  enabled: boolean;
  status?: string | null;
};

export const useAdminSearchUsersApi = () => {
  const client = useAmplifyUserApiClient();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<UserSummary[]>([]);

  const searchByEmail = useCallback(async (email: string) => {
    const trimmed = (email || '').trim();
    if (!trimmed) {
      setUsers([]);
      return [] as UserSummary[];
    }
    setIsLoading(true);
    try {
      const response = await client.queries.adminSearchUsers({
        email: trimmed,
      });
      if (response.errors) {
        throw new Error(response.errors[0].message);
      }
      const data = (response.data as any)?.users || [];
      setUsers(data as UserSummary[]);
      return data as UserSummary[];
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  return {
    isLoading,
    users,
    searchByEmail,
  };
};


