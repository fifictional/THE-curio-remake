export type Chat = {
  chatUuid: string;
  userUuid: string;
  documentUuid: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
  spaceName: string;
  spaceUuid: string | null;
  isWebSearchCalled: boolean;
  hasFlashcardsOrQuizzes: boolean;
  lastQuizScore?: number | null;
  lastQuizTotal?: number | null;
};