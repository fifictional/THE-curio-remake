import type { Schema } from "@database-schema";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/process-document-update-task-status';
import { Amplify } from 'aws-amplify';
import { generateClient } from "aws-amplify/api";
import { updateTaskStatus } from "../../utils/process-document/task-status";
import { getMixpanel } from "../../utils/mixpanel";
import { withSentryLambdaHandler } from "../common/sentry-lambda";

// Initialize Amplify Data client
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env as any);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

interface UpdateTaskStatusEvent {
  taskUuid: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress?: number;
  error?: string;
}

const processDocumentUpdateTaskStatusHandler = async (event: UpdateTaskStatusEvent) => {
  if (!event.taskUuid) {
    throw new Error('taskUuid is required');
  }

  const { taskUuid, status, progress, error } = event;

  await updateTaskStatus(client, taskUuid, status, progress, error);

  // Track Mixpanel events for specific statuses
  const mixpanel = await getMixpanel();
  if (mixpanel) {
    if (status === 'FAILED') {
      mixpanel.track('task_failed', {
        taskUuid: taskUuid,
        branch: process.env.AWS_BRANCH || 'local',
      });
    }

    if (status === 'COMPLETED') {
      mixpanel.track('task_completed', {
        taskUuid: taskUuid,
        branch: process.env.AWS_BRANCH || 'local',
      });
    }
  }

  return {
    taskUuid: taskUuid,
    status: status,
  };
};

export const handler = withSentryLambdaHandler(processDocumentUpdateTaskStatusHandler);

