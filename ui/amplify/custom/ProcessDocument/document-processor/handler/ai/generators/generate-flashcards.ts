import { Logger } from "@aws-lambda-powertools/logger";
import { UnifiedFunctionCall } from "@ai-providers/unified-types";
import { promptMessage } from "../prompts/system-prompt";
import { createAIClient } from "@ai-client";
import { createUserRequest } from "../../database/user-requests/create-user-request";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { 
  NoResponseError, 
  ValidationError
} from "../../errors/error";
import { INTENT } from '@ai-intents/types';
import { TIER } from '@ai-intents/tier';
import { UserContentItem } from '@ai-providers/types';

const logger = new Logger({
  logLevel: "INFO",
  serviceName: "document-processor/generate-flashcards",
});

const cloudwatchClient = new CloudWatchClient({});

import { generateFlashcardsTool } from "@ai-tools/generate-flashcards-tool";

export const generateFlashcards = async (documentUuid: string, enrichedMarkdown: string, userUuid: string) => {
  logger.info('Generating Flashcards for document:', { documentUuid });

  try {
    const aiClient = createAIClient({
      userUuid,
      saveTokenData: createUserRequest,
      cloudwatchClient,
      documentUuid,
    });

    const userContent: UserContentItem[] = [
      {
        mimeType: 'text/plain',
        content: 'Generate flashcards from this document',
      },
    ];

    const result = await aiClient.call({
      intent: INTENT.GENERATE_FLASHCARDS,
      userTier: TIER.FREE,
      prompt: promptMessage(enrichedMarkdown),
      userContent,
      category: 'document',
      feature: 'document_flashcards',
      tools: [generateFlashcardsTool],
      temperature: 0.8,
      messages: [],
    });

    if (result.error) {
      logger.warn('No output received');
      throw new NoResponseError(result.error);
    }

    const { output } = result;

    if (!output) {
      logger.warn('No output received');
      throw new NoResponseError('No output received from AI model');
    }

    const gptOutput = output || [];

    // output will be in the function call output
    for (const item of gptOutput) {
      if(item.type === 'function_call') {
        const functionCallResponseItem = item as UnifiedFunctionCall;
        const validatedData = JSON.parse(functionCallResponseItem.arguments);
        if (!validatedData.flashcards || !Array.isArray(validatedData.flashcards)) {
          logger.error('Parsed data does not have flashcards array:', { validatedData });
          throw new ValidationError('Parsed data does not have flashcards array');
        }

        return validatedData;
      }
    }
  } catch (error) {
    logger.error('Error in flashcard generation:', { 
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      documentUuid 
    });

    throw error;
  }
};