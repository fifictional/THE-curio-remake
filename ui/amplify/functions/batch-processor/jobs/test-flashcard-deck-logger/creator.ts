import type { Schema } from "../../../../data/resource";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env as creatorEnv } from '$amplify/env/hono-heavy';
import { Amplify } from 'aws-amplify';
import { generateClient } from "aws-amplify/api";
import { registerCreator } from "../../../../common/batch-processing";
import { JOB_NAME, TestFlashcardDeckLoggerJob } from "./interface";

// Initialize Amplify Data client for creator
const { resourceConfig: creatorResourceConfig, libraryOptions: creatorLibraryOptions } = await getAmplifyDataClientConfig(
  creatorEnv as any
);

Amplify.configure(creatorResourceConfig, creatorLibraryOptions);
const creatorClient = generateClient<Schema>();

// Register creator
registerCreator({
  name: "Test: Flashcard Deck Logger",
  jobType: JOB_NAME,
  description: "Test job that logs the number of cards in each flashcard deck",
  createJobs: async (emit, log) => {
    log('Starting to query FlashcardDeck records...');
    
    let nextToken: string | undefined = undefined;
    let totalQueued = 0;
    let hasMore = true;
    
    while (hasMore) {
      const listParams: { limit: number; nextToken?: string } = {
        limit: 1000,
      };
      if (nextToken) {
        listParams.nextToken = nextToken;
      }
      
      const response = await creatorClient.models.FlashcardDeck.list(listParams);
      
      if (response.errors) {
        throw new Error(`Failed to list FlashcardDeck: ${response.errors[0].message}`);
      }
      
      const decks = response.data || [];
      
      for (const deck of decks) {
        await emit({
          flashcardDeckUuid: deck.flashcardDeckUuid,
        } as TestFlashcardDeckLoggerJob);
        totalQueued++;
      }
      
      nextToken = response.nextToken ?? undefined;
      hasMore = !!nextToken;
      
      if (totalQueued % 1000 === 0) {
        log(`Queued ${totalQueued} decks so far...`);
      }
    }
    
    log(`Finished queuing ${totalQueued} flashcard decks`);
  },
});

