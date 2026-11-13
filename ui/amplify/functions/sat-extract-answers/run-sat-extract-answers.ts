import type { Schema } from '@database-schema';
import { generateClient } from 'aws-amplify/data';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import type { createAIClient } from '@ai-client';
import { INTENT } from '@ai-intents/types';
import { TIER } from '@ai-intents/tier';
import { UserContentItem } from '@ai-providers/types';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { PDFDocument } from 'pdf-lib';
import { UnifiedFunctionCall } from '@ai-providers/unified-types';
import {
  ExtractedAnswerFromModule,
  SINGLE_MODULE_ANSWER_EXTRACTION_PROMPT,
} from './sat-answer-extraction-prompt';
import { createExtractAnswersFromModuleTool } from '@ai-tools/extract-answers-from-module-tool';
import { IdentifiedAnswerKeyModule } from '../sat-extract-answer-modules/module-identification-prompt';

type DataClient = ReturnType<typeof generateClient<Schema>>;

export interface SatExtractAnswersInput {
  questionExtractJobUuid: string;
}

export interface SatExtractAnswersOutput {
  success: boolean;
  matchedCount: number;
  error?: string;
}

export interface SatExtractAnswersDeps {
  s3Client: S3Client;
  cloudwatchClient: CloudWatchClient;
  bucketName: string;
  createAIClient: typeof createAIClient;
}

async function logProgress(
  client: DataClient,
  jobUuid: string,
  message: string,
  currentLogs?: string,
) {
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

// Helper function to extract specific page range from PDF
async function extractPdfPages(
  pdfBuffer: Buffer,
  startPage: number,
  endPage: number
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const newPdfDoc = await PDFDocument.create();

  // Page numbers are 1-indexed in our system, but 0-indexed in pdf-lib
  for (let i = startPage - 1; i < Math.min(endPage, pdfDoc.getPageCount()); i++) {
    const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [i]);
    newPdfDoc.addPage(copiedPage);
  }

  const pdfBytes = await newPdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function runSatExtractAnswers(
  client: DataClient,
  input: SatExtractAnswersInput,
  deps: SatExtractAnswersDeps,
): Promise<SatExtractAnswersOutput> {
  const { s3Client, cloudwatchClient, bucketName, createAIClient } = deps;

  console.log('SAT Extract Answers handler invoked with:', JSON.stringify(input));

  const { questionExtractJobUuid } = input;

  try {
    // 1. Fetch the job
    const jobResponse = await client.models.QuestionExtractJob.get({ questionExtractJobUuid });
    if (!jobResponse.data) {
      throw new Error(`Job not found: ${questionExtractJobUuid}`);
    }
    const job = jobResponse.data;

    // Load existing logs to continue from where we left off
    let currentLogs = job.extractionLogs || '';

    if (!job.answerKeyS3Key) {
      throw new Error('No answer key uploaded for this job');
    }

    // Check if pre-identified modules exist
    if (!job.identifiedAnswerModules) {
      throw new Error('No identified answer modules found in job. Please run answer module extraction first.');
    }

    currentLogs = await logProgress(client, questionExtractJobUuid, `📄 Starting answer extraction for: ${job.answerKeyFileName}`, currentLogs);
    currentLogs = await logProgress(client, questionExtractJobUuid, `🔧 Function version: v0.1`, currentLogs);

    // 2. Update job status to PROCESSING
    await client.models.QuestionExtractJob.update({
      questionExtractJobUuid,
      answerKeyStatus: 'PROCESSING',
      answerKeyError: null,
      updatedAt: new Date().toISOString(),
    });

    // 3. Load pre-identified modules from job
    const identifiedModules: IdentifiedAnswerKeyModule[] = JSON.parse(job.identifiedAnswerModules);

    if (identifiedModules.length === 0) {
      throw new Error('No modules were identified in the answer key');
    }

    // Log identified modules
    currentLogs = await logProgress(client, questionExtractJobUuid, `📋 Using ${identifiedModules.length} pre-identified answer modules:`, currentLogs);
    
    for (const module of identifiedModules) {
      currentLogs = await logProgress(
        client,
        questionExtractJobUuid,
        `  - Module ${module.moduleNumber}: ${module.moduleName} (Pages ${module.startPage}-${module.endPage}, ${module.answerCount} answers)`,
        currentLogs
      );
    }

    // Download the full PDF for splitting
    const getObjectResponse = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: job.answerKeyS3Key,
    }));

    const pdfBuffer = Buffer.from(await getObjectResponse.Body!.transformToByteArray());

    // Split PDF by modules and upload each module's PDF
    currentLogs = await logProgress(client, questionExtractJobUuid, `📄 Splitting answer key into ${identifiedModules.length} module-specific documents...`, currentLogs);
    
    const modulePdfUrls: Map<number, string> = new Map();

    for (const module of identifiedModules) {
      const modulePdfBuffer = await extractPdfPages(pdfBuffer, module.startPage, module.endPage);
      
      // Upload module PDF to S3
      const modulePdfKey = `${job.answerKeyS3Key.replace(/\.[^/.]+$/, '')}_module${module.moduleNumber}.pdf`;
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: modulePdfKey,
        Body: modulePdfBuffer,
        ContentType: 'application/pdf',
      }));

      // Generate presigned URL for this module's PDF
      const moduleCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: modulePdfKey,
      });
      const modulePdfUrl = await getSignedUrl(s3Client, moduleCommand, { expiresIn: 3600 });
      modulePdfUrls.set(module.moduleNumber, modulePdfUrl);

      currentLogs = await logProgress(client, questionExtractJobUuid, `  ✓ Created Module ${module.moduleNumber} answer key PDF (pages ${module.startPage}-${module.endPage})`, currentLogs);
    }

    currentLogs = await logProgress(client, questionExtractJobUuid, `✅ Successfully split answer key into ${identifiedModules.length} module documents`, currentLogs);

    // ==================== FETCH ACTUAL QUESTION COUNTS PER MODULE ====================
    currentLogs = await logProgress(client, questionExtractJobUuid, '\n🔢 **Fetching actual question counts per module from database...**', currentLogs);
    
    const moduleQuestionCounts = new Map<number, number>();
    
    for (const module of identifiedModules) {
      // Query the database to count actual questions extracted for this module
      // Use pagination to fetch ALL questions (default limit is 100)
      const allQuestions: any[] = [];
      let nextToken: string | null | undefined = null;
      
      do {
        const questionsForModuleResponse: any = await client.models.ExtractedQuestion.list({
          filter: {
            questionExtractJobUuid: { eq: questionExtractJobUuid },
            moduleNumber: { eq: module.moduleNumber }
          },
          limit: 1000,
          nextToken: nextToken || undefined
        });
        
        if (questionsForModuleResponse.data) {
          allQuestions.push(...questionsForModuleResponse.data);
        }
        
        nextToken = questionsForModuleResponse.nextToken;
      } while (nextToken);
      
      const actualQuestionCount = allQuestions.length;
      moduleQuestionCounts.set(module.moduleNumber, actualQuestionCount);
      
      currentLogs = await logProgress(
        client,
        questionExtractJobUuid,
        `  - Module ${module.moduleNumber}: ${actualQuestionCount} questions found in database`,
        currentLogs
      );
    }

    // ==================== EXTRACT ANSWERS FROM EACH MODULE ====================
    currentLogs = await logProgress(client, questionExtractJobUuid, '\n🔍 **Extracting answers from each module...**', currentLogs);
    
    const allExtractedAnswers: Array<{
      moduleNumber: number;
      moduleName: string;
      answer: ExtractedAnswerFromModule;
    }> = [];

    // Extract answers from each module sequentially
    for (const module of identifiedModules) {
      const actualQuestionCount = moduleQuestionCounts.get(module.moduleNumber) || 0;
      
      if (actualQuestionCount === 0) {
        currentLogs = await logProgress(
          client,
          questionExtractJobUuid,
          `\n⚠️ Skipping Module ${module.moduleNumber} (${module.moduleName}) - no questions found in database`,
          currentLogs
        );
        continue;
      }
      
      currentLogs = await logProgress(client, questionExtractJobUuid, `\n📝 Extracting answers from Module ${module.moduleNumber} (${module.moduleName}, expecting ${actualQuestionCount} answers)...`, currentLogs);
      
      const modulePrompt = SINGLE_MODULE_ANSWER_EXTRACTION_PROMPT(
        module.moduleNumber,
        module.moduleName,
        module.startPage,
        module.endPage,
        actualQuestionCount
      );

      const extractionTool = createExtractAnswersFromModuleTool(actualQuestionCount);

      const aiClient = createAIClient({
        userUuid: job.userUuid,
        saveTokenData: async (tokenData) => { await client.models.UserRequest.create(tokenData) },
        cloudwatchClient,
      });

      const userContent: UserContentItem[] = [
        {
          mimeType: 'text/plain',
          content: `Extract all ${actualQuestionCount} answers from Module ${module.moduleNumber}`,
        },
        {
          mimeType: 'application/pdf',
          contentURL: modulePdfUrls.get(module.moduleNumber)!,
        },
      ];

      const moduleExtractionResponse = await aiClient.call({
        intent: INTENT.EXTRACT_ANSWERS,
        userTier: TIER.FREE,
        prompt: modulePrompt,
        userContent,
        category: 'extraction',
        feature: 'extraction_extract_answers',
        tools: [extractionTool],
        temperature: 0,
        messages: [],
      });

      if (moduleExtractionResponse.error) {
        console.error(`Failed to extract answers from Module ${module.moduleNumber}:`, moduleExtractionResponse.error);
        throw new Error(`Module ${module.moduleNumber} answer extraction failed: ${moduleExtractionResponse.error}`);
      }

      const answerOutput = moduleExtractionResponse.output || [];
      const answerToolCall = answerOutput.find((item) => item.type === 'function_call') as UnifiedFunctionCall | undefined;
      
      if (!answerToolCall) {
        throw new Error(`No answers extracted from Module ${module.moduleNumber}`);
      }

      const answerData = JSON.parse(answerToolCall.arguments);
      const moduleAnswers: ExtractedAnswerFromModule[] = answerData.answers;

      currentLogs = await logProgress(client, questionExtractJobUuid, `  ✅ Extracted ${moduleAnswers.length} answers from Module ${module.moduleNumber}`, currentLogs);

      // Validate count matches expected (based on actual questions in database)
      if (moduleAnswers.length !== actualQuestionCount) {
        currentLogs = await logProgress(
          client,
          questionExtractJobUuid,
          `  ⚠️ Warning: Expected ${actualQuestionCount} answers (based on extracted questions) but got ${moduleAnswers.length}`,
          currentLogs
        );
      }

      // Store answers with module info
      moduleAnswers.forEach(answer => {
        allExtractedAnswers.push({
          moduleNumber: module.moduleNumber,
          moduleName: module.moduleName,
          answer
        });
      });
    }

    currentLogs = await logProgress(client, questionExtractJobUuid, `\n✅ Total answers extracted: ${allExtractedAnswers.length}`, currentLogs);
    
    if (allExtractedAnswers.length === 0) {
      throw new Error('No answers were extracted from any module');
    }

    // 6. Fetch all questions for this job with pagination
    currentLogs = await logProgress(client, questionExtractJobUuid, '\n🔗 **Matching answers with questions...**', currentLogs);
    
    const allQuestionsForMatching: any[] = [];
    let nextTokenForMatching: string | null | undefined = null;
    
    do {
      const questionsResponse: any = await client.models.ExtractedQuestion.list({
        filter: {
          questionExtractJobUuid: { eq: questionExtractJobUuid }
        },
        limit: 1000,
        nextToken: nextTokenForMatching || undefined
      });
      
      if (questionsResponse.data) {
        allQuestionsForMatching.push(...questionsResponse.data);
      }
      
      nextTokenForMatching = questionsResponse.nextToken;
    } while (nextTokenForMatching);

    if (allQuestionsForMatching.length === 0) {
      throw new Error(`No questions found for job: ${questionExtractJobUuid}`);
    }

    const questions = allQuestionsForMatching;
    currentLogs = await logProgress(client, questionExtractJobUuid, `Found ${questions.length} questions to match with ${allExtractedAnswers.length} answers`, currentLogs);

    // 7. Match answers to questions by moduleNumber + questionNumber
    let matchedCount = 0;
    const unmatchedAnswers: string[] = [];
    const matchedQuestions = new Set<string>();
    
    // Create a map using both moduleNumber and questionNumber as key
    const questionByModuleAndNumber = new Map(
      questions.map(q => [`${q.moduleNumber}-${q.questionNumber}`, q])
    );

    for (const item of allExtractedAnswers) {
      const key = `${item.moduleNumber}-${item.answer.questionNumber}`;
      const question = questionByModuleAndNumber.get(key);
      
      if (question) {
        await client.models.ExtractedQuestion.update({
          extractedQuestionUuid: question.extractedQuestionUuid,
          correctAnswer: item.answer.correctAnswer.toUpperCase(), // Normalize to uppercase
          answerExplanations: item.answer.answerExplanations && item.answer.answerExplanations.some(exp => exp && exp.trim() !== '') ? item.answer.answerExplanations : undefined,
          hint: item.answer.hint && item.answer.hint.trim() !== '' ? item.answer.hint : undefined,
          updatedAt: new Date().toISOString(),
        });
        matchedCount++;
        matchedQuestions.add(key);
        currentLogs = await logProgress(
          client,
          questionExtractJobUuid,
          `  ✓ M${item.moduleNumber}-Q${item.answer.questionNumber}: Matched answer "${item.answer.correctAnswer}"`,
          currentLogs
        );
      } else {
        unmatchedAnswers.push(`M${item.moduleNumber}-Q${item.answer.questionNumber}`);
        currentLogs = await logProgress(
          client,
          questionExtractJobUuid,
          `  ⚠️ M${item.moduleNumber}-Q${item.answer.questionNumber}: No matching question found`,
          currentLogs
        );
      }
    }
    
    // Check for questions without answers
    const questionsWithoutAnswers: string[] = [];
    for (const question of questions) {
      const key = `${question.moduleNumber}-${question.questionNumber}`;
      if (!matchedQuestions.has(key)) {
        questionsWithoutAnswers.push(`M${question.moduleNumber}-Q${question.questionNumber}`);
      }
    }
    
    if (questionsWithoutAnswers.length > 0) {
      currentLogs = await logProgress(
        client,
        questionExtractJobUuid,
        `\n⚠️ **${questionsWithoutAnswers.length} questions without answers:** ${questionsWithoutAnswers.join(', ')}`,
        currentLogs
      );
    }

    // 8. Update job status to COMPLETED
      currentLogs = await logProgress(
        client,
        questionExtractJobUuid,
      `\n✅ **Answer extraction completed!** Successfully matched ${matchedCount} out of ${allExtractedAnswers.length} answers to ${questions.length} questions.`,
      currentLogs
    );
    
    await client.models.QuestionExtractJob.update({
      questionExtractJobUuid,
      answerKeyStatus: 'COMPLETED',
      updatedAt: new Date().toISOString(),
    });

    return {
      success: true,
      matchedCount,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error extracting answers';
    console.error('Answer extraction failed:', errorMessage);

    // Log the error
    try {
      // Get existing logs in case of error
      const jobResponse = await client.models.QuestionExtractJob.get({
        questionExtractJobUuid
      });
      const existingLogs = jobResponse.data?.extractionLogs || '';
      
      await logProgress(
        client,
        questionExtractJobUuid,
        `\n❌ **Error:** ${errorMessage}`,
        existingLogs
      );
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    // Update job with error status
    try {
      await client.models.QuestionExtractJob.update({
        questionExtractJobUuid,
        answerKeyStatus: 'FAILED',
        answerKeyError: errorMessage,
        updatedAt: new Date().toISOString(),
      });
    } catch (updateError) {
      console.error('Failed to update job with error status:', updateError);
    }

    return {
      success: false,
      matchedCount: 0,
      error: errorMessage,
    };
  }
}

