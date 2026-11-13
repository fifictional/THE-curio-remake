/**
 * Test job: Delayed number logger
 * 
 * Creator: Queues 1000 random numbers (one per job)
 * Mutator: Logs the number, waits ~20 seconds, logs it again
 * 
 * This tests the heartbeat functionality since jobs take longer than default visibility timeout
 */

export const JOB_NAME = "test-delayed-logger";

export type TestDelayedLoggerJob = {
  number: number;
  index: number;
};

