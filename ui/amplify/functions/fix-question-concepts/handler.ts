/**
 * Lambda to fix existing ExtractedQuestion concepts by matching them to SAT concepts from the database
 * 
 * This Lambda:
 * 1. Fetches all SAT concepts from TopicSubtopicConcept table
 * 2. Fetches all ExtractedQuestion records
 * 3. Uses AI model to match each question to the correct concept
 * 4. Updates the questions with the correct topic, subtopic, and concept
 */

import type { Schema } from "@database-schema";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/fix-question-concepts';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { createAIClient } from '@ai-client';
import { INTENT } from '@ai-intents/types';
import { TIER } from '@ai-intents/tier';
import { UserContentItem } from '@ai-providers/types';
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { UnifiedFunctionCall } from "@ai-providers/unified-types";
import { withSentryLambdaHandler } from "../common/sentry-lambda";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  env as any
);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();
const cloudwatchClient = new CloudWatchClient({});

// ==================== TYPES ====================
interface SATConcept {
  topic: string;
  topicDisplay: string;
  subtopic: string;
  subtopicDisplay: string;
  concept: string;
  conceptDisplay: string;
}

interface ExtractedQuestion {
  extractedQuestionUuid: string;
  questionContent: string;
  topic: string;
  subtopic: string;
  concept: string;
  difficulty: string;
  questionType: string;
}

// ==================== AI MATCHING ====================
async function matchQuestionsBatch(
  questions: ExtractedQuestion[],
  concepts: SATConcept[]
): Promise<Map<string, { topic: string; subtopic: string; concept: string } | null>> {
  const conceptsList = concepts.map(c => 
    `- topic: "${c.topic}", subtopic: "${c.subtopic}", concept: "${c.concept}" (${c.conceptDisplay})`
  ).join('\n');

  // Format questions for batch processing
  const questionsText = questions.map((q, idx) => 
    `**QUESTION ${idx + 1} (ID: ${q.extractedQuestionUuid}):**
Content: ${q.questionContent.substring(0, 300)}...
Current Topic: ${q.topic}
Current Subtopic: ${q.subtopic}
Current Concept: ${q.concept}
Difficulty: ${q.difficulty}
Type: ${q.questionType}
`
  ).join('\n\n');

  const prompt = `You are an SAT expert. Match these ${questions.length} questions to the most appropriate concepts from the allowed list.

**ALLOWED SAT CONCEPTS:**
${conceptsList}

**QUESTIONS TO MATCH:**
${questionsText}

**YOUR TASK:**
For each question, analyze it and determine which concept from the list best matches what the question is testing.

**IMPORTANT:**
- You MUST choose a concept from the allowed list above for each question
- Return ONLY the topic, subtopic, and concept IDs (not the display names)
- Match based on what the question is actually testing, not just keywords

Use the 'matchQuestionsToConcepts' tool to return the matches.`;

  // Define the tool for structured output
  const matchTool = {
    strict: true,
    type: "function",
    name: "matchQuestionsToConcepts",
    description: `Match ${questions.length} questions to their appropriate SAT concepts`,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        matches: {
          type: "array",
          description: "Array of question-to-concept matches",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              questionId: {
                type: "string",
                description: "The UUID of the question being matched"
              },
              topic: {
                type: "string",
                description: "The topic ID from the allowed concepts list"
              },
              subtopic: {
                type: "string",
                description: "The subtopic ID from the allowed concepts list"
              },
              concept: {
                type: "string",
                description: "The concept ID from the allowed concepts list"
              },
              reasoning: {
                type: "string",
                description: "Brief explanation of why this concept matches"
              }
            },
            required: ["questionId", "topic", "subtopic", "concept", "reasoning"]
          }
        }
      },
      required: ["matches"]
    }
  };

  try {
    const aiClient = createAIClient({
      userUuid: 'system',
      saveTokenData: async () => {}, // No-op for this Lambda
      cloudwatchClient,
    });

    const userContent: UserContentItem[] = [
      {
        mimeType: 'text/plain',
        content: `Match ${questions.length} questions to concepts`,
      },
    ];

    const response = await aiClient.call({
      intent: INTENT.DOCUMENT_CATEGORIZATION,
      userTier: TIER.FREE,
      prompt,
      userContent,
      category: 'extraction',
      feature: 'fix-question-concepts',
      tools: [matchTool as any],
      messages: [],
    });

    console.log('AI Response output:', response.error, null, 2);

    if (!response) {
      console.error('No output in response');
      throw new Error('No output from AI model');
    }

    // Extract tool call from output
    let toolCallArgs: any = null;
    
    // Handle OpenAI response format
    if (Array.isArray(response.output)) {
      const functionCall = response.output.find(
        (item): item is UnifiedFunctionCall => 
          item.type === 'function_call'
      ) as UnifiedFunctionCall | undefined;
      
      if (functionCall && functionCall.name === 'matchQuestionsToConcepts') {
        toolCallArgs = JSON.parse(functionCall.arguments);
      }
    }

    if (!toolCallArgs) {
      console.error('No tool call found in output:', response.output);
      throw new Error('No tool call in response');
    }

    const result = toolCallArgs;
    
    if (!result.matches || !Array.isArray(result.matches)) {
      console.error('Invalid response structure:', result);
      throw new Error('Invalid response structure from AI model');
    }

    console.log(`✓ Received ${result.matches.length} matches from AI model`);

    // Create a map of questionId -> match
    const matchMap = new Map<string, { topic: string; subtopic: string; concept: string } | null>();
    
    for (const match of result.matches) {
      // Validate that the concept exists in our list
      const matchedConcept = concepts.find(c => 
        c.topic === match.topic && 
        c.subtopic === match.subtopic && 
        c.concept === match.concept
      );

      if (!matchedConcept) {
        console.error(`AI returned invalid concept for ${match.questionId}: ${match.concept}`);
        matchMap.set(match.questionId, null);
      } else {
        console.log(`  ✓ ${match.questionId}: Matched to ${matchedConcept.concept} ${matchedConcept.conceptDisplay} (${match.reasoning})`);
        matchMap.set(match.questionId, {
          topic: match.topic,
          subtopic: match.subtopic,
          concept: match.concept
        });
      }
    }

    return matchMap;
  } catch (error) {
    console.error('Error calling AI:', error);
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // Return empty map on error
    const emptyMap = new Map<string, { topic: string; subtopic: string; concept: string } | null>();
    questions.forEach(q => emptyMap.set(q.extractedQuestionUuid, null));
    return emptyMap;
  }
}

// ==================== DATABASE OPERATIONS ====================
async function fetchAllSATConcepts(): Promise<SATConcept[]> {
  return [];
}

async function fetchAllExtractedQuestions(): Promise<ExtractedQuestion[]> {
  console.log('📝 Fetching extracted questions from database...');
  
  const questions: ExtractedQuestion[] = [];
  let nextToken: string | null | undefined = undefined;

  do {
    const response = await client.models.ExtractedQuestion.list({
      limit: 1000,
      nextToken: nextToken || undefined,
    });

    if (response.data) {
      questions.push(...response.data.map((q: any) => ({
        extractedQuestionUuid: q.extractedQuestionUuid,
        questionContent: q.questionContent,
        topic: q.topic,
        subtopic: q.subtopic,
        concept: q.concept,
        difficulty: q.difficulty,
        questionType: q.questionType,
      })));
    }

    nextToken = response.nextToken as string | null | undefined;
  } while (nextToken);

  console.log(`✅ Loaded ${questions.length} extracted questions`);
  return questions;
}

async function updateQuestionConcept(
  questionUuid: string,
  topic: string,
  subtopic: string,
  concept: string
): Promise<void> {
  await client.models.ExtractedQuestion.update({
    extractedQuestionUuid: questionUuid,
    topic,
    subtopic,
    concept,
    updatedAt: new Date().toISOString(),
  });
}

// ==================== MAIN HANDLER ====================
const fixQuestionConceptsHandler = async (event: { arguments: { dryRun?: boolean } }) => {
  console.log('🚀 Starting question concept fix Lambda...', event);

  const dryRun = event.arguments?.dryRun ?? false;
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made to the database');
  }

  try {
    // 1. Fetch all SAT concepts
    const concepts = await fetchAllSATConcepts();
    if (concepts.length === 0) {
      return {
        success: false,
        message: 'SAT concept fixing requires knowledge-base concepts (Neptune decommissioned).',
        stats: {
          total: 0,
          updated: 0,
          skipped: 0,
          failed: 0,
        },
      };
    }

    // 2. Fetch all extracted questions
    const questions = await fetchAllExtractedQuestions();
    if (questions.length === 0) {
      console.log('ℹ️  No questions found to update.');
      return {
        success: true,
        message: 'No questions found to update',
        stats: {
          total: 0,
          updated: 0,
          skipped: 0,
          failed: 0,
        }
      };
    }

    console.log(`\n📊 Processing ${questions.length} questions...\n`);

    // 3. Filter questions that need updating
    const questionsToProcess = questions.filter(q => {
      const alreadyMatched = concepts.find(c => 
        c.topic === q.topic && 
        c.subtopic === q.subtopic && 
        c.concept === q.concept
      );
      return !alreadyMatched;
    });

    const skippedCount = questions.length - questionsToProcess.length;
    console.log(`⏭️  Skipping ${skippedCount} questions that already have valid concepts`);
    console.log(`🔄 Processing ${questionsToProcess.length} questions in batches of 30...\n`);

    let successCount = 0;
    let failCount = 0;

    // Process in batches of 30
    const BATCH_SIZE = 30;
    const batches = [];
    for (let i = 0; i < questionsToProcess.length; i += BATCH_SIZE) {
      batches.push(questionsToProcess.slice(i, i + BATCH_SIZE));
    }

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      console.log(`\n📦 Processing batch ${batchIdx + 1}/${batches.length} (${batch.length} questions)...`);

      // Match batch of questions
      const matchMap = await matchQuestionsBatch(batch, concepts);

      // Update database for successful matches
      for (const question of batch) {
        const match = matchMap.get(question.extractedQuestionUuid);

        if (match) {
          if (!dryRun) {
            // Update in database
            await updateQuestionConcept(
              question.extractedQuestionUuid,
              match.topic,
              match.subtopic,
              match.concept
            );
            console.log(`  ✅ Updated ${question.extractedQuestionUuid}`);
          } else {
            console.log(`  🔍 Would update ${question.extractedQuestionUuid} to: ${match.concept}`);
          }
          successCount++;
        } else {
          console.log(`  ❌ Failed to match ${question.extractedQuestionUuid}`);
          failCount++;
        }
      }

      // Rate limiting: wait 2 seconds between batches
      if (batchIdx < batches.length - 1) {
        console.log(`⏳ Waiting 2 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // 4. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total questions: ${questions.length}`);
    console.log(`✅ Successfully ${dryRun ? 'matched' : 'updated'}: ${successCount}`);
    console.log(`⏭️  Skipped (already valid): ${skippedCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log('='.repeat(60));

    return {
      success: true,
      message: `Processed ${questions.length} questions`,
      stats: {
        total: questions.length,
        updated: successCount,
        skipped: skippedCount,
        failed: failCount,
      },
      dryRun,
    };

  } catch (error) {
    console.error('\n❌ Lambda failed:', error);
    throw error;
  }
};

export const handler = withSentryLambdaHandler(fixQuestionConceptsHandler);

