import type { Schema } from '@database-schema';
import { generateClient } from 'aws-amplify/api';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { createAIClient } from '@ai-client';
import { INTENT } from '@ai-intents/types';
import { TIER } from '@ai-intents/tier';
import { UserContentItem } from '../../ai/providers/types';
import { createMockQuestionsTool } from '@ai-tools/create-mock-questions-tool';
import { mockExamGenerateQuestionsPrompt } from '../ai-chat/chat-prompts';
import type { QuestionsToolOutput } from '@ai-tools/types';
import { UnifiedFunctionCall } from '@ai-providers/unified-types';
import { v4 as uuidv4 } from 'uuid';

type DataClient = ReturnType<typeof generateClient<Schema>>;

export interface MockExamsGenerateQuestionsInput {
  mockExamUuid: string;
  userUuid: string;
  taskUuid: string;
}

export interface MockExamsGenerateQuestionsOutput {
  success: boolean;
  output?: unknown;
  error?: string;
}

export interface MockExamsGenerateQuestionsDeps {
  cloudwatchClient?: CloudWatchClient;
  createAIClientFn?: typeof createAIClient;
}

let client: DataClient;
const defaultCloudwatchClient = new CloudWatchClient({});

type ExtractedQuestionData = {
  extractedQuestionUuid: string;
  questionContent: string;
  questionType: 'MULTIPLE_CHOICE' | 'TEXT_INPUT';
  questionOptions: string[];
  correctAnswer?: string;
  answerExplanations?: string[]; // Array of 4 explanations in A,B,C,D order
  hint?: string;
  questionReference?: {
    referenceType: 'image' | 'graph' | 'chart' | 'table' | 'passage' | 'none';
    page: number;
    boundingBox: number[];
    s3Key?: string;
  };
  exam: string;
  module: string;
  topic?: string;
  subtopic?: string;
  concept?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
};

type MockExamInfo = {
  topic: string;
  description: string;
  difficulty: string;
  questionCount: number;
  moduleUuids: string[]; // Will be used for exam/module filtering
};

type MockExamQuestion = {
  index: number;
  questionContent: string;
  options: string[];
  answer: number;
  hint: string;
  answerExplanations: string[];
};

const getVerifiedQuestions = async (exam?: string, module?: string, topic?: string, difficulty?: string) => {
  console.log('Getting verified questions', exam, module, topic, difficulty);
  // Fetch all verified questions from ExtractedQuestion table
  // Apply filters based on exam type, module, topic, difficulty
  let nextToken: string | undefined = undefined;
  const allQuestions: ExtractedQuestionData[] = [];
  
  while (true) {
    const questionsPage = await client.models.ExtractedQuestion.list({
      filter: {
        verified: { eq: true },
        questionType: { eq: 'MULTIPLE_CHOICE' }, // Only multiple choice questions, no text input
        ...(exam && { exam: { eq: exam } }),
        ...(module && { module: { eq: module } }),
        // ...(topic && { topic: { eq: topic } }),
        ...(difficulty && { difficulty: { eq: difficulty.toUpperCase() as 'EASY' | 'MEDIUM' | 'HARD' } }),
      },
      limit: 1000,
      nextToken,
    }) as any;
    
    if (questionsPage.errors) {
      console.error('Error getting verified questions', questionsPage.errors);
      throw new Error('Error getting verified questions');
    }
    
    if (questionsPage.data) {
      allQuestions.push(...questionsPage.data);
      nextToken = questionsPage.nextToken;
    }
    
    if (!nextToken) {
      break;
    }
  }
  
  console.log(`Found ${allQuestions.length} verified questions matching filters`);
  return allQuestions;
}

const pickQuestionsFromBundle = async (questionCount: number, mockExamInfo: MockExamInfo) => {
  // Get verified questions based on mock exam criteria
  console.log('Mock exam info', mockExamInfo);

  const exam = mockExamInfo.topic.toUpperCase().includes('SAT') ? 'SAT' : undefined;
  
  // Determine if we need to fetch from specific module or all modules
  let questions: ExtractedQuestionData[] = [];
  
  if (mockExamInfo.topic.includes('Math')) {
    // Specific Math module
    questions = await getVerifiedQuestions(exam, 'Math', undefined, mockExamInfo.difficulty);
  } else if (mockExamInfo.topic.includes('Reading') || mockExamInfo.topic.includes('Writing')) {
    // Specific Reading and Writing module
    questions = await getVerifiedQuestions(exam, 'Reading and Writing', undefined, mockExamInfo.difficulty);
  } else if (exam === 'SAT') {
    // General SAT - fetch from both modules and combine
    console.log('Fetching questions from both SAT modules (Math and Reading and Writing)');
    const mathQuestions = await getVerifiedQuestions(exam, 'Math', undefined, mockExamInfo.difficulty);
    const readingWritingQuestions = await getVerifiedQuestions(exam, 'Reading and Writing', undefined, mockExamInfo.difficulty);
    
    console.log(`Found ${mathQuestions.length} Math questions and ${readingWritingQuestions.length} Reading and Writing questions`);
    
    // Try to get an even split from both modules
    const halfCount = Math.floor(questionCount / 2);
    const mathShuffled = mathQuestions.sort(() => Math.random() - 0.5);
    const rwShuffled = readingWritingQuestions.sort(() => Math.random() - 0.5);
    
    const mathPicked = mathShuffled.slice(0, Math.min(halfCount, mathShuffled.length));
    const rwPicked = rwShuffled.slice(0, Math.min(halfCount, rwShuffled.length));
    
    questions = [...mathPicked, ...rwPicked];
    
    // If we still need more questions and one module has more available, take from it
    const remaining = questionCount - questions.length;
    if (remaining > 0) {
      const remainingMath = mathShuffled.slice(mathPicked.length, mathPicked.length + remaining);
      const remainingRW = rwShuffled.slice(rwPicked.length, rwPicked.length + remaining);
      questions.push(...remainingMath, ...remainingRW.slice(0, remaining - remainingMath.length));
    }
    
    console.log(`Combined ${mathPicked.length} Math and ${rwPicked.length} Reading and Writing questions`);
  }
  
  if (questions.length === 0) {
    console.log('No verified questions found matching criteria, will generate all questions');
    return [];
  }
  
  // Shuffle the final selection
  const shuffled = questions.sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, Math.min(questionCount, shuffled.length));
  
  console.log(`Picked ${picked.length} questions from ${questions.length} available verified questions`);
  return picked;
}

const generateQuestions = async (
  mockExamUuid: string,
  mockExamInfo: MockExamInfo,
  questionCount: number,
  userUuid: string,
  cloudwatchClient: CloudWatchClient,
  createAIClientFn: typeof createAIClient,
) => {
  const userBasicInformation = await client.models.UserProfile.get({ userUuid }, { selectionSet: ['userDescription', 'userHelp'] });

  let chatPrompt = mockExamGenerateQuestionsPrompt;
  // replace the {{data}} with the document content
  chatPrompt = chatPrompt.replace('{{userBasicInformation}}', `User current situation: ${userBasicInformation.data?.userDescription || ''} User is using Curio for: ${userBasicInformation.data?.userHelp || ''}`);

  // Build user message
  const userMessage = `
    Create a quiz for the following subject or exam: ${mockExamInfo.topic}
    Description: ${mockExamInfo.description}
    Difficulty: ${mockExamInfo.difficulty}
    Exact number of questions: ${questionCount}
  `;

  const minItems = questionCount < 0 ? 1 : questionCount;
  const maxItems = Math.max(questionCount, 50);

  const aiClient = createAIClientFn({
    userUuid,
    saveTokenData: async (tokenData) => { await client.models.UserRequest.create(tokenData) },
    cloudwatchClient,
  });

  const userContent: UserContentItem[] = [
    {
      mimeType: 'text/plain',
      content: userMessage,
    },
  ];

  const result = await aiClient.call({
    intent: INTENT.GENERATE_QUESTIONS,
    userTier: TIER.FREE,
    prompt: chatPrompt,
    userContent,
    tools: [createMockQuestionsTool(minItems, maxItems)],
    category: 'generation',
    feature: 'generation_practice_test',
    messages: [],
  });

  const { output, error } = result;
  const errorCode = error ? 500 : undefined;

  // check errors first
  if (errorCode) {
    throw new Error(error as string);
  }

  if (!output) {
    throw new Error('No output received');
  }

  const gptOutput = output || [];

  const functionCall = gptOutput.find((item) => item.type === 'function_call') as UnifiedFunctionCall | undefined;
  const rawArguments = functionCall?.arguments;
  if (!rawArguments) {
    throw new Error('No arguments received');
  }

  await client.models.UserActionLog.create({
    userActionLogUuid: uuidv4(),
    userUuid,
    actionType: 'generated_questions_practice_test',
    sourceType: 'mockExam',
    sourceUuid: mockExamUuid,
    createdAt: new Date().toISOString(),
  });

  const quiz = JSON.parse(rawArguments) as QuestionsToolOutput;
  return quiz.questions;
}

export async function runMockExamsGenerateQuestions(
  dataClient: DataClient,
  input: MockExamsGenerateQuestionsInput,
  deps: MockExamsGenerateQuestionsDeps = {},
): Promise<MockExamsGenerateQuestionsOutput> {
  client = dataClient;
  const cloudwatchClient = deps.cloudwatchClient ?? defaultCloudwatchClient;
  const createAIClientFn = deps.createAIClientFn ?? createAIClient;

  const { mockExamUuid, userUuid, taskUuid } = input;

  if (!mockExamUuid) {
    console.error('Mock exam UUID is required');
    throw new Error('Mock exam UUID is required');
  }
  if (!userUuid) {
    console.error('User UUID is required');
    throw new Error('User UUID is required');
  }
  if (!taskUuid) {
    console.error('Task UUID is required');
    throw new Error('Task UUID is required');
  }

  // update task status to PROCESSING
  await client.models.Task.update({
    taskUuid,
    status: 'PROCESSING',
  });

  // get the mock exam
  const mockExam = await client.models.MockExam.get({ mockExamUuid }, { selectionSet: ['mockExamInfo.*', 'creationStatus'] });
  if (!mockExam.data) {
    return {
      success: false,
      error: 'Mock exam not found',
    };
  }
  if (!mockExam.data.mockExamInfo) {
    return {
      success: false,
      error: 'Mock exam info not found',
    };
  }

  if (mockExam.data.creationStatus === 'GENERATING') {
    return {
      success: true,
      output: 'Mock exam is already generating',
    };
  }

  // set exam creation status to generating
  await client.models.MockExam.update({
    mockExamUuid,
    creationStatus: 'GENERATING',
  });

  // Get verified questions from ExtractedQuestion table
  const questions: MockExamQuestion[] = [];
  const pickedQuestions = await pickQuestionsFromBundle(
    mockExam.data.mockExamInfo.questionCount,
    mockExam.data.mockExamInfo as unknown as MockExamInfo
  );
  
  // Map ExtractedQuestion to MockExamQuestion format
  questions.push(...pickedQuestions.map((question, index) => {
    // Convert correct answer letter to index (A=0, B=1, C=2, D=3)
    const answerIndex = question.correctAnswer ? 
      question.correctAnswer.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0) : 0;
    
    // Use answer explanations directly from the database (already in A,B,C,D order)
    // If not available, create empty array of correct length
    const answerExplanations = question.answerExplanations || 
      question.questionOptions.map(() => '');
    
    return {
      index,
      questionContent: question.questionContent,
      options: question.questionOptions,
      answer: answerIndex,
      hint: question.hint || '',
      answerExplanations,
      ...(question.questionReference && question.questionReference.referenceType !== 'none' && {
        questionReference: [{
          referenceType: question.questionReference.referenceType === 'passage' ? 'text' : 
                         question.questionReference.referenceType === 'graph' || 
                         question.questionReference.referenceType === 'chart' ? 'image' : 
                         question.questionReference.referenceType as 'image' | 'text' | 'table',
          text: question.questionReference.referenceType === 'passage' ? '' : undefined,
          ...(question.questionReference.s3Key && { externalKey: question.questionReference.s3Key }),
        }]
      }),
    };
  }));
  
  console.log(`Picked ${pickedQuestions.length} verified questions from ExtractedQuestion table, generating ${mockExam.data.mockExamInfo.questionCount - pickedQuestions.length} more questions`);

  // if we didn't have enough questions, generate some more
  if (pickedQuestions.length < mockExam.data.mockExamInfo.questionCount) {
    const remainingQuestionCount = mockExam.data.mockExamInfo.questionCount - pickedQuestions.length;
    const startingIndex = pickedQuestions.length; // Continue from where picked questions left off
    
    try {
      const generatedQuestions = await generateQuestions(
        mockExamUuid,
        {
          topic: mockExam.data.mockExamInfo.topic,
          description: mockExam.data.mockExamInfo.description,
          difficulty: mockExam.data.mockExamInfo.difficulty,
          questionCount: mockExam.data.mockExamInfo.questionCount,
          moduleUuids: mockExam.data.mockExamInfo.moduleUuids as string[],
        },
        remainingQuestionCount,
        userUuid,
        cloudwatchClient,
        createAIClientFn,
      );
      
      // Re-index generated questions to continue from where picked questions left off
      const reindexedGeneratedQuestions = generatedQuestions.map((q, idx) => ({
        ...q,
        index: startingIndex + idx,
      }));
      
      questions.push(...reindexedGeneratedQuestions);
    } catch (error) {
      console.error('Error generating questions', error);

      await client.models.Task.update({
        taskUuid,
        status: 'FAILED',
        error: error as string,
      });
  
      // update the mock exam with the creation status
      await client.models.MockExam.update({
        mockExamUuid,
        creationStatus: 'FAILED',
      });
  
      return {
        success: false,
        error: 'Error generating questions',
      };
    }
  }

  await client.models.MockExam.update({
    mockExamUuid,
    questions,
    creationStatus: 'GENERATED',
  });
  
  // update task status to COMPLETED
  await client.models.Task.update({
    taskUuid,
    status: 'COMPLETED',
  });

  // return the entire output, and the UI will handle the rest
  return {
    success: true,
    output: questions,
  };
}
