import { NestedStack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { createQueue } from './create-queue';

export class QueuesStack extends NestedStack {
  public readonly processDocumentQueue: sqs.Queue;
  public readonly memoryReflectionQueue: sqs.Queue;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create SQS queue
    this.processDocumentQueue = createQueue(this, 'process-document-queue');
    this.memoryReflectionQueue = createQueue(this, 'memory-reflection-queue');

    // Export queue ARN and URL for use in parent stack
    new CfnOutput(this, 'process-document-queue-arn', {
      value: this.processDocumentQueue.queueArn,
      exportName: `${this.stackName}-process-document-queue-arn`,
    });

    new CfnOutput(this, 'process-document-queue-url', {
      value: this.processDocumentQueue.queueUrl,
      exportName: `${this.stackName}-process-document-queue-url`,
    });

    new CfnOutput(this, 'memory-reflection-queue-arn', {
      value: this.memoryReflectionQueue.queueArn,
      exportName: `${this.stackName}-memory-reflection-queue-arn`,
    });

    new CfnOutput(this, 'memory-reflection-queue-url', {
      value: this.memoryReflectionQueue.queueUrl,
      exportName: `${this.stackName}-memory-reflection-queue-url`,
    });
  }
}

