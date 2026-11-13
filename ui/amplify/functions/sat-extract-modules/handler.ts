import type { Schema } from "@database-schema";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/sat-extract-modules';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createAIClient } from '@ai-client';
import { INTENT } from '@ai-intents/types';
import { TIER } from '@ai-intents/tier';
import { UserContentItem } from '@ai-providers/types';
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { 
  IdentifiedQuestionModule, 
  QUESTION_MODULE_IDENTIFICATION_PROMPT
} from "./module-identification-prompt";
import { identifyQuestionModulesTool } from "@ai-tools/identify-question-modules-tool";
import { UnifiedFunctionCall } from "@ai-providers/unified-types";
import { withSentryLambdaHandler } from "../common/sentry-lambda";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  env as any
);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const cloudwatchClient = new CloudWatchClient({});

// Helper function to log and update job with extraction progress
const logProgress = async (jobUuid: string, message: string, currentLogs?: string) => {
  const timestamp = new Date().toISOString();
  const logEntry = `**[${timestamp}]** ${message}`;
  const updatedLogs = currentLogs ? `${currentLogs}\n${logEntry}` : logEntry;
  
  console.log(message); // Still log to CloudWatch
  
  try {
    await client.models.QuestionExtractJob.update({
      questionExtractJobUuid: jobUuid,
      extractionLogs: updatedLogs,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to update extraction logs:', error);
  }
  
  return updatedLogs;
};

const satExtractModulesHandler = async (event: { arguments: { questionExtractJobUuid: string } }) => {
  console.log('SAT Extract Modules started', event);

  const { questionExtractJobUuid } = event.arguments;
  let currentLogs = '';

  try {
    // 1. Get the job from database
    const jobResponse = await client.models.QuestionExtractJob.get({
      questionExtractJobUuid
    });

    if (!jobResponse.data) {
      throw new Error('Job not found');
    }

    const job = jobResponse.data;

    // 2. Update status to PROCESSING
    await client.models.QuestionExtractJob.update({
      questionExtractJobUuid,
      status: 'PROCESSING',
      updatedAt: new Date().toISOString(),
    });

    currentLogs = await logProgress(questionExtractJobUuid, `📄 Starting module extraction for: ${job.fileName}`, currentLogs);
    currentLogs = await logProgress(questionExtractJobUuid, `🔧 Function version: v0.1`, currentLogs);

    // 3. Get presigned URL for the file
    const command = new GetObjectCommand({
      Bucket: env.AI_TUTOR_STORAGE_BUCKET_NAME,
      Key: job.s3Key,
    });
    const fileUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // ==================== PHASE 1: IDENTIFY MODULES ====================
    currentLogs = await logProgress(questionExtractJobUuid, `🔍 **Phase 1**: Identifying modules in document...`, currentLogs);
    
    const aiClient = createAIClient({
      userUuid: job.userUuid,
      saveTokenData: async (tokenData) => { await client.models.UserRequest.create(tokenData) },
      cloudwatchClient,
    });

    const userContent: UserContentItem[] = [
      {
        mimeType: 'text/plain',
        content: 'Identify all modules in this SAT exam document',
      },
      {
        mimeType: job.fileType,
        contentURL: fileUrl,
      },
    ];

    const moduleIdentificationResponse = await aiClient.call({
      intent: INTENT.EXTRACT_MODULES,
      userTier: TIER.FREE,
      prompt: QUESTION_MODULE_IDENTIFICATION_PROMPT,
      userContent,
      category: 'extraction',
      feature: 'extraction_identify_modules',
      tools: [identifyQuestionModulesTool],
      temperature: 0.3,
      messages: [],
    });

    if (moduleIdentificationResponse.error) {
      throw new Error(`Module identification failed: ${moduleIdentificationResponse.error}`);
    }

    const moduleOutput = moduleIdentificationResponse.output || [];
    const moduleToolCall = moduleOutput.find((item) => item.type === 'function_call') as UnifiedFunctionCall | undefined;
    
    if (!moduleToolCall) {
      throw new Error('No modules identified from AI response');
    }

    const moduleData = JSON.parse(moduleToolCall.arguments);
    const identifiedModules: IdentifiedQuestionModule[] = moduleData.modules;

    if (identifiedModules.length === 0) {
      throw new Error('No modules were identified in the document');
    }

    // Log identified modules
    const modulesList = identifiedModules.map(m => 
      `- Module ${m.moduleNumber}: ${m.moduleName} (pages ${m.startPage}-${m.endPage}, ${m.questionCount} questions)`
    ).join('\n');
    currentLogs = await logProgress(questionExtractJobUuid, `✅ Found ${identifiedModules.length} modules:\n${modulesList}`, currentLogs);

    // Store the identified modules in the job
    await client.models.QuestionExtractJob.update({
      questionExtractJobUuid,
      status: 'MODULES_EXTRACTED',
      identifiedModules: JSON.stringify(identifiedModules),
      updatedAt: new Date().toISOString(),
    });

    currentLogs = await logProgress(questionExtractJobUuid, `✅ Module identification complete. Ready for review.`, currentLogs);

    return {
      success: true,
      modules: identifiedModules,
    };

  } catch (error: any) {
    console.error('Error in satExtractModules:', error);
    currentLogs = await logProgress(questionExtractJobUuid, `❌ Error: ${error.message}`, currentLogs);

    // Update job with error
    await client.models.QuestionExtractJob.update({
      questionExtractJobUuid,
      status: 'FAILED',
      error: error.message,
      updatedAt: new Date().toISOString(),
    });

    throw error;
  }
};

export const handler = withSentryLambdaHandler(satExtractModulesHandler);

