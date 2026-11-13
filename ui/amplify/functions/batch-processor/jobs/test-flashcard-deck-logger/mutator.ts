import type { Schema } from "../../../../data/resource";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env as mutatorEnv } from '$amplify/env/batch-mutator';
import { Amplify } from 'aws-amplify';
import { generateClient } from "aws-amplify/api";
import { registerMutator } from "../../../../common/batch-processing";
import { JOB_NAME, TestFlashcardDeckLoggerJob } from "./interface";

// Initialize Amplify Data client for mutator
const { resourceConfig: mutatorResourceConfig, libraryOptions: mutatorLibraryOptions } = await getAmplifyDataClientConfig(
  mutatorEnv as any
);

Amplify.configure(mutatorResourceConfig, mutatorLibraryOptions);
const mutatorClient = generateClient<Schema>();

// Register mutator
registerMutator({
  jobType: JOB_NAME,
  processJob: async (job: TestFlashcardDeckLoggerJob, log, jobId: string) => {
    const { flashcardDeckUuid } = job;
    
    log(`Processing flashcard deck: ${flashcardDeckUuid}`);
    
    const response = await mutatorClient.models.FlashcardDeck.get({
      flashcardDeckUuid,
    });
    
    if (response.errors) {
      throw new Error(`Failed to get FlashcardDeck: ${response.errors[0].message}`);
    }
    
    if (!response.data) {
      throw new Error(`FlashcardDeck not found: ${flashcardDeckUuid}`);
    }
    
    const cardCount = response.data.flashcards?.length ?? 0;
    log(`FlashcardDeck ${flashcardDeckUuid} has ${cardCount} cards`);
  },
});

