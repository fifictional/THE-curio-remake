import { defineFunction } from '@aws-amplify/backend';
import { sentryEnv } from '../../common/sentry-env';

/** Processes OpenSearch → Qdrant export slices in the Qdrant VPC (not Neptune). */
export const qdrantExportMutator = defineFunction({
  name: 'qdrant-export-mutator',
  timeoutSeconds: 900,
  memoryMB: 1024,
  resourceGroupName: 'data',
  environment: {
    ...sentryEnv,
  },
});
