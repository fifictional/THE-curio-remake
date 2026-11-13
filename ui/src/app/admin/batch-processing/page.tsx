'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { ArrowLeft, Play, Loader2 } from "lucide-react";
import Link from "next/link";
import { useBatchProcessingApi } from "@/hooks/api/batch-processing/use-batch-processing.api";
import { useBatchProcessesApi } from "@/hooks/api/batch-processing/use-batch-processes.api";
import { useState, useMemo } from "react";

// Simple inline alert component since it doesn't exist in UI library
const Alert = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={`rounded-lg border p-4 ${className ?? ''}`}>{children}</div>
);
const AlertDescription = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

export default function BatchProcessingPage() {
  const { jobs, isLoadingJobs, jobsError, triggerJob } = useBatchProcessingApi();
  const { activeJobs, completeJobs, isLoading: isLoadingProcesses } = useBatchProcessesApi();
  const [triggeredJob, setTriggeredJob] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ jobType: string; success: boolean; message: string } | null>(null);

  // Check for duplicate active jobs
  const activeJobTypes = useMemo(() => {
    return new Set(activeJobs.map(job => job.jobType));
  }, [activeJobs]);

  const handleTriggerJob = async (jobType: string, jobName: string) => {
    // Check if job is already active
    if (activeJobTypes.has(jobType)) {
      setLastResult({
        jobType,
        success: false,
        message: 'This job type is already running. Please wait for it to complete.',
      });
      return;
    }

    setTriggeredJob(jobType);
    setLastResult(null);
    
    try {
      const result = await triggerJob.mutateAsync({ jobType, jobName });
      setLastResult({
        jobType,
        success: result.success,
        message: result.success 
          ? `Successfully queued ${result.jobsQueued ?? 0} jobs`
          : result.error ?? 'Unknown error',
      });
    } catch (error) {
      setLastResult({
        jobType,
        success: false,
        message: error instanceof Error ? error.message : 'Failed to trigger job',
      });
    } finally {
      setTriggeredJob(null);
    }
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Button>
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">Batch Processing</h1>
          <p className="text-muted-foreground mt-2">
            Manage and trigger batch processing jobs
          </p>
        </div>

        {lastResult && (
          <Alert className={`mb-6 ${lastResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <AlertDescription>
              <strong>{lastResult.jobType}:</strong> {lastResult.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Active Jobs Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Active Jobs</CardTitle>
            <CardDescription>Currently running batch processes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingProcesses ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading...</span>
              </div>
            ) : activeJobs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No active jobs</p>
            ) : (
              <div className="space-y-4">
                {activeJobs.map((job) => {
                  const borderColor = job.state === 'creating' ? 'border-blue-500' : 'border-yellow-500';
                  const indicatorColor = job.state === 'creating' ? 'bg-blue-500' : 'bg-yellow-500';
                  
                  return (
                    <div key={job.processId} className={`border-2 rounded-lg p-4 ${borderColor}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-3 h-3 rounded-full ${indicatorColor}`} />
                            <h3 className="font-semibold">{job.jobName || job.jobType}</h3>
                            <Tooltip content={job.processId}>
                              <span className="text-xs text-muted-foreground cursor-help">
                                ID
                              </span>
                            </Tooltip>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Started: {new Date(job.startTime).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {job.completedJobs}/{job.totalJobs} ({job.progressPercentage}%)
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {job.estimatedCompletion}
                          </p>
                        </div>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${job.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Complete Jobs Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Complete Jobs</CardTitle>
            <CardDescription>Recently completed batch processes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] overflow-y-auto">
              {isLoadingProcesses ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading...</span>
                </div>
              ) : completeJobs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No completed jobs yet</p>
              ) : (
                <div className="space-y-3">
                  {completeJobs.map((job) => {
                    const borderColor = job.failed ? 'border-red-500' : 'border-green-500';
                    const indicatorColor = job.failed ? 'bg-red-500' : 'bg-green-500';
                    
                    return (
                      <div key={job.processId} className={`border-2 rounded-lg p-3 ${borderColor}`}>
                        <div className="grid grid-cols-2 gap-4">
                          {/* Left column: Title, Start, End */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-3 h-3 rounded-full ${indicatorColor}`} />
                              <Tooltip content={job.processId}>
                                <h4 className="font-semibold cursor-help">{job.jobName || job.jobType}</h4>
                              </Tooltip>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>Start: {new Date(job.startTime).toLocaleString()}</p>
                              {job.completionTime && (
                                <p>End: {new Date(job.completionTime).toLocaleString()}</p>
                              )}
                            </div>
                          </div>
                          {/* Right column: Total, Duration, Average */}
                          <div className="flex-1">
                            <div className="text-sm text-muted-foreground space-y-1 pt-5">
                              <p>
                                Total jobs:{' '}
                                {job.totalJobs === 0
                                  ? '0 (nothing to process)'
                                  : job.totalJobs}
                              </p>
                              {job.totalJobs > 0 && (
                                <p>
                                  Completed: {job.completedJobs}
                                  {job.failedJobs > 0 ? ` (${job.failedJobs} failed)` : ''}
                                </p>
                              )}
                              <p>Duration: {job.duration}</p>
                              <p>Average: {job.averageTimePerJob}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Job Trigger Cards */}
        {isLoadingJobs ? (
          <Card>
            <CardContent className="py-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading jobs...</span>
              </div>
            </CardContent>
          </Card>
        ) : jobsError ? (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertDescription>
              Failed to load jobs: {jobsError instanceof Error ? jobsError.message : 'Unknown error'}
            </AlertDescription>
          </Alert>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">No batch jobs available</p>
            </CardContent>
          </Card>
        ) : (
          <div>
            <h2 className="text-2xl font-bold mb-4">Available Jobs</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <Card key={job.jobType}>
                  <CardHeader>
                    <CardTitle>{job.name}</CardTitle>
                    <CardDescription>{job.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        <strong>Job Type:</strong> {job.jobType}
                      </div>
                      <Button
                        onClick={() => handleTriggerJob(job.jobType, job.name)}
                        disabled={triggeredJob === job.jobType || triggerJob.isPending || activeJobTypes.has(job.jobType)}
                        className="w-full mt-4"
                      >
                        {triggeredJob === job.jobType ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Triggering...
                          </>
                        ) : activeJobTypes.has(job.jobType) ? (
                          'Already Running'
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Trigger Job
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
