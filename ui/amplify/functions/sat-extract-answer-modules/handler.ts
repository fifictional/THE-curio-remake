import type { Schema } from "@database-schema";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/sat-extract-answer-modules';
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
  IdentifiedAnswerKeyModule, 
  ANSWER_KEY_MODULE_IDENTIFICATION_PROMPT
} from "./module-identification-prompt";
import { identifyAnswerKeyModulesTool } from "@ai-tools/identify-answer-key-modules-tool";
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

const satExtractAnswerModulesHandler = async (event: { arguments: { questionExtractJobUuid: string } }) => {
  console.log('SAT Extract Answer Modules started', event);

  const { questionExtractJobUuid } = event.arguments;

  try {
    // 1. Get the job from database
    const jobResponse = await client.models.QuestionExtractJob.get({
      questionExtractJobUuid
    });

    if (!jobResponse.data) {
      throw new Error('Job not found');
    }

    const job = jobResponse.data;
    
    // Load existing logs to continue from where we left off
    let currentLogs = job.extractionLogs || '';

    if (!job.answerKeyS3Key) {
      throw new Error('No answer key uploaded for this job');
    }

    // 2. Update answer key status to PROCESSING
    await client.models.QuestionExtractJob.update({
      questionExtractJobUuid,
      answerKeyStatus: 'PROCESSING',
      updatedAt: new Date().toISOString(),
    });

    currentLogs = await logProgress(questionExtractJobUuid, `📄 Starting answer module extraction for: ${job.answerKeyFileName}`, currentLogs);
    currentLogs = await logProgress(questionExtractJobUuid, `🔧 Function version: v0.1`, currentLogs);

    // 3. Get presigned URL for the answer key file
    const command = new GetObjectCommand({
      Bucket: env.AI_TUTOR_STORAGE_BUCKET_NAME,
      Key: job.answerKeyS3Key,
    });
    const fileUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // ==================== IDENTIFY MODULES IN ANSWER KEY ====================
    currentLogs = await logProgress(questionExtractJobUuid, `🔍 Identifying modules in answer key document...`, currentLogs);
    
    const aiClient = createAIClient({
      userUuid: job.userUuid,
      saveTokenData: async (tokenData) => { await client.models.UserRequest.create(tokenData) },
      cloudwatchClient,
    });

    const userContent: UserContentItem[] = [
      {
        mimeType: 'text/plain',
        content: 'Identify all modules in this SAT answer key document',
      },
      {
        mimeType: 'application/pdf',
        contentURL: fileUrl,
      },
    ];

    const moduleIdentificationResponse = await aiClient.call({
      intent: INTENT.EXTRACT_MODULES,
      userTier: TIER.FREE,
      prompt: ANSWER_KEY_MODULE_IDENTIFICATION_PROMPT,
      userContent,
      category: 'extraction',
      feature: 'extraction_identify_answer_modules',
      tools: [identifyAnswerKeyModulesTool],
      temperature: 0.3,
      messages: [],
    });

    if (moduleIdentificationResponse.error) {
      throw new Error(`Answer module identification failed: ${moduleIdentificationResponse.error}`);
    }

    const moduleOutput = moduleIdentificationResponse.output || [];
    const moduleToolCall = moduleOutput.find((item) => item.type === 'function_call') as UnifiedFunctionCall | undefined;
    
    if (!moduleToolCall) {
      throw new Error('No modules identified from AI response');
    }

    const moduleData = JSON.parse(moduleToolCall.arguments);
    const identifiedModules: IdentifiedAnswerKeyModule[] = moduleData.modules;

    if (identifiedModules.length === 0) {
      throw new Error('No modules were identified in the answer key document');
    }

    // Log identified modules
    const modulesList = identifiedModules.map(m => 
      `- Module ${m.moduleNumber}: ${m.moduleName} (pages ${m.startPage}-${m.endPage}, ${m.answerCount} answers)`
    ).join('\n');
    currentLogs = await logProgress(questionExtractJobUuid, `✅ Found ${identifiedModules.length} modules in answer key:\n${modulesList}`, currentLogs);

    // Store the identified answer modules in the job
    await client.models.QuestionExtractJob.update({
      questionExtractJobUuid,
      answerKeyStatus: 'ANSWER_MODULES_EXTRACTED',
      identifiedAnswerModules: JSON.stringify(identifiedModules),
      updatedAt: new Date().toISOString(),
    });

    currentLogs = await logProgress(questionExtractJobUuid, `✅ Answer module identification complete. Ready for review.`, currentLogs);

    return {
      success: true,
      modules: identifiedModules,
    };

  } catch (error: any) {
    console.error('Error in satExtractAnswerModules:', error);
    
    // Get existing logs in case of error
    try {
      const jobResponse = await client.models.QuestionExtractJob.get({
        questionExtractJobUuid
      });
      const existingLogs = jobResponse.data?.extractionLogs || '';
      await logProgress(questionExtractJobUuid, `❌ Error: ${error.message}`, existingLogs);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    // Update job with error
    await client.models.QuestionExtractJob.update({
      questionExtractJobUuid,
      answerKeyStatus: 'FAILED',
      answerKeyError: error.message,
      updatedAt: new Date().toISOString(),
    });

    throw error;
  }
};

export const handler = withSentryLambdaHandler(satExtractAnswerModulesHandler);

