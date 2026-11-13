import { defineBackend, secret } from '@aws-amplify/backend';
import { auth, overrideCognitoDefaultSettings } from './auth/resource';
import { data } from './data/resource';
import { storage, promptStorage } from './storage/resource';
import { ProcessDocumentBackend } from './custom/ProcessDocument/resource';
import { addPoliciesAndStream, processTaskStream } from './functions/process-task-stream/resource';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { configureQdrantAccess } from './utils/qdrant-config';
import * as cdk from 'aws-cdk-lib';
import { subscriptionUpdate } from './functions/subscription-update/resource';
import { transactionCompleted } from './functions/transaction-completed/resource';
import { satExtractModules } from './functions/sat-extract-modules/resource';
import { satExtractAnswerModules } from './functions/sat-extract-answer-modules/resource';
import { satQuestionExtractor } from './functions/sat-question-extractor/resource';
import { fixQuestionConcepts } from './functions/fix-question-concepts/resource';
import { retrieveDatalabQuery } from './functions/retrieve-datalab-query/resource'
import { embedSpaceFlashcards } from './functions/embed-space-flashcards/resource';
import { batchMutator } from './functions/batch-processor/batch-mutator/resource';
import { qdrantExportMutator } from './functions/batch-processor/qdrant-export-mutator/resource';
import { BatchProcessingStack } from './functions/batch-processor/batch-stack';
import * as iam from 'aws-cdk-lib/aws-iam';
import { FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda';
import { Tags } from 'aws-cdk-lib';
import { queryRagLambda } from './functions/query-rag-lambda/resource'
import { extractAndEmbedLambda } from './functions/extract-and-embed/resource'
import { processDocumentUpdateTaskStatus } from './functions/process-document-update-task-status/resource';
import { processDocumentCreateSummary } from './functions/process-document-create-summary/resource';
import { processDocumentCreateFlashcards } from './functions/process-document-create-flashcards/resource';
import { processDocumentCategorise } from './functions/process-document-categorise/resource';
import { processDocumentDatalabSubmit } from './functions/process-document-datalab-submit/resource';
import { processDocumentDatalabWaitForToken } from './functions/process-document-datalab-wait-for-token/resource';
import { memoryReflection } from './functions/memory-reflection/resource';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

// Phase 5 — 26 GraphQL ops consolidated into 3 Hono Lambdas (§10.7).
import { honoLight } from './hono/lambdas/hono-light/resource';
import { honoHeavy } from './hono/lambdas/hono-heavy/resource';

import { processDocumentDatalabRetrieve } from './functions/process-document-datalab-retrieve/resource';
import { processDocumentFileTypeDetection } from './functions/process-document-file-type-detection/resource';
import { QueuesStack } from './custom/queues-stack/resource';
import { mergeDuplicateUser } from './functions/merge-duplicate-user/resource';
import { questionBankBackup } from './functions/question-bank-backup/resource';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Duration } from 'aws-cdk-lib';

const currentBranch = process.env.AWS_BRANCH || "local";

const backend = defineBackend({
  auth,
  data,
  storage,
  promptStorage,
  processTaskStream,
  subscriptionUpdate,
  transactionCompleted,
  satExtractModules,
  satExtractAnswerModules,
  satQuestionExtractor,
  fixQuestionConcepts,
  queryRagLambda,
  extractAndEmbedLambda,
  mergeDuplicateUser,
  batchMutator,
  qdrantExportMutator,
  embedSpaceFlashcards,
  processDocumentUpdateTaskStatus,
  processDocumentCreateSummary,
  processDocumentCreateFlashcards,
  processDocumentCategorise,
  processDocumentDatalabSubmit,
  processDocumentDatalabRetrieve,
  processDocumentFileTypeDetection,
  retrieveDatalabQuery,
  processDocumentDatalabWaitForToken,
  questionBankBackup,
  memoryReflection,
  honoLight,
  honoHeavy,
});

// override cognito default settings
overrideCognitoDefaultSettings(backend.auth.resources.cfnResources);

// Grant subscription-update function access to Amplify Data API via env vars
// This avoids cyclic dependency by passing the endpoint and key directly
const apiUrl = backend.data.graphqlUrl;
const apiKey = backend.data.apiKey || '';

/**
 * Enable Point-in-Time Recovery (PITR) for DynamoDB tables
 * @param tableNames Array of table names to enable PITR for
 * @param throwOnMissing If true, throw error when table is not found. If false, log warning and continue.
 * @returns Record mapping table names to their ARN and table name info
 */
function enablePITRForTables(
  tableNames: string[],
  throwOnMissing: boolean = false
): Record<string, { tableArn: string; tableName: string }> {
  const tableInfo: Record<string, { tableArn: string; tableName: string }> = {};

  for (const tableName of tableNames) {
    const table = backend.data.resources.cfnResources.amplifyDynamoDbTables[tableName];
    if (!table) {
      const message = `Table ${tableName} not found`;
      if (throwOnMissing) {
        throw new Error(message);
      }
      console.warn(`${message}, skipping PITR`);
      continue;
    }

    table.pointInTimeRecoveryEnabled = true;

    // Store table info for backup stack
    const tableResource = backend.data.resources.tables[tableName];
    if (tableResource) {
      // Construct ARN from table name: arn:aws:dynamodb:region:account:table/table-name
      const tableArn = cdk.Stack.of(backend.stack).formatArn({
        service: 'dynamodb',
        resource: 'table',
        resourceName: tableResource.tableName,
      });

      tableInfo[tableName] = {
        tableArn,
        tableName: tableResource.tableName,
      };
    }
  }

  return tableInfo;
}

// Enable PITR for all tables that need it
enablePITRForTables(['Purchase'], true); // Purchase table is required

const questionBankTableNames = [
  'ExtractedQuestion',
  'ExamModule',
  'QuestionExtractJob',
  'QuestionGenerationJob',
];
const questionBankTableInfo = enablePITRForTables(questionBankTableNames);

const taskTable = backend.data.resources.tables.Task;
const processTaskStreamLambda = backend.processTaskStream.resources.lambda;
addPoliciesAndStream(taskTable, processTaskStreamLambda);

// const stackEnvId = currentBranch === 'release' ? 'prod' : 'dev';

const queuesStack = backend.createStack('queues');
const queuesStackResource = new QueuesStack(queuesStack, 'queues');
backend.processTaskStream.addEnvironment('QUEUE_URL', queuesStackResource.processDocumentQueue.queueUrl);

const memoryQueue = queuesStackResource.memoryReflectionQueue;
const memoryQueueUrl = memoryQueue.queueUrl;
backend.memoryReflection.addEnvironment('MEMORY_REFLECTION_QUEUE_URL', memoryQueueUrl);
backend.honoLight.addEnvironment('MEMORY_REFLECTION_QUEUE_URL', memoryQueueUrl);
backend.honoHeavy.addEnvironment('MEMORY_REFLECTION_QUEUE_URL', memoryQueueUrl);

memoryQueue.grantSendMessages(backend.honoLight.resources.lambda);
memoryQueue.grantSendMessages(backend.honoHeavy.resources.lambda);
memoryQueue.grantConsumeMessages(backend.memoryReflection.resources.lambda);

backend.memoryReflection.resources.lambda.addEventSource(
  new SqsEventSource(memoryQueue, {
    batchSize: 1,
    maxConcurrency: 5,
  })
);

// Create QuestionBank backup infrastructure (in data stack to avoid circular dependency)
if (Object.keys(questionBankTableInfo).length === questionBankTableNames.length) {
  const userName = process.env.USER || process.env.LOGNAME || 'unknown';
  const nameSuffix = currentBranch === "local" ? `${currentBranch}-${userName}` : currentBranch;
  const backupLambda = backend.questionBankBackup.resources.lambda;

  // Create S3 bucket for backups with encryption and lifecycle
  const backupBucket = new s3.Bucket(backend.stack, 'QuestionBankBackupBucket', {
    bucketName: `question-bank-backups-${nameSuffix}`,
    encryption: s3.BucketEncryption.S3_MANAGED,
    versioned: false,
    lifecycleRules: [
      {
        id: 'expire-old-backups',
        expiration: Duration.days(30), // Keep backups for 30 days
        enabled: true,
      },
    ],
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  });

  // Grant Lambda permission to write to the bucket
  backupBucket.grantWrite(backupLambda);

  // Set environment variables for Lambda
  backend.questionBankBackup.addEnvironment('BACKUP_BUCKET_NAME', backupBucket.bucketName);
  backend.questionBankBackup.addEnvironment('EXTRACTED_QUESTION_TABLE_ARN', questionBankTableInfo['ExtractedQuestion'].tableArn);
  backend.questionBankBackup.addEnvironment('EXAMMODULE_TABLE_ARN', questionBankTableInfo['ExamModule'].tableArn);
  backend.questionBankBackup.addEnvironment('QUESTIONEXTRACTJOB_TABLE_ARN', questionBankTableInfo['QuestionExtractJob'].tableArn);
  backend.questionBankBackup.addEnvironment('QUESTIONGENERATIONJOB_TABLE_ARN', questionBankTableInfo['QuestionGenerationJob'].tableArn);

  // Grant Lambda permission to start DynamoDB exports
  backupLambda.addToRolePolicy(new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'dynamodb:ExportTableToPointInTime',
      'dynamodb:DescribeExport',
    ],
    resources: [
      questionBankTableInfo['ExtractedQuestion'].tableArn,
      questionBankTableInfo['ExamModule'].tableArn,
      questionBankTableInfo['QuestionExtractJob'].tableArn,
      questionBankTableInfo['QuestionGenerationJob'].tableArn,
    ],
  }));

  // Create EventBridge rule for weekly backup (every Sunday at 2 AM UTC)
  const weeklyBackupRule = new events.Rule(backend.stack, 'QuestionBankWeeklyBackupRule', {
    ruleName: `question-bank-weekly-backup-${nameSuffix}`,
    description: 'Triggers weekly backup of QuestionBank tables',
    schedule: events.Schedule.cron({
      minute: '0',
      hour: '2',
      month: '*',
      weekDay: 'SUN', // Every Sunday
    }),
    enabled: true,
  });

  // Add Lambda as target
  weeklyBackupRule.addTarget(new targets.LambdaFunction(backupLambda));
}

const customResourceStack = backend.createStack('document-processing');

// Create nested stack for batch processing
// PHASE 1: Create the stack but don't link it (so old resources are deleted)
// PHASE 2: Uncomment the lines below to link the stack
const batchProcessingStack = backend.createStack('batch-processing');
const batchStack = new BatchProcessingStack(
  batchProcessingStack,
  'BatchProcessingStack',
  {
    creatorLambda: backend.honoHeavy.resources.lambda,
    mutatorLambda: backend.batchMutator.resources.lambda,
    qdrantExportMutatorLambda: backend.qdrantExportMutator.resources.lambda,
  }
);

backend.honoHeavy.addEnvironment('BATCH_QUEUE_URL', batchStack.queue.queueUrl);
batchStack.queue.grantSendMessages(backend.honoHeavy.resources.lambda);
backend.batchMutator.addEnvironment('AWS_BRANCH', currentBranch);
backend.batchMutator.addEnvironment("COGNITO_USER_POOL_ID", backend.auth.resources.userPool.userPoolId);
// The mutator increments BatchProcess.completedJobs with raw DynamoDB (atomic
// ADD). It must target THIS environment's table — discovering it via
// ListTables picks the alphabetically-first environment in the account.
// Both batchMutator and the table live in the data stack, so no circular dep.
backend.batchMutator.addEnvironment(
  'BATCH_PROCESS_TABLE_NAME',
  backend.data.resources.tables['BatchProcess'].tableName
);
backend.qdrantExportMutator.addEnvironment('AWS_BRANCH', currentBranch);
backend.qdrantExportMutator.addEnvironment(
  'BATCH_PROCESS_TABLE_NAME',
  backend.data.resources.tables['BatchProcess'].tableName
);

// EOPRD-813: Schedule chat summary embed job every 24h for space RAG
const batchNameSuffix = currentBranch === "local" ? `${currentBranch}-${process.env.USER || "default"}` : currentBranch;
const chatSummaryRule = new events.Rule(backend.stack, "ChatSummaryEmbedSchedule", {
  ruleName: `chat-summary-embed-${batchNameSuffix}`,
  description: "Triggers chat summary embed job every 24h for space RAG (EOPRD-813)",
  schedule: events.Schedule.cron({ minute: "0", hour: "3", month: "*", weekDay: "*", year: "*" }),
  enabled: true,
});
chatSummaryRule.addTarget(
  new targets.LambdaFunction(backend.honoHeavy.resources.lambda, {
    event: events.RuleTargetInput.fromObject({
      arguments: { jobType: "chat-summary-embed", jobName: "Chat Summary Embed" },
    }),
  })
);

const processDocumentBackend = new ProcessDocumentBackend(
  customResourceStack,
  `/document-processing/${currentBranch}`,
  {
    apiUrl,
    apiKey,
    bucketName: backend.storage.resources.bucket.bucketName,
    // P5 — ProcessDocument dispatcher targets Hono Lambdas (§10.7 P5-5).
    // Payloads include `__route` for the Hono direct-invoke adapter.
    chatLambdaArn: backend.honoHeavy.resources.lambda.functionArn,
    processDocumentQueue: queuesStackResource.processDocumentQueue,
    mockExamsGenerateQuestionsLambdaArn: backend.honoHeavy.resources.lambda.functionArn,
    satExtractModulesLambdaArn: backend.satExtractModules.resources.lambda.functionArn,
    satExtractAnswerModulesLambdaArn: backend.satExtractAnswerModules.resources.lambda.functionArn,
    satQuestionExtractorLambdaArn: backend.satQuestionExtractor.resources.lambda.functionArn,
    generateQuestionsLambdaArn: backend.honoHeavy.resources.lambda.functionArn,
    // Pass Amplify function references
    updateTaskStatusLambda: backend.processDocumentUpdateTaskStatus.resources.lambda,
    createSummaryLambda: backend.processDocumentCreateSummary.resources.lambda,
    createFlashcardsLambda: backend.processDocumentCreateFlashcards.resources.lambda,
    categoriseDocumentLambda: backend.processDocumentCategorise.resources.lambda,
    datalabSubmitLambda: backend.processDocumentDatalabSubmit.resources.lambda,
    datalabRetrieveLambda: backend.processDocumentDatalabRetrieve.resources.lambda,
    extractAndEmbedLambda: backend.extractAndEmbedLambda.resources.lambda,
    fileTypeDetectionLambda: backend.processDocumentFileTypeDetection.resources.lambda,
    datalabWaitForTokenLambda: backend.processDocumentDatalabWaitForToken.resources.lambda
  },
);

// ✅ Bedrock embeddings (Titan) — OpenSearch stack removed after Qdrant migration
const bedrockInvokePolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
  resources: ['*'],
});
for (const fn of [
  backend.extractAndEmbedLambda.resources.lambda,
  backend.queryRagLambda.resources.lambda,
  backend.batchMutator.resources.lambda,
  backend.qdrantExportMutator.resources.lambda,
  backend.embedSpaceFlashcards.resources.lambda,
  backend.memoryReflection.resources.lambda,
  backend.honoHeavy.resources.lambda,
]) {
  fn.addToRolePolicy(bedrockInvokePolicy);
}

backend.storage.resources.bucket.grantRead(processDocumentBackend.convertToPdfLambda);
backend.storage.resources.bucket.grantWrite(processDocumentBackend.convertToPdfLambda);
backend.storage.resources.bucket.grantPut(processDocumentBackend.convertToPdfLambda);

// Grant S3 read access to batchMutator (moved from storage/resource.ts to avoid circular dependency)
// backend.storage.resources.bucket.grantRead(backend.batchMutator.resources.lambda);

// Exam paper orchestrator ARN is already stored in SSM by the ProcessExamPaperBackend
// const openaiSecret = secretsmanager.Secret.fromSecretNameV2(backend.stack, 'OpenaiApiKey', 'openai/api-key');
const anthropicApiKey = secretsmanager.Secret.fromSecretNameV2(backend.stack, 'AnthropicApiKey', 'anthropic/api-key');
// const openaiSecret = secretsmanager.Secret.fromSecretNameV2(backend.stack, 'AnthropicApiKey', 'anthropic/api-key');
anthropicApiKey.grantRead(backend.satExtractModules.resources.lambda);
anthropicApiKey.grantRead(backend.satExtractAnswerModules.resources.lambda);
anthropicApiKey.grantRead(backend.satQuestionExtractor.resources.lambda);
anthropicApiKey.grantRead(backend.honoHeavy.resources.lambda);
anthropicApiKey.grantRead(backend.fixQuestionConcepts.resources.lambda);
anthropicApiKey.grantRead(backend.batchMutator.resources.lambda);

// Grant secrets access to new document processing functions
anthropicApiKey.grantRead(backend.processDocumentCreateSummary.resources.lambda);
anthropicApiKey.grantRead(backend.processDocumentCreateFlashcards.resources.lambda);
anthropicApiKey.grantRead(backend.processDocumentCategorise.resources.lambda);
anthropicApiKey.grantRead(backend.processDocumentFileTypeDetection.resources.lambda);

const geminiSecret = secretsmanager.Secret.fromSecretNameV2(backend.stack, 'GeminiApiKey', 'gemini-api-key');
geminiSecret.grantRead(backend.honoHeavy.resources.lambda);
geminiSecret.grantRead(backend.batchMutator.resources.lambda);
geminiSecret.grantRead(backend.processDocumentCreateSummary.resources.lambda);
geminiSecret.grantRead(backend.processDocumentCreateFlashcards.resources.lambda);
geminiSecret.grantRead(backend.memoryReflection.resources.lambda);

const supadataSecret = secretsmanager.Secret.fromSecretNameV2(backend.stack, 'SupadataApiKey', 'supadata/api-key');
supadataSecret.grantRead(processDocumentBackend.convertToPdfLambda);

const youtubeSecret = secretsmanager.Secret.fromSecretNameV2(backend.stack, 'YoutubeApiKey', 'youtube/api-key');
youtubeSecret.grantRead(processDocumentBackend.convertToPdfLambda);

const datalabSecret = secretsmanager.Secret.fromSecretNameV2(backend.stack, 'DatalabApiKey', 'datalab-api-key');
datalabSecret.grantRead(backend.processDocumentDatalabSubmit.resources.lambda);
datalabSecret.grantRead(backend.processDocumentDatalabRetrieve.resources.lambda);

/**
 * REQUIRED for WAIT_FOR_TASK_TOKEN callback
 */
backend.retrieveDatalabQuery.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    actions: [
      'states:SendTaskSuccess',
      'states:SendTaskFailure',
    ],
    resources: ['*'],
  })
);

backend.processDocumentDatalabWaitForToken.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    actions: [
      'states:SendTaskSuccess',
      'states:SendTaskFailure',
    ],
    resources: ['*'],
  })
);

// create a new stack for custom metrics
// const customMetricsStack = backend.createStack('metrics');
// new CustomMetricsStack(customMetricsStack, `/metrics/${currentBranch}`);

const qdrantBranch = currentBranch;

const vectorLambdas = [
  backend.extractAndEmbedLambda,
  backend.queryRagLambda,
  backend.embedSpaceFlashcards,
  backend.memoryReflection,
  backend.honoHeavy,
  backend.qdrantExportMutator,
];

for (const amplifyFunction of vectorLambdas) {
  configureQdrantAccess(amplifyFunction, backend.stack, {
    branch: qdrantBranch,
  });
}

// Tag all resources with user name and environment
const userName = process.env.USER || process.env.LOGNAME || 'unknown';
Tags.of(backend.stack).add('Owner', userName);
Tags.of(backend.stack).add('Environment', currentBranch);
Tags.of(customResourceStack).add('Owner', userName);
Tags.of(customResourceStack).add('Environment', currentBranch);
Tags.of(batchProcessingStack).add('Owner', userName);
Tags.of(batchProcessingStack).add('Environment', currentBranch);

cloudwatch.Metric.grantPutMetricData(backend.satExtractModules.resources.lambda);
cloudwatch.Metric.grantPutMetricData(backend.satExtractAnswerModules.resources.lambda);
cloudwatch.Metric.grantPutMetricData(backend.satQuestionExtractor.resources.lambda);
cloudwatch.Metric.grantPutMetricData(backend.fixQuestionConcepts.resources.lambda);

cloudwatch.Metric.grantPutMetricData(backend.processDocumentCreateSummary.resources.lambda);
cloudwatch.Metric.grantPutMetricData(backend.processDocumentCreateFlashcards.resources.lambda);
cloudwatch.Metric.grantPutMetricData(backend.processDocumentCategorise.resources.lambda);
cloudwatch.Metric.grantPutMetricData(backend.processDocumentFileTypeDetection.resources.lambda);

cloudwatch.Metric.grantPutMetricData(backend.batchMutator.resources.lambda);

cloudwatch.Metric.grantPutMetricData(backend.extractAndEmbedLambda.resources.lambda);
cloudwatch.Metric.grantPutMetricData(backend.queryRagLambda.resources.lambda);

cloudwatch.Metric.grantPutMetricData(backend.memoryReflection.resources.lambda);

cloudwatch.Metric.grantPutMetricData(backend.honoLight.resources.lambda);
cloudwatch.Metric.grantPutMetricData(backend.honoHeavy.resources.lambda);

backend.honoLight.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['cognito-idp:ListUsers'],
  resources: [backend.auth.resources.userPool.userPoolArn],
}));
backend.subscriptionUpdate.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['cognito-idp:ListUsers'],
  resources: [backend.auth.resources.userPool.userPoolArn],
}));

backend.honoLight.addEnvironment("COGNITO_USER_POOL_ID", backend.auth.resources.userPool.userPoolId);
const sentryRelease =
  process.env.AWS_COMMIT_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  `amplify-${currentBranch}`;
const sentryEnvironment =
  process.env.SENTRY_ENVIRONMENT ||
  (currentBranch === "release"
    ? "production"
    : currentBranch === "local"
      ? "development"
      : "staging");

const functionsWithSentryEnv = [
  backend.processTaskStream,
  backend.subscriptionUpdate,
  backend.transactionCompleted,
  backend.satExtractModules,
  backend.satExtractAnswerModules,
  backend.satQuestionExtractor,
  backend.fixQuestionConcepts,
  backend.queryRagLambda,
  backend.extractAndEmbedLambda,
  backend.mergeDuplicateUser,
  backend.batchMutator,
  backend.qdrantExportMutator,
  backend.embedSpaceFlashcards,
  backend.processDocumentUpdateTaskStatus,
  backend.processDocumentCreateSummary,
  backend.processDocumentCreateFlashcards,
  backend.processDocumentCategorise,
  backend.processDocumentDatalabSubmit,
  backend.processDocumentDatalabRetrieve,
  backend.processDocumentFileTypeDetection,
  backend.retrieveDatalabQuery,
  backend.processDocumentDatalabWaitForToken,
  backend.questionBankBackup,
  backend.memoryReflection,
  backend.honoLight,
  backend.honoHeavy,
] as const;

for (const fn of functionsWithSentryEnv) {
  fn.addEnvironment("SENTRY_RELEASE", sentryRelease);
  fn.addEnvironment("SENTRY_ENVIRONMENT", sentryEnvironment);
}

// process-task-stream uses raw CDK NodejsFunction; bind Amplify secret here (not in CDK env map)
backend.processTaskStream.addEnvironment("SENTRY_DSN", secret("SENTRY_DSN"));
backend.subscriptionUpdate.addEnvironment("COGNITO_USER_POOL_ID", backend.auth.resources.userPool.userPoolId);
backend.transactionCompleted.addEnvironment("COGNITO_USER_POOL_ID", backend.auth.resources.userPool.userPoolId);
backend.mergeDuplicateUser.addEnvironment("COGNITO_USER_POOL_ID", backend.auth.resources.userPool.userPoolId);
backend.processDocumentCreateFlashcards.addEnvironment("COGNITO_USER_POOL_ID", backend.auth.resources.userPool.userPoolId);
backend.processDocumentCreateFlashcards.addEnvironment("EMBED_SPACE_FLASHCARDS_FUNCTION_NAME", backend.embedSpaceFlashcards.resources.lambda.functionName);
backend.processDocumentCreateFlashcards.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ["lambda:InvokeFunction"],
  resources: [backend.embedSpaceFlashcards.resources.lambda.functionArn],
}));
backend.honoHeavy.addEnvironment("EMBED_SPACE_FLASHCARDS_FUNCTION_NAME", backend.embedSpaceFlashcards.resources.lambda.functionName);
backend.honoHeavy.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ["lambda:InvokeFunction"],
  resources: [backend.embedSpaceFlashcards.resources.lambda.functionArn],
}));
backend.honoHeavy.addEnvironment("COGNITO_USER_POOL_ID", backend.auth.resources.userPool.userPoolId);
backend.honoHeavy.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['cognito-idp:ListUsers', 'cognito-idp:AdminListGroupsForUser'],
  resources: [backend.auth.resources.userPool.userPoolArn],
}));
backend.honoHeavy.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['cognito-idp:AdminDeleteUser'],
  resources: [backend.auth.resources.userPool.userPoolArn],
}));
backend.batchMutator.addEnvironment("COGNITO_USER_POOL_ID", backend.auth.resources.userPool.userPoolId);

backend.mergeDuplicateUser.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: [
    'cognito-idp:AdminDeleteUser',
    'cognito-idp:AdminDisableUser',
    'cognito-idp:AdminUserGlobalSignOut',
  ],
  resources: [backend.auth.resources.userPool.userPoolArn],
}));

// Grant the transactionCompleted function permission to list users in the Cognito User Pool
backend.transactionCompleted.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['cognito-idp:ListUsers'],
  resources: [backend.auth.resources.userPool.userPoolArn],
}));
// Grant the processDocumentCreateFlashcards function permission to list users and check admin groups in the Cognito User Pool
backend.processDocumentCreateFlashcards.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['cognito-idp:ListUsers', 'cognito-idp:AdminListGroupsForUser'],
  resources: [backend.auth.resources.userPool.userPoolArn],
}));
// honoHeavy hosts generateQuestions — duplicate Cognito policy merged above.
// Grant the batchMutator function permission to list users in the Cognito User Pool
backend.batchMutator.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['cognito-idp:ListUsers'],
  resources: [backend.auth.resources.userPool.userPoolArn],
}));

// Create Function URL for subscription-update webhook
const subscriptionUpdateUrl = backend.subscriptionUpdate.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE, // Webhook endpoint, will verify Paddle signature in handler
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [HttpMethod.POST, HttpMethod.GET],
    allowedHeaders: ['*'],
  },
});

// Create Function URL for transaction-completed webhook
const transactionCompletedUrl = backend.transactionCompleted.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE, // Webhook endpoint, will verify Paddle signature in handler
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [HttpMethod.POST, HttpMethod.GET],
    allowedHeaders: ['*'],
  },
});

// // Create Function URL for transaction-completed webhook
const datalabCallBackUrl = backend.retrieveDatalabQuery.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE, // Webhook endpoint, will verify Paddle signature in handler
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [HttpMethod.POST],
    allowedHeaders: ['*'],
  },
});

// adding env var
backend.processDocumentDatalabSubmit.addEnvironment('datalabCallBackUrl', datalabCallBackUrl.url);

// Finally, Add all stack outputs
backend.addOutput({
  custom: {
    queueArn: queuesStackResource.processDocumentQueue.queueArn,
    queueName: queuesStackResource.processDocumentQueue.queueName,
    queueUrl: queuesStackResource.processDocumentQueue.queueUrl,
    subscriptionUpdateUrl: subscriptionUpdateUrl.url,
    transactionCompletedUrl: transactionCompletedUrl.url,
    // Knowledge-base graph DB removed — stubs served via honoHeavy
    batchQueueUrl: batchStack.queue.queueUrl,
    batchCreatorFunctionName: backend.honoHeavy.resources.lambda.functionName,
    batchMutatorFunctionName: backend.batchMutator.resources.lambda.functionName,
    extractAndEmbedFunctionName: backend.extractAndEmbedLambda.resources.lambda.functionName,
    mergeDuplicateUserFunctionName: backend.mergeDuplicateUser.resources.lambda.functionName,
    datalabCallBackUrl: datalabCallBackUrl.url,
  },
});

// NOTE: SSM parameter creation removed - it was causing circular dependency
// Instead, batchMutator will read API key from Amplify Data client config at runtime