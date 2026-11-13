import type { Schema } from "@database-schema";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/sat-question-extractor';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { withSentryLambdaHandler } from "../common/sentry-lambda";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  env as any
);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

const logProgress = async (jobUuid: string, message: string, currentLogs?: string) => {
  const timestamp = new Date().toISOString();
  const logEntry = `**[${timestamp}]** ${message}`;
  const updatedLogs = currentLogs ? `${currentLogs}\n${logEntry}` : logEntry;

  console.log(message);

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

const satQuestionExtractorHandler = async (event: { arguments: { questionExtractJobUuid: string } }) => {
  console.log('SAT Question Extractor started', event);

  const { questionExtractJobUuid } = event.arguments;
  let currentLogs = '';

  try {
    currentLogs = await logProgress(
      questionExtractJobUuid,
      '❌ Knowledge-base graph decommissioned — SAT concept list unavailable',
      currentLogs,
    );
    throw new Error('SAT question extraction requires knowledge-base concepts (graph store decommissioned).');
  } catch (error) {
    console.error('Error extracting questions:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await logProgress(
      questionExtractJobUuid,
      `❌ **Extraction failed**: ${errorMessage}`,
      currentLogs,
    );

    await client.models.QuestionExtractJob.update({
      questionExtractJobUuid,
      status: 'FAILED',
      error: errorMessage,
      updatedAt: new Date().toISOString(),
    });

    throw error;
  }
};

export const handler = withSentryLambdaHandler(satQuestionExtractorHandler);
