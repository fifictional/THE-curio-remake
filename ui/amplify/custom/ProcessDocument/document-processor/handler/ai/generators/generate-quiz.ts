import { Logger } from "@aws-lambda-powertools/logger";
import { UnifiedFunctionCall } from "@ai-providers/unified-types";
import { promptMessage } from "../prompts/system-prompt";
import { createUserRequest } from "../../database/user-requests/create-user-request";
import { createAIClient } from "@ai-client";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { 
  NoResponseError, 
  ValidationError
} from "../../errors/error";
import { INTENT } from "@ai-intents/types";
import { TIER } from "@ai-intents/tier";
import { UserContentItem } from "@ai-providers/types";

const cloudwatchClient = new CloudWatchClient({});

const logger = new Logger({
  logLevel: "INFO",
  serviceName: "document-processor/generate-quiz",
});

import { generateQuizTool } from "@ai-tools/generate-quiz-tool";

export const generateQuiz = async (documentUuid: string, enrichedMarkdown: string, userUuid: string) => {
  logger.info('Generating Quiz for document:', { documentUuid });

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
        content: 'Generate quiz questions from this document',
      },
    ];

    const result = await aiClient.call({
      intent: INTENT.GENERATE_QUESTIONS,
      userTier: TIER.FREE,
      prompt: promptMessage(enrichedMarkdown),
      userContent,
      category: 'document',
      feature: 'document_quiz',
      tools: [generateQuizTool],
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
        if (!validatedData.questions || !Array.isArray(validatedData.questions)) {
          logger.error('Parsed data does not have questions array:', { validatedData });
          throw new ValidationError('Parsed data does not have questions array');
        }

        return validatedData;
      }
    }
  } catch (error) {
    logger.error('Error in quiz generation:', { 
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      documentUuid 
    });

    throw error;
  }
};