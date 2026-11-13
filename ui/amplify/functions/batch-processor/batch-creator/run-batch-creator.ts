import type { Schema } from '../../../data/resource';
import { queueJobs, createLogFunction, generateCreatorJobId } from '../../../common/batch-processing/framework';
import { getCreator, listCreators } from '../../../common/batch-processing/registry';
import { generateClient } from 'aws-amplify/api';
import { v4 as uuidv4 } from 'uuid';

type DataClient = ReturnType<typeof generateClient<Schema>>;

export interface BatchCreatorInput {
  jobType?: string;
  jobName?: string;
}

export interface BatchCreatorOutput {
  success: boolean;
  jobType?: string;
  jobsQueued?: number;
  jobs?: unknown;
  error?: string;
}

export interface BatchCreatorDeps {
  queueUrl: string;
}

const STREAM_FLUSH_SIZE = 10;

export async function runBatchCreator(
  client: DataClient,
  input: BatchCreatorInput,
  deps: BatchCreatorDeps,
): Promise<BatchCreatorOutput> {
  const { queueUrl } = deps;
  if (!queueUrl) {
    throw new Error('BATCH_QUEUE_URL environment variable is not set');
  }

  const jobType = input.jobType;
  const jobName = input.jobName;

  // Special case: list available jobs
  if (jobType === '__LIST_JOBS__') {
    const creators = listCreators();
    return {
      success: true,
      jobs: creators.map(c => ({
        name: c.name,
        jobType: c.jobType,
        description: c.description,
      })),
    } as any; // Type assertion needed for GraphQL return type
  }

  if (!jobType) {
    const error = 'jobType is required';
    return {
      success: false,
      error,
      jobs: null,
    };
  }

  // Execute creator for the given jobType
  const creator = getCreator(jobType);
  if (!creator) {
    const error = `No creator found for jobType: ${jobType}`;
    return {
      success: false,
      error,
      jobs: null,
    };
  }

  // Generate processId (GUID) at the very start
  const processId = uuidv4();
  const startTime = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 1 week from now

  // Create BatchProcess entry immediately
  try {
    await client.models.BatchProcess.create({
      processId,
      jobType,
      jobName: jobName || creator.name,
      state: 'creating',
      failed: false,
      startTime,
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      ttl,
    });
    process.stdout.write(`[Creator:${jobType}] Created BatchProcess entry with ID ${processId}\n`);
  } catch (dbError) {
    const dbErrorMessage = dbError instanceof Error ? dbError.message : String(dbError);
    process.stderr.write(`[Creator:${jobType}] Failed to create BatchProcess entry: ${dbErrorMessage}\n`);
    // Continue anyway - we'll try to update it later
  }

  try {
    const creatorJobId = generateCreatorJobId();
    const log = createLogFunction(creatorJobId);

    process.stdout.write(`[Creator:${jobType}] Starting with ID ${creatorJobId}, processId ${processId}\n`);

    const pendingJobs: unknown[] = [];
    let jobsQueued = 0;

    const flushPending = async () => {
      if (pendingJobs.length === 0) return;

      const batch = pendingJobs.splice(0, pendingJobs.length);
      await queueJobs(queueUrl, jobType, batch, log, processId);
      jobsQueued += batch.length;

      try {
        await client.models.BatchProcess.update({
          processId,
          totalJobs: jobsQueued,
          state: 'mutating',
        });
      } catch (updateError) {
        const message =
          updateError instanceof Error ? updateError.message : String(updateError);
        process.stderr.write(`[Creator:${jobType}] Failed to update totalJobs=${jobsQueued}: ${message}\n`);
        throw new Error(`Failed to set totalJobs=${jobsQueued} on BatchProcess ${processId}: ${message}`);
      }
    };

    const emit = async (job: unknown) => {
      pendingJobs.push(job);
      if (pendingJobs.length >= STREAM_FLUSH_SIZE) {
        await flushPending();
      }
    };

    // Execute the creator function — jobs stream to SQS in batches as they are emitted
    await creator.createJobs(emit, log);
    await flushPending();

    const jobsCount = jobsQueued;

    // Finalize state: if no jobs were created, mark as complete; otherwise already mutating
    try {
      if (jobsCount === 0) {
        await client.models.BatchProcess.update({
          processId,
          state: 'complete',
          completionTime: new Date().toISOString(),
        });
        process.stdout.write(`[Creator:${jobType}] No jobs created, marking process as complete\n`);
      } else {
        process.stdout.write(`[Creator:${jobType}] ${jobsCount} jobs queued, marking process as mutating\n`);
      }
    } catch (updateError) {
      process.stderr.write(`[Creator:${jobType}] Failed to update state: ${updateError}\n`);
    }

    process.stdout.write(`[Creator:${jobType}] Complete: ${jobsCount} jobs queued\n`);

    return {
      success: true,
      jobType: jobType,
      jobsQueued: jobsCount,
      jobs: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[Creator:${jobType}] Failed: ${errorMessage}\n`);

    // Update BatchProcess entry to mark as failed
    try {
      await client.models.BatchProcess.update({
        processId,
        state: 'complete',
        failed: true,
        completionTime: new Date().toISOString(),
      });
    } catch (updateError) {
      process.stderr.write(`[Creator:${jobType}] Failed to update BatchProcess on error: ${updateError}\n`);
    }

    return {
      success: false,
      error: errorMessage,
      jobs: null,
    };
  }
}
