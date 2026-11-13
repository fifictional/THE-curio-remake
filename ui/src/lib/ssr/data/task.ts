import { cookieBasedClient } from "@ssr/utils/request-helper";
import { v4 as uuidv4 } from 'uuid';

export type CreateTask = {
  userUuid: string,
  documentUuid: string,
}

export async function createTask({userUuid, documentUuid}: CreateTask) {
  const taskUuid = uuidv4();
  const response = await cookieBasedClient.models.Task.create({
    taskUuid,
    userUuid: userUuid,
    documentUuid: documentUuid,
    type: "DOCUMENT_PROCESSING",
    status: "PENDING",
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Amplify Data resolves with `{ data, errors }` even on failure — it does NOT
  // throw. Without this check a failed Task.create (expired API key, schema
  // validation, throttle, etc.) returns silently and the document is never
  // picked up by the processing pipeline (dynamo stream → SQS → dispatcher).
  if (response.errors && response.errors.length > 0) {
    const msg = response.errors.map((e) => e.message).join('; ');
    console.error('[createTask] Task.create failed', {
      taskUuid,
      documentUuid,
      userUuid,
      errors: response.errors,
    });
    throw new Error(`Failed to create task: ${msg}`);
  }

  if (!response.data) {
    console.error('[createTask] Task.create returned no data', {
      taskUuid,
      documentUuid,
      userUuid,
    });
    throw new Error('Failed to create task: empty response');
  }

  return response;
}