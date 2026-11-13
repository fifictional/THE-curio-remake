/**
 * `createDefaultKnowledgeBaseNodes` mutation route.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';

import { runCreateDefaultKnowledgeBaseNodes } from '../../functions/neptune-create-default-nodes/run-create-default-knowledge-base-nodes';
import {
  getValidatedBody,
  validateBody,
} from '../shared/middleware/validate';
import type { HonoEnv } from '../shared/types';

export const CreateDefaultKnowledgeBaseNodesArgs = z.object({}).passthrough();

export interface CreateDefaultKnowledgeBaseNodesRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

export function createCreateDefaultKnowledgeBaseNodesRoute(): CreateDefaultKnowledgeBaseNodesRoute {
  const validate = validateBody(CreateDefaultKnowledgeBaseNodesArgs);

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    getValidatedBody<typeof CreateDefaultKnowledgeBaseNodesArgs>(c);
    const result = await runCreateDefaultKnowledgeBaseNodes();
    return c.json(result);
  };

  return { validate, handler };
}
