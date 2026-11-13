import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import type { MemoryQueueEvent } from './types';

const sqs = new SQSClient({});

export async function publishMemoryEvent(event: MemoryQueueEvent): Promise<void> {
  const queueUrl = process.env.MEMORY_REFLECTION_QUEUE_URL;
  if (!queueUrl) {
    console.warn('[memory] MEMORY_REFLECTION_QUEUE_URL not set; skipping enqueue');
    return;
  }
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(event),
    })
  );
}
