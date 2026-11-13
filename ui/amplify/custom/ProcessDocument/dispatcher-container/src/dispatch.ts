import { getTask } from "../../document-processor/handler/database/tasks/get-task";
import { getDocument } from "../../document-processor/handler/database/documents/get-document";
import { updateTask } from "../../document-processor/handler/database/tasks/update-task";
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { Mixpanel } from "mixpanel";

export interface performDispatchDependencies {
  sfn: SFNClient;
  mixpanel: Mixpanel | { track: (event: string, properties: Record<string, any>) => void; } | null;
}

export interface PerformDispatchLambdaArns {
  chatLambdaArn: string;
  mockExamsGenerateQuestionsLambdaArn: string;
  satExtractModulesArn: string;
  satExtractAnswerModulesArn: string;
  satQuestionExtractorArn: string;
  generateQuestionsArn: string;
}

export async function performDispatch(deps: performDispatchDependencies, taskUuid: string, taskType: string, stateMachineArn: string, lambdaArns: PerformDispatchLambdaArns, messageId: string): Promise<{ retry: boolean, errorMessage: string | undefined }> {
  console.log('Performing dispatch for task:', taskUuid, taskType);

  // get task data from database
  const task = await getTask(taskUuid);
  if (!task) {
    return { retry: false, errorMessage: 'Task not found' };
  }
    
  // if the task is not pending do no further processing
  if (task.status !== 'PENDING') {
    return { retry: false, errorMessage: 'Task is not pending' };
  }


  if (taskType === 'CHAT') {
    // P3-16: direct-invoke via Hono-Heavy `/ai-chat` (see hono-direct-invoke-adapter).
    const chatLambda = new LambdaClient({ region: process.env.AWS_REGION! });
    const chatLambdaResult = await chatLambda.send(new InvokeCommand({
      FunctionName: lambdaArns.chatLambdaArn,
      Payload: JSON.stringify({
        __route: 'ai-chat',
        arguments: { ...JSON.parse(task.args), taskUuid },
      }),
    }));

    if (chatLambdaResult.StatusCode !== 200) {
      return { retry: false, errorMessage: 'Chat lambda failed' };
    }

    return { retry: false, errorMessage: undefined };
  }

  if (taskType === 'QUESTION_GENERATION') {
    // P3-16: direct-invoke via Hono-Heavy `/mock-exams-generate-questions`.
    const mockExamsGenerateQuestionsLambda = new LambdaClient({ region: process.env.AWS_REGION! });
    const mockExamsGenerateQuestionsLambdaResult = await mockExamsGenerateQuestionsLambda.send(new InvokeCommand({
      FunctionName: lambdaArns.mockExamsGenerateQuestionsLambdaArn,
      Payload: JSON.stringify({
        __route: 'mock-exams-generate-questions',
        arguments: { ...JSON.parse(task.args), taskUuid },
      }),
    }));

    if (mockExamsGenerateQuestionsLambdaResult.StatusCode !== 200) {
      return { retry: false, errorMessage: 'Mock exams generate questions lambda failed' };
    }

    return { retry: false, errorMessage: undefined };
  }

  if (taskType === 'EXTRACT_MODULES') {
    // call sat extract modules lambda
    const satExtractModulesLambda = new LambdaClient({ region: process.env.AWS_REGION! });
    const satExtractModulesResult = await satExtractModulesLambda.send(new InvokeCommand({
      FunctionName: lambdaArns.satExtractModulesArn,
      Payload: JSON.stringify({ arguments: JSON.parse(task.args) }),
    }));

    console.log('SAT Extract Modules lambda called');

    if (satExtractModulesResult.StatusCode !== 200) {
      return { retry: false, errorMessage: 'SAT Extract Modules lambda failed' };
    }

    return { retry: false, errorMessage: undefined };
  }

  if (taskType === 'EXTRACT_ANSWER_MODULES') {
    // call sat extract answer modules lambda
    const satExtractAnswerModulesLambda = new LambdaClient({ region: process.env.AWS_REGION! });
    const satExtractAnswerModulesResult = await satExtractAnswerModulesLambda.send(new InvokeCommand({
      FunctionName: lambdaArns.satExtractAnswerModulesArn,
      Payload: JSON.stringify({ arguments: JSON.parse(task.args) }),
    }));

    console.log('SAT Extract Answer Modules lambda called');

    if (satExtractAnswerModulesResult.StatusCode !== 200) {
      return { retry: false, errorMessage: 'SAT Extract Answer Modules lambda failed' };
    }

    return { retry: false, errorMessage: undefined };
  }

  if (taskType === 'QUESTION_EXTRACT') {
    // call sat question extractor lambda
    const satQuestionExtractorLambda = new LambdaClient({ region: process.env.AWS_REGION! });
    const satQuestionExtractorResult = await satQuestionExtractorLambda.send(new InvokeCommand({
      FunctionName: lambdaArns.satQuestionExtractorArn,
      Payload: JSON.stringify({ arguments: JSON.parse(task.args) }),
    }));

    console.log('SAT Question Extractor lambda called');

    if (satQuestionExtractorResult.StatusCode !== 200) {
      return { retry: false, errorMessage: 'SAT Question Extractor lambda failed' };
    }

    return { retry: false, errorMessage: undefined };
  }

  if (taskType === 'GENERATE_QUESTIONS') {
    // P4-7: direct-invoke via Hono-Neptune `/generate-questions`.
    const generateQuestionsLambda = new LambdaClient({ region: process.env.AWS_REGION! });
    const generateQuestionsResult = await generateQuestionsLambda.send(new InvokeCommand({
      FunctionName: lambdaArns.generateQuestionsArn,
      Payload: JSON.stringify({
        __route: 'generate-questions',
        arguments: JSON.parse(task.args),
      }),
    }));

    console.log('Generate Questions lambda called');

    if (generateQuestionsResult.StatusCode !== 200) {
      return { retry: false, errorMessage: 'Generate Questions lambda failed' };
    }

    return { retry: false, errorMessage: undefined };
  }

  // get document from database
  const document = await getDocument(task.documentUuid);
  if (!document) {
    return { retry: false, errorMessage: 'Document not found' };
  }

  // get mixpanel token from secret
  if (deps.mixpanel) {
    deps.mixpanel.track('task_processing', {
      userId: task.userUuid,
      taskUuid: taskUuid,
      documentUuid: document.documentUuid,
      documentName: document.fileName,
      documentType: document.type,
      branch: process.env.AWS_BRANCH || 'local',
    });
  }

  // create payload for state machine - only pass UUIDs, everything else will be fetched from DB
  const payload = {
    taskUuid,
    documentUuid: task.documentUuid,
    userUuid: task.userUuid,
  };

  // start state machine execution
  // update task status to PROCESSING
  const updateTaskResult = updateTask(taskUuid, "PROCESSING");
  const startExecutionResult = deps.sfn.send(new StartExecutionCommand({
    stateMachineArn,
    input: JSON.stringify(payload),
    name: messageId,
  }));

  try {
    await updateTaskResult;
  } catch (error) {
    console.error('Error updating task status:', error);
  }
  try {
    await startExecutionResult;
    console.log('State machine execution started for task:', taskUuid);
  } catch (error) {
    console.error('Error starting state machine execution:', error);
  }

  return { retry: false, errorMessage: undefined};
};
