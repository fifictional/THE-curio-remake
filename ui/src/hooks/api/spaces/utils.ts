import { Schema } from "@amplify/data/resource";

type RequestType = Schema['Question']['type'];

export const mapQuestionToQuizQuestion = (question: RequestType) => ({
  questionUuid: question.questionUuid,
  userUuid: question.userUuid,
  spaceUuid: question.spaceUuid || null,
  documentUuid: question.documentUuid || null,
  chatUuid: question.chatUuid || null,
  questionContent: question.questionContent,
  questionReferences: (question.questionReferences ?? []).filter((ref): ref is NonNullable<typeof ref> => ref !== null).map((ref: any) => ({
    reference_type: ref.reference_type || undefined,
    reference_name: ref.reference_name || undefined,
    reference_content: ref.reference_content || undefined,
    reference_url: ref.reference_url || undefined,
  })),
  options: (question.options || []).filter((option): option is string => option !== null),
  answer: question.answer,
  hint: (question as any).hint ?? null,
  answerExplanations: (question as any).answerExplanations ?? null,
  createdAt: question.createdAt,
  updatedAt: question.updatedAt,
  vote: (question as any).vote ?? null,
});