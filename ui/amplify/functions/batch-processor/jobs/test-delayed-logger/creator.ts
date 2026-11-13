import { registerCreator } from "../../../../common/batch-processing";
import { JOB_NAME, TestDelayedLoggerJob } from "./interface";

// Register creator
registerCreator({
  name: "Test: Delayed Number Logger",
  jobType: JOB_NAME,
  description: "Test job that logs random numbers with a 20-second delay (tests heartbeat functionality)",
  createJobs: async (emit, log) => {
    log('Generating 100 random numbers...');
    
    for (let i = 0; i < 100; i++) {
      const randomNumber = Math.floor(Math.random() * 1000000);
      await emit({
        number: randomNumber,
        index: i + 1,
      } as TestDelayedLoggerJob);
    }
    
    log('Finished queuing 100 random numbers');
  },
});

