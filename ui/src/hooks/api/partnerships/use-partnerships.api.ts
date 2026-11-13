import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAmplifyUserApiClient, useAmplifyApiClient } from '@/providers/amplify-provider';
import { v4 as uuidv4 } from 'uuid';

export interface Partnership {
  partnershipUuid: string;
  partnerName: string;
  partnerCode: string;
  logoS3Key?: string | null;
  priceRecordOverrides?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartnershipFormData {
  partnerName: string;
  partnerCode: string;
  logoS3Key?: string;
  priceRecordOverrides?: string;
}

export function usePartnershipsApi() {
  const client = useAmplifyUserApiClient();
  const queryClient = useQueryClient();

  const { data: partnerships, isLoading, error } = useQuery({
    queryKey: ['partnerships'],
    queryFn: async () => {
      const response = await client.models.Partnership.list();
      if (response.errors) {
        throw new Error(response.errors[0].message);
      }
      console.log('response.data', response.data);
      return response.data as Partnership[];
    },
  });

  const createPartnership = useMutation({
    mutationFn: async (formData: PartnershipFormData) => {
      const response = await client.models.Partnership.create({
        partnershipUuid: uuidv4(),
        partnerName: formData.partnerName,
        partnerCode: formData.partnerCode,
        logoS3Key: formData.logoS3Key || null,
        priceRecordOverrides: formData.priceRecordOverrides || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      if (response.errors) {
        throw new Error(response.errors[0].message);
      }
      return response.data as Partnership;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
    },
  });

  const updatePartnership = useMutation({
    mutationFn: async ({ partnershipUuid, formData }: { partnershipUuid: string; formData: PartnershipFormData }) => {
      const response = await client.models.Partnership.update({
        partnershipUuid,
        partnerName: formData.partnerName,
        partnerCode: formData.partnerCode,
        logoS3Key: formData.logoS3Key || null,
        priceRecordOverrides: formData.priceRecordOverrides || null,
      });
      if (response.errors) {
        throw new Error(response.errors[0].message);
      }
      return response.data as Partnership;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
    },
  });

  const deletePartnership = useMutation({
    mutationFn: async (partnershipUuid: string) => {
      const response = await client.models.Partnership.delete({
        partnershipUuid,
      });
      if (response.errors) {
        throw new Error(response.errors[0].message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
    },
  });

  return {
    partnerships: partnerships || [],
    isLoading,
    error,
    createPartnership: createPartnership.mutateAsync,
    updatePartnership: updatePartnership.mutateAsync,
    deletePartnership: deletePartnership.mutateAsync,
  };
}

/**
 * Hook to fetch a single partnership by partnerCode
 * Uses public API client since partnerships are publicly readable
 */
export function usePartnershipByCode(partnerCode: string | null) {
  const client = useAmplifyApiClient();

  return useQuery({
    queryKey: ['partnership', partnerCode],
    queryFn: async () => {
      if (!partnerCode) {
        return null;
      }

      const response = await client.models.Partnership.listPartnershipByPartnerCode({
        partnerCode,
      });
      
      if (response.errors) {
        throw new Error(response.errors[0].message);
      }

      return (response.data?.[0] as Partnership) || null;
    },
    enabled: !!partnerCode,
  });
}

