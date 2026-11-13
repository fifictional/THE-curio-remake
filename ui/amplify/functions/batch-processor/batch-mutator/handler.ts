import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/batch-mutator';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../data/resource';
import { createSqsMutatorHandler } from '../../../common/batch-processing/sqs-mutator-handler';
import { withSentryLambdaHandler } from '../../common/sentry-lambda';

import '../jobs/flashcard-migration/mutator';
import '../jobs/rag-embeddings-sync/mutator';
import '../jobs/test-delayed-logger/mutator';
import '../jobs/test-flashcard-deck-logger/mutator';
import '../jobs/subscription-tier-default/mutator';
import '../jobs/categorise-document/mutator';
import '../jobs/populate-user-profile/mutator';
import '../jobs/space-flashcard-embed/mutator';
import '../jobs/chat-summary-embed/mutator';
import '../jobs/memory-consolidation/mutator';
import '../jobs/chat-memory-backfill/mutator';

if (process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT && !process.env.APPSYNC_URL) {
  process.env.APPSYNC_URL = process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT;
}

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env as any);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

export const handler = withSentryLambdaHandler(
  createSqsMutatorHandler(client, 'batch-mutator-handler'),
);
