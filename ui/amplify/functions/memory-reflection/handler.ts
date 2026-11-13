import type { SQSEvent } from 'aws-lambda';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/memory-reflection';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '@database-schema';
import { MemoryService, runAgentReflection, resolveEventOccurredAt, type MemoryQueueEvent } from '@ai-memory/index';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { withSentryLambdaHandler } from '../common/sentry-lambda';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  env as any
);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();
const cloudwatchClient = new CloudWatchClient({});

async function processRecord(body: string): Promise<void> {
  let event = JSON.parse(body) as MemoryQueueEvent;
  event = await resolveEventOccurredAt(client, event);
  const memory = new MemoryService(client);

  if (!(await memory.isMemoryEnabledForUser(event.ownerUuid))) {
    return;
  }

  let priorQuizAttempts: Array<{ scoreRatio: number; createdAt: string }> | undefined;
  if (event.type === 'quiz_attempt') {
    const prior = await client.models.QuizAttempt.listQuizAttemptByUserUuidAndCreatedAt(
      { userUuid: event.ownerUuid },
      { limit: 50, sortDirection: 'DESC' }
    );
    priorQuizAttempts = (prior.data ?? [])
      .filter(
        (a) =>
          a.quizUuid === event.quizUuid && a.quizAttemptUuid !== event.quizAttemptUuid
      )
      .map((a) => ({
        scoreRatio: a.total > 0 ? a.score / a.total : 0,
        createdAt: a.createdAt,
      }));
  }

  try {
    await runAgentReflection({
      client,
      event,
      cloudwatchClient,
      priorQuizAttempts,
    });
  } catch (err) {
    console.error('[memory-reflection] agent reflection failed', err);
    throw err;
  }
}

const memoryReflectionHandler = async (sqsEvent: SQSEvent) => {
  for (const record of sqsEvent.Records) {
    try {
      await processRecord(record.body);
    } catch (err) {
      console.error('[memory-reflection] failed record', err);
      throw err;
    }
  }
};

export const handler = withSentryLambdaHandler(memoryReflectionHandler);
