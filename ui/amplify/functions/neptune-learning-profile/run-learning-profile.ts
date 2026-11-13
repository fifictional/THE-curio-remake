/**
 * Learning-profile stubs after Neptune decommission.
 */

export type LearningProfileArgs = Record<string, unknown> & {
  actionType?: string;
  userUuid?: string;
  concept?: string;
  masteryLevel?: number;
  updates?: unknown[];
};

export async function runLearningProfileQuery(args: LearningProfileArgs) {
  const { actionType } = args;
  switch (actionType) {
    case 'getUserLearningProfile':
      return { success: true, conceptMasteries: [] };
    case 'getConceptMastery':
      return { success: true, masteryLevel: 0 };
    case 'getTopicMastery':
    case 'getSubtopicMastery':
      return { success: true, masteryLevel: 0 };
    case 'getUserConceptsMastery':
      return { success: true, conceptMasteries: [] };
    default:
      throw new Error(`Unknown query actionType: ${actionType}`);
  }
}

export async function runLearningProfileMutation(args: LearningProfileArgs) {
  const { actionType } = args;
  switch (actionType) {
    case 'createOrUpdateConceptMastery':
      return {
        success: true,
        concept: args.concept,
        masteryLevel: args.masteryLevel ?? 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    case 'batchUpdateConceptMastery': {
      const updates = Array.isArray(args.updates) ? args.updates : [];
      return { success: true, updatedCount: updates.length };
    }
    case 'deleteUserKnowledge':
      return { success: true };
    default:
      throw new Error(`Unknown mutation actionType: ${actionType}`);
  }
}

export const LEARNING_PROFILE_QUERY_ACTIONS = [
  'getUserLearningProfile',
  'getConceptMastery',
  'getTopicMastery',
  'getSubtopicMastery',
  'getUserConceptsMastery',
] as const;

export const LEARNING_PROFILE_MUTATION_ACTIONS = [
  'createOrUpdateConceptMastery',
  'batchUpdateConceptMastery',
  'deleteUserKnowledge',
] as const;

export const LEARNING_PROFILE_LEGACY_ACTION_HANDLERS: Record<
  string,
  (args: LearningProfileArgs) => Promise<unknown>
> = {
  createOrUpdateConceptMastery: (args) =>
    runLearningProfileMutation({ ...args, actionType: 'createOrUpdateConceptMastery' }),
  getUserLearningProfile: (args) =>
    runLearningProfileQuery({ ...args, actionType: 'getUserLearningProfile' }),
  getConceptMastery: (args) =>
    runLearningProfileQuery({ ...args, actionType: 'getConceptMastery' }),
  getTopicMastery: (args) =>
    runLearningProfileQuery({ ...args, actionType: 'getTopicMastery' }),
  getSubtopicMastery: (args) =>
    runLearningProfileQuery({ ...args, actionType: 'getSubtopicMastery' }),
  batchUpdateConceptMastery: (args) =>
    runLearningProfileMutation({ ...args, actionType: 'batchUpdateConceptMastery' }),
};
