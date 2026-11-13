import type { Schema } from "../../../../data/resource";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env as creatorEnv } from '$amplify/env/hono-heavy';
import { Amplify } from 'aws-amplify';
import { generateClient } from "aws-amplify/api";
import { registerCreator } from "../../../../common/batch-processing";
import { JOB_NAME, RagEmbeddingsSyncJob } from "./interface";

// Initialize Amplify Data client for creator
const { resourceConfig: creatorResourceConfig, libraryOptions: creatorLibraryOptions } = await getAmplifyDataClientConfig(
  creatorEnv as any
);

Amplify.configure(creatorResourceConfig, creatorLibraryOptions);
const creatorClient = generateClient<Schema>();

// Register creator
registerCreator({
  name: "RAG Embeddings Sync",
  jobType: JOB_NAME,
  description: "Sync RAG embeddings status for all documents - check embeddings, embed if MD file exists, mark as false if no MD file",
  createJobs: async (emit, log) => {
    let documentsQueued = 0;

    // Query all documents with pagination, filtering for those where hasRagEmbeddings is not set
    log('Querying Document table for documents without hasRagEmbeddings...');
    let documentNextToken: string | undefined;
    let hasMoreDocuments = true;

    while (hasMoreDocuments) {
      const documentsResponse = await creatorClient.models.Document.list({
        limit: 1000,
        nextToken: documentNextToken,
        selectionSet: ['documentUuid', 'hasRagEmbeddings'],
      });

      const documents = documentsResponse.data;
      documentNextToken = documentsResponse.nextToken ?? undefined;
      hasMoreDocuments = !!documentNextToken;

      if (documents.length === 0) {
        continue;
      }

      for (const document of documents) {
        // Only queue documents where hasRagEmbeddings is not set (null or undefined)
        if (document.hasRagEmbeddings === null || document.hasRagEmbeddings === undefined) {
          await emit({
            documentUuid: document.documentUuid,
          } as RagEmbeddingsSyncJob);
          documentsQueued++;
        }
      }

      if (documentsQueued % 1000 === 0) {
        log(`Queued ${documentsQueued} documents so far...`);
      }
    }

    log(`Completed Document queueing: ${documentsQueued} queued`);
    log(`Finished queuing ${documentsQueued} total items for RAG embeddings sync`);
  },
});

