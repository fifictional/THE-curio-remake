import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Duration } from 'aws-cdk-lib';

export const createQueue = (scope: Construct, id: string) => {
  return new sqs.Queue(scope, id, {
    visibilityTimeout: Duration.minutes(5),
    retentionPeriod: Duration.days(14),
    receiveMessageWaitTime: Duration.seconds(20),
    // Add Dead Letter Queue for failed messages
    deadLetterQueue: {
      maxReceiveCount: 3,
      queue: new sqs.Queue(scope, `${id}-dlq`)
    },
  });
};