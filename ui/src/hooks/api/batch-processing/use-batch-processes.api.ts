import { useAmplifyApiClient } from "@/providers/amplify-provider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSubscription } from "@/hooks/api/use-subscription";
import type { Schema } from "@/../amplify/data/resource";

type BatchProcess = Pick<Schema['BatchProcess']['type'], 
  'processId' | 'jobName' | 'jobType' | 'state' | 'failed' | 'startTime' | 
  'completionTime' | 'totalJobs' | 'completedJobs' | 'failedJobs'
>;

const selectionSet = [
  'processId',
  'jobType',
  'jobName',
  'state',
  'failed',
  'startTime',
  'completionTime',
  'totalJobs',
  'completedJobs',
  'failedJobs',
] as const;

type RequestType = Pick<Schema['BatchProcess']['type'], typeof selectionSet[number]>;

export interface ActiveJob extends BatchProcess {
  estimatedCompletion?: string; // "at HH:MM AM/PM" or "Calculating..."
  progressPercentage: number;
}

export interface CompleteJob extends BatchProcess {
  duration: string; // "Xh Ym" or "Xm Ys" format
  averageTimePerJob: string; // "~X seconds/job" or "~X minutes/job"
}

/**
 * Format duration in a human-readable way
 */
function formatDuration(startTime: string, endTime: string | null | undefined): string {
  if (!endTime) return 'N/A';
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const diffMs = end - start;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  
  if (diffHours > 0) {
    const minutes = diffMinutes % 60;
    return minutes > 0 ? `${diffHours}h ${minutes}m` : `${diffHours}h`;
  } else if (diffMinutes > 0) {
    const seconds = diffSeconds % 60;
    return seconds > 0 ? `${diffMinutes}m ${seconds}s` : `${diffMinutes}m`;
  } else {
    return `${diffSeconds}s`;
  }
}

/**
 * Format average time per job
 * Accounts for parallel execution by estimating actual job time
 * Assumes maxConcurrency of 5 (from batch-stack.ts)
 * 
 * Formula: actualJobTime = totalTime / numberOfRounds
 * Where numberOfRounds = ceil(totalJobs / concurrency)
 */
function formatAverageTimePerJob(durationMs: number, totalJobs: number): string {
  const MAX_CONCURRENCY = 5; // From batch-stack.ts maxConcurrency setting
  
  // Calculate number of "rounds" needed (assuming jobs run in parallel batches)
  const numberOfRounds = Math.ceil(totalJobs / MAX_CONCURRENCY);
  
  // Estimate actual job time: total time divided by number of rounds
  // This gives us the time per "round", which approximates the time per job
  // when jobs run in parallel
  const estimatedJobTimeMs = durationMs / numberOfRounds;
  const estimatedJobSeconds = Math.round(estimatedJobTimeMs / 1000);
  const estimatedJobMinutes = Math.round(estimatedJobTimeMs / 60000);
  
  // Show estimated actual job time (accounting for parallelism)
  if (estimatedJobMinutes >= 1) {
    return `~${estimatedJobMinutes} minute${estimatedJobMinutes !== 1 ? 's' : ''}/job`;
  } else {
    return `~${estimatedJobSeconds} second${estimatedJobSeconds !== 1 ? 's' : ''}/job`;
  }
}

/** Creator Lambdas time out at 15 minutes — treat older `creating` rows as dead. */
const CREATOR_STALE_MS = 16 * 60 * 1000;

function isStaleCreatorJob(job: RequestType, nowMs: number): boolean {
  if (job.state !== 'creating') return false;
  return nowMs - new Date(job.startTime).getTime() > CREATOR_STALE_MS;
}

/**
 * Calculate estimated completion time
 */
function calculateEstimatedCompletion(
  startTime: string,
  completedJobs: number,
  totalJobs: number
): string | undefined {
  if (completedJobs < 3 || completedJobs === 0) {
    return undefined; // Show "Calculating..."
  }
  
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const elapsed = now - start;
  const avgTimePerJob = elapsed / completedJobs;
  const remainingJobs = totalJobs - completedJobs;
  const estimatedRemaining = avgTimePerJob * remainingJobs;
  const estimatedEnd = now + estimatedRemaining;
  
  const endDate = new Date(estimatedEnd);
  const hours = endDate.getHours();
  const minutes = endDate.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  
  return `at ${displayHours}:${displayMinutes} ${ampm}`;
}

export function useBatchProcessesApi() {
  const client = useAmplifyApiClient();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(Date.now());

  // Update current time every 5 seconds for real-time estimated completion
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Query all batch processes (we'll filter client-side)
  const { data: allProcessesData, isLoading: isLoadingProcesses } = useQuery({
    queryKey: ['batch-processes-all'],
    queryFn: async (): Promise<RequestType[]> => {
      const response = await client.models.BatchProcess.list({
        selectionSet,
        limit: 1000, // Should be enough for recent processes
      });
      
      if (response.errors) {
        throw new Error(response.errors[0].message);
      }
      
      return (response.data || []) as RequestType[];
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Filter active jobs (creating or mutating), excluding zombie creators past Lambda timeout
  const activeJobsData = useMemo(() => {
    if (!allProcessesData) return undefined;
    const active = allProcessesData.filter(
      (p) =>
        (p.state === 'creating' || p.state === 'mutating') &&
        !isStaleCreatorJob(p, now)
    );
    // Sort by startTime DESC
    return active.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }, [allProcessesData, now]);

  // Filter complete jobs
  const completeJobsData = useMemo(() => {
    if (!allProcessesData) return undefined;
    const complete = allProcessesData.filter((p) => p.state === 'complete');
    // Sort by completionTime DESC (most recent first)
    return complete.sort((a, b) => {
      const aTime = a.completionTime ? new Date(a.completionTime).getTime() : 0;
      const bTime = b.completionTime ? new Date(b.completionTime).getTime() : 0;
      return bTime - aTime;
    });
  }, [allProcessesData]);

  // Set up subscriptions
  const createSubscription = useCallback(() => {
    return client.models.BatchProcess.onCreate({
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        queryClient.invalidateQueries({ queryKey: ['batch-processes-all'] });
      },
    });
  }, [client, queryClient]);

  const updateSubscription = useCallback(() => {
    return client.models.BatchProcess.onUpdate({
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        queryClient.invalidateQueries({ queryKey: ['batch-processes-all'] });
      },
    });
  }, [client, queryClient]);

  useSubscription({
    subscriptions: 'create-update',
    input: {},
    createFunc: createSubscription,
    updateFunc: updateSubscription,
    onValidate: () => true,
  });

  // Process active jobs with estimated completion
  const activeJobs = useMemo((): ActiveJob[] => {
    if (!activeJobsData) return [];
    
    return activeJobsData.map((job) => {
      const progressPercentage = job.totalJobs > 0 
        ? Math.round((job.completedJobs / job.totalJobs) * 100)
        : 0;
      
      const estimatedCompletion = calculateEstimatedCompletion(
        job.startTime,
        job.completedJobs,
        job.totalJobs
      );

      return {
        ...job,
        estimatedCompletion: estimatedCompletion || 'Calculating...',
        progressPercentage,
      };
    });
  }, [activeJobsData, now]);

  // Process complete jobs with formatted times
  const completeJobs = useMemo((): CompleteJob[] => {
    if (!completeJobsData) return [];
    
    return completeJobsData.map((job) => {
      const duration = formatDuration(job.startTime, job.completionTime);
      
      let averageTimePerJob = 'N/A';
      if (job.completionTime && job.totalJobs > 0) {
        const start = new Date(job.startTime).getTime();
        const end = new Date(job.completionTime).getTime();
        const durationMs = end - start;
        averageTimePerJob = formatAverageTimePerJob(durationMs, job.totalJobs);
      }
      
      return {
        ...job,
        duration,
        averageTimePerJob,
      };
    });
  }, [completeJobsData]);

  return {
    activeJobs,
    completeJobs,
    isLoading: isLoadingProcesses,
  };
}

