/**
 * Hono-Light Lambda entrypoint.
 *
 * Hosts the 7 light operations (§10.4 Phase 2):
 *   adminSearchUsers, fulfillPurchase, enqueueMemoryEvent, clearUserMemory,
 *   exportLearningProfile, runMemoryBackfill, deleteChat.
 *
 * The `/__hello` route is retained as a sandbox smoke check — invokable via
 * direct-invoke without touching any data dependencies (lets us deploy and
 * verify even when a single route is broken).
 *
 * See `docs/2026-05-27-amplify-to-hono-migration-plan.md` §10.3 + §10.4.
 */

import { Hono } from 'hono';

import { authIdentity } from '../../shared/middleware/auth-identity';
import { errorBoundary } from '../../shared/middleware/error-boundary';
import { requestLogger } from '../../shared/middleware/request-logger';
import { buildPolymorphicHandler } from '../../shared/polymorphic-dispatcher';
import { createAdminSearchUsersRoute } from '../../routes/admin-search-users';
import { createClearUserMemoryRoute } from '../../routes/clear-user-memory';
import { createDeleteChatRoute } from '../../routes/delete-chat';
import { createEnqueueMemoryEventRoute } from '../../routes/enqueue-memory-event';
import { createExportLearningProfileRoute } from '../../routes/export-learning-profile';
import { createFulfillPurchaseRoute } from '../../routes/fulfill-purchase';
import { createRunMemoryBackfillRoute } from '../../routes/run-memory-backfill';
import type { HonoEnv } from '../../shared/types';

import { dataClient } from './data';

const app = new Hono<HonoEnv>();

app.onError(errorBoundary);
app.use('*', authIdentity);
app.use('*', requestLogger);

/**
 * Sandbox smoke check. Touches no data dependencies so we can verify the
 * Lambda is live independent of any route's correctness.
 */
app.post('/__hello', (c) =>
  c.json({
    success: true,
    lambda: 'hono-light',
    invocationType: c.var.invocationType,
    identityPresent: c.var.identity !== null,
    requestId: c.var.requestId,
  }),
);

/* ------------------------------------------------------------------------- */
/* Phase 2 — Light routes                                                    */
/* ------------------------------------------------------------------------- */

// P2-4: clearUserMemory
const clearUserMemory = createClearUserMemoryRoute(dataClient);
app.post('/clearUserMemory', clearUserMemory.validate, clearUserMemory.handler);

// P2-7: deleteChat
const deleteChat = createDeleteChatRoute(dataClient);
app.post('/deleteChat', deleteChat.validate, deleteChat.handler);

// P2-3: enqueueMemoryEvent
const enqueueMemoryEvent = createEnqueueMemoryEventRoute(dataClient);
app.post('/enqueueMemoryEvent', enqueueMemoryEvent.validate, enqueueMemoryEvent.handler);

// P2-6: runMemoryBackfill
const runMemoryBackfill = createRunMemoryBackfillRoute(dataClient);
app.post('/runMemoryBackfill', runMemoryBackfill.validate, runMemoryBackfill.handler);

// P2-2: fulfillPurchase
const fulfillPurchase = createFulfillPurchaseRoute(dataClient);
app.post('/fulfillPurchase', fulfillPurchase.validate, fulfillPurchase.handler);

// P2-1: adminSearchUsers — rejects direct-invoke (admin boundary lives in AppSync)
// COGNITO_USER_POOL_ID is set via backend.ts addEnvironment().
const adminSearchUsers = createAdminSearchUsersRoute({
  userPoolId: process.env.COGNITO_USER_POOL_ID ?? '',
});
app.post('/adminSearchUsers', adminSearchUsers.validate, adminSearchUsers.handler);

// P2-5: exportLearningProfile — uses S3 storage at exports/memory/* (granted
// in amplify/storage/resource.ts) and reads AI_TUTOR_STORAGE_BUCKET_NAME env.
const exportLearningProfile = createExportLearningProfileRoute(dataClient);
app.post(
  '/exportLearningProfile',
  exportLearningProfile.validate,
  exportLearningProfile.handler,
);

export const handler = buildPolymorphicHandler(app);
