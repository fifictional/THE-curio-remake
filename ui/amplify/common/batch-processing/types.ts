/**
 * Types for the batch processing framework
 */

/**
 * Creator definition - defines how to create jobs for a batch process
 */
export interface CreatorDefinition {
  name: string;              // Display name in Admin Panel menu
  jobType: string;          // Unique identifier for this job type
  description: string;      // Description shown in Admin Panel
  createJobs: (emit: (job: any) => Promise<void>, log: (message: string) => void) => Promise<void>;
}

/**
 * Mutator definition - defines how to process individual jobs
 */
export interface MutatorDefinition {
  jobType: string;          // Must match creator's jobType
  processJob: (job: any, log: (message: string) => void, jobId: string) => Promise<void>;
}

/**
 * SQS message body structure for a single job
 */
export interface JobMessage {
  jobType: string;
  jobId: string; // Unique ID for this job
  processId: string; // GUID for tracking the overall batch process
  job: any; // The actual job data
}

/**
 * Job registry - stores creator and mutator definitions
 */
export interface JobRegistry {
  creators: Map<string, CreatorDefinition>;
  mutators: Map<string, MutatorDefinition>;
}

