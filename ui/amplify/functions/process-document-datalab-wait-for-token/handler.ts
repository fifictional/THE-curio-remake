import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { Schema } from "../../data/resource";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { env } from "$amplify/env/process-document-datalab-wait-for-token";
import { SendTaskSuccessCommand, SFNClient } from "@aws-sdk/client-sfn";
import { withSentryLambdaHandler } from "../common/sentry-lambda";

interface DatalabRetrieveEvent {
  taskToken: string;      // injected by Step Functions WAIT_FOR_TASK_TOKEN
  documentUuid: string;
  taskUuid: string;
  userUuid: string;
  requestId: string;
}

const sfn = new SFNClient({ region: process.env.AWS_REGION! });
// Initialize Amplify Data client
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env as any);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

const processDocumentDatalabWaitForTokenHandler = async (event: DatalabRetrieveEvent) => {
  const { taskToken, taskUuid, documentUuid, userUuid, requestId } = event;

  if (!taskToken) {
    throw new Error("Missing taskToken in event");
  }

  if(requestId === 'youtube-skipped') { 
    console.info("YouTube video processing was skipped, skipping Datalab retrieval.", { requestId, documentUuid, taskUuid, userUuid });
    
    await sfn.send(
    new SendTaskSuccessCommand({
      taskToken,
      output: JSON.stringify({
        skipped: true,
        reason: 'YouTube video processing was skipped',
        requestId: requestId,
        webhookReceived: true,
      }),
    }));

    return {
      skipped: true,
      reason: 'YouTube video processing was skipped',
      requestId,
      documentUuid,
      taskUuid,
      userUuid
    };
  }

  // Optionally, store mapping for webhook processing
  await client.models.DatalabRequest.create({
    requestId,
    documentUuid,
    taskUuid,
    userUuid,
    taskToken,
    status: 'submitted',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.info("Retrieve Lambda is now waiting for webhook callback...", { taskToken, requestId });

  // ✅ Do NOT call Datalab API here. Step Function pauses automatically.

  return {}; // Step Function will pause until webhook calls SendTaskSuccess
};

export const handler = withSentryLambdaHandler(processDocumentDatalabWaitForTokenHandler);
