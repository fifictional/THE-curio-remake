import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Dispatcher } from '../dispatcher';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { CDKContextKey } from '@aws-amplify/platform-core';
import { createQueue } from '../../queues-stack/create-queue';

export interface ProcessDocumentInfrastructureStackProps extends NestedStackProps {
  environment: Record<string, string>;
  envId: 'dev' | 'prod';
  deploymentId: string;
  processDocumentQueue: sqs.Queue;
  stateMachineArn: string;
  chatLambdaArn: string;
  mockExamsGenerateQuestionsLambdaArn: string;
  satExtractModulesLambdaArn: string;
  satExtractAnswerModulesLambdaArn: string;
  satQuestionExtractorLambdaArn: string;
  generateQuestionsLambdaArn: string;
  mixpanelSecret: secretsmanager.ISecret;
}

export class ProcessDocumentInfrastructureStack extends NestedStack {
  public readonly dispatcherImageUri: string;

  constructor(scope: Construct, id: string, props: ProcessDocumentInfrastructureStackProps) {
    super(scope, id, props);

    const backendName = scope.node.getContext(CDKContextKey.BACKEND_NAME);
    // Build and publish dispatcher container image
    const dispatcher = new Dispatcher(this, "stack-dispatcher", {
      queueUrl: props.processDocumentQueue.queueUrl,
      queueArn: props.processDocumentQueue.queueArn,
      stateMachineArn: props.stateMachineArn,
      chatLambdaArn: props.chatLambdaArn,
      mockExamsGenerateQuestionsLambdaArn: props.mockExamsGenerateQuestionsLambdaArn,
      satExtractModulesLambdaArn: props.satExtractModulesLambdaArn,
      satQuestionExtractorLambdaArn: props.satQuestionExtractorLambdaArn,
      satExtractAnswerModulesLambdaArn: props.satExtractAnswerModulesLambdaArn,
      generateQuestionsLambdaArn: props.generateQuestionsLambdaArn,
      environment: props.environment,
      envId: props.envId,
      deploymentId: props.deploymentId,
      mixpanelSecret: props.mixpanelSecret,
    });
    this.dispatcherImageUri = dispatcher.image.imageUri;

    new CfnOutput(this, 'DispatcherImageUri', {
      value: this.dispatcherImageUri,
      exportName: `${this.stackName}-DispatcherImageUri`,
    });
  }
}

