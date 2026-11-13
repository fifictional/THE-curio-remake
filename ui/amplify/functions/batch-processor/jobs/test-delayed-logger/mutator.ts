import { registerMutator } from "../../../../common/batch-processing";
import { JOB_NAME, TestDelayedLoggerJob } from "./interface";

// Register mutator
registerMutator({
  jobType: JOB_NAME,
  processJob: async (job: TestDelayedLoggerJob, log, jobId: string) => {
    const { number, index } = job;
    
    log(`Starting processing for number: ${number}`);
    
    // Wait approximately 20 seconds
    // Using a random delay between 18-22 seconds to simulate real-world variability
    const delayMs = 18000 + Math.floor(Math.random() * 4000); // 18-22 seconds
    log(`Waiting ${Math.round(delayMs / 1000)} seconds before logging again...`);
    
    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    log(`Finished processing number: ${number} (after ~${Math.round(delayMs / 1000)}s delay)`);
  },
});

