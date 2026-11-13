import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const mutation = `
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
      taskUuid
      userUuid
      documentUuid
      type
      progress
      error
      result
      status
      createdAt
      updatedAt
    }
  }
`;

type CreateTaskInput = {
  userUuid: string;
  documentUuid: string;
  type: "LAYOUT_DETECTION" | "DOCUMENT_PROCESSING" | "QUESTION_GENERATION" | "FLASHCARD_GENERATION";
};

export const createTask = async ({ userUuid, documentUuid, type }: CreateTaskInput) => {
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
      query: mutation,
      variables: {
        input: {
          taskUuid: uuidv4(),
          userUuid: userUuid,
          documentUuid: documentUuid,
          type: type,
          status: "PENDING",
          progress: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update task');
  }
};