import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAmplifyUserApiClient } from '@/providers/amplify-provider';
import { v4 as uuidv4 } from 'uuid';

export interface FutureUser {
  futureUserUuid: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  partnershipUuid?: string | null;
  subStartDate?: string | null;
  subEndDate?: string | null;
  provider?: 'paddle' | 'stripe' | 'apple' | 'google' | 'manual' | 'partnership' | null;
  tier?: 'super' | 'ultra' | null;
  subscriptionGranted?: boolean | null;
  subscriptionGrantedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FutureUserFormData {
  email: string;
  firstName?: string;
  lastName?: string;
  partnershipUuid?: string;
  subStartDate?: string;
  subEndDate?: string;
  provider?: 'paddle' | 'stripe' | 'apple' | 'google' | 'manual' | 'partnership';
  tier?: 'super' | 'ultra';
}

export function useFutureUsersApi(partnershipUuid?: string | null) {
  const client = useAmplifyUserApiClient();
  const queryClient = useQueryClient();

  const { data: futureUsers, isLoading, error } = useQuery({
    queryKey: ['futureUsers', partnershipUuid],
    queryFn: async () => {
      let response;
      if (partnershipUuid) {
        // Use the secondary index to filter by partnership
        response = await client.models.FutureUser.listFutureUserByPartnershipUuidAndCreatedAt({
          partnershipUuid,
        }, {
          sortDirection: 'DESC',
        });
      } else {
        // List all future users
        response = await client.models.FutureUser.list();
      }
      
      if (response.errors) {
        throw new Error(response.errors[0].message);
      }
      return response.data as FutureUser[];
    },
  });

  const createFutureUser = useMutation({
    mutationFn: async (formData: FutureUserFormData) => {
      const response = await client.models.FutureUser.create({
        futureUserUuid: uuidv4(),
        email: formData.email,
        firstName: formData.firstName || null,
        lastName: formData.lastName || null,
        partnershipUuid: formData.partnershipUuid || null,
        subStartDate: formData.subStartDate || null,
        subEndDate: formData.subEndDate || null,
        provider: formData.provider || 'partnership',
        tier: formData.tier || null,
        subscriptionGranted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      if (response.errors) {
        throw new Error(response.errors[0].message);
      }
      return response.data as FutureUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['futureUsers'] });
    },
  });

  const updateFutureUser = useMutation({
    mutationFn: async ({ futureUserUuid, formData }: { futureUserUuid: string; formData: FutureUserFormData }) => {
      const response = await client.models.FutureUser.update({
        futureUserUuid,
        email: formData.email,
        firstName: formData.firstName || null,
        lastName: formData.lastName || null,
        partnershipUuid: formData.partnershipUuid || null,
        subStartDate: formData.subStartDate || null,
        subEndDate: formData.subEndDate || null,
        provider: formData.provider || 'partnership',
        tier: formData.tier || null,
        updatedAt: new Date().toISOString(),
      });
      if (response.errors) {
        throw new Error(response.errors[0].message);
      }
      return response.data as FutureUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['futureUsers'] });
    },
  });

  const deleteFutureUser = useMutation({
    mutationFn: async (futureUserUuid: string) => {
      const response = await client.models.FutureUser.delete({
        futureUserUuid,
      });
      if (response.errors) {
        throw new Error(response.errors[0].message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['futureUsers'] });
    },
  });

  return {
    futureUsers: futureUsers || [],
    isLoading,
    error,
    createFutureUser: createFutureUser.mutateAsync,
    updateFutureUser: updateFutureUser.mutateAsync,
    deleteFutureUser: deleteFutureUser.mutateAsync,
  };
}

