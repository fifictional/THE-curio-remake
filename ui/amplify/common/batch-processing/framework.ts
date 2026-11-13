/**
 * Core batch processing framework
 * Handles queueing and SQS operations for individual jobs
 */

import { SQSClient, SendMessageBatchCommand, SendMessageBatchRequestEntry } from '@aws-sdk/client-sqs';
import { JobMessage } from './types';
import { v4 as uuidv4 } from 'uuid';

const sqsClient = new SQSClient({});

/**
 * Generates a 6-digit ID with prefix (C for Creator, M for Mutator)
 */
let creatorJobIdCounter = 0;
let mutatorJobIdCounter = 0;

export function generateCreatorJobId(): string {
  creatorJobIdCounter = (creatorJobIdCounter + 1) % 1000000;
  return `C${creatorJobIdCounter.toString().padStart(6, '0')}`;
}

export function generateMutatorJobId(): string {
  mutatorJobIdCounter = (mutatorJobIdCounter + 1) % 1000000;
  return `M${mutatorJobIdCounter.toString().padStart(6, '0')}`;
}

/**
 * Creates a log function that writes to CloudWatch
 * Uses process.stdout.write to bypass Lambda's log wrapper for cleaner output
 */
export function createLogFunction(jobId: string): (message: string) => void {
  return (message: string) => {
    process.stdout.write(`[${jobId}] ${message}\n`);
  };
}

/**
 * Queues individual jobs to SQS
 * Uses SendMessageBatch for efficiency (up to 10 messages per call)
 */
export async function queueJobs(
  queueUrl: string,
  jobType: string,
  jobs: any[],
  log: (message: string) => void,
  processId: string
): Promise<void> {
  if (jobs.length === 0) {
    log('No jobs to queue');
    return;
  }

  log(`Queueing ${jobs.length} jobs`);

  // SQS SendMessageBatch allows up to 10 messages per batch call
  const sqsBatchSize = 10;
  const sqsBatchEntries: SendMessageBatchRequestEntry[] = [];

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const jobId = uuidv4();
    
    const message: JobMessage = {
      jobType,
      jobId,
      processId,
      job,
    };

    // Create SQS batch entry
    sqsBatchEntries.push({
      Id: `job-${i}`,
      MessageBody: JSON.stringify(message),
    });

    // If we've accumulated 10 entries or this is the last job, send them
    if (sqsBatchEntries.length === sqsBatchSize || i === jobs.length - 1) {
      try {
        await sqsClient.send(new SendMessageBatchCommand({
          QueueUrl: queueUrl,
          Entries: sqsBatchEntries,
        }));
        log(`Sent ${sqsBatchEntries.length} job messages to queue`);
      } catch (error) {
        log(`Error sending job messages: ${error}`);
        throw error;
      }

      // Clear accumulated entries
      sqsBatchEntries.length = 0;
    }
  }

  log(`Successfully queued ${jobs.length} jobs`);
}

/**
 * Processes a single job
 * Returns true if successful, false if failed
 */
export async function processJob(
  jobMessage: JobMessage,
  processJobFn: (job: any, log: (message: string) => void, jobId: string) => Promise<void>,
  log: (message: string) => void
): Promise<boolean> {
  const jobId = generateMutatorJobId();
  
  log(`[Job ${jobMessage.jobId}] Starting with ID ${jobId}`);
  
  try {
    await processJobFn(jobMessage.job, createLogFunction(jobId), jobId);
    log(`[Job ${jobMessage.jobId}] (${jobId}) succeeded`);
    return true;
  } catch (error) {
    log(`[Job ${jobMessage.jobId}] (${jobId}) failed: ${error}`);
    return false;
  }
}

