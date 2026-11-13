import { useAmplifyApiClient } from "@/providers/amplify-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface BatchJobInfo {
  name: string;
  jobType: string;
  description: string;
}

export interface BatchCreatorResponse {
  success: boolean;
  jobType?: string | null;
  jobsQueued?: number | null;
  jobs?: BatchJobInfo[] | null;
  error?: string | null;
}

export function useBatchProcessingApi() {
  const client = useAmplifyApiClient();
  const queryClient = useQueryClient();

  // List available batch jobs
  const { data: jobs, isLoading: isLoadingJobs, error: jobsError } = useQuery({
    queryKey: ['batch-jobs'],
    queryFn: async () => {
      const response = await client.mutations.batchCreator({
        jobType: '__LIST_JOBS__',
      });
      
      if (response.errors) {
        throw new Error(response.errors[0].message);
      }
      
      if (!response.data?.success || !response.data.jobs) {
        return [];
      }
      
      return (response.data.jobs as unknown as BatchJobInfo[]) ?? [];
    },
  });

  // Trigger a batch job
  const triggerJob = useMutation({
    mutationFn: async ({ jobType, jobName }: { jobType: string; jobName: string }): Promise<BatchCreatorResponse> => {
      const response = await client.mutations.batchCreator({
        jobType,
        jobName,
      });
      
      if (response.errors) {
        throw new Error(response.errors[0].message);
      }
      
      return response.data as BatchCreatorResponse;
    },
    onSuccess: () => {
      // Invalidate batch process queries to show new active job
      queryClient.invalidateQueries({ queryKey: ['batch-processes-active'] });
      queryClient.invalidateQueries({ queryKey: ['batch-jobs'] });
    },
  });

  return {
    jobs: jobs ?? [],
    isLoadingJobs,
    jobsError,
    triggerJob,
  };
}

