import { SQSEvent, SQSHandler } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, UpdateItemCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../data/resource';
import { JobMessage } from './types';
import { getMutator } from './registry';
import { processJob } from './framework';
import { HeartbeatManager } from './heartbeat';

function getQueueUrlFromEventSourceArn(eventSourceArn: string): string {
  const arnParts = eventSourceArn.split(':');
  if (arnParts.length < 6 || arnParts[0] !== 'arn' || arnParts[1] !== 'aws' || arnParts[2] !== 'sqs') {
    throw new Error(`Invalid SQS event source ARN: ${eventSourceArn}`);
  }
  const region = arnParts[3];
  const account = arnParts[4];
  const queueName = arnParts.slice(5).join(':');
  return `https://sqs.${region}.amazonaws.com/${account}/${queueName}`;
}

async function resolveBatchProcessTableName(
  logger: Logger,
  dynamoClient: DynamoDBClient,
): Promise<string> {
  const fromEnv = process.env.BATCH_PROCESS_TABLE_NAME;
  if (fromEnv) {
    logger.info(`Using BatchProcess table from environment: ${fromEnv}`);
    return fromEnv;
  }

  logger.warn('BATCH_PROCESS_TABLE_NAME not set, falling back to table discovery');
  try {
    const listTablesResponse = await dynamoClient.send(new ListTablesCommand({}));
    const batchProcessTables = (listTablesResponse.TableNames || []).filter((name) =>
      name.startsWith('BatchProcess-'),
    );
    if (batchProcessTables.length > 0) {
      logger.info(`Found BatchProcess table: ${batchProcessTables[0]}`);
      return batchProcessTables[0];
    }
    throw new Error('No BatchProcess table found');
  } catch (error) {
    logger.error(`Failed to find BatchProcess table: ${error}`);
    const branch = process.env.AWS_BRANCH || 'local';
    const userName = process.env.USER || process.env.LOGNAME || 'unknown';
    const suffix = branch === 'local' ? `${branch}-${userName}` : branch;
    const fallback = `BatchProcess-${suffix}`;
    logger.warn(`Using fallback table name: ${fallback}`);
    return fallback;
  }
}

export function createSqsMutatorHandler(
  client: ReturnType<typeof generateClient<Schema>>,
  serviceName: string,
): SQSHandler {
  const logger = new Logger({ logLevel: 'INFO', serviceName });
  const dynamoClient = new DynamoDBClient({});
  const tableNamePromise = resolveBatchProcessTableName(logger, dynamoClient);

  return async (event: SQSEvent) => {
    const TABLE_NAME = await tableNamePromise;
    const batchItemFailures: { itemIdentifier: string }[] = [];

    for (const record of event.Records) {
      let heartbeat: HeartbeatManager | null = null;

      try {
        const jobMessage: JobMessage = JSON.parse(record.body);
        const mutator = getMutator(jobMessage.jobType);
        if (!mutator) {
          throw new Error(`No mutator found for jobType: ${jobMessage.jobType}`);
        }

        process.stdout.write(`[Mutator:${jobMessage.jobType}:${jobMessage.jobId}] Processing job\n`);

        const queueUrl = getQueueUrlFromEventSourceArn(record.eventSourceARN);
        heartbeat = new HeartbeatManager({
          queueUrl,
          receiptHandle: record.receiptHandle,
          intervalSeconds: 30,
          extensionSeconds: 60,
        });
        heartbeat.start();

        const jobLog = (message: string) => {
          process.stdout.write(`${message}\n`);
        };

        const processId = jobMessage.processId;
        if (!processId) {
          throw new Error('Missing processId in job message');
        }

        const success = await processJob(jobMessage, mutator.processJob, jobLog);

        if (success) {
          try {
            const updateResult = await dynamoClient.send(
              new UpdateItemCommand({
                TableName: TABLE_NAME,
                Key: { processId: { S: processId } },
                UpdateExpression: 'ADD completedJobs :inc',
                ExpressionAttributeValues: { ':inc': { N: '1' } },
                ReturnValues: 'ALL_NEW',
              }),
            );

            if (!updateResult.Attributes) {
              process.stderr.write(
                `[Mutator:${jobMessage.jobType}:${jobMessage.jobId}] BatchProcess ${processId} not found\n`,
              );
            } else {
              const newCompleted = parseInt(updateResult.Attributes.completedJobs?.N || '0', 10);
              const totalJobs = parseInt(updateResult.Attributes.totalJobs?.N || '0', 10);
              const currentState = updateResult.Attributes.state?.S;

              if (totalJobs > 0 && newCompleted >= totalJobs && currentState !== 'complete') {
                await client.models.BatchProcess.update({
                  processId,
                  state: 'complete',
                  failed: false,
                  completionTime: new Date().toISOString(),
                });
                process.stdout.write(
                  `[Mutator:${jobMessage.jobType}:${jobMessage.jobId}] Process ${processId} completed: ${newCompleted}/${totalJobs} jobs\n`,
                );
              }
            }
          } catch (updateError) {
            process.stderr.write(
              `[Mutator:${jobMessage.jobType}:${jobMessage.jobId}] Failed to update BatchProcess: ${updateError}\n`,
            );
          }
        }

        heartbeat.stop();
        heartbeat = null;

        if (!success) {
          throw new Error(`Job ${jobMessage.jobId} failed`);
        }
      } catch {
        if (heartbeat) {
          heartbeat.stop();
        }
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }

    return { batchItemFailures };
  };
}
