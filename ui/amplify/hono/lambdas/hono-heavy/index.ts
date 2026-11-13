/**
 * Hono-Heavy Lambda entrypoint.
 *
 * Phase 3 — all 13 heavy GraphQL-backed routes + batchCreator cron entry.
 * See `docs/2026-05-27-amplify-to-hono-migration-plan.md` §10.5.
 */

import '../../batch-creator-side-effects';

import { Hono } from 'hono';
import type { HonoEnv } from '../../shared/types';
import { errorBoundary } from '../../shared/middleware/error-boundary';
import { authIdentity } from '../../shared/middleware/auth-identity';
import { requestLogger } from '../../shared/middleware/request-logger';
import { buildPolymorphicHandler } from '../../shared/polymorphic-dispatcher';
import { createMoveChatRoute } from '../../routes/move-chat';
import { createMoveDocumentRoute } from '../../routes/move-document';
import { createMoveAllUserResourcesRoute } from '../../routes/move-all-user-resources';
import { createEmbedSpaceFlashcardsRoute } from '../../routes/embed-space-flashcards';
import { createGenerateQuestionAnswerRoute } from '../../routes/generate-question-answer';
import { createGenerateQuestionReferenceRoute } from '../../routes/generate-question-reference';
import { createExtractQuestionReferencesRoute } from '../../routes/extract-question-references';
import { createSatExtractAnswersRoute } from '../../routes/sat-extract-answers';
import { createDeleteUserRoute } from '../../routes/delete-user';
import { createDeleteDocumentRoute } from '../../routes/delete-document';
import { createMockExamsGenerateQuestionsRoute } from '../../routes/mock-exams-generate-questions';
import { createAiChatRoute } from '../../routes/ai-chat';
import { createBatchCreatorRoute } from '../../routes/batch-creator';
import { mountKnowledgeBaseRoutes } from '../../routes/knowledge-base';
import { mountLearningProfileRoutes } from '../../routes/learning-profile';
import { createCreateDefaultKnowledgeBaseNodesRoute } from '../../routes/create-default-knowledge-base-nodes';
import { createGenerateQuestionsRoute } from '../../routes/generate-questions';
import { dataClient } from './data';

const app = new Hono<HonoEnv>();

app.onError(errorBoundary);
app.use('*', authIdentity);
app.use('*', requestLogger);

app.post('/__hello', async (c) => {
  let body: unknown = null;
  try {
    body = await c.req.json();
  } catch {
    body = null;
  }
  return c.json({
    success: true,
    lambda: 'hono-heavy',
    phase: 'Phase 3 — Heavy routes (complete)',
    routeCount: 13,
    invocationType: c.var.invocationType,
    identityPresent: c.var.identity !== null,
    requestId: c.var.requestId,
    receivedBody: body,
  });
});

function mount(
  paths: string[],
  validate: import('hono').MiddlewareHandler<HonoEnv>,
  handler: (c: import('hono').Context<HonoEnv>) => Promise<Response>,
) {
  for (const path of paths) {
    app.post(path, validate, handler);
  }
}

// P3-1: moveChat
const moveChat = createMoveChatRoute(dataClient);
app.post('/moveChat', moveChat.validate, moveChat.handler);

// P3-2: moveDocument
const moveDocument = createMoveDocumentRoute(dataClient);
app.post('/moveDocument', moveDocument.validate, moveDocument.handler);

// P3-3: moveAllUserResources
const moveAllUserResources = createMoveAllUserResourcesRoute(dataClient);
app.post(
  '/moveAllUserResources',
  moveAllUserResources.validate,
  moveAllUserResources.handler,
);

// P3-4: deleteDocument
const deleteDocument = createDeleteDocumentRoute(dataClient);
app.post('/deleteDocument', deleteDocument.validate, deleteDocument.handler);

// P3-5: embedSpaceFlashcards
const embedSpaceFlashcards = createEmbedSpaceFlashcardsRoute(dataClient);
app.post(
  '/embedSpaceFlashcards',
  embedSpaceFlashcards.validate,
  embedSpaceFlashcards.handler,
);

// P3-6: mockExamsGenerateQuestions (AppSync + ProcessDocument direct-invoke)
const mockExamsGenerateQuestions = createMockExamsGenerateQuestionsRoute(dataClient);
mount(
  ['/mockExamsGenerateQuestions', '/mock-exams-generate-questions'],
  mockExamsGenerateQuestions.validate,
  mockExamsGenerateQuestions.handler,
);

// P3-7: generateQuestionAnswer
const generateQuestionAnswer = createGenerateQuestionAnswerRoute(dataClient);
app.post(
  '/generateQuestionAnswer',
  generateQuestionAnswer.validate,
  generateQuestionAnswer.handler,
);

// P3-8: generateQuestionReference
const generateQuestionReference = createGenerateQuestionReferenceRoute(dataClient);
app.post(
  '/generateQuestionReference',
  generateQuestionReference.validate,
  generateQuestionReference.handler,
);

// P3-9: batchCreator (AppSync + EventBridge cron via /__cron/batch-creator)
const batchCreator = createBatchCreatorRoute(dataClient);
mount(
  ['/batchCreator', '/__cron/batch-creator'],
  batchCreator.validate,
  batchCreator.handler,
);

// P3-10: extractQuestionReferences
const extractQuestionReferences = createExtractQuestionReferencesRoute(dataClient);
app.post(
  '/extractQuestionReferences',
  extractQuestionReferences.validate,
  extractQuestionReferences.handler,
);

// P3-11: satExtractAnswers
const satExtractAnswers = createSatExtractAnswersRoute(dataClient);
app.post('/satExtractAnswers', satExtractAnswers.validate, satExtractAnswers.handler);

// P3-12: aiChat (AppSync + ProcessDocument direct-invoke)
const aiChat = createAiChatRoute(dataClient);
mount(['/aiChat', '/ai-chat'], aiChat.validate, aiChat.handler);

// P3-13: deleteUser
const deleteUser = createDeleteUserRoute(dataClient);
app.post('/deleteUser', deleteUser.validate, deleteUser.handler);

// Knowledge base, learning profile, and question generation (formerly hono-neptune)
mountKnowledgeBaseRoutes(app);
mountLearningProfileRoutes(app);

const createDefaultNodes = createCreateDefaultKnowledgeBaseNodesRoute();
app.post(
  '/createDefaultKnowledgeBaseNodes',
  createDefaultNodes.validate,
  createDefaultNodes.handler,
);

const generateQuestions = createGenerateQuestionsRoute(dataClient);
app.post('/generateQuestions', generateQuestions.validate, generateQuestions.handler);
app.post('/generate-questions', generateQuestions.validate, generateQuestions.handler);

export const handler = buildPolymorphicHandler(app);
