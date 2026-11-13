import type { Schema } from '@database-schema';
import { generateClient } from 'aws-amplify/data';
import { createAIClient } from '@ai-client';
import { INTENT } from '@ai-intents/types';
import { TIER } from '@ai-intents/tier';
import { UserContentItem } from '@ai-providers/types';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { S3Client } from '@aws-sdk/client-s3';
import { UnifiedFunctionCall } from '@ai-providers/unified-types';
import { randomUUID } from 'crypto';
import {
  QUESTION_GENERATION_PROMPT,
  generateQuestionsTool,
  GeneratedQuestion,
} from './question-generation-prompt';
import {
  ANSWER_GENERATION_PROMPT,
  QuestionToSolve,
  SolvedQuestion,
} from './answer-generation-prompt';
import { generateAnswersTool } from '@ai-tools/generate-answers-tool';
import { generateQuestionReference } from '../../hono/shared/question-utils/generate-question-reference';
import { generateQuestionAnswer } from '../../hono/shared/question-utils/generate-question-answer';

type DataClient = ReturnType<typeof generateClient<Schema>>;

const cloudwatchClient = new CloudWatchClient({});
const s3Client = new S3Client({});

export interface GenerateQuestionsInput {
  questionGenerationJobUuid: string;
}

export interface GenerateQuestionsOutput {
  success: boolean;
  questionsGenerated?: number;
  questionsNeedingReferences?: number;
  error?: string;
}

let activeClient: DataClient;

async function logProgress(
  jobUuid: string,
  message: string,
  currentLogs?: string,
): Promise<string> {
  const timestamp = new Date().toISOString();
  const logEntry = `**[${timestamp}]** ${message}`;
  const updatedLogs = currentLogs ? `${currentLogs}\n${logEntry}` : logEntry;

  console.log(message); // Still log to CloudWatch

  try {
    await activeClient.models.QuestionGenerationJob.update({
      questionGenerationJobUuid: jobUuid,
      generationLogs: updatedLogs,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to update generation logs:', error);
  }

  return updatedLogs;
}

const generateQuestionsHandler = async (
  client: DataClient,
  event: { arguments: GenerateQuestionsInput },
): Promise<GenerateQuestionsOutput> => {
  activeClient = client;
  const { questionGenerationJobUuid } = event.arguments;

  console.log("Starting question generation for job:", questionGenerationJobUuid);

  let currentLogs = "";

  try {
    // Log function version
    currentLogs = await logProgress(
      questionGenerationJobUuid,
      "🔧 Function version: v0.1",
      currentLogs
    );

    // Fetch job details
    currentLogs = await logProgress(
      questionGenerationJobUuid,
      "📋 Fetching job details...",
      currentLogs
    );

    const jobResponse = await activeClient.models.QuestionGenerationJob.get({
      questionGenerationJobUuid,
    });

    if (!jobResponse.data) {
      throw new Error("Job not found");
    }

    const job = jobResponse.data;

    currentLogs = await logProgress(
      questionGenerationJobUuid,
      `📝 User prompt: "${job.prompt}"`,
      currentLogs
    );

    // Update job status to GENERATING_QUESTIONS
    await activeClient.models.QuestionGenerationJob.update({
      questionGenerationJobUuid,
      status: "GENERATING_QUESTIONS",
    });

    currentLogs = await logProgress(
      questionGenerationJobUuid,
      "🤖 Calling AI model to generate questions...",
      currentLogs
    );

    const allowedConcepts: string[] = [];
    const conceptMap = new Map<string, { topic: string; subtopic: string; topicDisplay: string; subtopicDisplay: string; conceptDisplay: string }>();
    const uniqueTopics = new Set<string>();
    const uniqueSubtopics = new Set<string>();

    currentLogs = await logProgress(
      questionGenerationJobUuid,
      '⚠️ Neptune decommissioned — generating without knowledge-base concept list',
      currentLogs,
    );

    // Call AI model to generate questions
    const aiClient = createAIClient({
      userUuid: job.userUuid,
      saveTokenData: async (tokenData) => { await activeClient.models.UserRequest.create(tokenData) },
      cloudwatchClient,
    });

    const userContent: UserContentItem[] = [
      {
        mimeType: 'text/plain',
        content: job.prompt,
      },
    ];

    const gptResponse = await aiClient.call({
      intent: INTENT.GENERATE_QUESTIONS,
      userTier: TIER.TECHNICAL, // Use technical tier for batch question generation jobs
      prompt: QUESTION_GENERATION_PROMPT(allowedConcepts, Array.from(uniqueTopics), Array.from(uniqueSubtopics)),
      userContent,
      tools: [
        generateQuestionsTool as any,
        {
          type: 'code_interpreter' as const,
          container: 'auto',
        },
      ] as any,
      category: 'generation',
      feature: 'generation_generate_questions',
      temperature: 0.7, // Slightly higher temperature for more creative questions
      messages: [],
    });

    if (gptResponse.error) {
      console.error('Failed to generate questions:', gptResponse.error);
      throw new Error(`Question generation failed: ${gptResponse.error}`);
    }

    // Extract questions from tool call
    const output = gptResponse.output || [];
    const toolCall = output.find((item) => item.type === 'function_call') as UnifiedFunctionCall | undefined;
    
    if (!toolCall) {
      throw new Error("No questions generated");
    }

    const generatedData = JSON.parse(toolCall.arguments) as {
      questions: GeneratedQuestion[];
    };
    const questions = generatedData.questions;

    currentLogs = await logProgress(
      questionGenerationJobUuid,
      `✅ Generated ${questions.length} questions`,
      currentLogs
    );

    // Count questions needing references
    const questionsNeedingReferences = questions.filter((q) => q.needsReference);
    currentLogs = await logProgress(
      questionGenerationJobUuid,
      `📎 ${questionsNeedingReferences.length} questions need references`,
      currentLogs
    );

    // Store questions in the database
    currentLogs = await logProgress(
      questionGenerationJobUuid,
      "💾 Storing questions in database...",
      currentLogs
    );

    let storedCount = 0;
    for (const question of questions) {
      const questionUuid = randomUUID();
      
      // Look up the concept in the table to get the correct topic and subtopic
      const conceptEntry = conceptMap.get(question.concept);
      if (!conceptEntry) {
        console.warn(`Concept ${question.concept} not found in TopicSubtopicConcept table, using model-provided values`);
      }
      
      // Use topic/subtopic from the table, fallback to model values if not found
      const topic = conceptEntry?.topic || question.topic;
      const subtopic = conceptEntry?.subtopic || question.subtopic;
      
      await activeClient.models.ExtractedQuestion.create({
        extractedQuestionUuid: questionUuid,
        questionExtractJobUuid: null,
        questionGenerationJobUuid,
        exam: question.exam,
        module: question.module,
        moduleNumber: 0, // Generated questions don't have module numbers
        questionNumber: 0, // Generated questions don't have question numbers
        topic: topic,
        subtopic: subtopic,
        concept: question.concept,
        difficulty: question.difficulty.toUpperCase() as "EASY" | "MEDIUM" | "HARD",
        questionType: question.questionType,
        questionContent: question.questionContent,
        questionOptions: question.questionOptions || [],
        needsReference: question.needsReference,
        referenceGenerationPrompt: question.referenceGenerationPrompt || null,
        needsCodeInterpreterForAnswer: question.needsCodeInterpreterForAnswer,
        isGenerated: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      storedCount++;

      if (storedCount % 5 === 0) {
        currentLogs = await logProgress(
          questionGenerationJobUuid,
          `📝 Stored ${storedCount}/${questions.length} questions...`,
          currentLogs
        );
      }
    }

    currentLogs = await logProgress(
      questionGenerationJobUuid,
      `✅ Successfully stored all ${questions.length} questions`,
      currentLogs
    );

    // Update job with total question count
    await activeClient.models.QuestionGenerationJob.update({
      questionGenerationJobUuid,
      totalQuestions: questions.length,
    });

    // If there are questions needing references, generate them now
    // Otherwise, move to GENERATING_ANSWERS
    if (questionsNeedingReferences.length > 0) {
      await activeClient.models.QuestionGenerationJob.update({
        questionGenerationJobUuid,
        status: "GENERATING_REFERENCES",
      });

        currentLogs = await logProgress(
          questionGenerationJobUuid,
        `🎨 Phase 2: Generating references for ${questionsNeedingReferences.length} questions...`,
        currentLogs
      );

      // Fetch the stored questions that need references
      const questionsToProcess: any[] = [];
      let nextToken: string | null | undefined = null;
      
      do {
        const response: any = await activeClient.models.ExtractedQuestion.list({
          filter: {
            questionGenerationJobUuid: { eq: questionGenerationJobUuid },
            needsReference: { eq: true }
          },
          limit: 1000,
          nextToken: nextToken || undefined
        });
        
        if (response.data) {
          questionsToProcess.push(...response.data);
        }
        
        nextToken = response.nextToken;
      } while (nextToken);

        currentLogs = await logProgress(
          questionGenerationJobUuid,
        `📝 Found ${questionsToProcess.length} questions needing references`,
        currentLogs
      );

      // Generate references for each question
      let processedCount = 0;
      let successCount = 0;
      let failureCount = 0;

      for (const question of questionsToProcess) {
        processedCount++;
        
        const logWrapper = async (message: string, currentLogs?: string) => {
          return await logProgress(
            questionGenerationJobUuid,
            message,
            currentLogs
          );
        };

        const result = await generateQuestionReference({
          client: activeClient,
          question,
          userUuid: job.userUuid,
          cloudwatchClient,
          s3Client,
          bucketName: process.env.AI_TUTOR_STORAGE_BUCKET_NAME!,
          logProgress: async (message, logs) => {
            const progressMessage = `${message} (${processedCount}/${questionsToProcess.length})`;
            return await logWrapper(progressMessage, logs || currentLogs);
          },
        });

        if (result.success) {
          successCount++;
          if (result.s3Key) {
            currentLogs = await logProgress(
              questionGenerationJobUuid,
              `✅ Generated reference ${successCount}/${questionsToProcess.length}`,
              currentLogs
            );
          }
        } else {
          failureCount++;
          currentLogs = await logProgress(
            questionGenerationJobUuid,
            `❌ Failed to generate reference ${processedCount}/${questionsToProcess.length}: ${result.error}`,
            currentLogs
          );
        }

        // Log progress every 3 questions
        if (processedCount % 3 === 0) {
          currentLogs = await logProgress(
            questionGenerationJobUuid,
            `📊 Progress: ${processedCount}/${questionsToProcess.length} references processed (${successCount} success, ${failureCount} failed)`,
            currentLogs
          );
        }
      }

        currentLogs = await logProgress(
          questionGenerationJobUuid,
        `🎉 Reference generation completed: ${successCount} success, ${failureCount} failed`,
        currentLogs
      );
    }

    // Move to GENERATING_ANSWERS phase
    await activeClient.models.QuestionGenerationJob.update({
      questionGenerationJobUuid,
      status: "GENERATING_ANSWERS",
    });

    currentLogs = await logProgress(
      questionGenerationJobUuid,
      "🎯 Phase 3: Generating answers and explanations...",
      currentLogs
    );

    // Fetch all questions for this job
    const allQuestions: any[] = [];
    let nextToken: string | null | undefined = null;
    
    do {
      const response: any = await activeClient.models.ExtractedQuestion.list({
        filter: {
          questionGenerationJobUuid: { eq: questionGenerationJobUuid }
        },
        limit: 1000,
        nextToken: nextToken || undefined
      });
      
      if (response.data) {
        allQuestions.push(...response.data);
      }
      
      nextToken = response.nextToken;
    } while (nextToken);

    currentLogs = await logProgress(
      questionGenerationJobUuid,
      `📚 Found ${allQuestions.length} questions total`,
      currentLogs
    );

    // Separate questions by whether they need code_interpreter
    // Prioritize model's decision (needsCodeInterpreterForAnswer), use heuristic as safety net
    const heuristicNeedsCI = (q: any) => {
      const isMath = (q.module || '').toLowerCase().includes('math');
      const content: string = (q.questionContent || '').toLowerCase();
      const refs = (q.questionReference?.text || '').toLowerCase();
      const combinedText = content + ' ' + refs;
      // More comprehensive indicators for complex calculations
      const indicator = /\b(solve|evaluate|calculate|compute|find|determine)\b|x\s*=|y\s*=|integral|derivative|system of equations|quadratic|polynomial|matrix|determinant|limit|derivative|integral|area under|volume|probability|statistics|standard deviation|mean|median|mode|\d+\s*[*/+-]\s*\d+|sqrt|log|ln|sin|cos|tan|exp/.test(combinedText);
      return isMath && indicator;
    };

    // If model explicitly said needsCodeInterpreterForAnswer=true, ALWAYS use Python
    // For false/undefined, use heuristic as safety net
    const codeInterpreterQuestions = allQuestions.filter(q => {
      if (q.needsCodeInterpreterForAnswer === true) {
        return true; // Model said it needs Python - trust it
      }
      // If model said false, we can override with heuristic for safety
      // If model didn't set it (undefined), use heuristic
      return heuristicNeedsCI(q);
    });
    
    const batchQuestions = allQuestions.filter(q => {
      // Exclude questions that need code interpreter
      if (q.needsCodeInterpreterForAnswer === true) {
        return false; // Model said it needs Python - don't batch
      }
      // Don't batch if heuristic says it needs Python
      return !heuristicNeedsCI(q);
    });
    
    currentLogs = await logProgress(
      questionGenerationJobUuid,
      `🔢 ${codeInterpreterQuestions.length} questions need code_interpreter, ${batchQuestions.length} can be batched`,
      currentLogs
    );

    let answersGenerated = 0;
    let answersFailed = 0;

    // Phase 3a: Process questions needing code_interpreter (one by one)
    if (codeInterpreterQuestions.length > 0) {
      currentLogs = await logProgress(
        questionGenerationJobUuid,
        `🐍 Solving ${codeInterpreterQuestions.length} questions with Python...`,
        currentLogs
      );

      for (let i = 0; i < codeInterpreterQuestions.length; i++) {
        const question = codeInterpreterQuestions[i];
        
        try {
          currentLogs = await logProgress(
            questionGenerationJobUuid,
            `🧮 Solving question ${i + 1}/${codeInterpreterQuestions.length} with code_interpreter...`,
            currentLogs
          );

          // Use the common utility function
          const result = await generateQuestionAnswer({
            client: activeClient,
            question: {
              extractedQuestionUuid: question.extractedQuestionUuid,
              questionContent: question.questionContent,
              questionType: question.questionType,
              questionOptions: question.questionOptions,
              questionReference: question.questionReference,
              needsCodeInterpreterForAnswer: question.needsCodeInterpreterForAnswer,
            },
            userUuid: job.userUuid,
            cloudwatchClient,
            logProgress: async (message: string) => {
              return await logProgress(questionGenerationJobUuid, message, currentLogs);
            },
          });

          if (!result.success) {
            throw new Error(result.error || 'Answer generation failed');
          }

          answersGenerated++;
          
          if ((i + 1) % 3 === 0) {
            currentLogs = await logProgress(
              questionGenerationJobUuid,
              `📊 Progress: ${i + 1}/${codeInterpreterQuestions.length} code_interpreter questions solved`,
              currentLogs
            );
          }
        } catch (error: any) {
          answersFailed++;
          console.error('[ERROR] Failed to solve question:', error);
          currentLogs = await logProgress(
            questionGenerationJobUuid,
            `❌ Failed to solve question ${i + 1}: ${error.message}`,
            currentLogs
          );
        }
      }
    }

    // Phase 3b: Batch process questions not needing code_interpreter
    if (batchQuestions.length > 0) {
      currentLogs = await logProgress(
        questionGenerationJobUuid,
        `📦 Batch solving ${batchQuestions.length} questions...`,
        currentLogs
      );

      const chunk = <T,>(arr: T[], size: number): T[][] => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
      };

      // Use smaller batch size (5) to ensure model returns all answers
      for (const slice of chunk(batchQuestions, 5)) {
        try {
          const questionsToSolve: QuestionToSolve[] = slice.map(q => ({
            extractedQuestionUuid: q.extractedQuestionUuid,
            questionContent: q.questionContent,
            questionType: q.questionType,
            questionOptions: q.questionOptions,
            questionReference: q.questionReference,
          }));

          const questionsText = questionsToSolve.map((q, idx) => `
Question ${idx + 1} (UUID: ${q.extractedQuestionUuid}):
${q.questionContent}
${q.questionType === 'MULTIPLE_CHOICE' ? `Options:\n${(q.questionOptions || []).map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n')}` : ''}
${q.questionReference?.text ? `Reference: ${q.questionReference.text}` : ''}
---`).join('\n');

          const batchUserContent: UserContentItem[] = [
            {
              mimeType: 'text/plain',
              content: questionsText,
            },
          ];

          const batchResponse = await aiClient.call({
            intent: INTENT.EXTRACT_ANSWERS,
            userTier: TIER.FREE,
            prompt: ANSWER_GENERATION_PROMPT + `\n\nReturn a function call to generateAnswers with solvedQuestions array containing EXACTLY ${questionsToSolve.length} items matching the provided UUIDs.`,
            userContent: batchUserContent,
            tools: [generateAnswersTool],
            temperature: 0.3,
            feature: 'generation_generate_answers',
            category: 'generation',
            messages: [],
          });

          if (batchResponse.error) {
            throw new Error(`Batch answer generation failed: ${batchResponse.error}`);
          }

          const batchOutput = batchResponse.output || [];
          const batchToolCall = batchOutput.find((item) => item.type === 'function_call') as UnifiedFunctionCall | undefined;
          if (!batchToolCall) {
            throw new Error('No answers generated in batch');
          }

          const batchData = JSON.parse(batchToolCall.arguments) as { solvedQuestions: SolvedQuestion[] };
          
          // Validate that we got answers for all questions
          const expectedUuids = new Set(questionsToSolve.map(q => q.extractedQuestionUuid));
          const receivedUuids = new Set(batchData.solvedQuestions.map(s => s.extractedQuestionUuid));
          
          // Check for missing answers
          const missingUuids = Array.from(expectedUuids).filter(uuid => !receivedUuids.has(uuid));
          if (missingUuids.length > 0) {
            currentLogs = await logProgress(
              questionGenerationJobUuid,
              `⚠️ Warning: ${missingUuids.length} questions missing from batch response: ${missingUuids.join(', ')}`,
              currentLogs
            );
          }
          
          // Check for extra/unexpected answers
          const extraUuids = Array.from(receivedUuids).filter(uuid => !expectedUuids.has(uuid));
          if (extraUuids.length > 0) {
            currentLogs = await logProgress(
              questionGenerationJobUuid,
              `⚠️ Warning: ${extraUuids.length} unexpected answers in batch response: ${extraUuids.join(', ')}`,
              currentLogs
            );
          }
          
          // Create a map for quick lookup
          const answerMap = new Map<string, SolvedQuestion>();
          for (const solved of batchData.solvedQuestions) {
            answerMap.set(solved.extractedQuestionUuid, solved);
          }
          
          // Track which questions still need answers
          const questionsNeedingRetry: QuestionToSolve[] = [];
          
          // Apply answers to all expected questions, validating UUIDs
          for (const questionToSolve of questionsToSolve) {
            const solved = answerMap.get(questionToSolve.extractedQuestionUuid);
            if (!solved) {
              questionsNeedingRetry.push(questionToSolve);
              continue;
            }
            
            // UUID validation is implicit since we used it as the map key, but verify for safety
            if (solved.extractedQuestionUuid !== questionToSolve.extractedQuestionUuid) {
              questionsNeedingRetry.push(questionToSolve);
              continue;
            }
            
            try {
              await activeClient.models.ExtractedQuestion.update({
                extractedQuestionUuid: solved.extractedQuestionUuid,
                correctAnswer: solved.correctAnswer,
                answerExplanations: solved.answerExplanations,
                hint: solved.hint,
              });
              answersGenerated++;
            } catch (error: any) {
              questionsNeedingRetry.push(questionToSolve);
              console.error('[ERROR] Failed to store answer:', error);
              currentLogs = await logProgress(
                questionGenerationJobUuid,
                `❌ Failed to store answer for ${solved.extractedQuestionUuid}: ${error.message}`,
                currentLogs
              );
            }
          }
          
          // Retry failed questions individually
          if (questionsNeedingRetry.length > 0) {
            currentLogs = await logProgress(
              questionGenerationJobUuid,
              `🔄 Retrying ${questionsNeedingRetry.length} failed questions individually...`,
              currentLogs
            );
            
            for (const questionToRetry of questionsNeedingRetry) {
              try {
                // Fetch the full question to get needsCodeInterpreterForAnswer flag
                const questionResponse = await activeClient.models.ExtractedQuestion.get({
                  extractedQuestionUuid: questionToRetry.extractedQuestionUuid,
                });
                
                if (!questionResponse.data) {
                  throw new Error('Question not found');
                }

                const fullQuestion = questionResponse.data;

                // Use the common utility function for retry
                const result = await generateQuestionAnswer({
                  client,
                  question: {
                    extractedQuestionUuid: questionToRetry.extractedQuestionUuid,
                    questionContent: questionToRetry.questionContent,
                    questionType: questionToRetry.questionType,
                    questionOptions: questionToRetry.questionOptions,
                    questionReference: questionToRetry.questionReference,
                    needsCodeInterpreterForAnswer: fullQuestion.needsCodeInterpreterForAnswer,
                  },
                  userUuid: job.userUuid,
                  cloudwatchClient,
                  logProgress: async (message: string) => {
                    return await logProgress(questionGenerationJobUuid, message, currentLogs);
                  },
                });

                if (!result.success) {
                  throw new Error(result.error || 'Retry failed');
                }

                answersGenerated++;
              } catch (error: any) {
                answersFailed++;
                console.error('[ERROR] Retry failed for question:', questionToRetry.extractedQuestionUuid, error);
                currentLogs = await logProgress(
                  questionGenerationJobUuid,
                  `❌ Retry failed for question ${questionToRetry.extractedQuestionUuid}: ${error.message}`,
                  currentLogs
                );
              }
            }
          }

          currentLogs = await logProgress(
            questionGenerationJobUuid,
            `✅ Batch processed: ${answersGenerated} succeeded, ${answersFailed} failed out of ${questionsToSolve.length} questions`,
            currentLogs
          );
        } catch (error: any) {
          answersFailed += slice.length;
          console.error('[ERROR] Batch answer generation failed:', error);
          currentLogs = await logProgress(
            questionGenerationJobUuid,
            `❌ Batch answer generation failed: ${error.message}`,
            currentLogs
          );
        }
      }
    }

    currentLogs = await logProgress(
      questionGenerationJobUuid,
      `🎉 Answer generation completed: ${answersGenerated} success, ${answersFailed} failed`,
      currentLogs
    );

    // Mark job as completed
    await activeClient.models.QuestionGenerationJob.update({
      questionGenerationJobUuid,
      status: "COMPLETED",
    });

    currentLogs = await logProgress(
      questionGenerationJobUuid,
      "✅ All phases completed successfully!",
      currentLogs
    );

    return {
      success: true,
      questionsGenerated: questions.length,
      questionsNeedingReferences: questionsNeedingReferences.length,
    };
  } catch (error: any) {
    console.error("Error generating questions:", error);

    // Load existing logs before appending error
    const jobResponse = await activeClient.models.QuestionGenerationJob.get({
      questionGenerationJobUuid,
    });

    if (jobResponse.data?.generationLogs) {
      currentLogs = jobResponse.data.generationLogs;
    }

    currentLogs = await logProgress(
      questionGenerationJobUuid,
      `❌ Error: ${error.message}`,
      currentLogs
    );

    await activeClient.models.QuestionGenerationJob.update({
      questionGenerationJobUuid,
      status: "FAILED",
      error: error.message,
    });

    throw error;
  }
};

export async function runGenerateQuestions(
  client: DataClient,
  input: GenerateQuestionsInput,
): Promise<GenerateQuestionsOutput> {
  return generateQuestionsHandler(client, { arguments: input });
}

