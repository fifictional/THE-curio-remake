import type { DynamoDBStreamHandler } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { withSentryLambdaHandler } from "../common/sentry-lambda";

const client = new SQSClient({});

const logger = new Logger({
  logLevel: "INFO",
  serviceName: "dynamodb-task-stream-handler",
});

const processTaskStreamHandler: DynamoDBStreamHandler = async (event) => {

  const documentQueueUrl = process.env.QUEUE_URL;

  for (const record of event.Records) {
    logger.info(`Processing record: ${record.eventID}`);
    logger.info(`Event Type: ${record.eventName}`);

    if (record.eventName === "INSERT") {
      // business logic to process new records
      logger.info(`New Image: ${JSON.stringify(record.dynamodb?.NewImage)}`);
      logger.info(`Document Queue URL: ${documentQueueUrl}`);
      logger.info(`Task UUID: ${record.dynamodb?.NewImage?.taskUuid.S}`);
      const message = {
        taskUuid: record.dynamodb?.NewImage?.taskUuid.S,
        taskType: record.dynamodb?.NewImage?.type.S
      };

      await client.send(new SendMessageCommand({
        QueueUrl: documentQueueUrl!,
        MessageBody: JSON.stringify(message),
      }));
    }
  }
  logger.info(`Successfully processed ${event.Records?.length} records.`);

  return {
    statusCode: 200,
    batchItemFailures: [],
  };
};

export const handler = withSentryLambdaHandler(processTaskStreamHandler);