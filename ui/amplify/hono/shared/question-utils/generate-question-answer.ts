import type { Schema } from "@database-schema";
import { generateClient } from 'aws-amplify/data';
import { createAIClient } from '@ai-client';
import { INTENT } from '@ai-intents/types';
import { UserContentItem } from '@ai-providers/types';
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { ANSWER_GENERATION_PROMPT, SolvedQuestion } from '../../../functions/generate-questions/answer-generation-prompt';
import { generateAnswersTool } from '@ai-tools/generate-answers-tool';
import { UnifiedTool } from "@ai-tools/types";
import { UnifiedFunctionCall } from "@ai-providers/unified-types";
import { getUserTier } from '../../../utils/lambda-utils';

interface GenerateAnswerParams {
  client: ReturnType<typeof generateClient<Schema>>;
  question: {
    extractedQuestionUuid: string;
    questionContent: string;
    questionType: 'MULTIPLE_CHOICE' | 'TEXT_INPUT';
    questionOptions?: string[] | null;
    questionReference?: {
      text?: string | null;
      s3Key?: string | null;
    } | null;
    needsCodeInterpreterForAnswer?: boolean | null;
  };
  userUuid: string;
  cloudwatchClient: CloudWatchClient;
  logProgress?: (message: string, currentLogs?: string) => Promise<string> | string;
}

interface GenerateAnswerResult {
  success: boolean;
  error?: string;
}

/**
 * Generates an answer for a single question.
 * This function handles both Python-required and simple questions.
 */
export async function generateQuestionAnswer({
  client,
  question,
  userUuid,
  cloudwatchClient,
  logProgress,
}: GenerateAnswerParams): Promise<GenerateAnswerResult> {
  try {
    if (logProgress) {
      const result = logProgress(`🧮 Generating answer for question ${question.extractedQuestionUuid}...`);
      if (result instanceof Promise) {
        await result;
      }
    }

    // Prepare the question text
    const singleBlock = `Question 1 (UUID: ${question.extractedQuestionUuid}):\n${question.questionContent}\n${question.questionType === 'MULTIPLE_CHOICE' ? `Options:\n${(question.questionOptions || []).map((opt: string, idx: number) => `${String.fromCharCode(65 + idx)}) ${opt}`).join('\n')}` : ''}\n${question.questionReference?.text ? `Reference: ${question.questionReference.text}` : ''}\n---`;

    // Determine if we need code_interpreter
    const needsCodeInterpreter = question.needsCodeInterpreterForAnswer === true;

    // Prepare tools
    const tools: UnifiedTool[] = [generateAnswersTool];
    if (needsCodeInterpreter) {
      tools.push({
        type: 'code_interpreter' as const,
      });
    }

    // Call AI model
    const aiClient = createAIClient({
      userUuid,
      saveTokenData: async (tokenData) => { await client.models.UserRequest.create(tokenData) },
      cloudwatchClient,
    });

    // Get user's actual tier
    const userTier = await getUserTier(client, userUuid);

    const userContent: UserContentItem[] = [
      {
        mimeType: 'text/plain',
        content: singleBlock,
      },
    ];

    const solveResponse = await aiClient.call({
      intent: INTENT.EXTRACT_ANSWERS,
      userTier,
      prompt: ANSWER_GENERATION_PROMPT + `\n\nReturn a function call to generateAnswers with solvedQuestions array containing EXACTLY 1 item matching the provided UUID.`,
      userContent,
      category: 'generation',
      feature: needsCodeInterpreter ? 'generation_generate_answers_with_code_interpreter' : 'generation_generate_answers',
      tools,
      temperature: needsCodeInterpreter ? 0.2 : 0.3,
      messages: [],
    });

    if (solveResponse.error) {
      throw new Error(`Failed to solve: ${solveResponse.error}`);
    }

    // Extract structured result from function call
    const singleOut = solveResponse.output || [];
    const fnCall = singleOut.find((item) => item.type === 'function_call') as UnifiedFunctionCall | undefined;
    if (!fnCall) {
      throw new Error('No function call returned for question');
    }
    const payload = JSON.parse(fnCall.arguments) as { solvedQuestions: SolvedQuestion[] };
    
    // Validate we got exactly one answer
    if (!payload.solvedQuestions || payload.solvedQuestions.length !== 1) {
      throw new Error(`Expected exactly 1 answer, got ${payload.solvedQuestions?.length || 0}`);
    }
    
    const solved = payload.solvedQuestions[0];
    
    // Validate UUID matches
    if (solved.extractedQuestionUuid !== question.extractedQuestionUuid) {
      throw new Error(`UUID mismatch: expected ${question.extractedQuestionUuid}, got ${solved.extractedQuestionUuid}`);
    }
    
    // Update the question with the answer
    await client.models.ExtractedQuestion.update({
      extractedQuestionUuid: solved.extractedQuestionUuid,
      correctAnswer: solved.correctAnswer,
      answerExplanations: solved.answerExplanations,
      hint: solved.hint,
    });

    if (logProgress) {
      const result = logProgress(`✅ Generated answer successfully`);
      if (result instanceof Promise) {
        await result;
      }
    }
    return { success: true };
  } catch (error: any) {
    console.error('[ERROR] Answer generation failed:', error);
    
    if (logProgress) {
      const result = logProgress(`❌ Failed to generate answer: ${error.message}`);
      if (result instanceof Promise) {
        await result;
      }
    }
    return { success: false, error: error.message };
  }
}

