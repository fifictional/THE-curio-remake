/**
 * Unit tests for learning-profile routes.
 */

import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';

import { appsyncAdapter } from '../shared/hono-appsync-adapter';
import { authIdentity } from '../shared/middleware/auth-identity';
import { errorBoundary } from '../shared/middleware/error-boundary';
import { buildAppSyncEvent, buildLambdaContext } from '../shared/test-utils';
import type { HonoEnv } from '../shared/types';
import { mountLearningProfileRoutes } from '../routes/learning-profile';

function buildApp() {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  mountLearningProfileRoutes(app);
  return app;
}

describe('learning-profile routes', () => {
  it('getUserLearningProfile via AppSync adapter', async () => {
    const app = buildApp();
    const handler = appsyncAdapter(app);
    const event = buildAppSyncEvent({
      fieldName: 'learningProfileQuery',
      args: { actionType: 'getUserLearningProfile', userUuid: 'user-1' },
    });

    const result = await handler(event, buildLambdaContext());

    expect(result).toEqual({ success: true, conceptMasteries: [] });
  });

  it('legacy getConceptMastery alias path resolves via adapter', async () => {
    const app = buildApp();
    const handler = appsyncAdapter(app);
    const event = buildAppSyncEvent({
      fieldName: 'getConceptMastery',
      args: { userUuid: 'user-1', conceptId: 'concept-1' },
    });

    const result = await handler(event, buildLambdaContext());

    expect(result).toEqual({
      success: true,
      masteryLevel: 0,
    });
  });
});
