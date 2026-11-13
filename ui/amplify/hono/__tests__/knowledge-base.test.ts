/**
 * Unit tests for knowledge-base routes.
 */

import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';

import { appsyncAdapter } from '../shared/hono-appsync-adapter';
import { authIdentity } from '../shared/middleware/auth-identity';
import { errorBoundary } from '../shared/middleware/error-boundary';
import { buildAppSyncEvent, buildLambdaContext } from '../shared/test-utils';
import type { HonoEnv } from '../shared/types';
import { mountKnowledgeBaseRoutes } from '../routes/knowledge-base';

function buildApp() {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  mountKnowledgeBaseRoutes(app);
  return app;
}

describe('knowledge-base routes', () => {
  it('listSubjects via AppSync adapter path returns empty stub data', async () => {
    const app = buildApp();
    const handler = appsyncAdapter(app);
    const event = buildAppSyncEvent({
      fieldName: 'knowledgeBaseQuery',
      args: { actionType: 'listSubjects' },
    });

    const result = await handler(event, buildLambdaContext());

    expect(result).toEqual({
      success: true,
      subjectsList: [],
    });
  });

  it('createSubject mutation stub returns echoed subject', async () => {
    const app = buildApp();
    const handler = appsyncAdapter(app);
    const event = buildAppSyncEvent({
      fieldName: 'knowledgeBaseMutation',
      parentTypeName: 'Mutation',
      args: { actionType: 'createSubject', subject: { id: 's1', displayName: 'Science' } },
    });

    const result = await handler(event, buildLambdaContext());

    expect(result).toMatchObject({
      success: true,
      subjectItem: { id: 's1', displayName: 'Science' },
    });
  });

  it('createSubject validates required fields', async () => {
    const app = buildApp();
    const handler = appsyncAdapter(app);
    const event = buildAppSyncEvent({
      fieldName: 'knowledgeBaseMutation',
      parentTypeName: 'Mutation',
      args: { actionType: 'createSubject', subject: { id: 's1' } },
    });

    await expect(handler(event, buildLambdaContext())).rejects.toThrow(
      'subject.id and subject.displayName are required',
    );
  });
});
