import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { ProcessDocumentBackendProps } from './document-processor/create-function';
import { ProcessDocumentLambdasStack } from './nested-stacks/lambdas-stack';
import { ProcessDocumentStateMachineStack } from './nested-stacks/state-machine-stack';
import { ProcessDocumentInfrastructureStack } from './nested-stacks/infrastructure-stack';

export interface ProcessDocumentBackendWithAmplifyFunctionsProps extends ProcessDocumentBackendProps {
  // Amplify function references (required - these replace the old CDK Lambda functions)
  updateTaskStatusLambda: lambda.IFunction;
  createSummaryLambda: lambda.IFunction;
  createFlashcardsLambda: lambda.IFunction;
  categoriseDocumentLambda: lambda.IFunction;
  datalabSubmitLambda: lambda.IFunction;
  datalabRetrieveLambda: lambda.IFunction;
  extractAndEmbedLambda: lambda.IFunction;
  fileTypeDetectionLambda: lambda.IFunction;
  datalabWaitForTokenLambda: lambda.IFunction;
}

export class ProcessDocumentBackend extends Construct {
  public readonly taskStateMachine: sfn.StateMachine;
  public readonly processDocumentQueue: sqs.Queue;
  public readonly convertToPdfLambda: lambda.Function;
  public readonly createDocumentSummaryLambda: lambdaNodejs.NodejsFunction;
  public readonly createFlashcardsLambda: lambdaNodejs.NodejsFunction;
  public readonly categoriseDocumentLambda: lambdaNodejs.NodejsFunction;
  public readonly dispatcherImageUri: string;
  public readonly datalabSubmitLambda: lambdaNodejs.NodejsFunction;
  public readonly datalabRetrieveLambda: lambdaNodejs.NodejsFunction;
  public readonly datalabWaitForTokenLambda: lambdaNodejs.NodejsFunction;


  constructor(scope: Construct, id: string, props: ProcessDocumentBackendWithAmplifyFunctionsProps) {
    super(scope, id);

    const environment = {
      APPSYNC_URL: props.apiUrl,
      APPSYNC_API_KEY: props.apiKey,
      AWS_BUCKET_NAME: props.bucketName,
      AWS_BRANCH: process.env.AWS_BRANCH || "local",
      MIXPANEL_API_HOST: process.env.MIXPANEL_API_HOST || "",
    };

    const envId = (process.env.AWS_BRANCH || 'local') === 'release' ? 'prod' : 'dev';
    const deploymentId = process.env.AWS_BRANCH || process.env.USER || 'local';

    // Create mixpanel secret once for reuse
    const mixpanelSecret = secretsmanager.Secret.fromSecretNameV2(this, 'MixpanelToken', 'mixpanel');

    // Create nested stack 1: Lambdas (only for convert-to-pdf now)
    const lambdasStack = new ProcessDocumentLambdasStack(this, 'LambdasStack', {
      environment,
      bucketName: props.bucketName,
    });

    // Use Amplify functions (required)
    const updateTaskStatusLambda = props.updateTaskStatusLambda;
    const createSummaryLambda = props.createSummaryLambda;
    const createFlashcardsLambda = props.createFlashcardsLambda;
    const categoriseDocumentLambda = props.categoriseDocumentLambda;
    const datalabSubmitLambda = props.datalabSubmitLambda;
    const datalabRetrieveLambda = props.datalabRetrieveLambda;
    const datalabWaitForTokenLambda = props.datalabWaitForTokenLambda;
    const extractAndEmbedLambda = props.extractAndEmbedLambda;
    const fileTypeDetectionLambda = props.fileTypeDetectionLambda;

    // Create nested stack 2: State Machine (uses Amplify functions if provided)
    const stateMachineStack = new ProcessDocumentStateMachineStack(this, 'StateMachineStack', {
      environment,
      mixpanelSecret,
      convertToPdfLambda: lambdasStack.convertToPdfLambda,
      createDocumentSummaryLambda: createSummaryLambda,
      createFlashcardsLambda: createFlashcardsLambda,
      categoriseDocumentLambda: categoriseDocumentLambda,
      datalabSubmitLambda: datalabSubmitLambda,
      datalabRetrieveLambda: datalabRetrieveLambda,
      updateTaskStatusLambda: updateTaskStatusLambda,
      extractAndEmbedLambda: extractAndEmbedLambda,
      fileTypeDetectionLambda: fileTypeDetectionLambda,
      waitForTokenLambda: datalabWaitForTokenLambda
    });

    // Create nested stack 3: Infrastructure (needs state machine ARN and queue)
    const infrastructureStack = new ProcessDocumentInfrastructureStack(this, 'InfrastructureStack', {
      environment,
      envId,
      deploymentId,
      stateMachineArn: stateMachineStack.stateMachine.stateMachineArn,
      processDocumentQueue: props.processDocumentQueue,
      chatLambdaArn: props.chatLambdaArn,
      mockExamsGenerateQuestionsLambdaArn: props.mockExamsGenerateQuestionsLambdaArn,
      satExtractModulesLambdaArn: props.satExtractModulesLambdaArn,
      satExtractAnswerModulesLambdaArn: props.satExtractAnswerModulesLambdaArn,
      satQuestionExtractorLambdaArn: props.satQuestionExtractorLambdaArn,
      generateQuestionsLambdaArn: props.generateQuestionsLambdaArn,
      mixpanelSecret,
    });

    // Expose outputs from nested stacks
    this.processDocumentQueue = props.processDocumentQueue;
    this.taskStateMachine = stateMachineStack.stateMachine;
    this.convertToPdfLambda = lambdasStack.convertToPdfLambda;
    this.createDocumentSummaryLambda = createSummaryLambda as any; // Amplify function (IFunction)
    this.createFlashcardsLambda = createFlashcardsLambda as any; // Amplify function (IFunction)
    this.categoriseDocumentLambda = categoriseDocumentLambda as any; // Amplify function (IFunction)
    this.datalabSubmitLambda = datalabSubmitLambda as any; // Amplify function (IFunction)
    this.datalabRetrieveLambda = datalabRetrieveLambda as any; // Amplify function (IFunction)
    this.dispatcherImageUri = infrastructureStack.dispatcherImageUri;
    this.datalabWaitForTokenLambda = datalabWaitForTokenLambda as any;
  }
}