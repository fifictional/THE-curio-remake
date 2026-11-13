import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { CDKContextKey } from '@aws-amplify/platform-core';

export interface BatchProcessingStackProps extends NestedStackProps {
  creatorLambda: lambda.IFunction;
  mutatorLambda: lambda.IFunction;
}

export class BatchProcessingStack extends NestedStack {
  public readonly queue: sqs.Queue;

  constructor(scope: Construct, id: string, props: BatchProcessingStackProps) {
    super(scope, id, props);

    const backendName = scope.node.tryGetContext(CDKContextKey.BACKEND_NAME);
    const currentBranch = process.env.AWS_BRANCH || "local";
    const userName = process.env.USER || process.env.LOGNAME || 'unknown';
    
    // Include username in queue name for local resources
    const nameSuffix = currentBranch === "local" ? `${currentBranch}-${userName}` : currentBranch;
    const queueName = `batch-processing-${nameSuffix}`;
    const dlqName = `batch-processing-${nameSuffix}-dlq`;

    // Create Dead Letter Queue
    const dlq = new sqs.Queue(this, 'BatchProcessingDLQ', {
      queueName: dlqName,
      retentionPeriod: Duration.days(14),
    });

    // Create main standard queue
    this.queue = new sqs.Queue(this, 'BatchProcessingQueue', {
      queueName,
      // AWS requires visibility timeout >= 6 × Lambda timeout (6 × 15 min = 90 min)
      // This is enforced even though we use heartbeats to extend it immediately.
      visibilityTimeout: Duration.minutes(90), // 90 minutes - required by AWS, extended by heartbeat to 5 min
      retentionPeriod: Duration.days(14),
      receiveMessageWaitTime: Duration.seconds(20), // Long polling
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: dlq,
      },
    });

    // Grant the creator Lambda permission to send messages
    this.queue.grantSendMessages(props.creatorLambda);

    // Grant the mutator Lambda permission to consume messages
    this.queue.grantConsumeMessages(props.mutatorLambda);

    // Grant permission to change message visibility (for heartbeat)
    // This allows the Lambda to extend visibility timeout during long-running batches
    this.queue.grant(props.mutatorLambda, 'sqs:ChangeMessageVisibility');

    // Grant SSM permissions to read Amplify Data configuration (if needed)
    props.mutatorLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: ['*'],
    }));

    // Subscribe mutator Lambda to SQS queue
    // Batch size of 1 so each SQS message (which contains our own batched jobs) is processed individually
    // This allows different job types to define their own batch sizes
    // No batching window - process immediately
    // Max concurrency of 5 to limit concurrent Lambda invocations
    props.mutatorLambda.addEventSource(
      new SqsEventSource(this.queue, {
        batchSize: 1, // Process one SQS message at a time (each message contains our own batched jobs)
        maxConcurrency: 5, // Limit to 5 concurrent Lambda invocations
      })
    );

    // Export queue URLs and ARNs for use in parent stack
    new CfnOutput(this, 'BatchQueueUrl', {
      value: this.queue.queueUrl,
      exportName: `${this.stackName}-BatchQueueUrl`,
    });

    new CfnOutput(this, 'BatchQueueArn', {
      value: this.queue.queueArn,
      exportName: `${this.stackName}-BatchQueueArn`,
    });
  }
}

