/**
 * Mount all knowledge-base action routes on a Hono app.
 */

import type { Hono } from 'hono';
import {
  KNOWLEDGE_BASE_MUTATION_ACTIONS,
  KNOWLEDGE_BASE_QUERY_ACTIONS,
  runKnowledgeBaseMutation,
  runKnowledgeBaseQuery,
  type KnowledgeBaseArgs,
} from '../../functions/neptune-knowledge-base/run-knowledge-base';
import type { HonoEnv } from '../shared/types';

function mountActionRoutes(
  app: Hono<HonoEnv>,
  prefix: 'knowledgeBaseQuery' | 'knowledgeBaseMutation',
  actions: readonly string[],
  runner: (args: KnowledgeBaseArgs) => Promise<unknown>,
) {
  for (const actionType of actions) {
    app.post(`/${prefix}/${actionType}`, async (c) => {
      const args = (await c.req.json()) as KnowledgeBaseArgs;
      const result = await runner({ ...args, actionType });
      return c.json(result);
    });
  }
}

export function mountKnowledgeBaseRoutes(app: Hono<HonoEnv>) {
  mountActionRoutes(
    app,
    'knowledgeBaseQuery',
    KNOWLEDGE_BASE_QUERY_ACTIONS,
    runKnowledgeBaseQuery,
  );
  mountActionRoutes(
    app,
    'knowledgeBaseMutation',
    KNOWLEDGE_BASE_MUTATION_ACTIONS,
    runKnowledgeBaseMutation,
  );
}
