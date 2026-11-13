import { defineFunction } from '@aws-amplify/backend';

export const clearUserMemory = defineFunction({
  name: 'clear-user-memory',
  resourceGroupName: 'data',
  timeoutSeconds: 60,
});
