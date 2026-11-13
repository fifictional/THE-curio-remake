import { NextRequest, NextResponse } from "next/server";
import { authorizeDocumentAccess, cookieBasedClient, getUserId } from "@/lib/ssr/utils";
import { v4 as uuidv4 } from 'uuid';
import OpenAI from "openai";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { createAIClient } from "@ai/ai-client";
import { INTENT, TIER } from "@ai-intents";
import { UserContentItem } from "@ai-providers/types";
import { createQuestionsTool } from "@ai-tools/create-questions-tool";

const cloudwatchClient = new CloudWatchClient({});

type CreateQuizBody = {
  messageUuid?: string;
  userUuid: string;
  sourceType: 'document' | 'chat';
  sourceUuid: string;
  quiz: { title: string; description: string; difficulty: string; questionCount: number };
}

async function updateQuizState(
  quizUuid: string,
  state: 'completed' | 'failed',
  sourceType: 'document' | 'chat',
  sourceUuid: string
): Promise<void> {
  await cookieBasedClient.models.Quiz.update(
    {
      quizUuid,
      state,
    }
  );
  switch (sourceType) {
    case 'document': {
      await cookieBasedClient.models.Document.update({
        documentUuid: sourceUuid,
      }, {
        selectionSet: ['documentUuid', 'spaceUuid', 'quizzes.*'],
      });
      break;
    }
    case 'chat': {
      await cookieBasedClient.models.Chat.update({
        chatUuid: sourceUuid,
      }, {
        selectionSet: ['chatUuid', 'spaceUuid', 'quizzes.*'],
      });
    }
  }
}

async function updateMessageState({
  messageUuid,
  state,
}: {
  messageUuid?: string,
  state: 'in_progress' | 'completed' | 'failed'
}): Promise<void> {
  if (!messageUuid) return;
  
  await cookieBasedClient.models.Message.update({
    messageUuid,
    toolExtras: {
      userAction: true,
      isLoading: state === 'in_progress',
      success: state === 'completed',
      errors: state === 'failed' ? ['Failed to generate quiz'] : null,
    },
  });
}

async function updateChatWithQuiz(chatUuid: string) {
  await cookieBasedClient.models.Chat.update({
    chatUuid,
    hasFlashcardsOrQuizzes: true,
    updatedAt: new Date().toISOString(),
  });
}

async function getPastMessages(chatUuid: string) {
  const messages = await cookieBasedClient.models.Message.listMessageByChatUuidAndCreatedAt({ chatUuid }, { limit: 50, sortDirection: 'DESC' });
  if (!messages.data) {
    console.error('Error getting old messages:', JSON.stringify(messages.errors));
    throw new Error('Internal server error');
  }
  const orderedMessages = messages.data.reverse();

  const history = orderedMessages.map((message) => ({
    role: message.role === "user" ? "user" as const : "model" as const,
    content: message.type === 'tool'
      ? `This message was response from a tool call with these arguments: ${message.toolArguments} and this text: ${message.content}`
      : message.content,
  }));

  // how many messages are in the history of the chat that are from the user and are from today
  const today = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
  const messageCount = orderedMessages
    .filter((message) => message.role === 'user' && message.createdAt > today)
    .length;

  return {
    history,
    messageCount,
  };
}

export async function POST(req: NextRequest) {
  const { messageUuid, userUuid, sourceType, sourceUuid, quiz }: CreateQuizBody = await req.json();

  if (!userUuid || !sourceType || !sourceUuid || !quiz || !quiz.questionCount || quiz.questionCount <= 0) {
    return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
  }

  const callerUserId = await getUserId();
  if (!callerUserId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }
  if (callerUserId !== userUuid) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  if (sourceType === 'document') {
    const access = await authorizeDocumentAccess(sourceUuid);
    if (!access.ok) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }
  }

  await updateMessageState({ messageUuid, state: 'in_progress' });

  try {
    // Create a quiz up front to give the UI something to show
    const quizUuid = uuidv4();
    const now = new Date().toISOString();
    await cookieBasedClient.models.Quiz.create({
      quizUuid,
      userUuid,

      sourceType,
      sourceUuid,

      title: quiz.title,
      description: quiz.description,
      difficulty: quiz.difficulty,

      questionCount: quiz.questionCount,

      state: 'generating',

      createdAt: now,
      updatedAt: now,
    });

    let contextText = '';
    switch (sourceType) {
      case 'document': {
        await cookieBasedClient.models.Document.update({
          documentUuid: sourceUuid,
        }, {
          selectionSet: ['documentUuid', 'spaceUuid', 'quizzes.*'],
        });
        const docSummary = await cookieBasedClient.models.DocumentSummary.listDocumentSummaryByDocumentUuid({
          documentUuid: sourceUuid,
        }, {
          selectionSet: ['documentSummaryUuid', 'summary', 'enrichedMarkdown'],
          limit: 1,
        });
        contextText = docSummary.data?.[0]?.enrichedMarkdown || docSummary.data?.[0]?.summary || '';
        break;
      }
    }

    const { history } = await getPastMessages(sourceUuid);

    const generationPrompt = `You are an AI assistant tasked withgenerating practice quiz questions. Using the provided context, you MUST call the create_questions tool with exactly ${quiz.questionCount} questions.
    Use the same language as the context provided.
Each question MUST follow the tool schema: a multiple-choice with 4 options, integer answer index (0-3), a concise hint that doesn't give away the answer, and per-option answerExplanations (4 entries).

## IMPORTANT: Use LaTeX for formulas in style \\(f(x) = x^2\\). Don't use "$" for LaTeX formulas. All backslashes must be doubled.

IMPORTANT - Canonical option order for storage:
- The CORRECT option MUST be placed at index 0 in the options array.
- The remaining 3 options can be in any order.

Return NOTHING else: only call the tool.

CONTEXT:\n${contextText}`;

    const aiClient = createAIClient({
      userUuid,
      saveTokenData: async (tokenData) => { await cookieBasedClient.models.UserRequest.create(tokenData) },
      cloudwatchClient,
    });

    const userContent: UserContentItem[] = [
      {
        mimeType: 'text/plain',
        content: `Generate exactly ${quiz.questionCount} questions from the context`,
      },
    ];

    const result = await aiClient.call({
      intent: INTENT.GENERATE_QUESTIONS,
      userTier: TIER.FREE,
      prompt: generationPrompt,
      userContent,
      tools: [createQuestionsTool(quiz.questionCount, quiz.questionCount)],
      temperature: 0.8,
      category: 'generation',
      feature: 'quiz-generation',
      messages: history,
    });

    const { output, error } = result;
    const errorCode = error ? 500 : undefined;

    if (errorCode) {
      await updateQuizState(quizUuid, 'failed', sourceType, sourceUuid);
      await updateMessageState({ messageUuid, state: 'failed' });
      return NextResponse.json({ success: false, errorCode, error }, { status: 500 });
    }

    if (!output) {
      await updateQuizState(quizUuid, 'failed', sourceType, sourceUuid);
      await updateMessageState({ messageUuid, state: 'failed' });
      return NextResponse.json({ success: false, error: 'No tool output produced' }, { status: 500 });
    }

    const gptOutput = output as OpenAI.Responses.ResponseOutputItem[];

    // Find the create_questions function call
    const functionCall = gptOutput.find((o: any) => o.type === 'function_call' && (o as any).name === 'create_questions') as OpenAI.Responses.ResponseFunctionToolCall | undefined;
    if (!functionCall) {
      await updateQuizState(quizUuid, 'failed', sourceType, sourceUuid);
      await updateMessageState({ messageUuid, state: 'failed' });
      return NextResponse.json({ success: false, error: 'Tool did not call create_questions' }, { status: 500 });
    }

    let parsed: { questions: { questionContent: string; options: string[]; answer: number; hint?: string; answerExplanations?: string[] }[] };
    try {
      parsed = JSON.parse(functionCall.arguments);
    } catch {
      await updateQuizState(quizUuid, 'failed', sourceType, sourceUuid);
      await updateMessageState({ messageUuid, state: 'failed' });
      return NextResponse.json({ success: false, error: 'Failed to parse create_questions arguments' }, { status: 500 });
    }

    const questions = (parsed.questions || []).slice(0, quiz.questionCount).map((q) => {
      try {
        const options = Array.isArray(q.options) ? [...q.options] : [];
        const exps = Array.isArray((q as any).answerExplanations) ? [...(q as any).answerExplanations] : undefined;
        const hint = (q as any).hint || undefined;
        return {
          questionContent: q.questionContent,
          options,
          hint,
          answerExplanations: exps,
        };
      } catch {
        return q;
      }
    });

    // Persist Questions and collect their UUIDs in order
    const questionUuids: string[] = [];
    for (const q of questions) {
      const quizQuestionUuid = uuidv4();
      await cookieBasedClient.models.QuizQuestion.create({
        quizQuestionUuid,
        userUuid,
        sourceType,
        sourceUuid,
        questionContent: q.questionContent,
        quizUuid,
        options: q.options,
        hint: q.hint,
        answerExplanations: q.answerExplanations,
      });
    }

    // Mark the quiz as completed
    await updateQuizState(quizUuid, 'completed', sourceType, sourceUuid);
    await updateMessageState({ messageUuid, state: 'completed' });
    await updateChatWithQuiz(sourceUuid);

    await cookieBasedClient.models.UserActionLog.create({
      userActionLogUuid: uuidv4(),
      userUuid,
      actionType: 'generated_questions',
      sourceType: sourceType,
      sourceUuid: sourceUuid,
      createdAt: now,
    });
  
    return NextResponse.json({ success: true, quizUuid, questionUuids });
  } catch (e: any) {
    await updateMessageState({ messageUuid, state: 'failed' });
    return NextResponse.json({ success: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
