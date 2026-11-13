export type UserRequest = {
  userUuid: string;
  category?: 'chat' | 'document' | 'generation' | 'extraction';
  feature?: string;
  model: string;
  totalTokenCount: number;
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  cachedContentTokenCount?: number;
  createdAt: string;
  documentUuid: string | null;
  requestStatus: number;
  webSearchCalled: boolean;
  latency?: number;
};