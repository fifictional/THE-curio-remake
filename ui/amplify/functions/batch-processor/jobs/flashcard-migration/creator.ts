import type { Schema } from "../../../../data/resource";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env as creatorEnv } from '$amplify/env/hono-heavy';
import { Amplify } from 'aws-amplify';
import { generateClient } from "aws-amplify/api";
import { registerCreator } from "../../../../common/batch-processing";
import { JOB_NAME, MigrationJob } from "./interface";

// Initialize Amplify Data client for creator
const { resourceConfig: creatorResourceConfig, libraryOptions: creatorLibraryOptions } = await getAmplifyDataClientConfig(
  creatorEnv as any
);

Amplify.configure(creatorResourceConfig, creatorLibraryOptions);
const creatorClient = generateClient<Schema>();

// Register creator
registerCreator({
  name: "Flashcard Migration",
  jobType: JOB_NAME,
  description: "Migrate flashcards from old Flashcard model to FlashcardDeck model for documents and chats",
  createJobs: async (emit, log) => {
    let documentsQueued = 0;
    let chatsQueued = 0;

    // Query all documents with pagination
    log('Querying Document table...');
    let documentNextToken: string | undefined;
    let hasMoreDocuments = true;

    while (hasMoreDocuments) {
      const documentsResponse = await creatorClient.models.Document.list({
        limit: 1000,
        nextToken: documentNextToken,
      });

      const documents = documentsResponse.data;
      documentNextToken = documentsResponse.nextToken ?? undefined;
      hasMoreDocuments = !!documentNextToken;

      if (documents.length === 0) {
        continue;
      }

      for (const document of documents) {
        await emit({
          type: 'document',
          uuid: document.documentUuid,
        } as MigrationJob);
        documentsQueued++;
      }

      if (documentsQueued % 1000 === 0) {
        log(`Queued ${documentsQueued} documents so far...`);
      }
    }

    log(`Completed Document queueing: ${documentsQueued} queued`);

    // Query all chats with pagination
    log('Querying Chat table...');
    let chatNextToken: string | undefined;
    let hasMoreChats = true;

    while (hasMoreChats) {
      const chatsResponse = await creatorClient.models.Chat.list({
        limit: 1000,
        nextToken: chatNextToken,
      });

      const chats = chatsResponse.data;
      chatNextToken = chatsResponse.nextToken ?? undefined;
      hasMoreChats = !!chatNextToken;

      if (chats.length === 0) {
        continue;
      }

      for (const chat of chats) {
        await emit({
          type: 'chat',
          uuid: chat.chatUuid,
        } as MigrationJob);
        chatsQueued++;
      }

      if (chatsQueued % 1000 === 0) {
        log(`Queued ${chatsQueued} chats so far...`);
      }
    }

    log(`Completed Chat queueing: ${chatsQueued} queued`);
    log(`Finished queuing ${documentsQueued + chatsQueued} total items for migration`);
  },
});

