/**
 * Mount all learning-profile action routes on a Hono app.
 */

import type { Hono } from 'hono';
import {
  LEARNING_PROFILE_MUTATION_ACTIONS,
  LEARNING_PROFILE_QUERY_ACTIONS,
  runLearningProfileMutation,
  runLearningProfileQuery,
  type LearningProfileArgs,
} from '../../functions/neptune-learning-profile/run-learning-profile';
import type { HonoEnv } from '../shared/types';

function mountActionRoutes(
  app: Hono<HonoEnv>,
  prefix: 'learningProfileQuery' | 'learningProfileMutation',
  actions: readonly string[],
  runner: (args: LearningProfileArgs) => Promise<unknown>,
) {
  for (const actionType of actions) {
    app.post(`/${prefix}/${actionType}`, async (c) => {
      const args = (await c.req.json()) as LearningProfileArgs;
      const result = await runner({ ...args, actionType });
      return c.json(result);
    });
  }
}

export function mountLearningProfileRoutes(app: Hono<HonoEnv>) {
  mountActionRoutes(
    app,
    'learningProfileQuery',
    LEARNING_PROFILE_QUERY_ACTIONS,
    runLearningProfileQuery,
  );
  mountActionRoutes(
    app,
    'learningProfileMutation',
    LEARNING_PROFILE_MUTATION_ACTIONS,
    runLearningProfileMutation,
  );
}
