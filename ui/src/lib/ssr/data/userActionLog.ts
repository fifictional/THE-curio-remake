import { cookieBasedClient } from "@ssr/utils/request-helper";
import { v4 as uuidv4 } from 'uuid';

export type CreateUserActionLog = {
  userUuid: string,
  actionType: 'sent_chat_message' | 'analyzing_document' | 'generated_flashcards' | 'generated_quiz' | 'web_searched' | 'generated_practice_test' | 'generated_questions' | 'generated_questions_practice_test',
  sourceType: 'chat' | 'document' | 'mockExam' | 'youtube',
  sourceUuid: string,
}

export function addUserActionLog({userUuid, actionType, sourceType, sourceUuid}: CreateUserActionLog) {
  return cookieBasedClient.models.UserActionLog.create({
    userActionLogUuid: uuidv4(),
    userUuid,
    actionType,
    sourceType,
    sourceUuid,
    createdAt: new Date().toISOString(),
  });
}