import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/qdrant-export-mutator';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../data/resource';
import { createSqsMutatorHandler } from '../../../common/batch-processing/sqs-mutator-handler';
import { withSentryLambdaHandler } from '../../common/sentry-lambda';

import '../jobs/opensearch-qdrant-export/mutator';

if (process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT && !process.env.APPSYNC_URL) {
  process.env.APPSYNC_URL = process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT;
}

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env as any);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

export const handler = withSentryLambdaHandler(
  createSqsMutatorHandler(client, 'qdrant-export-mutator-handler'),
);
