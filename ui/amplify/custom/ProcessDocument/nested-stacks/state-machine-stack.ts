import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { buildStepUpdateTaskStatus } from './steps/update-task-status';
import { buildStepCreateSummary } from './steps/create-summary';
import { buildStepCreateFlashcards } from './steps/create-flashcards';
import { buildStepCategoriseDocument } from './steps/categorise-document';
import { buildStepConvertToPdf } from './steps/convert-to-pdf';
import { buildStepDatalabSubmit } from './steps/datalab-submit';
import { buildStepDatalabRetrieve } from './steps/datalab-retrieve';
import { buildStepExtractAndEmbed } from './steps/extract-and-embed';
import { buildStepFileTypeDetection } from './steps/file-type-detection';
import { buildStepDatalabWaitForToken } from './steps/datalab-wait-for-token';

/**
 * Dispatcher Payload Interface
 * 
 * The dispatcher (amplify/custom/ProcessDocument/dispatcher-container/src/dispatch.ts) 
 * invokes this state machine with the following minimal payload:
 * 
 * ```json
 * {
 *   "taskUuid": "<string>",
 *   "documentUuid": "<string>",
 *   "userUuid": "<string>"
 * }
 * ```
 * 
 * All other data (task details, document details, etc.) is fetched from the database
 * by individual lambda functions as needed. This reduces the payload size and ensures
 * lambdas always work with the latest data from the database.
 * 
 * The initial pass state stores these UUIDs as top-level variables in the execution
 * context, making them available to all subsequent states via JSONata expressions like:
 * - `{% $taskUuid %}`
 * - `{% $documentUuid %}`
 * - `{% $userUuid %}`
 */

export interface ProcessDocumentStateMachineStackProps extends NestedStackProps {
  environment: Record<string, string>;
  mixpanelSecret: secretsmanager.ISecret;
  // Lambda functions - Amplify functions (IFunction) or CDK Lambda functions
  convertToPdfLambda: lambda.Function;
  createDocumentSummaryLambda: lambda.IFunction;
  createFlashcardsLambda: lambda.IFunction;
  categoriseDocumentLambda: lambda.IFunction;
  datalabSubmitLambda: lambda.IFunction;
  datalabRetrieveLambda: lambda.IFunction;
  updateTaskStatusLambda: lambda.IFunction;
  extractAndEmbedLambda: lambda.IFunction;
  fileTypeDetectionLambda: lambda.IFunction;
  waitForTokenLambda: lambda.IFunction;
}

export class ProcessDocumentStateMachineStack extends NestedStack {
  public readonly stateMachine: sfn.StateMachine;
  public readonly convertToPdfLambda: lambda.Function;
  public readonly createDocumentSummaryLambda: lambda.IFunction;
  public readonly createFlashcardsLambda: lambda.IFunction;
  public readonly datalabSubmitLambda: lambda.IFunction;
  public readonly datalabRetrieveLambda: lambda.IFunction;

  constructor(scope: Construct, id: string, props: ProcessDocumentStateMachineStackProps) {
    super(scope, id, props);

    // Store references to Lambda functions
    this.convertToPdfLambda = props.convertToPdfLambda;
    this.createDocumentSummaryLambda = props.createDocumentSummaryLambda;
    this.createFlashcardsLambda = props.createFlashcardsLambda;
    this.datalabSubmitLambda = props.datalabSubmitLambda;
    this.datalabRetrieveLambda = props.datalabRetrieveLambda;

    // Build state machine steps
    const stepUpdateTaskStatusLambda = buildStepUpdateTaskStatus(this, props.updateTaskStatusLambda, props.environment);
    const stepCreateSummaryLambda = buildStepCreateSummary(this, props.createDocumentSummaryLambda, props.environment);
    const stepCreateFlashcardsLambda = buildStepCreateFlashcards(this, props.createFlashcardsLambda, props.environment);
    const stepCategoriseDocumentLambda = buildStepCategoriseDocument(this, props.categoriseDocumentLambda, props.environment);
    const stepConvertToPdfLambda = buildStepConvertToPdf(this, props.convertToPdfLambda, props.environment);
    const stepFileTypeDetectionLambda = buildStepFileTypeDetection(this, props.fileTypeDetectionLambda);
    const stepDatalabSubmitLambda = buildStepDatalabSubmit(this, props.datalabSubmitLambda, props.environment);
    const stepDatalabWaitLambda = buildStepDatalabWaitForToken(this, props.waitForTokenLambda, props.environment);
    const stepDatalabRetrieveLambda = buildStepDatalabRetrieve(this, props.datalabRetrieveLambda, props.environment);
    const stepExtractAndEmbedLambda = buildStepExtractAndEmbed(this, props.extractAndEmbedLambda, props.environment);

    // Pass state to store global variables from dispatcher input
    // Uses assign with JSONata to extract taskUuid, documentUuid, and userUuid from $states.input
    // and set them as top-level variables in the execution context for all subsequent states
    const storeGlobals = new sfn.Pass(this, 'store-globals', {
      stateName: 'Store Global Variables',
      assign: {
        taskUuid: '{% $states.input.taskUuid %}',
        documentUuid: '{% $states.input.documentUuid %}',
        userUuid: '{% $states.input.userUuid %}',
      },
    });

    // Pass state after file-type detection as catch target (no outputs needed)
    const fileTypeDetectionCatchPass = new sfn.Pass(this, 'file-type-detection-catch-pass', {
      stateName: 'File Type Detection Completed',
    });

    // File type detection with catch handler
    const fileTypeDetectionChain = stepFileTypeDetectionLambda.step
      .addCatch(fileTypeDetectionCatchPass, {
        errors: ['States.ALL'],
      })
      .next(fileTypeDetectionCatchPass);


    // Pass state after flashcards creation as catch target (no outputs needed)
    const flashcardsCatchPass = new sfn.Pass(this, 'flashcards-catch-pass', {
      stateName: 'Flashcards Creation Completed',
    });

    // Flashcards creation with catch handler
    const flashcardsStepChain = stepCreateFlashcardsLambda.step
      .addCatch(flashcardsCatchPass, {
        errors: ['States.ALL'],
      })
      .next(flashcardsCatchPass);

    // Pass state after document categorisation as catch target (no outputs needed)
    const categoriseDocumentCatchPass = new sfn.Pass(this, 'categorise-document-catch-pass', {
      stateName: 'Document Categorisation Completed',
    });

    // Document categorisation with catch handler
    const categoriseStepChain = stepCategoriseDocumentLambda.step
      .addCatch(categoriseDocumentCatchPass, {
        errors: ['States.ALL'],
      })
      .next(categoriseDocumentCatchPass);

    // Pass state after extract and embed as catch target (no outputs needed)
    const extractEmbedCatchPass = new sfn.Pass(this, 'extract-embed-catch-pass', {
      stateName: 'Extract and Embed Completed',
    });

    // Extract and embed with catch handler
    const extractEmbedStepChain = stepExtractAndEmbedLambda.step
      .addCatch(extractEmbedCatchPass, {
        errors: ['States.ALL'],
      })
      .next(extractEmbedCatchPass);


    // Define parallel content orchestration: Flashcards, Categorise, Embed, and File Type Detection
    const parallelContentOrchestration = new sfn.Parallel(this, 'parallel-content-orchestration', {
      stateName: 'Process Content: Flashcards, Categorise, ald Embed',
    });
    parallelContentOrchestration.branch(flashcardsStepChain);
    parallelContentOrchestration.branch(categoriseStepChain);
    parallelContentOrchestration.branch(extractEmbedStepChain);

    // Pass state after extract and embed as catch target (no outputs needed)
    const generateSummaryCatchPass = new sfn.Pass(this, 'generate-summary-catch-pass', {
      stateName: 'Generate Summary Completed',
    });

    // Extract and embed with catch handler
    const generateSummaryChain = stepCreateSummaryLambda.step
      .addCatch(generateSummaryCatchPass, {
        errors: ['States.ALL'],
      })
      .next(generateSummaryCatchPass);

    const datalabSubmitChain = stepDatalabSubmitLambda.step
      .next(stepDatalabWaitLambda.step)
      .next(stepDatalabRetrieveLambda.step)
      .next(parallelContentOrchestration);

    const parallelRawDataProcessing = new sfn.Parallel(this, 'parallel-raw-data-processing', {
      stateName: 'Process Raw Data: Summary, Detect File Type and Datalab',
    });
    parallelRawDataProcessing.branch(generateSummaryChain);
    parallelRawDataProcessing.branch(datalabSubmitChain);
    parallelRawDataProcessing.branch(fileTypeDetectionChain);

    // Construct the overall state machine definition.
    const definition = storeGlobals
      .next(stepConvertToPdfLambda.step.addCatch(stepUpdateTaskStatusLambda.stepSetFailed))
      .next(parallelRawDataProcessing.addCatch(stepUpdateTaskStatusLambda.stepSetFailed))
      .next(stepUpdateTaskStatusLambda.stepSetCompleted);

    // Define the State Machine.
    this.stateMachine = new sfn.StateMachine(this, 'task-state-machine', {
      definition,
      queryLanguage: sfn.QueryLanguage.JSONATA,
    });

    // Output the state machine ARN
    new CfnOutput(this, 'StateMachineArn', {
      value: this.stateMachine.stateMachineArn,
      exportName: `${this.stackName}-StateMachineArn`,
    });
  }
}

