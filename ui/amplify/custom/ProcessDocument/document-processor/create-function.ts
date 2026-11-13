import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as url from 'node:url';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Duration } from 'aws-cdk-lib';
import * as eventSources from 'aws-cdk-lib/aws-lambda-event-sources';

export interface ProcessDocumentBackendProps {
  apiUrl: string;
  apiKey: string;
  bucketName: string;
  chatLambdaArn: string;
  mockExamsGenerateQuestionsLambdaArn: string;
  satExtractModulesLambdaArn: string;
  satExtractAnswerModulesLambdaArn: string;
  satQuestionExtractorLambdaArn: string;
  generateQuestionsLambdaArn: string;
  processDocumentQueue: sqs.Queue;
}

export const createFunction = (scope: Construct, id: string, queue: sqs.Queue, props: ProcessDocumentBackendProps) => {
  const processor = new lambda.NodejsFunction(scope, id, {
    entry: url.fileURLToPath(new URL('handler/core/document-processor.ts', import.meta.url)),
    runtime: Runtime.NODEJS_20_X,
    timeout: Duration.seconds(300),
    environment: {
      APPSYNC_URL: props.apiUrl,
      APPSYNC_API_KEY: props.apiKey,
      AWS_BUCKET_NAME: props.bucketName,
      AWS_BRANCH: process.env.AWS_BRANCH || "local",
    }
  });

  const openAiSecret = secretsmanager.Secret.fromSecretNameV2(scope, 'OpenAiApiKey', 'openai/api-key');
  openAiSecret.grantRead(processor);
  
  // Add another secret key
  const geminiSecret = secretsmanager.Secret.fromSecretNameV2(scope, 'GeminiApiKey', 'gemini-api-key');
  geminiSecret.grantRead(processor);

  const datalabSecret = secretsmanager.Secret.fromSecretNameV2(scope, 'DatalabApiKey', 'datalab-api-key');
  datalabSecret.grantRead(processor);
  
  processor.role?.addToPrincipalPolicy(new iam.PolicyStatement({
    actions: ['ssm:GetParameter'],
    resources: ['*'],
  }));

  processor.role?.addToPrincipalPolicy(new iam.PolicyStatement({
    actions: ['textract:AnalyzeDocument', 'textract:StartDocumentAnalysis', 'textract:GetDocumentAnalysis'],
    resources: ['*'],
  }));

  // Subscribe Lambda to SQS queue
  processor.addEventSource(new eventSources.SqsEventSource(queue));

  // Allow publisher to publish to SNS topic
  queue.grantConsumeMessages(processor);

  return processor;
}