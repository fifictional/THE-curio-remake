import type { Schema } from "@database-schema";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env as creatorEnv } from '$amplify/env/hono-heavy';
import { Amplify } from 'aws-amplify';
import { generateClient } from "aws-amplify/api";
import { registerCreator } from "@common/batch-processing";
import { JOB_NAME, CategoriseDocumentJob } from "./interface";

// Initialize Amplify Data client for creator
const { resourceConfig: creatorResourceConfig, libraryOptions: creatorLibraryOptions } = await getAmplifyDataClientConfig(
  creatorEnv as any
);

Amplify.configure(creatorResourceConfig, creatorLibraryOptions);
const creatorClient = generateClient<Schema>();

// Register creator
registerCreator({
  name: "Categorise Document",
  jobType: JOB_NAME,
  description: "Categorise documents into subjects using AI - processes documents without subjectId (paid users only)",
  createJobs: async (emit, log) => {
    // First, fetch all paid users (users with active or trialing subscriptions)
    log('Querying subscriptions to identify paid users...');
    const paidUserUuids = new Set<string>();
    let subscriptionNextToken: string | undefined;
    let hasMoreSubscriptions = true;
    let subscriptionsProcessed = 0;

    while (hasMoreSubscriptions) {
      const subscriptionsResponse = await creatorClient.models.CurioSubscription.list({
        limit: 1000,
        nextToken: subscriptionNextToken,
        selectionSet: ['userId', 'status'],
      });

      const subscriptions = subscriptionsResponse.data;
      subscriptionNextToken = subscriptionsResponse.nextToken ?? undefined;
      hasMoreSubscriptions = !!subscriptionNextToken;

      for (const subscription of subscriptions) {
        subscriptionsProcessed++;
        // Only include users with active or trialing subscriptions
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          if (subscription.userId) {
            paidUserUuids.add(subscription.userId);
          }
        }
      }

      if (subscriptionsProcessed % 1000 === 0) {
        log(`Processed ${subscriptionsProcessed} subscriptions, found ${paidUserUuids.size} paid users so far...`);
      }
    }

    log(`Found ${paidUserUuids.size} paid users from ${subscriptionsProcessed} subscriptions`);

    if (paidUserUuids.size === 0) {
      log('No paid users found, skipping document processing');
      return;
    }

    // Now query documents and filter by paid users
    let documentsQueued = 0;
    log('Querying Document table for uncategorised documents from paid users...');
    let documentNextToken: string | undefined;
    let hasMoreDocuments = true;

    while (hasMoreDocuments) {
      const documentsResponse = await creatorClient.models.Document.list({
        limit: 1000,
        nextToken: documentNextToken,
        selectionSet: ['documentUuid', 'userUuid'],
      });

      const documents = documentsResponse.data;
      documentNextToken = documentsResponse.nextToken ?? undefined;
      hasMoreDocuments = !!documentNextToken;

      if (documents.length === 0) {
        continue;
      }

      for (const document of documents) {
        // Only queue documents owned by paid users
        if (document.userUuid && paidUserUuids.has(document.userUuid)) {
          await emit({
            documentUuid: document.documentUuid,
          } as CategoriseDocumentJob);
          documentsQueued++;
        }
      }

      if (documentsQueued % 1000 === 0) {
        log(`Queued ${documentsQueued} documents so far...`);
      }
    }

    log(`Completed Document queueing: ${documentsQueued} queued`);
    log(`Finished queuing ${documentsQueued} total items for document categorisation`);
  },
});
