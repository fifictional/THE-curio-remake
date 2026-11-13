import { NextRequest, NextResponse } from "next/server";
import { cookieBasedClient } from "@/lib/ssr/utils";

export async function POST(req: NextRequest) {
  const { quizUuid } = await req.json();
  if (!quizUuid) return NextResponse.json({ success: false, error: 'quizUuid required' }, { status: 400 });

  try {
    // List quiz questions by quizUuid and delete them
    const res: any = await cookieBasedClient.models.QuizQuestion.listQuizQuestionByQuizUuid(
      { quizUuid },
      { limit: 500, selectionSet: ['quizQuestionUuid'] },
    );
    const items = res.data || [];
    for (const qq of items) {
      await cookieBasedClient.models.QuizQuestion.delete({ quizQuestionUuid: qq.quizQuestionUuid });
    }

    // Delete the quiz itself
    const quiz = await cookieBasedClient.models.Quiz.delete({ quizUuid });
    const sourceType = quiz.data?.sourceType;
    const sourceUuid = quiz.data?.sourceUuid;

    if (sourceUuid) {
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
          break;
        }
      }
    }


    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


