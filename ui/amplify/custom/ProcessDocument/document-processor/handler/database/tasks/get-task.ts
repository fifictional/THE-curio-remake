import fetch from 'node-fetch';
import { GetTaskResponse } from '../../core/types';

const query = `
  query GetTask($id: ID!) {
    getTask(taskUuid: $id) {
      taskUuid
      documentUuid
      userUuid
      type
      status
      progress
      args
    }
  }
`;

export const getTask = async (taskUuid: string) => {
  if (!process.env.APPSYNC_URL || !process.env.APPSYNC_API_KEY) {
    throw new Error('APPSYNC_URL or APPSYNC_API_KEY is not set');
  }

  const response = await fetch(process.env.APPSYNC_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.APPSYNC_API_KEY!,
    },
    body: JSON.stringify({
      query: query,
      variables: {
        id: taskUuid,
      },
    }),
  });

  if (!response.ok) {
    return undefined;
  }

  const data = await response.json() as {
    data?: { getTask: GetTaskResponse };
    errors?: Array<{ errorType?: string; message?: string; path?: (string | number)[] }>;
  };

  // Throw on GraphQL errors (e.g. Unauthorized) so SQS retries/DLQs instead of
  // silently treating an auth failure as "task not found".
  if (data.errors && data.errors.length > 0) {
    const primary = data.errors[0];
    throw new Error(
      `getTask AppSync error (${primary.errorType ?? 'Unknown'}): ${primary.message ?? 'no message'}`
    );
  }

  return data.data?.getTask;
};