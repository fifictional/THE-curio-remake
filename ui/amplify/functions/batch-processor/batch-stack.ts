import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { FilterCriteria } from 'aws-cdk-lib/aws-lambda';
import { CDKContextKey } from '@aws-amplify/platform-core';

const QDRANT_EXPORT_JOB_TYPE = 'opensearch-qdrant-export';

export interface BatchProcessingStackProps extends NestedStackProps {
  creatorLambda: lambda.IFunction;
  mutatorLambda: lambda.IFunction;
  /** Separate Lambda in Qdrant VPC — avoids overwriting Neptune VpcConfig on batchMutator. */
  qdrantExportMutatorLambda?: lambda.IFunction;
}

export class BatchProcessingStack extends NestedStack {
  public readonly queue: sqs.Queue;

  constructor(scope: Construct, id: string, props: BatchProcessingStackProps) {
    super(scope, id, props);

    const backendName = scope.node.tryGetContext(CDKContextKey.BACKEND_NAME);
    const currentBranch = process.env.AWS_BRANCH || 'local';
    const userName = process.env.USER || process.env.LOGNAME || 'unknown';

    const nameSuffix = currentBranch === 'local' ? `${currentBranch}-${userName}` : currentBranch;
    const queueName = `batch-processing-${nameSuffix}`;
    const dlqName = `batch-processing-${nameSuffix}-dlq`;

    const dlq = new sqs.Queue(this, 'BatchProcessingDLQ', {
      queueName: dlqName,
      retentionPeriod: Duration.days(14),
    });

    this.queue = new sqs.Queue(this, 'BatchProcessingQueue', {
      queueName,
      visibilityTimeout: Duration.minutes(90),
      retentionPeriod: Duration.days(14),
      receiveMessageWaitTime: Duration.seconds(20),
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: dlq,
      },
    });

    this.queue.grantSendMessages(props.creatorLambda);
    this.queue.grantConsumeMessages(props.mutatorLambda);
    this.queue.grant(props.mutatorLambda, 'sqs:ChangeMessageVisibility');

    props.mutatorLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: ['*'],
      }),
    );

    props.mutatorLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'dynamodb:UpdateItem',
          'dynamodb:GetItem',
          'dynamodb:Query',
          'dynamodb:ListTables',
        ],
        resources: [
          `arn:aws:dynamodb:*:*:table/BatchProcess-*`,
          `arn:aws:dynamodb:*:*:*`,
        ],
      }),
    );

    props.mutatorLambda.addEventSource(
      new SqsEventSource(this.queue, {
        batchSize: 1,
        maxConcurrency: 5,
        filters: [
          FilterCriteria.filter({
            body: {
              jobType: [{ 'anything-but': QDRANT_EXPORT_JOB_TYPE }],
            },
          }),
        ],
      }),
    );

    if (props.qdrantExportMutatorLambda) {
      const exportMutator = props.qdrantExportMutatorLambda;
      this.queue.grantConsumeMessages(exportMutator);
      this.queue.grant(exportMutator, 'sqs:ChangeMessageVisibility');

      exportMutator.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['ssm:GetParameter'],
          resources: ['*'],
        }),
      );

      exportMutator.addToRolePolicy(
        new iam.PolicyStatement({
          actions: [
            'dynamodb:UpdateItem',
            'dynamodb:GetItem',
            'dynamodb:Query',
            'dynamodb:ListTables',
          ],
          resources: [
            `arn:aws:dynamodb:*:*:table/BatchProcess-*`,
            `arn:aws:dynamodb:*:*:*`,
          ],
        }),
      );

      exportMutator.addEventSource(
        new SqsEventSource(this.queue, {
          batchSize: 1,
          maxConcurrency: 2,
          filters: [
            FilterCriteria.filter({
              body: {
                jobType: [QDRANT_EXPORT_JOB_TYPE],
              },
            }),
          ],
        }),
      );
    }

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
